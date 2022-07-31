import crc32 from './crc32.js';
import { DataWrapper } from './datawrapper';
import { SectionFlags, SectionType } from './enums';
import { Header } from './header';
import { uint16 } from './primitives';
import { RelocationSection, RPLCrcSection, RPLFileInfoSection, Section, StringSection, SymbolSection } from './sections';

export class RPL extends Header {
    constructor(data: ArrayBuffer) {
        const file = new DataWrapper(data);
        super(file);

        this.#sections = new Array(<number>this._sectionHeadersEntryCount) as Section[];
        file.pos = +this.sectionHeadersOffset;

        for (let i = 0; i < this._sectionHeadersEntryCount; i++) {
            const sectionType: SectionType = file.readUint32BE(file.pos + 4);
            switch (sectionType) {
                case SectionType.StrTab:      this.#sections[i] = new StringSection(file, this); break;
                case SectionType.SymTab:      this.#sections[i] = new SymbolSection(file, this); break;
                case SectionType.Rel:         //! fallthrough
                case SectionType.Rela:        this.#sections[i] = new RelocationSection(file, this); break;
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
     * `true` uses the default level (`-1`). `false` disables compression (default).
     */
    async save(path: string, compression: boolean | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = false): Promise<void> {
        const headers = new DataWrapper(Bun.allocUnsafe(<number>this.sectionHeadersOffset + (this.#sections.length * <number>this.sectionHeadersEntrySize)));
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

        let totalSectionSizes = 0;
        for (let i = 0; i < this.#sections.length; i++) {
            const section = this.#sections[i];
            const sectionSize = section.size;
            if (section.hasData) totalSectionSizes += <number>sectionSize;
            // Saving without compression, disable all Compressed flags
            if (compression === false && <number>section.flags & SectionFlags.Compressed) (<number>section.flags) &= ~SectionFlags.Compressed;
            headers.dropUint32(section.nameOffset);
            headers.dropUint32(section.type);
            headers.dropUint32(section.flags);
            headers.dropUint32(section.addr);
            headers.dropUint32(section.offset);
            headers.dropUint32(sectionSize);
            headers.dropUint32(section.link);
            headers.dropUint32(section.info);
            headers.dropUint32(section.addrAlign);
            headers.dropUint32(section.entSize);
        }

        let crcsPos = 0;
        let crcs: number[] = [];
        const sectionsData = new DataWrapper(Bun.allocUnsafe(totalSectionSizes));
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

            const data = section.data!;
            sectionsData.drop(data);
            const crc = crc32(data);
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
        }

        const file = Bun.concatArrayBuffers([headers, sectionsData]);
        await Bun.write(path, file);
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
