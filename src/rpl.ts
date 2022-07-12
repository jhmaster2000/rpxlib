import fs from 'fs';
import { DataWrapper } from './datawrapper';
import { SectionType } from './enums';
import { Header } from './header';
import { uint16 } from './primitives.js';
import { RelocationSection, RPLCrcSection, RPLFileInfoSection, Section, StringSection, SymbolSection } from './sections';

export class RPL extends Header {
    constructor(filepath: string) {
        const file = new DataWrapper(fs.readFileSync(filepath));
        super(file);

        this.#sections = new Array(<number>this._sectionHeadersEntryCount) as Section[];
        file.pos = +this.sectionHeadersOffset;

        for (let i = 0; i < this._sectionHeadersEntryCount; i++) {
            const sectionType: SectionType = file.readUint32BE(file.pos + 4);
            switch (sectionType) {
                case SectionType.StrTab:
                    this.#sections[i] = new StringSection(file, this); break;
                case SectionType.SymTab:
                    this.#sections[i] = new SymbolSection(file, this); break;
                case SectionType.Rela:
                    this.#sections[i] = new RelocationSection(file, this); break;
                case SectionType.RPLCrcs:
                    this.#sections[i] = new RPLCrcSection(file, this); break;
                case SectionType.RPLFileInfo:
                    this.#sections[i] = new RPLFileInfoSection(file, this); break;
                default:
                    this.#sections[i] = new Section(file, this);
            }
        }
        //! [[DISCARD this._sectionHeadersEntryCount]]
    }

    #sections: Section[];
    get sections(): ReadonlyArray<Section> { return this.#sections; }
    get sectionHeadersEntryCount(): uint16 { return new uint16(this.#sections.length); }
    get shstrIndex(): uint16 { return this._shstrIndex; }
    set shstrIndex(index: uint16 | number) {
        index = +index;
        if (this.#sections[<number>index] instanceof StringSection) {
            this._shstrIndex = index;
        } else {
            throw new TypeError(`Cannot assign shstrIndex, Section at index ${+index} is not a string table or doesn't exist.`);
        }
    }
}
