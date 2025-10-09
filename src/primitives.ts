export const CodeBaseAddress = 0x02000000 as const; // executable memory region
export const DataBaseAddress = 0x10000000 as const; // data memory region
export const LoadBaseAddress = 0xC0000000 as const; // loader memory region

export type TypedArray<T extends ArrayBufferLike = ArrayBufferLike> = Uint8Array<T> | Uint16Array<T> | Uint32Array<T> | Int8Array<T> | Int16Array<T> | Int32Array<T> | Float32Array<T> | Float64Array<T>;

export type nybble = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export class uint8 extends Number {
    constructor(value: number | int = 0) {
        const x = +value;
        if ((x & 0xFF) !== x) throw new RangeError(`u8 out of range: ${x}`);
        super(x);
    }
}

export class uint16 extends Number {
    constructor(value: number | int = 0) {
        const x = +value;
        if ((x & 0xFFFF) !== x) throw new RangeError(`u16 out of range: ${x}`);
        super(x);
    }
}

export class uint32 extends Number {
    constructor(value: number | int = 0) {
        const x = +value;
        if (x >>> 0 !== x) throw new RangeError(`u32 out of range: ${x}`);
        super(x);
    }
}

export class sint8 extends Number {
    constructor(value: number | int = 0) {
        const x = +value;
        if ((x << 24 >> 24) !== x) throw new RangeError(`s8 out of range: ${x}`);
        super(x);
    }
}

export class sint16 extends Number {
    constructor(value: number | string | int = 0) {
        const x = +value;
        if ((x << 16 >> 16) !== x) throw new RangeError(`s16 out of range: ${x}`);
        super(x);
    }
}

export class sint32 extends Number {
    constructor(value: number | int = 0) {
        const x = +value;
        if ((x | 0) !== x) throw new RangeError(`s32 out of range: ${x}`);
        super(x);
    }
}

export type int = uint8 | uint16 | uint32 | sint8 | sint16 | sint32;
