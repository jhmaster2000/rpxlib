import { int } from './primitives';

type WritableStringStore = StringStore & { [offset: number]: string };

export class StringStore {
    readonly #dataOffset: number = 0;
    constructor(data?: Buffer, dataOffset: number = 0) {
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
            sz += this[key].length + 1;
        }
        return sz;
    }
    /** All of the StringStore's strings as a buffer. */
    get buffer(): Buffer {
        const buffer = Buffer.allocUnsafe(this.size);
        const encoder = new TextEncoder('utf-8');
        for (const key in this) {
            const keyn = Number(key);
            if (keyn !== keyn) continue;
            const encoded = new Uint8Array(this[key].length + 1);
            encoder.encodeInto(this[key], encoded);
            buffer.set(encoded, keyn - this.#dataOffset);
        }
        return buffer;
    }
    get(offset: number | int): string {
        offset = +offset;
        let str = this[(<number>offset)];
        if (!str) {
            for (const key in this) {
                const keyn = Number(key);
                if (keyn < offset) {
                    const keynStr = this[keyn];
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
        if (!strings[(<number>offset)]) throw new Error(`Offset 0x${offset.toString(16).toUpperCase()} points to the middle of a string or out of bounds.`);
        const original = strings[(<number>offset)];
        if (str.length > original.length) throw new Error(`Cannot write new string of length ${str.length} over original string of length ${original.length}`);
        strings[(<number>offset)] = str.padEnd(original.length, '\0');
    }
    add(str: string): number {
        const strings = this as WritableStringStore;
        const lastOffset = Object.keys(strings).map(Number).filter(x => x === x).sort((a, b) => b - a)[0];
        const nextOffset = lastOffset + strings[lastOffset].length + 1;
        strings[nextOffset] = str;
        return nextOffset;
    }
    readonly [offset: number]: string;
}
