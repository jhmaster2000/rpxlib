import fs from 'fs';
import zlibng from './zlibng';
import { DataWrapper, ReadonlyDataWrapper } from './datawrapper';
import { SectionFlags, SectionType } from './enums';
import { Header } from './header';
import { sint32, uint16, uint32 } from './primitives';
import { RelocationSection, RPLCrcSection, RPLFileInfoSection, Section, StringSection, SymbolSection } from './sections';
import Util from './util';

interface RPLSaveOptions {
    /** Ignore `Compressed` flags and just try
     *  to compress all compressable sections.
     * 
     * A value of `false` for `compression` parameter has higher priority than this. */
    compressAsPossible?: boolean;
    /** Bypass the check for inefficient compression where a section will not be
     * compressed if its compressed data is bigger than the uncompressed data. */
    bypassCompressionSizeCheck?: boolean;
}

interface RPLParseOptions {
    /** @warning Makes parsing and saving **VERY SLOW** */
    parseRelocs?: boolean;
}

export class RPL extends Header {
    constructor(data: TypedArray, opts: RPLParseOptions = {}) {
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
                case SectionType.StrTab:      this.#sections[i] = new StringSection(file, this); break;
                case SectionType.SymTab:      this.#sections[i] = new SymbolSection(file, this); break;
                case SectionType.Rel:         //! fallthrough
                case SectionType.Rela:        this.#sections[i] = new RelocationSection(file, this, opts.parseRelocs); break;
                case SectionType.RPLCrcs:     this.#sections[i] = new RPLCrcSection(file, this); break;
                case SectionType.RPLFileInfo: this.#sections[i] = new RPLFileInfoSection(file, this); break;
                default:
                    this.#sections[i] = new Section(file, this);
            }
        }
        //! [[DISCARD this._sectionHeadersEntryCount]]
        Reflect.deleteProperty(this, '_sectionHeadersEntryCount');
    }

    /**
     * Saves the RPL/RPX to a file.
     * @param compression The compression level to use on sections with the `Compressed` flag enabled.
     * - `false` disables compression (default).
     * - `true` uses the level in the RPL File Info section or `-1` if there isn't one.
     * - `-1` uses the default zlib compression level of `6`.
     * - `0` disables compression but still wraps the data in a zlib header and footer.
     */
    save(path: string, compression: boolean | zlibng.CompressionLevel = false, options?: RPLSaveOptions): void {
        const headers = new DataWrapper(Util.allocUnsafe(<number>this.sectionHeadersOffset + (this.#sections.length * <number>this.sectionHeadersEntrySize)));
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
        if (compression === true) compression = <zlibng.CompressionLevel>+fileinfoSection?.fileinfo?.compressionLevel ?? -1;
        else fileinfoSection.fileinfo.compressionLevel = new sint32(compression === false ? -1 : compression);

        let currOffset = <number>this.sectionHeadersOffset + <number>this.sectionHeadersEntrySize * this.#sections.length;
        const datasink = new Util.ArrayBufferSink();
        for (let i = 0; i < this.#sections.length; i++) {
            const section = this.#sections[i];
            const sectionOffset: number = section.hasData ? currOffset : 0;
            let sectionSize: number | uint32;

            if (compression === false) {
                (<number>section.flags) &= ~SectionFlags.Compressed;
                sectionSize = section.size;
                if (section.hasData) {
                    currOffset += <number>sectionSize;
                    datasink.write(section.data!);
                }
            } else {
                if (<number>section.flags & SectionFlags.Compressed) {
                    if (!section.hasData) {
                        sectionSize = section.size;
                    } else if (+section.type === SectionType.RPLCrcs || +this.type === SectionType.RPLFileInfo) {
                        sectionSize = section.size;
                        currOffset += <number>sectionSize;
                        datasink.write(section.data!);
                    } else {
                        const data = section.data!;
                        const uncompressed = data instanceof ReadonlyDataWrapper ? new Uint8Array(data['@@arraybuffer']) : data;
                        const compressed = Buffer.concat([Util.allocUnsafe(4), zlibng.deflateSync(uncompressed, { level: compression, /*windowBits: -15, memLevel: 9*/ })]);
                        compressed.writeUint32BE(uncompressed.byteLength, 0);
                        if (compressed.byteLength >= uncompressed.byteLength) {
                            sectionSize = uncompressed.byteLength;
                            currOffset += <number>sectionSize;
                            datasink.write(uncompressed);
                        } else {
                            const compressedBuf = compressed.subarray(compressed.byteOffset, compressed.byteOffset + compressed.byteLength);
                            sectionSize = compressedBuf.byteLength;
                            currOffset += <number>sectionSize;
                            datasink.write(compressedBuf);
                        }
                    }
                } else {
                    sectionSize = section.size;
                    if (section.hasData) {
                        currOffset += <number>sectionSize;
                        datasink.write(section.data!);
                    }
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

        /*let crcsPos = 0;
        let crcs: number[] = [];
        const sectionsData = new DataWrapper(Util.allocUnsafe(totalSectionSizes));
        for (let i = 0; i < this.#sections.length; i++) {
            const section = this.#sections[i];
            const ix = i * 4;

            if (!section.hasData) {
                crcs[ix  ] = 0x00;
                crcs[ix+1] = 0x00;
                crcs[ix+2] = 0x00;
                crcs[ix+3] = 0x00;
                continue;
            }

            if (section instanceof RPLCrcSection) {
                crcsPos = sectionsData.pos;
                crcs[ix  ] = 0x00;
                crcs[ix+1] = 0x00;
                crcs[ix+2] = 0x00;
                crcs[ix+3] = 0x00;
                sectionsData.pos += this.#sections.length * <number>section.entSize;
                continue;
            }

            const uncompressedData = section.data!;
            const data = compressedDatas[i] ?? uncompressedData;
            sectionsData.drop(data);
            const crc = Number(Util.crc32(uncompressedData));
            crcs[ix  ] = crc >> 24 & 0xFF;
            crcs[ix+1] = crc >> 16 & 0xFF;
            crcs[ix+2] = crc >>  8 & 0xFF;
            crcs[ix+3] = crc       & 0xFF;
        }

        if (crcsPos !== 0) {
            const endPos = sectionsData.pos;
            sectionsData.pos = crcsPos;
            sectionsData.drop(crcs);
            sectionsData.pos = endPos;
        }*/

        const file = Buffer.concat([headers, new Uint8Array(datasink.end())]);
        fs.writeFileSync(path, file);
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
}
