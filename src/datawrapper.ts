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

    dropUint8 = function(this: DataWrapper, value: uint8) {
        this.writeUint8(+value, this.pos);
        this.pos += 1;
    };
    dropUint16 = function(this: DataWrapper, value: uint16) {
        this.writeUint16BE(+value, this.pos);
        this.pos += 2;
    };
    dropUint32 = function(this: DataWrapper, value: uint32) {
        this.writeUint32BE(+value, this.pos);
        this.pos += 4;
    };
    dropInt8 = function(this: DataWrapper, value: sint8) {
        this.writeInt8(+value, this.pos);
        this.pos += 1;
    };
    dropInt16 = function(this: DataWrapper, value: sint16) {
        this.writeInt16BE(+value, this.pos);
        this.pos += 2;
    };
    dropInt32 = function(this: DataWrapper, value: sint32) {
        this.writeInt32BE(+value, this.pos);
        this.pos += 4;
    };
}

export class ReadonlyDataWrapper extends DataWrapper {
    readonly [k: number]: number;
    override get buffer(): ArrayBuffer { throw new Error('Cannot access writable ArrayBuffer of ReadonlyDataWrapper instance.'); };
    override swap16 = function(this: ReadonlyDataWrapper): ReadonlyDataWrapper { return (Uint8Array.prototype.slice.call(this) as ReadonlyDataWrapper).swap16(); }
    override swap32 = function(this: ReadonlyDataWrapper): ReadonlyDataWrapper { return (Uint8Array.prototype.slice.call(this) as ReadonlyDataWrapper).swap32(); }
    override swap64 = function(this: ReadonlyDataWrapper): ReadonlyDataWrapper { return (Uint8Array.prototype.slice.call(this) as ReadonlyDataWrapper).swap64(); }
    override write = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeFloatBE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeFloatLE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeDoubleBE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeDoubleLE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeBigInt64BE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeBigInt64LE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeBigUInt64BE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeBigUInt64LE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeBigUint64BE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeBigUint64LE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeInt32BE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeInt32LE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUInt32BE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUInt32LE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUint32BE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUint32LE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUInt16BE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUInt16LE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUint16BE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUint16LE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeInt16BE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeInt16LE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeIntBE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeIntLE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUIntBE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUIntLE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUintBE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUintLE = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUInt8 = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeUint8 = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override writeInt8 = function(this: ReadonlyDataWrapper): 0 { return 0; }
    override set = function(this: ReadonlyDataWrapper): void {}
    override slice(start?: number, end?: number): ReadonlyDataWrapper {
        return new ReadonlyDataWrapper(Uint8Array.prototype.slice.call(this, start, end).buffer);
    }
    override subarray(start?: number, end?: number): ReadonlyDataWrapper {
        return new ReadonlyDataWrapper(Uint8Array.prototype.slice.call(this, start, end).buffer);
    }
    override copy(target: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number {
        if (target === this) return 0;
        return super.copy(target, targetStart, sourceStart, sourceEnd);
    }
    //@ts-expect-error
    override copyWithin = function(this: ReadonlyDataWrapper) { return this; }
    //@ts-expect-error
    override fill = function(this: ReadonlyDataWrapper): ReadonlyDataWrapper { return this; }
    //@ts-expect-error
    override sort = function(this: ReadonlyDataWrapper): ReadonlyDataWrapper { return this; }
    override dropUint8  = () => {};
    override dropUint16 = () => {};
    override dropUint32 = () => {};
    override dropInt8   = () => {};
    override dropInt16  = () => {};
    override dropInt32  = () => {};
}
