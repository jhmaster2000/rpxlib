import { SymbolBinding, SymbolType, SymbolVisibility } from './enums';
import { StringSection, SymbolSection } from './sections';
import { Structs } from './structs';

export class ELFSymbol extends Structs.Symbol {
    constructor(section: SymbolSection) {
        super();
        this.#section = section;
    }

    get name(): string {
        const strSection = this.#section.linkedSection as StringSection;
        return strSection.strings.get(this.nameOffset) || '';
    }

    get type(): SymbolType { return <number>this.info & 0xF; }
    get binding(): SymbolBinding { return <number>this.info >> 4; }
    get visibility(): SymbolVisibility { return <number>this.other & 0x3; }
    
    set type(type: SymbolType) {
        this.info = (0x2C >> 4 << 4) + +type;
    }
    set binding(binding: SymbolBinding) {
        this.info = (binding << 4) + (<number>this.info & 0xF);
    }
    set visibility(visibility: SymbolVisibility) {
        this.other = (<number>this.other >> 4 << 4) + +visibility;
    }

    /** @internal The SymbolSection this symbol belongs to. */
    readonly #section: SymbolSection;
}
