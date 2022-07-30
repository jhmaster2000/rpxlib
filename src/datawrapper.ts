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

    passUint8 = function(this: DataWrapper): uint8 {
        const v = this.readUint8(this.pos);
        this.pos += 1;
        return new uint8(v);
    };
    passUint16 = function(this: DataWrapper): uint16 {
        const v = this.readUint16BE(this.pos);
        this.pos += 2;
        return new uint16(v);
    };
    passUint32 = function(this: DataWrapper): uint32 {
        const v = this.readUint32BE(this.pos);
        this.pos += 4;
        return new uint32(v);
    };
    passInt8 = function(this: DataWrapper): sint8 {
        const v = this.readInt8(this.pos);
        this.pos += 1;
        return new sint8(v);
    };
    passInt16 = function(this: DataWrapper): sint16 {
        const v = this.readInt16BE(this.pos);
        this.pos += 2;
        return new sint16(v);
    };
    passInt32 = function(this: DataWrapper): sint32 {
        const v = this.readInt32BE(this.pos);
        this.pos += 4;
        return new sint32(v);
    };

    dropUint8 = function(this: DataWrapper, value: uint8): void {
        this.writeUint8(+value, this.pos);
        this.pos += 1;
    };
    dropUint16 = function(this: DataWrapper, value: uint16): void {
        this.writeUint16BE(+value, this.pos);
        this.pos += 2;
    };
    dropUint32 = function(this: DataWrapper, value: uint32): void {
        this.writeUint32BE(+value, this.pos);
        this.pos += 4;
    };
    dropInt8 = function(this: DataWrapper, value: sint8): void {
        this.writeInt8(+value, this.pos);
        this.pos += 1;
    };
    dropInt16 = function(this: DataWrapper, value: sint16): void {
        this.writeInt16BE(+value, this.pos);
        this.pos += 2;
    };
    dropInt32 = function(this: DataWrapper, value: sint32): void {
        this.writeInt32BE(+value, this.pos);
        this.pos += 4;
    };

    drop = function(this: DataWrapper, values: TypedArray | number[]): void {
        this.set(values, this.pos);
        this.pos += (<TypedArray>values).byteLength ?? values.length;
    };

    zerofill = function(this: DataWrapper, byteCount: number): void {
        this.fill(0, this.pos, this.pos + byteCount);
        this.pos += byteCount;
    };

    override swap16 = function(this: DataWrapper): DataWrapper { return swap16(this); };
    override swap32 = function(this: DataWrapper): DataWrapper { return swap32(this); };
    override swap64 = function(this: DataWrapper): DataWrapper { return swap64(this); };
}

export class ReadonlyDataWrapper extends DataWrapper {
    readonly [k: number]: number;
    override get buffer(): ArrayBuffer { throw new Error('Cannot access writable ArrayBuffer of ReadonlyDataWrapper instance.'); }
    //@ts-expect-error intellisense is drunk
    override swap16 = function(this: ReadonlyDataWrapper): ReadonlyDataWrapper { return new ReadonlyDataWrapper(swap16(Uint8Array.prototype.slice.call(this))); };
    //@ts-expect-error intellisense is drunk
    override swap32 = function(this: ReadonlyDataWrapper): ReadonlyDataWrapper { return new ReadonlyDataWrapper(swap32(Uint8Array.prototype.slice.call(this))); };
    //@ts-expect-error intellisense is drunk
    override swap64 = function(this: ReadonlyDataWrapper): ReadonlyDataWrapper { return new ReadonlyDataWrapper(swap64(Uint8Array.prototype.slice.call(this))); };
    override write = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeFloatBE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeFloatLE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeDoubleBE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeDoubleLE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeBigInt64BE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeBigInt64LE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeBigUInt64BE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeBigUInt64LE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeBigUint64BE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeBigUint64LE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeInt32BE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeInt32LE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUInt32BE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUInt32LE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUint32BE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUint32LE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUInt16BE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUInt16LE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUint16BE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUint16LE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeInt16BE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeInt16LE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeIntBE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeIntLE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUIntBE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUIntLE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUintBE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUintLE = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUInt8 = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeUint8 = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override writeInt8 = function(this: ReadonlyDataWrapper): 0 { return 0; };
    override set = function(this: ReadonlyDataWrapper): void { return; };
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
    //@ts-expect-error ---
    override copyWithin = function(this: ReadonlyDataWrapper): ReadonlyDataWrapper { return this; };
    //@ts-expect-error ---
    override fill = function(this: ReadonlyDataWrapper): ReadonlyDataWrapper { return this; };
    //@ts-expect-error ---
    override sort = function(this: ReadonlyDataWrapper): ReadonlyDataWrapper { return this; };
    override dropUint8  = (): void => { return; };
    override dropUint16 = (): void => { return; };
    override dropUint32 = (): void => { return; };
    override dropInt8   = (): void => { return; };
    override dropInt16  = (): void => { return; };
    override dropInt32  = (): void => { return; };
    override drop       = (): void => { return; };
    override zerofill   = (): void => { return; };
}

function swap(b: Uint8Array, n: number, m: number): void { const i = b[n]; b[n] = b[m]; b[m] = i; }
function swap16<T extends Uint8Array>(b: T): T {
    const len = b.length;
    if (len % 2 !== 0) throw new RangeError('Buffer size must be a multiple of 16-bits');
    for (let i = 0; i < len; i += 2) swap(b, i, i + 1);
    return b;
}
function swap32<T extends Uint8Array>(b: T): T {
    const len = b.length;
    if (len % 4 !== 0) throw new RangeError('Buffer size must be a multiple of 32-bits');
    for (let i = 0; i < len; i += 4) {
        swap(b, i    , i + 3);
        swap(b, i + 1, i + 2);
    }
    return b;
}
function swap64<T extends Uint8Array>(b: T): T {
    const len = b.length;
    if (len % 8 !== 0) throw new RangeError('Buffer size must be a multiple of 64-bits');
    for (let i = 0; i < len; i += 8) {
        swap(b, i    , i + 7);
        swap(b, i + 1, i + 6);
        swap(b, i + 2, i + 5);
        swap(b, i + 3, i + 4);
    }
    return b;
}
