import { FileBlob } from 'bun';
import path from 'path';

namespace Util {
    export async function write(dest: FileBlob | PathLike, input: string | Blob | TypedArray | ArrayBufferLike | BlobPart[]): Promise<number> {
        return await Bun.write(dest, input);
    }

    export function allocUnsafe(size: number): Uint8Array {
        return Bun.allocUnsafe(size);
    }

    export function crc32(data: string | ArrayBuffer | ArrayBufferView): number {
        return Number(Bun.hash.crc32(data));
    }

    export function resolve(relativePath: string, from: string = process.cwd()) {
        return path.resolve(from, relativePath);
    }

    export function gunzipSync(data: Uint8Array): Uint8Array {
        return Bun.gunzipSync(data);
    }

    export const ArrayBufferSink = Bun.ArrayBufferSink;

    export const stdout = Bun.stdout;
}

export default Util;
