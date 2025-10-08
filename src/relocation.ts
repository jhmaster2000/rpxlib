import { RelocationFieldType, RelocationType } from './enums.js';
import { uint8, uint32, sint32 } from './primitives.js';
import { Structs } from './structs.js';

export interface RelocationInfo {
    symbolIndex: number; // info >> 8 //* (uint24) */
    type: uint8;         // info & 0xFF
}

type RelocationInitCommon = Pick<Structs.Relocation, 'addr'> & Pick<Partial<Structs.Relocation>, 'addend'>;
type RelocationInit = RelocationInitCommon & ({
    type?: RelocationType,
    symbolIndex?: number,
    info?: never, // mutually exclusive with type/symbolIndex
} | Pick<Structs.Relocation, 'info'>);

const DISALLOW_STRUCTURAL_MATCH = Symbol();

export class Relocation extends Structs.Relocation {
    constructor(init?: RelocationInit) {
        super();
        if (!init) return;

        this.addr = new uint32(init.addr);
        if (init.addend !== undefined) this.addend = new sint32(init.addend);
        if ('info' in init) {
            if ('type' in init || 'symbolIndex' in init) throw new TypeError(
                `Relocation constructor initialization data fields "info" and "type"/"symbolIndex" are mutually exclusive.`
            );
            this.info = new uint32(init.info);
        } else {
            if ('type' in init) this.type = new uint8(init.type);
            if ('symbolIndex' in init) this.symbolIndex = init.symbolIndex ?? 0;
        }
    }
    readonly [DISALLOW_STRUCTURAL_MATCH]!: typeof DISALLOW_STRUCTURAL_MATCH;
    
    get symbolIndex(): number { return <number>this.info >> 8; }
    get type(): uint8 { return <number>this.info & 0xFF; }

    set symbolIndex(symbolIndex: number) {
        if (symbolIndex < 0x00 || symbolIndex > 0xFFFFFF) throw new RangeError(`24-bit value out of range: ${symbolIndex}`);
        this.info = (symbolIndex << 8) + (<number>this.info & 0xFF);
    }
    set type(type: uint8) {
        this.info = (<number>this.info & 0xFFFFFF00) + <number>type;
    }

    get fieldSize(): number {
        const ftype = this.fieldType;
        if (ftype === RelocationFieldType.none) return 0;
        else return ftype === RelocationFieldType.half16 ? 2 : 4;
    }

    get fieldType(): RelocationFieldType {
        switch (+this.type) {
            case RelocationType.None:
                return RelocationFieldType.none;
            case RelocationType.PPCAddr32:
            case RelocationType.PPCCopy:
            case RelocationType.PPCJumpSlot:
            case RelocationType.PPCGlobalData:
            case RelocationType.PPCRelative:
            case RelocationType.PPCUAddr32:
            case RelocationType.PPCRel32:
            case RelocationType.PPCPlt32:
            case RelocationType.PPCPltRel32:
                return RelocationFieldType.word32;
            case RelocationType.PPCAddr30:
                return RelocationFieldType.word30;
            case RelocationType.PPCAddr24:
            case RelocationType.PPCRel24:
            case RelocationType.PPCPltRel24:
            case RelocationType.PPCLocal24PC:
                return RelocationFieldType.low24;
            case RelocationType.PPCAddr14:
            case RelocationType.PPCAddr14BrTaken:
            case RelocationType.PPCAddr14BrNotTaken:
            case RelocationType.PPCRel14:
            case RelocationType.PPCRel14BrTaken:
            case RelocationType.PPCRel14BrNotTaken:
                return RelocationFieldType.low14;
            case RelocationType.PPCAddr16:
            case RelocationType.PPCAddr16Lo:
            case RelocationType.PPCAddr16Hi:
            case RelocationType.PPCAddr16Ha:
            case RelocationType.PPCGot16:
            case RelocationType.PPCGot16Lo:
            case RelocationType.PPCGot16Hi:
            case RelocationType.PPCGot16Ha:
            case RelocationType.PPCUAddr16:
            case RelocationType.PPCPlt16Lo:
            case RelocationType.PPCPlt16Hi:
            case RelocationType.PPCPlt16Ha:
            case RelocationType.PPCSdaRel16:
            case RelocationType.PPCSectOff:
            case RelocationType.PPCSectOffLo:
            case RelocationType.PPCSectOffHi:
            case RelocationType.PPCSectOffHa:
                return RelocationFieldType.half16; //? size 2
            default:
                return RelocationFieldType.none; //! unknown
        }
    }
}