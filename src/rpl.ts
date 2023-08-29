import fs from 'fs';
import zlib from 'zlib';
import Util from './util.js';
import { crc32 } from '@foxglove/crc';
import { Header } from './header.js';
import { DataSink } from './datasink.js';
import { SectionFlags, SectionType, Type } from './enums.js';
import { sint32, uint16, uint32 } from './primitives.js';
import { DataWrapper, ReadonlyDataWrapper } from './datawrapper.js';
import { NoBitsSection, RelocationSection, RPLCrcSection, RPLFileInfoSection, Section, StringSection, SymbolSection } from './sections.js';
import { Program } from './programs.js';

interface RPLSaveOptions {
    /** Ignore `Compressed` flags and just try to compress all compressable sections.
     *
     * This is useful for compressing ELF files back to RPX/RPL without manually selecting sections to compress.
     *
     * A value of `false` for `compression` parameter has higher priority than this. */
    compressAsPossible?: boolean;
    /** Ignore program headers/segments and force saving anyway without them. */
    forceIgnoreSegments?: boolean;
}

interface RPLParseOptions {
    /** @warning Makes initial RPL parsing **considerably slower** if the file contains very large relocation sections */
    parseRelocs?: boolean;
}

type CompressionLevel = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export class RPL extends Header {
    constructor(data: Uint8Array, opts: RPLParseOptions = {}) {
        const file = new DataWrapper(data);
        super(file);

        opts.parseRelocs ??= false;

        this.#programs = new Array(+this._programHeadersEntryCount) as Program[];
        this.#sections = new Array(+this._sectionHeadersEntryCount) as Section[];

        file.pos = +this.programHeadersOffset;

        for (let i = 0; i < +this._programHeadersEntryCount; i++) {
            //const programType: Type = +file.passUint32();
            //file.pos -= 4;
            //switch (programType) {
            //    default:
            this.#programs[i] = new Program(file, this);
            //}
        }

        file.pos = +this.sectionHeadersOffset;

        for (let i = 0; i < +this._sectionHeadersEntryCount; i++) {
            file.pos += 4;
            const sectionType: SectionType = +file.passUint32();
            file.pos -= 8;
            switch (sectionType) {
                case SectionType.NoBits:      this.#sections[i] = new NoBitsSection(file, this); break;
                case SectionType.StrTab:      this.#sections[i] = new StringSection(file, this); break;
                case SectionType.SymTab:      this.#sections[i] = new SymbolSection(file, this); break;
                case SectionType.Rel:         //! fallthrough
                case SectionType.Rela:        this.#sections[i] = new RelocationSection(file, this, opts.parseRelocs); break;
                case SectionType.RPLCrcs:     this.#sections[i] = new RPLCrcSection(file, this); break;
                case SectionType.RPLFileInfo: this.#sections[i] = new RPLFileInfoSection(file, this); break;
                default:                      this.#sections[i] = new Section(file, this);
            }
        }
        
        Reflect.deleteProperty(this, '_programHeadersEntryCount'); //! [[DISCARD this._programHeadersEntryCount]]
        Reflect.deleteProperty(this, '_sectionHeadersEntryCount'); //! [[DISCARD this._sectionHeadersEntryCount]]
    }

    /**
     * Saves the RPL/RPX to a file.
     * @param filepath The path to the output file without an extension.
     * The extension will be automatically determined based on the `compression` argument.
     * @param compression The compression level to use on sections with the `Compressed` flag enabled.
     * - `false` disables compression (default).
     * - `true` uses the level in the RPL File Info section or `-1` if there isn't one.
     * - `-1` uses the default zlib compression level of `6`.
     * - `0` disables compression but still wraps the data in a zlib header and footer.
     */
    save(filepath: string, compression: boolean | CompressionLevel = false, options: RPLSaveOptions = {}) {
        if (+this.programHeadersEntryCount !== 0) {
            if (!options.forceIgnoreSegments) throw new Error(
                'Cannot save file, program headers saving is not yet supported.\n' +
                'Use the "forceIgnoreSegments" option to force trying to save anyway (program headers will be stripped out!).'
            );
            else console.warn(
                '[!] Forcefully saving file with program headers/segments.\n' +
                '    Program headers will be stripped out and the file may be corrupt!'
            );
        }

        const headers = new DataWrapper(Buffer.allocUnsafe(
            <number>this.headerSize
            //+ (this.#programs.length * <number>this.programHeadersEntrySize)
            + (this.#sections.length * <number>this.sectionHeadersEntrySize)
        ));
        headers.dropUint32(this.magic);
        headers.dropUint8(this.class);
        headers.dropUint8(this.endian);
        headers.dropUint8(this.version);
        headers.dropUint8(this.abi);
        headers.dropUint8(this.abiVersion);
        headers.zerofill(7); //? padding
        headers.dropUint16(this.type);
        headers.dropUint16(this.isa);
        headers.dropUint32(this.isaVersion);
        headers.dropUint32(this.entryPoint);
        headers.dropUint32(0 /*this.programHeadersOffset*/);
        headers.dropUint32(this.headerSize /*this.sectionHeadersOffset*/);
        headers.dropUint32(this.isaFlags);
        headers.dropUint16(this.headerSize);
        headers.dropUint16(0 /*this.programHeadersEntrySize*/);
        headers.dropUint16(0 /*this.programHeadersEntryCount*/);
        headers.dropUint16(this.sectionHeadersEntrySize);
        headers.dropUint16(this.sectionHeadersEntryCount);
        headers.dropUint16(this.shstrIndex);
        //headers.zerofill(); //? padding

        if (+this.type === Type.RPL) {
            const fileinfoSection = (<RPLFileInfoSection | undefined>this.#sections.find(s => s instanceof RPLFileInfoSection));
            if (!fileinfoSection) throw new Error('Cannot save RPL, no RPL File Info section found.');
            if (compression === true) compression = <CompressionLevel>+fileinfoSection?.fileinfo?.compressionLevel ?? -1;
            else fileinfoSection.fileinfo.compressionLevel = new sint32(compression === false ? 0 : compression);
        } else if (compression === true) compression = -1;

        options.compressAsPossible ??= false;

        let crcsOffset = 0;
        let crcs: number[] = [];
        let currOffset = <number>this.headerSize
            //+ <number>this.programHeadersEntrySize * this.#programs.length
            + <number>this.sectionHeadersEntrySize * this.#sections.length;
        const datasink = new DataSink();

        /** If uncompressedData is `true`, the section is considered the RPLCrcSection */
        const writeSectionDataAndCRC = (i: number, offset: number, uncompressedData: Uint8Array | true, compressedData?: Uint8Array): void => {
            const ix = i * 4;
            if (uncompressedData === true) {
                crcsOffset = offset;
                crcs[ix] = 0x00; crcs[ix+1] = 0x00; crcs[ix+2] = 0x00; crcs[ix+3] = 0x00;
                datasink.write(Buffer.allocUnsafe(this.#sections.length * 4 /* Section.entSize */));
            } else {
                datasink.write(compressedData ?? uncompressedData);
                if (+this.type === Type.RPL) {
                    let crc: number;
                    if (uncompressedData instanceof ReadonlyDataWrapper) {
                        ReadonlyDataWrapper['@@unlock'](uncompressedData);
                        crc = crc32(uncompressedData);
                        ReadonlyDataWrapper['@@lock'](uncompressedData);
                    } else crc = crc32(uncompressedData);
                    crcs[ix  ] = crc >> 24 & 0xFF;
                    crcs[ix+1] = crc >> 16 & 0xFF;
                    crcs[ix+2] = crc >>  8 & 0xFF;
                    crcs[ix+3] = crc       & 0xFF;
                }
            }
        };

        for (let i = 0; i < this.#sections.length; i++) {
            const section = this.#sections[i]!;
            const sectionOffset: number = section.hasData ? currOffset : 0;
            let sectionSize: number | uint32;

            const isCRCSection = +section.type === SectionType.RPLCrcs;
            if (compression === false) { // Saving file with no compression (ELF)
                (<number>section.flags) &= ~SectionFlags.Compressed;
                sectionSize = section.size;
                if (section.hasData) {
                    currOffset += <number>sectionSize;
                    writeSectionDataAndCRC(i, sectionOffset, isCRCSection || section.data!);
                } else { const ix = i*4; crcs[ix] = 0x00; crcs[ix+1] = 0x00; crcs[ix+2] = 0x00; crcs[ix+3] = 0x00; }
            }
            else { // Saving file with compression (RPL/RPX)
                if (<number>section.flags & SectionFlags.Compressed || options.compressAsPossible) { // Saving compressed section
                    if (!section.hasData) {
                        (<number>section.flags) &= ~SectionFlags.Compressed;
                        sectionSize = section.size;
                        const ix = i*4; crcs[ix] = 0x00; crcs[ix+1] = 0x00; crcs[ix+2] = 0x00; crcs[ix+3] = 0x00;
                        if (!options.compressAsPossible) console.warn(
                            `[!] Saving section #${i} which has no data and has been marked as compressed.\n` +
                            `    This is likely a mistake and the section has been unmarked as compressed.`
                        );
                    } else if (isCRCSection || +section.type === SectionType.RPLFileInfo) {
                        (<number>section.flags) &= ~SectionFlags.Compressed;
                        sectionSize = section.size;
                        currOffset += <number>sectionSize;
                        writeSectionDataAndCRC(i, sectionOffset, isCRCSection || section.data!);
                        if (!options.compressAsPossible) console.warn(
                            `[!] Saving RPL CRCs or File Info section which has been marked as compressed, this is likely a mistake.\n` +
                            `    These sections cannot be compressed and have been saved as uncompressed instead.`
                        );
                    } else {
                        const data = section.data!;
                        const uncompressed = data instanceof ReadonlyDataWrapper
                            ? new Uint8Array(data['@@arraybuffer'], data.byteOffset, data.byteLength)
                            : data;
                        const compressed = Buffer.concat([
                            Buffer.allocUnsafe(4),
                            zlib.deflateSync(uncompressed, { level: compression })
                        ]);
                        compressed.writeUint32BE(uncompressed.byteLength, 0);

                        if (compression !== 0 && compressed.byteLength >= uncompressed.byteLength) {
                            (<number>section.flags) &= ~SectionFlags.Compressed;
                            sectionSize = uncompressed.byteLength;
                            currOffset += <number>sectionSize;
                            writeSectionDataAndCRC(i, sectionOffset, uncompressed);
                            if (!options.compressAsPossible) console.warn(
                                `[!] Saving section #${i} which has been marked as compressed as uncompressed,\n` +
                                `    due to the compression making it larger than uncompressed.`
                            );
                        } else {
                            sectionSize = compressed.byteLength;
                            currOffset += <number>sectionSize;
                            writeSectionDataAndCRC(i, sectionOffset, uncompressed, compressed); // Proper compressed section saving
                        }
                    }
                } else { // Saving uncompressed section
                    sectionSize = section.size;
                    if (section.hasData) {
                        currOffset += <number>sectionSize;
                        writeSectionDataAndCRC(i, sectionOffset, isCRCSection || section.data!);
                    } else { const ix = i*4; crcs[ix] = 0x00; crcs[ix+1] = 0x00; crcs[ix+2] = 0x00; crcs[ix+3] = 0x00; }
                }
            }

            headers.dropUint32(section.nameOffset);
            headers.dropUint32(section.type);
            headers.dropUint32(section.flags);
            headers.dropUint32(section.addr);
            headers.dropUint32(sectionOffset);
            headers.dropUint32(sectionSize);
            headers.dropUint32(section.link);
            headers.dropUint32(section.info);
            headers.dropUint32(section.addrAlign);
            headers.dropUint32(section.entSize);
        }

        const file = Buffer.concat([headers, datasink.end(), Buffer.alloc(1)]);
        if (+this.type === Type.RPL) {
            if (crcsOffset !== 0) file.set(crcs, crcsOffset);
            else throw new Error('Cannot save RPL, no RPL CRCs section found.');
        }

        filepath = Util.resolve(+this.type !== Type.RPL ? filepath : `${filepath}.${compression === false ? 'elf' : 'rpx'}`);
        fs.writeFileSync(filepath, file);
        return { filepath, filedata: file };
    }

    #programs: Program[];
    get programs(): ReadonlyArray<Program> { return this.#programs; }
    get programHeadersEntryCount(): uint16 { return new uint16(this.#programs.length); }

    #sections: Section[];
    get sections(): ReadonlyArray<Section> { return this.#sections; }
    get sectionHeadersEntryCount(): uint16 { return new uint16(this.#sections.length); }

    get shstrIndex(): uint16 { return this._shstrIndex; }
    set shstrIndex(index: uint16) {
        index = +index;
        if (this.#sections[(<number>index)] instanceof StringSection) {
            this._shstrIndex = new uint16(<number>index);
        } else {
            throw new TypeError(`Cannot assign shstrIndex, Section at index ${(<number>index)} is not a string table or doesn't exist.`);
        }
    }

    // Helper methods

    get shstrSection(): StringSection { return this.#sections[+this._shstrIndex] as StringSection; }
    get crcSection(): RPLCrcSection { return this.#sections.at(-2)! as RPLCrcSection; }
    get fileinfoSection(): RPLFileInfoSection { return this.#sections.at(-1)! as RPLFileInfoSection; }

    get addressRanges() {
        let used: [number, number][] = [];
        this.#sections.forEach(section => {
            if (+section.addr === 0) return;
            used.push([+section.addr, Util.roundUp(+section.addr + +section.size, +section.addrAlign)]);
        });
        used.sort((a, b) => a[0] - b[0]);

        let last = 0;
        let free: [number, number][] = [];
        used.forEach(([start, end], i) => {
            if (last > start) { last = start; used[i-1]![1] = last; }
            if (last === start) return last = end;
            if (start - 1 - last < 0x40) return last = end;
            free.push([last, start - 1]);
            return last = end;
        });
        free.push([last, 0xFFFFFFFF]);

        return { free, used, print() {
            const freeFmt = this.free.map(([x, y]) => [x, '\x1B[32;1m' + [
                x.toString(16).toUpperCase().padStart(8, '0'),
                y.toString(16).toUpperCase().padStart(8, '0')
            ].join(' -> ') + '\x1B[0m'] as const);
            const occupiedFmt = this.used.map(([x, y]) => [x, '\x1B[31;1m' + [
                x.toString(16).toUpperCase().padStart(8, '0'),
                y.toString(16).toUpperCase().padStart(8, '0')
            ].join(' -> ') + '\x1B[0m'] as const);
            console.info([...freeFmt, ...occupiedFmt].sort((a, b) => a[0] - b[0]).map(x => x[1]).join('\n'));
        } };
    }

    pushSection(section: Section) {
        Reflect.set(section, 'rpx', this);
        if (+this.type === Type.RPL) {
            const fileinfo = this.#sections.pop()!;
            const crcs = this.#sections.pop()!;
            this.#sections.push(section, crcs, fileinfo);
        } else {
            this.#sections.push(section);
        }
        return section;
    }

    // TODO: it shouldn't leave the file in an invalid state if it throws
    /**
     * RPXLib attempts to be as safe and prevent removing sections that are required or referenced by other sections,
     * but it's not perfect and it may be possible to remove a section that is referenced by another section through means that RPXLib doesn't check for.
     * 
     * Usage of this method takes responsibility for any issues that may arise from removing a section that is referenced by another section.
     * RPXLib will no longer be able to guarantee the validity of the file after this method is used.
     * 
     * **Important**: This method may throw on error, if it does, the file will be left in an invalid state and should no longer be used.
     * 
     * @param section The section to remove.
     * @param stubMode If `true`, RPXLib will simply stub over the section with a null section instead of removing it.
     * This is useful for avoiding shifting section indices.
     */
    removeSection(section: Section, stubMode = false) {
        if (!this.#sections.includes(section)) throw new Error('Cannot remove section, it does not belong to this file or is not a section.');
        if (section === this.shstrSection) throw new Error('Cannot remove section, it is the section headers string table.');
        if (+this.type === Type.RPL) {
            if (section === this.crcSection) throw new Error('Cannot remove section, it is the RPL CRCs section.');
            if (section === this.fileinfoSection) throw new Error('Cannot remove section, it is the RPL File Info section.');
        }

        for (let i = 0; i < this.#sections.length; i++) {
            const sect = this.#sections[i]!;
            if (sect.linkedSection === section) {
                throw new Error(`Cannot remove section, it is linked to by section #${i} (${sect.name}).`);
            }
            if (sect instanceof RelocationSection) {
                if (+sect.info === section.index) {
                    throw new Error(`Cannot remove section, it is referenced by relocation section #${i} (${sect.name}).`);
                }
                if (!stubMode && +sect.info > section.index) sect.info = new uint32(+sect.info - 1);
            }
            else if (sect instanceof SymbolSection) {
                for (let si = 0; si < sect.symbols.length; si++) {
                    const sym = sect.symbols[si]!;
                    if (section.index && +sym.shndx === section.index) {
                        throw new Error(`Cannot remove section, it is referenced by symbol #${si} (${sym.name}) in section #${sect.index} (${sect.name}).`);
                    }
                    if (!stubMode && +sym.shndx > section.index) sym.shndx = new uint16(+sym.shndx - 1);
                }
            }

            if (!stubMode && +sect.link > section.index) sect.link = new uint32(+sect.link - 1);
        }

        if (!stubMode) {
            this.shstrIndex = <number>this._shstrIndex - 1;
            this.#sections.splice(this.#sections.indexOf(section), 1);
        } else {
            this.#sections[section.index] = new Section(new DataWrapper(new Uint8Array(0x28)), this);
        }
        Reflect.deleteProperty(section, 'rpx');
    }
}
