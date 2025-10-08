import { DataWrapper } from './datawrapper.js';
import { Relocation } from './relocation.js';
import { uint32 } from './primitives.js';
import { SectionType } from './enums.js';
import type { RelocationSection } from './sections.js';

type RelocWithIndex = Relocation & { index: number };

enum DirtyRelocType {
    DELETED = 0,
    MODIFIED = 1,
}
type DirtyRelocRef = { idx: number } & (
    | { type: DirtyRelocType.DELETED }
    | { type: DirtyRelocType.MODIFIED, addr: number }
);

export const RELOC_PARSE_FAILED_SYMBOL = Symbol('@@RelocationStore.parse_failed');

export class RelocationStore {
    /** Array of deleted relocations indexes */
    #deleted: number[] = [];
    /** Map of modified relocations: index -> address */
    #modified = new Map<number, number>();
    /** Set of added relocations addresses */
    #added = new Set<number>();

    #map = new Map<number, Readonly<RelocWithIndex>>();
    readonly #data: DataWrapper;
    /** The current highest free relocation index, used to track new indexes for added relocations */
    #nextFreeIndex: number;
    
    [RELOC_PARSE_FAILED_SYMBOL]?: true;
    
    constructor(parentSection: RelocationSection, data?: DataWrapper | null) {
        this.rela = +parentSection.type === SectionType.Rela;
        this.entSize = this.rela ? 12 : 8;

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
            if (this.rela) relocation.addend = data.passInt32();

            relocation.index = i;
            this.#map.set(+relocation.addr, relocation);
        }
        const failed = this.count !== num;
        if (failed) {
            console.error(
                `[rpxlib] ERROR: While parsing relocations of RelocationSection linked to section #${+parentSection.info}:\n` +
                `         The number of parsed relocations (${this.count}) did not match the expected (${num}) relocations based on the section data size.\n` +
                `         This is likely caused by duplicate relocations pointing to the same address in the same section.\n` +
                `         rpxlib will treat this relocation section as UNPARSED and it will not be modifiable, and resaved as-is.`
            );
            const nullStore = new RelocationStore(parentSection, null);
            Object.defineProperty(nullStore, RELOC_PARSE_FAILED_SYMBOL, { value: true });
            return nullStore;
        }
    }

    public readonly rela: boolean;
    public readonly entSize: 8 | 12;

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
        const { entSize } = this;
        const originalCount = this.#data.byteLength / entSize;

        // Tag and merge deleteds & modifieds into one list sorted by index
        const specials: DirtyRelocRef[] = [
            ...this.#deleted.map(idx => (
                { idx, type: DirtyRelocType.DELETED as const }
            )),
            ...[...this.#modified].map(([idx, addr]) => (
                { idx, type: DirtyRelocType.MODIFIED as const, addr }
            ))
        ].sort((a, b) => a.idx - b.idx);

        // Walk through originals efficiently
        let posIdx = 0;
        for (const special of specials) {
            const { idx, type } = special;
            if (idx >= originalCount) break;
            if (posIdx < idx) {
                // Copy block of unmodified data
                dw.drop(this.#data.subarray(posIdx * entSize, idx * entSize));
            }
            if (type === DirtyRelocType.MODIFIED) {
                // Write modified relocation
                const rel = this.#map.get(special.addr);
                if (!rel) throw new Error('Fatal desync of internal data state detected [#M]. (This is a bug!)');
                dw.dropUint32(rel.addr);
                dw.dropUint32(rel.info);
                if (this.rela) dw.dropInt32(rel.addend!);
            }
            // If type was MODIFIED, we are advancing over the bytes we just wrote the modified reloc to above
            // If type === DELETED, simply skip without doing anything
            posIdx = idx + 1;
        }
        // Write any remaining unmodified data
        if (posIdx < originalCount) {
            dw.drop(this.#data.subarray(posIdx * entSize, originalCount * entSize));
        }
        // Append added relocations efficiently by direct map access
        for (const addr of this.#added) {
            const rel = this.#map.get(addr);
            if (!rel) throw new Error('Fatal desync of internal data state detected [#A]. (This is a bug!)'); // should never happen
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
        const addr = +rel.addr;
        const oldRel = this.#map.get(addr);
        if (!oldRel) throw new Error(`[RelocationStore] set(): No existing relocation at 0x${addr.toString(16)} to set. Did you mean to use add()?`);
        if (oldRel === rel) throw new Error(`[RelocationStore] set(): Attempt to set relocation to itself, this is a sign of incorrect usage. You must create a new Relocation object to set over the old one.`);
        if (this.rela && rel.addend === undefined) throw new Error(`[RelocationStore] set(): Attempt to set non-RELA relocation to RELA store.`);
        if (!this.rela && rel.addend !== undefined) throw new Error(`[RelocationStore] set(): Attempt to set RELA relocation to non-RELA store.`);
        
        const newRelWithIndex = rel as RelocWithIndex;
        newRelWithIndex.index = oldRel.index;
        this.#map.set(addr, newRelWithIndex);

        // No need to update added list, as address remains the same
        // Added relocs dont need to be tracked for modification, but originals do
        const isAddedReloc = this.#added.has(addr);
        if (!isAddedReloc) this.#modified.set(oldRel.index, addr); // mark reloc as modified for proper saving
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
