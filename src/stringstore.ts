import { int } from './primitives.js';

/** @internal */
type WritableStringStore = StringStore & { [offset: number]: string };

export class StringStore {
    readonly #dataOffset: number = 0;
    constructor(data?: Uint8Array, dataOffset: number = 0) {
        if (!data) return this;
        this.#dataOffset = dataOffset;
        const strings = this as WritableStringStore;
        const decoder = new TextDecoder();
        for (let i = 0, offset = 0; i < data.byteLength; i++) {
            if (data[i] !== 0) continue;
            const strLen = i - offset;
            if (strLen > 0) strings[dataOffset + offset] = decoder.decode(data.subarray(offset, offset + strLen));
            else strings[dataOffset + offset] = '';
            offset = i + 1;
        }
    }
    /** The total size in bytes to write all the StringStore's strings to a buffer. */
    get size() {
        let sz = 0;
        for (const key in this) {
            if (isNaN(<number><unknown>key)) continue;
            sz += (this[key] ?? '').length + 1;
        }
        return sz;
    }
    /** All of the StringStore's strings as a buffer. */
    get buffer(): Uint8Array {
        const buffer = Buffer.allocUnsafe(this.size);
        const encoder = new TextEncoder();
        for (const key in this) {
            const keyn = +key;
            if (keyn !== keyn) continue;
            const thiskey = this[keyn] ?? '';
            const encoded = Buffer.allocUnsafe(thiskey.length + 1);
            encoder.encodeInto(thiskey + '\0', encoded);
            buffer.set(encoded, keyn - this.#dataOffset);
        }
        return buffer;
    }
    get(offset: number | int): string {
        offset = +offset;
        let str = this[(<number>offset)];
        if (!str) {
            for (const key in this) {
                const keyn = +key;
                if (keyn < offset) {
                    const keynStr = this[keyn] ?? '';
                    if (keyn + keynStr.length > offset) {
                        str = keynStr.slice(<number>offset - keyn); break;
                    }
                }
            }
        }
        return (str ?? '<error>') || '<empty>';
    }
    set(offset: number | int, str: string): void {
        const strings = this as WritableStringStore;
        offset = +offset;
        const original = strings[(<number>offset)];
        if (!original) throw new Error(`Offset 0x${offset.toString(16).toUpperCase()} points to the middle of a string or out of bounds.`);
        if (str.length > original.length) throw new Error(`Cannot write new string of length ${str.length} over original string of length ${original.length}`);
        strings[(<number>offset)] = str.padEnd(original.length, '\0');
    }
    add(str: string): number {
        const strings = this as WritableStringStore;
        const lastOffset = Object.keys(strings).map(x => +x).filter(x => x === x).sort((a, b) => b - a)[0];
        const nextOffset = lastOffset === undefined ? 0 : lastOffset + strings[lastOffset]!.length + 1;
        strings[nextOffset] = str;
        return nextOffset;
    }
    readonly [offset: number]: string;
}
