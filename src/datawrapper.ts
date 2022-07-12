import { uint8, uint16, uint32, sint8, sint16, sint32 } from './primitives';

const DWInstanceSymbol: unique symbol = Symbol('DataWrapper');

export class DataWrapper extends Buffer {
    constructor(buf: ArrayBuffer) { super(buf); }
    
    //! Due to Buffer constructor being deprecated we cannot instanceof against DataWrapper normally
    static [Symbol.hasInstance](instance: unknown): instance is DataWrapper {
        return (instance as DataWrapper)[DWInstanceSymbol] ?? false;
    }
    private readonly [DWInstanceSymbol] = true as const;

    static override from(buf: ArrayBuffer | unknown, start: number | unknown = 0, length: number = (<ArrayBuffer>buf).byteLength ?? 0): DataWrapper {
        if (!(buf instanceof ArrayBuffer)) throw new TypeError('DataWrapper.from expected ArrayBuffer for argument 1.');
        if (typeof start !== 'number') throw new TypeError('DataWrapper.from expected number or undefined for argument 2.');
        return new DataWrapper(buf.slice(start, start + length));
    }

    // TODO: Override static methods
    
    pos: number = 0;

    passUint8 = function(this: DataWrapper) {
        const v = this.readUint8(this.pos);
        this.pos += 1;
        return new uint8(v);
    };
    passUint16 = function(this: DataWrapper) {
        const v = this.readUint16BE(this.pos);
        this.pos += 2;
        return new uint16(v);
    };
    passUint32 = function(this: DataWrapper) {
        const v = this.readUint32BE(this.pos);
        this.pos += 4;
        return new uint32(v);
    };
    passInt8 = function(this: DataWrapper) {
        const v = this.readInt8(this.pos);
        this.pos += 1;
        return new sint8(v);
    };
    passInt16 = function(this: DataWrapper) {
        const v = this.readInt16BE(this.pos);
        this.pos += 2;
        return new sint16(v);
    };
    passInt32 = function(this: DataWrapper) {
        const v = this.readInt32BE(this.pos);
        this.pos += 4;
        return new sint32(v);
    };

    dropUint8 = function(this: DataWrapper) {
        this.writeUint8(this.pos);
        this.pos += 1;
    };
    dropUint16 = function(this: DataWrapper) {
        this.writeUint16BE(this.pos);
        this.pos += 2;
    };
    dropUint32 = function(this: DataWrapper) {
        this.writeUint32BE(this.pos);
        this.pos += 4;
    };
    dropInt8 = function(this: DataWrapper) {
        this.writeInt8(this.pos);
        this.pos += 1;
    };
    dropInt16 = function(this: DataWrapper) {
        this.writeInt16BE(this.pos);
        this.pos += 2;
    };
    dropInt32 = function(this: DataWrapper) {
        this.writeInt32BE(this.pos);
        this.pos += 4;
    };
}

export class ReadonlyDataWrapper extends DataWrapper {
    readonly [k: number]: number;
    override swap16(): ReadonlyDataWrapper { return (Uint8Array.prototype.slice.call(this) as ReadonlyDataWrapper).swap16(); }
    override swap32(): ReadonlyDataWrapper { return (Uint8Array.prototype.slice.call(this) as ReadonlyDataWrapper).swap32(); }
    override swap64(): ReadonlyDataWrapper { return (Uint8Array.prototype.slice.call(this) as ReadonlyDataWrapper).swap64(); }
    override write(): 0 { return 0; }
    override writeFloatBE(): 0 { return 0; }
    override writeFloatLE(): 0 { return 0; }
    override writeDoubleBE(): 0 { return 0; }
    override writeDoubleLE(): 0 { return 0; }
    override writeBigInt64BE(): 0 { return 0; }
    override writeBigInt64LE(): 0 { return 0; }
    override writeBigUInt64BE(): 0 { return 0; }
    override writeBigUInt64LE(): 0 { return 0; }
    override writeBigUint64BE(): 0 { return 0; }
    override writeBigUint64LE(): 0 { return 0; }
    override writeInt32BE(): 0 { return 0; }
    override writeInt32LE(): 0 { return 0; }
    override writeUInt32BE(): 0 { return 0; }
    override writeUInt32LE(): 0 { return 0; }
    override writeUint32BE(): 0 { return 0; }
    override writeUint32LE(): 0 { return 0; }
    override writeUInt16BE(): 0 { return 0; }
    override writeUInt16LE(): 0 { return 0; }
    override writeUint16BE(): 0 { return 0; }
    override writeUint16LE(): 0 { return 0; }
    override writeInt16BE(): 0 { return 0; }
    override writeInt16LE(): 0 { return 0; }
    override writeIntBE(): 0 { return 0; }
    override writeIntLE(): 0 { return 0; }
    override writeUIntBE(): 0 { return 0; }
    override writeUIntLE(): 0 { return 0; }
    override writeUintBE(): 0 { return 0; }
    override writeUintLE(): 0 { return 0; }
    override writeUInt8(): 0 { return 0; }
    override writeUint8(): 0 { return 0; }
    override writeInt8(): 0 { return 0; }
    override set(): void {}
    override slice(start?: number, end?: number): ReadonlyDataWrapper {
        return new ReadonlyDataWrapper(Uint8Array.prototype.slice.call(this, start, end).buffer);
    }
    override subarray(start?: number, end?: number): ReadonlyDataWrapper {
        return this.subarray(start, end);
    }
    override copy(target: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number {
        if (target === this) return 0;
        return super.copy(target, targetStart, sourceStart, sourceEnd);
    }
    override copyWithin(): this { return this; }
    override fill(): this { return this; }
    override sort(): this { return this; }
    override dropUint8  = () => void 0;
    override dropUint16 = () => void 0;
    override dropUint32 = () => void 0;
    override dropInt8   = () => void 0;
    override dropInt16  = () => void 0;
    override dropInt32  = () => void 0;
}
