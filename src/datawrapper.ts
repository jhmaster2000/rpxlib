import { uint8, uint16, uint32, sint8, sint16, sint32, type TypedArray } from './primitives.js';

export class DataWrapper extends Uint8Array {
    constructor(arg: TypedArray) {
        super(arg.buffer as ArrayBuffer, arg.byteOffset, arg.byteLength);
    }
    pos: number = 0;

    passUint8(): uint8 {
        return new uint8(this[this.pos++]);
    }
    passUint16(): uint16 {
        const v = this[this.pos]! << 8 | this[this.pos+1]!;
        this.pos += 2;
        return new uint16(v);
    }
    passUint32(): uint32 {
        const v = this[this.pos]! << 24 | this[this.pos+1]! << 16 | this[this.pos+2]! << 8 | this[this.pos+3]!;
        this.pos += 4;
        return new uint32(v);
    }
    passInt8(): sint8 {
        const v = this[this.pos++]!;
        return new sint8(v & 0x80 ? (0xFF - v + 1) * -1 : v);
    }
    passInt16(): sint16 {
        const v = this[this.pos]! << 8 | this[this.pos+1]!;
        this.pos += 2;
        return new sint16((v & 0x8000) ? v | 0xFFFF0000 : v);
    }
    passInt32(): sint32 {
        const v = this[this.pos]! << 24 | this[this.pos+1]! << 16 | this[this.pos+2]! << 8 | this[this.pos+3]!;
        this.pos += 4;
        return new sint32(v);
    }

    dropUint8(value: uint8): void {
        this[this.pos++] = +value;
    }
    dropUint16(value: uint16): void {
        this[this.pos]   = <number>value >>> 8;
        this[this.pos+1] = <number>value & 0xFF;
        this.pos += 2;
    }
    dropUint32(value: uint32): void {
        this[this.pos]   = <number>value >>> 24;
        this[this.pos+1] = <number>value >>> 16;
        this[this.pos+2] = <number>value >>> 8;
        this[this.pos+3] = <number>value & 0xFF;
        this.pos += 4;
    }
    dropInt8(value: sint8): void {
        if (+value < 0) value = 0xFF + <number>value + 1;
        this[this.pos++] = (<number>value & 0xFF);
    }
    dropInt16(value: sint16): void {
        if (+value < 0) value = 0xFFFF + <number>value + 1;
        this[this.pos]   = <number>value >>> 8;
        this[this.pos+1] = <number>value & 0xFF;
        this.pos += 2;
    }
    dropInt32(value: sint32): void {
        if (+value < 0) value = 0xFFFFFFFF + <number>value + 1;
        this[this.pos]   = <number>value >>> 24;
        this[this.pos+1] = <number>value >>> 16;
        this[this.pos+2] = <number>value >>> 8;
        this[this.pos+3] = <number>value & 0xFF;
        this.pos += 4;
    }

    drop(values: TypedArray | number[]): void {
        this.set(values, this.pos);
        this.pos += (<TypedArray>values).byteLength ?? values.length;
    }
    zerofill(byteCount: number): void {
        this.fill(0, this.pos, this.pos + byteCount);
        this.pos += byteCount;
    }

    swap16(): DataWrapper {
        const len = this.length;
        if (len % 2 !== 0) throw new RangeError('Buffer size must be a multiple of 16-bits');
        for (let i = 0, x; i < len; i += 2) { x = this[i]!; this[i] = this[i + 1]!; this[i + 1] = x; }
        return this;
    }
    swap32(): DataWrapper {
        const len = this.length;
        if (len % 4 !== 0) throw new RangeError('Buffer size must be a multiple of 32-bits');
        for (let i = 0, x; i < len; i += 4) {
            x = this[i]!; this[i] = this[i + 3]!; this[i + 3] = x;
            x = this[i + 1]!; this[i + 1] = this[i + 2]!; this[i + 2] = x;
        }
        return this;
    }

    // These two overrides are temporary workarounds for a bug in JSC engine
    override subarray(start?: number, end?: number) { return new DataWrapper(new Uint8Array(this).subarray(start, end)); }
    override slice(start?: number, end?: number) { return new DataWrapper(new Uint8Array(this).slice(start, end)); }
}

export class ReadonlyDataWrapper extends DataWrapper {
    /** @internal For internal API interoperability */
    static '@@unlock'(buffer: ReadonlyDataWrapper) {
        return Object.defineProperty(buffer, 'buffer', {
            configurable: true,
            get() { return buffer['@@arraybuffer']; }
        });
    }

    /** @internal For internal API interoperability */
    static '@@lock'(buffer: ReadonlyDataWrapper) {
        return Object.defineProperty(buffer, 'buffer', {
            configurable: true,
            get() { throw new Error('Cannot access writable ArrayBuffer of ReadonlyDataWrapper instance.'); }
        });
    }

    readonly [k: number]: number;
    /** @internal For internal APIs */
    protected get '@@arraybuffer'(): ArrayBuffer { return super.buffer; }
    override get buffer(): never { throw new Error('Cannot access writable ArrayBuffer of ReadonlyDataWrapper instance.'); }
    toReversed(): ReadonlyDataWrapper { return new ReadonlyDataWrapper(new Uint8Array(this).reverse()); }
    override reverse(): Discarded { throw new Error('Illegal call to ReadonlyDataWrapper.reverse'); }
    override set(...$: Discarded): void { return; }
    override slice(start?: number, end?: number) { return new ReadonlyDataWrapper(super.slice(start, end)); }
    override subarray(start?: number, end?: number) { return new ReadonlyDataWrapper(super.subarray(start, end)); }
    override copyWithin(...$: Discarded): Discarded { throw new Error('Illegal call to ReadonlyDataWrapper.copyWithin'); }
    override fill(...$: Discarded): Discarded { throw new Error('Illegal call to ReadonlyDataWrapper.fill'); }
    override sort(): Discarded { throw new Error('Illegal call to ReadonlyDataWrapper.sort'); }
    override dropUint8 (...$: Discarded): void { return; }
    override dropUint16(...$: Discarded): void { return; }
    override dropUint32(...$: Discarded): void { return; }
    override dropInt8  (...$: Discarded): void { return; }
    override dropInt16 (...$: Discarded): void { return; }
    override dropInt32 (...$: Discarded): void { return; }
    override drop      (...$: Discarded): void { return; }
    override zerofill  (...$: Discarded): void { return; }
    override swap16(): ReadonlyDataWrapper { return new ReadonlyDataWrapper(super.swap16.call(new Uint8Array(this))); }
    override swap32(): ReadonlyDataWrapper { return new ReadonlyDataWrapper(super.swap32.call(new Uint8Array(this))); }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Discarded = any;
