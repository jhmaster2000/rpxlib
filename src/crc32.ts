import * as ffi from 'bun:ffi';
import { FFIType } from 'bun:ffi';

const cflibzPath = `${import.meta.dir}/../lib/cflibz.${ffi.suffix}` as const;
const {
    symbols: cflibz,
    //close: _libzClose
} = ffi.dlopen(cflibzPath, {
    crc32: {
        args: [FFIType.u32, FFIType.pointer, FFIType.u32],
        returns: FFIType.u32
    }
});

/**
 * Fast CRC32 hash calculation powered by `cloudflare/zlib`
 * @brief Supports data of up to 4.3GB in size at once. For performance, this is not verified.
 * Data over the maximum size will simply be clamped to the first 4.3GB of bytes.
 */
export function crc32(buffer: ArrayBuffer): number {
    return cflibz.crc32(null, ffi.ptr(buffer), buffer.byteLength) >>> 0;
}

export default crc32;
