/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as ffi from 'bun:ffi';
import { FFIType } from 'bun:ffi';

namespace zlibng {
    /**
     * Purely cosmetic FFIType.pointer wrapper which allows a type annotation for the pointer type.
     *
     * **Example:** An `int*` type in C can be represented as `FFITypePointer<FFIType.int>()`
     */
    const FFITypePointer = <_>() => /* FFIType.pointer */ 12 as const;

    /**
     * Maps zconf.h / Zlib docs types to appropriate FFI types.
     * Note that the original Zlib was written in the era of 16 bit computers,
     * where int's were 16 bits, hence the mappings of int to i16 and long to i32.
     */
    const ZlibFFIType = {
        Byte:    FFIType.u8,
        Bytef:   FFIType.u8,
        uInt:    FFIType.u16,
        uIntf:   FFIType.u16,
        uLong:   FFIType.u32,
        uLongf:  FFIType.u32,
        char:    FFIType.char,
        charf:   FFIType.char,
        int:     FFIType.i16,
        intf:    FFIType.i16,
        long:    FFIType.i32,
        voidp:   FFIType.pointer,
        voidpc:  FFIType.pointer,
        voidpf:  FFIType.pointer,
        Z_U4:    FFIType.uint32_t,
        z_crc_t: FFIType.uint32_t,
        z_off_t: FFIType.int32_t,
        cstring: FFIType.cstring
    };

    // These types are for use with FFITypePointer
    type Byte = typeof ZlibFFIType.Byte; type Bytef = Byte;
    //type uInt = typeof ZlibFFIType.uInt; //type uIntf = uInt;
    type uLong = typeof ZlibFFIType.uLong; type uLongf = uLong;
    //type char = typeof ZlibFFIType.char; //type charf = char;
    //type int = typeof ZlibFFIType.int; //type intf = int;
    //type long = typeof ZlibFFIType.long;
    //type voidp = typeof ZlibFFIType.voidp; //type voidpc = voidp; type voidpf = voidp;
    //type Z_U4 = typeof ZlibFFIType.Z_U4; //type z_crc_t = Z_U4;
    //type z_off_t = typeof ZlibFFIType.z_off_t;
    //type cstring = typeof ZlibFFIType.cstring;

    export type CompressionLevel = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

    const {
        symbols: libzng,
        //close: _libzngClose
    } = ffi.dlopen(`/home/jhmaster/zlib-ng/libz.${ffi.suffix}.1`, {
        zlibVersion: {
            args: [],
            returns: ZlibFFIType.cstring
        },
        zlibCompileFlags: {
            args: [],
            returns: ZlibFFIType.uLong
        },
        compressBound: {
            args: [ZlibFFIType.uLong],
            returns: ZlibFFIType.uLong
        },
        compress2: {
            args: [FFITypePointer<Bytef>(), FFITypePointer<uLongf>(), FFITypePointer<Bytef>(), ZlibFFIType.uLong, ZlibFFIType.int],
            returns: ZlibFFIType.int
        }
    });

    export function deflateSync(data: Uint8Array, { level = constants.Z_DEFAULT_COMPRESSION }: { level?: CompressionLevel } = {}): Uint8Array {
        return Bun.deflateSync(data, { level, windowBits: -15 });
        //const destLen = compressBound(data.byteLength);
        //const dest = new Uint8Array(destLen);
        //return new Uint8Array(compress(dest, destLen, data, data.byteLength, level));
    }

    export function compress(dest: Uint8Array, destLen: number, source: Uint8Array, sourceLen: number, level: number = constants.Z_DEFAULT_COMPRESSION): ArrayBuffer {
        const destPtr = ffi.ptr(dest.buffer.slice(0));
        const destLenPtr = ffi.ptr(new Uint32Array([destLen]));
        const sourcePtr = ffi.ptr(source.buffer.slice(0));
        const Z_RETURN = libzng.compress2(destPtr, destLenPtr, sourcePtr, sourceLen, level) as number;
        if (Z_RETURN !== constants.Z_OK) {
            throw new Error(`zlib error: ${Z_RETURN}`);
        }
        const Z_COMPRESSED_DATA_SIZE = new DataView(ffi.toArrayBuffer(destLenPtr, 0, 4)).getUint32(0, true);
        return ffi.toArrayBuffer(destPtr, 0, Z_COMPRESSED_DATA_SIZE);
    }

    export function compressBound(sourceLen: number): number {
        return libzng.compressBound(sourceLen);
    }

    export function version(): string {
        return libzng.zlibVersion();
    }

    export function compileFlags(): CompileFlags {
        const flags = <number>libzng.zlibCompileFlags();
        return {
            valueOf() {
                return flags;
            },
            toString() {
                return this.valueOf().toString(2).padStart(32, '0');
            },
            typeSizes: {
                uint:    TypeSize[(flags      & 0b11) as keyof typeof TypeSize],
                ulong:   TypeSize[(flags >> 2 & 0b11) as keyof typeof TypeSize],
                pointer: TypeSize[(flags >> 4 & 0b11) as keyof typeof TypeSize],
                z_off_t: TypeSize[(flags >> 6 & 0b11) as keyof typeof TypeSize]
            },
            ZLIB_DEBUG: !!(flags >> 8 & 0b1),
            ASMV: !!(flags >> 9 & 0b1),
            get ASMINF() { return this.ASMV; },
            ZLIB_WINAPI: !!(flags >> 10 & 0b1),
            BUILDFIXED: !!(flags >> 12 & 0b1),
            DYNAMIC_CRC_TABLE: !!(flags >> 13 & 0b1),
            NO_GZCOMPRESS: !!(flags >> 16 & 0b1),
            NO_GZIP: !!(flags >> 17 & 0b1),
            PKZIP_BUG_WORKAROUND: !!(flags >> 20 & 0b1),
            FASTEST: !!(flags >> 21 & 0b1),
            gzprintf: {
                limitedArguments: !!(flags >> 24 & 0b1),
                notSecure: !!(flags >> 25 & 0b1),
                returnsInferredStringLength: !!(flags >> 26 & 0b1),
                get functionUsed() {
                    return `${this.limitedArguments ? 's' : 'vs'}${this.notSecure ? 'printf' : 'nprintf'}` as const;
                }
            }
        };
    }

    const /* enum */ TypeSize = {
        0b00: 16 as TypeSize,
        0b01: 32 as TypeSize,
        0b10: 64 as TypeSize,
        0b11: -1 as TypeSize // other
    };
    type TypeSize = 16 | 32 | 64 | -1;

    export interface CompileFlags {
        /** Returns the raw numeric value of the compile flags bitfield */
        valueOf(): number,
        /** Returns a 32 bit binary representation of the compile flags bitfield */
        toString(): string,
        readonly typeSizes: {
            readonly uint: TypeSize, // 0-1
            readonly ulong: TypeSize, // 2-3
            readonly pointer: TypeSize, // 4-5
            readonly z_off_t: TypeSize  // 6-7
        },
        readonly ZLIB_DEBUG: boolean, // 8
        readonly ASMV: boolean, // 9
        /** Alias of {@link CompileFlags.ASMV} */
        readonly ASMINF: boolean, // 9
        readonly ZLIB_WINAPI: boolean, // 10
        // 11 (RESERVED 0)
        readonly BUILDFIXED: boolean, // 12
        readonly DYNAMIC_CRC_TABLE: boolean, // 13
        // 14-15 (RESERVED 0)
        readonly NO_GZCOMPRESS: boolean, // 16
        readonly NO_GZIP: boolean, // 17
        // 18-19 (RESERVED 0)
        readonly PKZIP_BUG_WORKAROUND: boolean, // 20
        readonly FASTEST: boolean, // 21
        // 22-23 (RESERVED 0)
        readonly gzprintf: {
            readonly limitedArguments: boolean, // 24
            readonly notSecure: boolean, // 25
            readonly returnsInferredStringLength: boolean, // 26
            readonly functionUsed: `${'vs' | 's'}${'nprintf' | 'printf'}` // Generated from 24 and 25
        }
        // 27-31 (RESERVED 0)
    }

    type VersionDigit = 0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15;
    const zlib_version = <string>libzng.zlibVersion();
    const zlib_version_major  = (Number(zlib_version.split('.')[0]) || 0) as VersionDigit;
    const zlib_version_minor  = (Number(zlib_version.split('.')[1]) || 0) as VersionDigit;
    const zlib_version_rev    = (Number(zlib_version.split('.')[2]) || 0) as VersionDigit;
    const zlib_version_subrev = (Number(zlib_version.split('.')[3]) || 0) as VersionDigit;
    const _constants = {
        ZLIB_VERSION: zlib_version,
        ZLIB_VERNUM: zlib_version_major << 12 | zlib_version_minor << 8 | zlib_version_rev << 4 | zlib_version_subrev,
        ZLIB_VER_MAJOR: zlib_version_major,
        ZLIB_VER_MINOR: zlib_version_minor,
        ZLIB_VER_REVISION: zlib_version_rev,
        ZLIB_VER_SUBREVISION: zlib_version_subrev,
        Z_NO_FLUSH: 0,
        Z_PARTIAL_FLUSH: 1,
        Z_SYNC_FLUSH: 2,
        Z_FULL_FLUSH: 3,
        Z_FINISH: 4,
        Z_BLOCK: 5,
        Z_TREES: 6,
        Z_OK: 0,
        Z_STREAM_END: 1,
        Z_NEED_DICT: 2,
        Z_ERRNO: -1,
        Z_STREAM_ERROR: -2,
        Z_DATA_ERROR: -3,
        Z_MEM_ERROR: -4,
        Z_BUF_ERROR: -5,
        Z_VERSION_ERROR: -6,
        Z_NO_COMPRESSION: 0,
        Z_BEST_SPEED: 1,
        Z_BEST_COMPRESSION: 9,
        Z_DEFAULT_COMPRESSION: -1,
        Z_FILTERED: 1,
        Z_HUFFMAN_ONLY: 2,
        Z_RLE: 3,
        Z_FIXED: 4,
        Z_DEFAULT_STRATEGY: 0,
        Z_BINARY: 0,
        Z_TEXT: 1,
        Z_ASCII: 1,
        Z_UNKNOWN: 2,
        Z_DEFLATED: 8,
        Z_NULL: 0,
        //
        Z_DEFAULT_COMPRESSION_LEVEL: 6,
        //
        DEFLATE: 1,
        INFLATE: 2,
        GZIP: 3,
        GUNZIP: 4,
        DEFLATERAW: 5,
        INFLATERAW: 6,
        UNZIP: 7,
        Z_MIN_WINDOWBITS: 8,
        Z_MAX_WINDOWBITS: 15,
        Z_DEFAULT_WINDOWBITS: 15,
        Z_MIN_CHUNK: 64,
        Z_MAX_CHUNK: Infinity,
        Z_DEFAULT_CHUNK: 16384,
        Z_MIN_MEMLEVEL: 1,
        Z_MAX_MEMLEVEL: 9,
        Z_DEFAULT_MEMLEVEL: 8,
        Z_MIN_LEVEL: -1,
        Z_MAX_LEVEL: 9,
        Z_DEFAULT_LEVEL: -1
    } as const;
    export const constants = <typeof _constants>Object.assign(Object.create(null), _constants);
}

export default zlibng;
