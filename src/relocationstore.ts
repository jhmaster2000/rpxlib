import { DataWrapper } from './datawrapper.js';
import { Relocation } from './relocation.js';
import { uint32 } from './primitives.js';

type RelocWithIndex = Relocation & { index: number };

export class RelocationStore {
    /** Array of deleted relocations indexes */
    #deleted: number[] = [];
    /** Set of modified relocations indexes */
    #modified = new Set<number>;
    /** Set of added relocations addresses */
    #added = new Set<number>();

    #map = new Map<number, Readonly<RelocWithIndex>>();
    readonly #data: DataWrapper;
    /** The current highest free relocation index, used to track new indexes for added relocations */
    #nextFreeIndex: number;

    constructor(data?: DataWrapper | null, public readonly rela: boolean = true) {
        if (!data) {
            this.#data = new DataWrapper(new Uint8Array(0));
            this.#nextFreeIndex = 0;
            return this;
        }
        this.#data = data;
        const num = data.byteLength / this.entSize;
        this.#nextFreeIndex = num;

        for (let i = 0; i < num; i++) {
            const relocation = new Relocation() as RelocWithIndex;
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
        const dw = new DataWrapper(Buffer.allocUnsafe(this.size));
        const entSize = this.entSize;
        const originalCount = this.#data.byteLength / entSize;
        // Prepare sorted lists
        const deleted = Array.from(this.#deleted).sort((a, b) => a - b);
        const modified = Array.from(this.#modified).sort((a, b) => a - b);
        // Merge deleted and modified into a single sorted list with tags
        let specials: { idx: number, type: 'deleted' | 'modified' }[] = [];
        let d = 0, m = 0;
        while (d < deleted.length || m < modified.length) {
            if (d < deleted.length && (m >= modified.length || deleted[d]! < modified[m]!)) {
                specials.push({ idx: deleted[d++]!, type: 'deleted' });
            } else if (m < modified.length && (d >= deleted.length || modified[m]! < deleted[d]!)) {
                specials.push({ idx: modified[m++]!, type: 'modified' });
            } else if (d < deleted.length && m < modified.length && deleted[d] === modified[m]) {
                // If both, treat as deleted (deletion takes precedence)
                specials.push({ idx: deleted[d]!, type: 'deleted' });
                d++; m++;
            }
        }
        // Walk through originals efficiently
        let pos = 0;
        for (const { idx, type } of specials) {
            if (idx >= originalCount) break;
            if (pos < idx) {
                // Copy block of unmodified data
                dw.drop(this.#data.subarray(pos * entSize, idx * entSize));
            }
            if (type === 'modified') {
                // Write modified relocation from map
                const rel = Array.from(this.#map.values()).find(r => r.index === idx);
                if (!rel) throw new Error('Fatal desync of internal data state detected. (This is a bug!)');
                dw.dropUint32(rel.addr);
                dw.dropUint32(rel.info);
                if (this.rela) dw.dropInt32(rel.addend!);
            }
            // If deleted, skip writing
            pos = idx + 1;
        }
        // Write any remaining unmodified data
        if (pos < originalCount) {
            dw.drop(this.#data.subarray(pos * entSize, originalCount * entSize));
        }
        // Append added relocations efficiently by direct map access
        if (this.#added.size !== 0) for (const addr of this.#added) {
            const rel = this.#map.get(addr);
            if (!rel) throw new Error('Fatal desync of internal data state detected. (This is a bug!)'); // should never happen
            dw.dropUint32(rel.addr);
            dw.dropUint32(rel.info);
            if (this.rela) dw.dropInt32(rel.addend!);
        }
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
    
    /** @experimental */
    add(rel: Relocation) {
        if (this.hasAt(rel.addr)) throw new Error(`[RelocationStore] add(): Relocation at 0x${rel.addr.toString(16)} already exists. Did you mean to use set()?`);
        if (this.rela && rel.addend === undefined) throw new Error(`[RelocationStore] add(): Attempt to add non-RELA relocation to RELA store.`);
        if (!this.rela && rel.addend !== undefined) throw new Error(`[RelocationStore] add(): Attempt to add RELA relocation to non-RELA store.`);
        
        const withIndex = rel as RelocWithIndex;
        withIndex.index = this.#nextFreeIndex;
        this.#nextFreeIndex++;

        const addr = +rel.addr;
        this.#map.set(addr, withIndex);
        this.#added.add(addr);
    }
    
    /** @experimental */
    set(rel: Relocation) {
        const oldRel = this.#map.get(+rel.addr);
        if (!oldRel) throw new Error(`[RelocationStore] set(): No existing relocation at 0x${rel.addr.toString(16)} to set. Did you mean to use add()?`);
        if (oldRel === rel) throw new Error(`[RelocationStore] set(): Attempt to set relocation to itself, this is a sign of incorrect usage. You must create a new Relocation object to set over the old one.`);
        if (this.rela && rel.addend === undefined) throw new Error(`[RelocationStore] set(): Attempt to set non-RELA relocation to RELA store.`);
        if (!this.rela && rel.addend !== undefined) throw new Error(`[RelocationStore] set(): Attempt to set RELA relocation to non-RELA store.`);
        
        const newRelWithIndex = rel as RelocWithIndex;
        newRelWithIndex.index = oldRel.index;
        this.#map.set(+rel.addr, newRelWithIndex);

        // No need to update added list, as address remains the same
        // Added relocs dont need to be tracked for modification, but originals do
        const isAddedReloc = this.#added.has(+rel.addr);
        if (!isAddedReloc) this.#modified.add(oldRel.index); // mark reloc as modified for proper saving
    }

    /**
     * @note Deletions are permanent and irreversible, however, they are tracked by indexes.
     * This means while you cannot restore a deleted relocation at its original index in the file,
     * you can still {@link add} a *new* relocation at the same address as a deleted one, only it will
     * be placed at the end of the original relocations array.
     * 
     * The `delete` + `add` method is also required to change the address of a relocation, as
     * {@link set} provides no mechanism to modify the address of existing relocations.
     */
    delete({ addr }: Relocation): void {
        return this.deleteAt(addr);
    }
    /** @see {@link delete} for notes. */
    deleteAt(addr: number | uint32): void {
        addr = +addr;
        const rel = this.#map.get(<number>addr);
        if (!rel) throw new Error(`Relocation at 0x${addr.toString(16).toUpperCase().padStart(8, '0')} does not exist.`);

        this.#map.delete(<number>addr);

        const wasAddedRel = this.#added.delete(<number>addr);
        // Only original (non-added) relocations need to be tracked for deletion/modification.
        if (!wasAddedRel) {
            // this just gracefully no-op's if its not a modified reloc.
            this.#modified.delete(rel.index); 
            // this is duplicate-proof by it being impossible for a reloc with a deleted reloc's index to be added back to the map after the original is deleted
            this.#deleted.push(rel.index);
        }
    }
}
