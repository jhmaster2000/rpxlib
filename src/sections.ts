import crc32 from './crc32';
import { DataWrapper, ReadonlyDataWrapper } from './datawrapper';
import { SectionFlags, SectionType } from './enums';
import { int, uint32 } from './primitives';
import { Relocation } from './relocation';
import { RPL } from './rpl';
import { Structs } from './structs';
import { ELFSymbol } from './symbol';

function inflateSync(buf: Uint8Array): Uint8Array {
    //@ts-expect-error
    return Bun.gunzipSync(buf);
}
function deflateSync(buf: Uint8Array, opts?: { windowBits?: number, level?: number, memLevel?: number, strategy?: number }): Uint8Array {
    //@ts-expect-error
    return Bun.gzipSync(buf, opts);
}

function isSectionWithData(sectiondata: Structs.ISection): sectiondata is Structs.ISectionWithData {
    return +sectiondata.type !== SectionType.NoBits && +sectiondata.type !== SectionType.Null;
}

export class Section extends Structs.Section {
    constructor(inputdata: DataWrapper | Structs.ISection, rpx: RPL) {
        super();
        this.rpx = rpx;
        if (!(inputdata instanceof DataWrapper)) {
            this.nameOffset = inputdata.nameOffset;
            this.type = new uint32(inputdata.type) as SectionType;
            this.flags = inputdata.flags;
            this.addr = inputdata.addr;
            this.link = inputdata.link;
            this.info = inputdata.info;
            this.addrAlign = inputdata.addrAlign;
            this.entSize = inputdata.entSize;
            this.storedOffset = new uint32(0);
            this.storedSize = new uint32(0);
            if (isSectionWithData(inputdata)) {
                this.storedOffset = new uint32(1);
                this.#data = inputdata.data;
            }
            return this;
        }
        const file = inputdata;
        this.nameOffset = file.passUint32();
        this.type = file.passUint32() as SectionType;
        this.flags = file.passUint32();
        this.addr = file.passUint32();
        this.storedOffset = file.passUint32();
        this.storedSize = file.passUint32();
        this.link = file.passUint32();
        this.info = file.passUint32();
        this.addrAlign = file.passUint32();
        this.entSize = file.passUint32();
        if (this.type !== SectionType.NoBits && this.type !== SectionType.Null && +this.storedOffset !== 0) {
            this.#data = file.subarray(<number>this.storedOffset, <number>this.storedOffset + <number>this.storedSize);
            this.#tryDecompress();
        }
    }

    override readonly type;
    override readonly storedOffset;
    override readonly storedSize;

    init(...args: unknown[]): unknown { return; } //! virtual

    #tryDecompress(): boolean {
        if (!this.#data || !(<number>this.flags & SectionFlags.Compressed)) return false;
        if (+this.type === SectionType.RPLCrcs || +this.type === SectionType.RPLFileInfo) return false;
        const decompressed = inflateSync(this.#data.subarray(4));
        (<number>this.flags) &= ~SectionFlags.Compressed;
        this.#data = Buffer.from(decompressed.subarray(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength));
        return true;
    }
    /* //! <temp> prevent TS no unused method */ compress() { this.#tryCompress(); }
    #tryCompress(compressionLevel?: -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9): Buffer | false {
        if (!this.hasData || +this.type === SectionType.RPLCrcs || +this.type === SectionType.RPLFileInfo) return false;

        const compressed = Buffer.concat([Buffer.alloc(4), deflateSync(this.data!, { level: compressionLevel })]);
        compressed.writeUint32BE(+this.size, 0);
        if (compressed.byteLength > this.size) return false;

        (<number>this.flags) |= SectionFlags.Compressed;
        this.#data = null;
        return compressed.subarray(compressed.byteOffset, compressed.byteOffset + compressed.byteLength);
    }

    get index(): number {
        return this.rpx.sections.indexOf(this);
    }

    get name(): string {
        const thisIndex = this.index;
        if (+this.rpx.shstrIndex === 0) return `SECTION${thisIndex}`;

        const shstrtab = this.rpx.sections[+this.rpx.shstrIndex];
        if (!(shstrtab instanceof StringSection)) throw new Error('Invalid ELF file. Section header string table index is not a string table.');

        if (+this.nameOffset === 0) return +this.type ? `SECTION${thisIndex}` : '<null>';
        else return shstrtab.getString(this.nameOffset);
    }

    get offset(): uint32 {
        if (!this.hasData) return new uint32(0);
        const sections = this.rpx.sections.filter(section => section.hasData);
        const idx = sections.indexOf(this);
        if (idx === 0) {
            const off = <number>this.rpx.sectionHeadersOffset + <number>this.rpx.sectionHeadersEntrySize * this.rpx.sections.length;
            return new uint32(off + off % 2);
        }
        const prevSect = sections[idx - 1]!;
        const off = <number>prevSect.offset + <number>prevSect.size;
        return new uint32(off + off % 2);
    }

    get size(): uint32 {
        return new uint32(this.data?.byteLength ?? 0);
    }

    get linkedSection(): Section | null {
        return +this.link ? this.rpx.sections[+this.link] ?? null : null;
    }

    get crc32Hash(): uint32 {
        if (!this.hasData) return new uint32(0x00000000);
        return new uint32(crc32(this.data!));
    }
    
    get data(): Buffer | null {
        return this.#data;
    }

    set data(value: Buffer | null) {
        if (+this.type === SectionType.NoBits || +this.type === SectionType.Null) throw new TypeError('Cannot set data of NoBits or Null section.');
        if (+this.storedOffset === 0) throw new TypeError('Cannot set data of section with offset set to 0.');
        if (value === null) throw new TypeError('Cannot manually set data of section to null.');
        this.#data = value;
    }

    get hasData(): boolean {
        return this.#data !== null;
    }

    /** @internal The RPL/RPX file this Section belongs to. */
    protected readonly rpx: RPL;
    #data: Buffer | null = null;
}

export class StringSection extends Section {
    constructor(file: DataWrapper, rpx: RPL) {
        super(file, rpx);
        if (!this.hasData) throw new Error('String section cannot be empty.');
        this.init();
    }
    override init() {
        const decoder = new TextDecoder();

        for (let i = 0, offset = 0; i < this.size; i++) {
            if (super.data![i] !== 0) continue;
            const strLen = i - offset;
            if (strLen > 0) this.strings[offset] = decoder.decode(super.data!.subarray(offset, offset + strLen));
            offset = i + 1;
        }
    }

    getString(offset: number | int): string {
        offset = +offset;
        if (!Object.keys(this.strings).length) return '<compressed>';
        let str = this.strings[(<number>offset)];
        if (!str) {
            for (const key in this.strings) {
                const kv = Number(key);
                if (kv < offset) {
                    const ss = this.strings[kv]!;
                    if (kv + ss.length > offset) {
                        str = ss.slice(<number>offset - kv); break;
                    }
                }
            }
        }
        return (str || '<empty>') ?? '<error>';
    }

    strings: Record<number, string> = {};
}

export class SymbolSection extends Section {
    constructor(file: DataWrapper, rpx: RPL) {
        super(file, rpx);
        if (!this.hasData) throw new Error('Symbol section cannot be empty.');
        this.init();
    }
    override init() {
        const data = new DataWrapper(super.data!);
        const num = (<number>this.size) / (<number>this.entSize);
    
        for (let i = 0; i < num; i++) {
            const symbol = new ELFSymbol(this);
            symbol.nameOffset = data.passUint32();
            symbol.value      = data.passUint32();
            symbol.size       = data.passUint32();
            symbol.info       = data.passUint8();
            symbol.other      = data.passUint8();
            symbol.shndx      = data.passUint16();
            this.symbols[i] = symbol;
        }
    }

    symbols: ELFSymbol[] = [];
}

export class RelocationSection extends Section {
    constructor(file: DataWrapper, rpx: RPL) {
        super(file, rpx);
        this.init();
    }
    override init() {
        const data = new DataWrapper(super.data!);
        const num = (<number>this.size) / (<number>this.entSize);

        for (let i = 0; i < num; i++) {
            const relocation = new Relocation();
            relocation.addr = data.passUint32();
            relocation.info = data.passUint32();
            if (+this.type === SectionType.Rela) relocation.addend = data.passInt32();

            this.relocations[i] = relocation;
        }
    }

    relocations: Relocation[] = [];
}

export class RPLCrcSection extends Section {
    constructor(file: DataWrapper, rpx: RPL) {
        super(file, rpx);
    }

    override get data() {
        return new ReadonlyDataWrapper(new Uint32Array(this.crcs as number[]).buffer).swap32();
    }

    override get size(): uint32 {
        return new uint32(this.rpx.sections.length * <number>this.entSize);
    }

    override get crc32Hash(): uint32 {
        return new uint32(0);
    }

    get crcs() {
        const hashes: uint32[] = [];
        for (let i = 0; i < this.rpx.sections.length; i++) {
            hashes.push(this.rpx.sections[i].crc32Hash);
        }
        return hashes;
    }
}

export class RPLFileInfoSection extends Section {
    constructor(file: DataWrapper, rpx: RPL) {
        super(file, rpx);
        this.init();
    }


}
