import fs from 'fs';
import zlib from 'zlib';
import Util from './util.js';
import { crc32 } from '@foxglove/crc';
import { Header } from './header.js';
import { DataSink } from './datasink.js';
import { SectionFlags, SectionType } from './enums.js';
import { sint32, uint16, uint32 } from './primitives.js';
import { DataWrapper, ReadonlyDataWrapper } from './datawrapper.js';
import { NoBitsSection, RelocationSection, RPLCrcSection, RPLFileInfoSection, Section, StringSection, SymbolSection } from './sections.js';

interface RPLSaveOptions {
    /** Ignore `Compressed` flags and just try to compress all compressable sections.
     *
     * This is useful for compressing ELF files back to RPX/RPL without manually selecting sections to compress.
     *
     * A value of `false` for `compression` parameter has higher priority than this. */
    compressAsPossible?: boolean;
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

        this.#sections = new Array(<number>this._sectionHeadersEntryCount) as Section[];
        file.pos = +this.sectionHeadersOffset;

        for (let i = 0; i < this._sectionHeadersEntryCount; i++) {
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
        //! [[DISCARD this._sectionHeadersEntryCount]]
        Reflect.deleteProperty(this, '_sectionHeadersEntryCount');
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
        const headers = new DataWrapper(Buffer.allocUnsafe(<number>this.sectionHeadersOffset + (this.#sections.length * <number>this.sectionHeadersEntrySize)));
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
        headers.dropUint32(this.programHeadersOffset);
        headers.dropUint32(this.sectionHeadersOffset);
        headers.dropUint32(this.isaFlags);
        headers.dropUint16(this.headerSize);
        headers.dropUint16(this.programHeadersEntrySize);
        headers.dropUint16(this.programHeadersEntryCount);
        headers.dropUint16(this.sectionHeadersEntrySize);
        headers.dropUint16(this.sectionHeadersEntryCount);
        headers.dropUint16(this.shstrIndex);
        headers.zerofill(<number>this.sectionHeadersOffset - <number>this.headerSize); //? padding

        const fileinfoSection = (<RPLFileInfoSection>this.#sections.find(s => s instanceof RPLFileInfoSection));
        if (compression === true) compression = <CompressionLevel>+fileinfoSection?.fileinfo?.compressionLevel ?? -1;
        else fileinfoSection.fileinfo.compressionLevel = new sint32(compression === false ? 0 : compression);

        options.compressAsPossible ??= false;

        let crcsOffset = 0;
        let crcs: number[] = [];
        let currOffset = <number>this.sectionHeadersOffset + <number>this.sectionHeadersEntrySize * this.#sections.length;
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
        if (crcsOffset !== 0) file.set(crcs, crcsOffset);

        filepath = Util.resolve(`${filepath}.${compression === false ? 'elf' : 'rpx'}`);
        fs.writeFileSync(filepath, file);
        return { filepath, filedata: file };
    }

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
            console.log([...freeFmt, ...occupiedFmt].sort((a, b) => a[0] - b[0]).map(x => x[1]).join('\n'));
        } };
    }

    pushSection(section: Section) {
        const fileinfo = this.#sections.pop()!;
        const crcs = this.#sections.pop()!;
        Reflect.set(section, 'rpx', this);
        this.#sections.push(section, crcs, fileinfo);
        return section;
    }
}
