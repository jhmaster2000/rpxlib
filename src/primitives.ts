export type nybble = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export class uint8 extends Number {
    constructor(x: number | string = 0) {
        x = <number>x >>> 0;
        if (x < 0) throw new RangeError(`u8 underflow: ${x}`);
        if (x > 255) throw new RangeError(`u8 overflow: ${x}`);
        super(x);
    }
}

export class uint16 extends Number {
    constructor(x: number | string = 0) {
        x = <number>x >>> 0;
        if (x < 0) throw new RangeError(`u16 underflow: ${x}`);
        if (x > 65535) throw new RangeError(`u16 overflow: ${x}`);
        super(x);
    }
}

export class uint32 extends Number {
    constructor(x: number | string = 0) {
        x = <number>x >>> 0;
        if (x < 0) throw new RangeError(`u32 underflow: ${x}`);
        if (x > 4294967295) throw new RangeError(`u32 overflow: ${x}`);
        super(x);
    }
}

export class sint8 extends Number {
    constructor(x: number | string = 0) {
        x = <number>x >> 0;
        if (x < -128) throw new RangeError(`s8 underflow: ${x}`);
        if (x > 127) throw new RangeError(`s8 overflow: ${x}`);
        super(x);
    }
}

export class sint16 extends Number {
    constructor(x: number | string = 0) {
        x = <number>x >> 0;
        if (x < -32768) throw new RangeError(`s16 underflow: ${x}`);
        if (x > 32767) throw new RangeError(`s16 overflow: ${x}`);
        super(x);
    }
}

export class sint32 extends Number {
    constructor(x: number | string = 0) {
        x = <number>x >> 0;
        if (x < -2147483648) throw new RangeError(`s32 underflow: ${x}`);
        if (x > 2147483647) throw new RangeError(`s32 overflow: ${x}`);
        super(x);
    }
}

//type uint8 = number;
//type uint16 = number;
//type uint32 = number;
//type sint8 = number;
//type sint16 = number;
//type sint32 = number;
export type int = uint8 | uint16 | uint32 | sint8 | sint16 | sint32;

export type ZlibCompressionLevel = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
