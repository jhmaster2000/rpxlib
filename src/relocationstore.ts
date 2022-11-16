import { DataWrapper } from './datawrapper.js';
import { Relocation } from './relocation.js';
import { uint32 } from './primitives.js';

type RelocWithIndex = Relocation & { readonly index: number };

export class RelocationStore {
    /** Array of deleted relocations indexes */
    #deleted: number[] = [];
    #map: Map<number, RelocWithIndex> = new Map();
    readonly #data: DataWrapper;

    constructor(data?: DataWrapper | null, public readonly rela: boolean = true) {
        if (!data) {
            this.#data = new DataWrapper(new Uint8Array(0));
            return this;
        }
        this.#data = data;
        const num = data.byteLength / this.entSize;

        for (let i = 0; i < num; i++) {
            const relocation = new Relocation() as RelocWithIndex & { index: number };
            relocation.addr = data.passUint32();
            relocation.info = data.passUint32();
            if (rela) relocation.addend = data.passInt32();

            relocation.index = i;
            this.#map.set(+relocation.addr, relocation);
        }
    }

    public readonly entSize = this.rela ? 12 : 8;

    /** The number of relocations in this RelocationStore */
    get count() {
        return this.#map.size;
    }
    /** The total size in bytes to write all the RelocationStore's relocations to a buffer. */
    get size() {
        return this.count * this.entSize;
    }

    /** All of the RelocationStore's relocations as a buffer. */
    get buffer(): Uint8Array {
        let pos = 0;
        const dw = new DataWrapper(Buffer.allocUnsafe(this.size));
        const sorted = this.#deleted.sort((a, b) => a - b);
        for (let i = 0; i < sorted.length; i++) {
            const deleted = sorted[i]! * this.entSize;
            if (pos === deleted) {
                // skip sequential deletions
                pos += this.entSize;
                continue;
            }
            dw.drop(this.#data.subarray(pos, deleted));
            pos = deleted + this.entSize;
        }
        dw.drop(this.#data.subarray(pos));
        return dw;
    }

    forEach(callback: (relocation: RelocWithIndex, addr: number) => void): void {
        this.#map.forEach((r, addr) => callback(r, addr));
    }
    [Symbol.iterator]() {
        return this.#map.values();
    }

    has({ addr }: Relocation): boolean {
        return this.hasAt(addr);
    }
    hasAt(addr: number | uint32): boolean {
        return this.#map.has(+addr);
    }

    get(addr: number | uint32): Relocation | undefined {
        return this.#map.get(+addr);
    }

    //set() // TODO
    //add() // TODO

    delete({ addr }: Relocation): void {
        return this.deleteAt(addr);
    }
    deleteAt(addr: number | uint32): void {
        addr = +addr;
        const rel = this.#map.get(<number>addr);
        if (!rel) throw new Error(`Relocation at 0x${addr.toString(16).toUpperCase().padStart(8, '0')} does not exist.`);

        this.#deleted.push(rel.index);
        this.#map.delete(<number>addr);
    }
}
