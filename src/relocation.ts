import { uint8 } from './primitives.js';
import { Structs } from './structs.js';

export interface RelocationInfo {
    symbolIndex: number; // info >> 8 //* (uint24) */
    type: uint8;         // info & 0xFF
}

export class Relocation extends Structs.Relocation {
    get symbolIndex(): number { return <number>this.info >> 8; }
    get type(): uint8 { return <number>this.info & 0xFF; }

    set symbolIndex(symbolIndex: number) {
        if (symbolIndex < 0x00 || symbolIndex > 0xFFFFFF) throw new RangeError(`24-bit value out of range: ${symbolIndex}`);
        this.info = (symbolIndex << 8) + (<number>this.info & 0xFF);
    }
    set type(type: uint8) {
        this.info = (<number>this.info & 0xFFFFFF00) + <number>type;
    }
}