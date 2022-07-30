import crc32 from './crc32';
import { DataWrapper, ReadonlyDataWrapper } from './datawrapper';
import { SectionFlags, SectionType } from './enums';
import { uint32 } from './primitives';
import { Relocation } from './relocation';
import { RPL } from './rpl';
import { StringStore } from './stringstore';
import { Structs } from './structs';
import { ELFSymbol } from './symbol';

function inflateSync(buf: Uint8Array): Uint8Array {
    //@ts-expect-error missing from bun-types
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return Bun.gunzipSync(buf) as Uint8Array;
}
function deflateSync(buf: Uint8Array, opts?: { windowBits?: number, level?: number, memLevel?: number, strategy?: number }): Uint8Array {
    //@ts-expect-error missing from bun-types
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return Bun.gzipSync(buf, opts) as Uint8Array;
}

export class Section extends Structs.Section {
    constructor(inputdata: DataWrapper | Structs.RawSectionValues & { data?: Buffer | null }, rpx: RPL) {
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
            const sectionType = +inputdata.type;
            if (sectionType !== SectionType.NoBits && sectionType !== SectionType.Null) {
                this.storedOffset = new uint32(0xFFFFFFFF); // Special value for internal use
                this.storedSize = new uint32(0xFFFFFFFF); // Special value for internal use
                if (!inputdata.data) {
                    if (
                        sectionType === SectionType.StrTab || sectionType === SectionType.SymTab ||
                        sectionType === SectionType.Rela || sectionType === SectionType.RPLFileInfo
                    ) return this;
                    else throw new TypeError('Sections not of type Null or NoBits must have data.');
                }
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
            if (<number>this.flags & SectionFlags.Compressed) {
                // Decompress section data
                const decompressed = inflateSync(file.subarray(<number>this.storedOffset + 4, <number>this.storedOffset + <number>this.storedSize));
                //(<number>this.flags) &= ~SectionFlags.Compressed;
                this.#data = Buffer.from(decompressed.subarray(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength));
            } else {
                // Section is not compressed
                this.#data = file.subarray(<number>this.storedOffset, <number>this.storedOffset + <number>this.storedSize);
            }
        }
    }

    override readonly type;
    protected override readonly storedOffset;
    protected override readonly storedSize;

    /** Safely attempts to provide the section data compressed.
     * 
     * **Does NOT mutate the Section instance in any way:**
     * - The Section instance `data` property will **NOT** be modified and remain the uncompressed data.
     * - It is enforced that `Section.data` is always **NOT** compressed for functionality and simplicity.
     * - This function will **NOT** enable the `Compressed` flag in the Section instance `Section.flags`
     * property, instead the flag will be handled by the parent RPL/RPX (`Section.rpx`) class during save.
     * - The `Compressed` flag is to be added/removed **by the user** to tell the library whether or not
     * that section should be compressed on save, if compression is requested to `RPL.save()`
     * 
     * @returns `Buffer` containing the compressed data if successful.
     * @returns `false` if the section is not compressable or if the compression would make it larger than uncompressed.
     */
    tryCompress(compressionLevel?: -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9): Buffer | false {
        if (!this.hasData || +this.type === SectionType.RPLCrcs || +this.type === SectionType.RPLFileInfo) return false;

        const compressed = Buffer.concat([Buffer.allocUnsafe(4), deflateSync(this.data!, { level: compressionLevel })]);
        compressed.writeUint32BE(+this.size, 0);
        if (compressed.byteLength > this.size) return false;
        //(<number>this.flags) |= SectionFlags.Compressed;
        return compressed.subarray(compressed.byteOffset, compressed.byteOffset + compressed.byteLength);
    }

    get index(): number {
        return this.rpx.sections.indexOf(this);
    }

    get name(): string {
        const thisIndex = this.index;
        if (+this.rpx.shstrIndex === 0) return `SECTION${thisIndex}`;
        if (+this.nameOffset === 0) return +this.type ? `SECTION${thisIndex}` : '<null>';

        const shstrtab = this.rpx.sections[+this.rpx.shstrIndex];
        if (!(shstrtab instanceof StringSection)) throw new Error('Invalid ELF file. Section header string table index is not a string table.');
        else return shstrtab.strings.get(this.nameOffset);
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
        return new uint32(this.data?.byteLength ?? (+this.type === SectionType.NoBits ? <number>this.storedSize : 0));
    }

    get linkedSection(): Section | null {
        return +this.link ? this.rpx.sections[+this.link] ?? null : null;
    }

    get crc32Hash(): uint32 {
        return new uint32(this.hasData ? crc32(this.data!) : 0x00000000);
    }
    
    get data(): Buffer | null {
        return this.#data;
    }

    set data(value: Buffer | null) {
        if (!this.hasData) throw new TypeError('Cannot set data of NoBits or Null section.');
        if (value === null || value.byteLength === 0) throw new TypeError('Cannot set data of section to empty data or null.');
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
    constructor(inputdata: DataWrapper | Structs.RawSectionValues & { strings?: Record<number, string> }, rpx: RPL) {
        super(inputdata, rpx);
        if (!(inputdata instanceof DataWrapper)) {
            this.strings = new StringStore();
            return this; // TODO
        }
        if (!super.hasData) throw new Error('String section cannot be empty.');
        this.strings = new StringStore(super.data!);
    }

    override get data(): ReadonlyDataWrapper {
        return new ReadonlyDataWrapper(this.strings.buffer);
    }
    override get hasData(): true {
        return true;
    }

    override get size(): uint32 {
        return new uint32(this.strings.size);
    }

    readonly strings: StringStore;
}

export class SymbolSection extends Section {
    constructor(inputdata: DataWrapper | Structs.RawSectionValues & { symbols?: ELFSymbol[] }, rpx: RPL) {
        super(inputdata, rpx);
        if (!(inputdata instanceof DataWrapper)) {
            return this; // TODO
        }
        if (!super.hasData) throw new Error('Symbol section cannot be empty.');
        const data = new DataWrapper(super.data!);
        const num = super.data!.byteLength / (<number>this.entSize);
    
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

    override get data(): ReadonlyDataWrapper {
        const buffer = new DataWrapper(new ArrayBuffer(<number>this.entSize * this.symbols.length));
        for (const sym of this.symbols) {
            buffer.dropUint32(sym.nameOffset);
            buffer.dropUint32(sym.value);
            buffer.dropUint32(sym.size);
            buffer.dropUint8(sym.info);
            buffer.dropUint8(sym.other);
            buffer.dropUint16(sym.shndx);
        }
        return new ReadonlyDataWrapper(buffer);
    }
    override get hasData(): true {
        return true;
    }

    override get size(): uint32 {
        return new uint32(<number>this.entSize * this.symbols.length);
    }

    symbols: ELFSymbol[] = [];
}

export class RelocationSection extends Section {
    constructor(inputdata: DataWrapper | Structs.RawSectionValues & { relocations?: Relocation[] }, rpx: RPL) {
        super(inputdata, rpx);
        if (!(inputdata instanceof DataWrapper)) {
            return this; // TODO
        }
        if (!super.hasData) throw new Error('Relocation section cannot be empty.');
        const data = new DataWrapper(super.data!);
        const num = super.data!.byteLength / (<number>this.entSize);

        for (let i = 0; i < num; i++) {
            const relocation = new Relocation();
            relocation.addr = data.passUint32();
            relocation.info = data.passUint32();
            if (+this.type === SectionType.Rela) relocation.addend = data.passInt32();

            this.relocations[i] = relocation;
        }
    }

    override get data(): ReadonlyDataWrapper {
        const buffer = new DataWrapper(new ArrayBuffer(<number>this.entSize * this.relocations.length));
        for (const reloc of this.relocations) {
            buffer.dropUint32(reloc.addr);
            buffer.dropUint32(reloc.info);
            if (+this.type === SectionType.Rela) buffer.dropInt32(reloc.addend!);
        }
        return new ReadonlyDataWrapper(buffer);
    }
    override get hasData(): true {
        return true;
    }

    override get size(): uint32 {
        return new uint32(<number>this.entSize * this.relocations.length);
    }

    relocations: Relocation[] = [];
}

export class RPLCrcSection extends Section {
    constructor(inputdata: DataWrapper, rpx: RPL) {
        super(inputdata, rpx);
        if (!super.hasData) throw new Error('RPL CRC section cannot be empty.');
    }

    override get data(): ReadonlyDataWrapper {
        return new ReadonlyDataWrapper(new Uint32Array(this.crcs as number[]).buffer).swap32();
    }
    override get hasData(): true {
        return true;
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
    constructor(inputdata: DataWrapper | Structs.RawSectionValues & { fileinfo?: Structs.RPLFileInfo }, rpx: RPL) {
        super(inputdata, rpx);
        if (!(inputdata instanceof DataWrapper)) {
            this.strings = new StringStore();
            return this; // TODO
        }
        if (!super.hasData) throw new Error('RPL File Info section cannot be empty.');
        if (super.data!.byteLength < 0x60) throw new Error('RPL File Info section is too small, must be at least 0x60 in size.');

        const data = new DataWrapper(super.data!);

        const magic = data.passUint16();
        if (+magic !== +this.fileinfo.magic) throw new Error(`RPL File Info section magic number is invalid. Expected 0xCAFE, got 0x${magic.toString(16).toUpperCase()}`);

        this.fileinfo.version             = data.passUint16();
        this.fileinfo.textSize            = data.passUint32();
        this.fileinfo.textAlign           = data.passUint32();
        this.fileinfo.dataSize            = data.passUint32();
        this.fileinfo.dataAlign           = data.passUint32();
        this.fileinfo.loadSize            = data.passUint32();
        this.fileinfo.loadAlign           = data.passUint32();
        this.fileinfo.tempSize            = data.passUint32();
        this.fileinfo.trampAdjust         = data.passUint32();
        this.fileinfo.sdaBase             = data.passUint32();
        this.fileinfo.sda2Base            = data.passUint32();
        this.fileinfo.stackSize           = data.passUint32();
        this.fileinfo.stringsOffset       = data.passUint32();
        this.fileinfo.flags               = data.passUint32();
        this.fileinfo.heapSize            = data.passUint32();
        this.fileinfo.tagOffset           = data.passUint32();
        this.fileinfo.minVersion          = data.passUint32();
        this.fileinfo.compressionLevel    = data.passInt32();
        this.fileinfo.trampAddition       = data.passUint32();
        this.fileinfo.fileInfoPad         = data.passUint32();
        this.fileinfo.cafeSdkVersion      = data.passUint32();
        this.fileinfo.cafeSdkRevision     = data.passUint32();
        this.fileinfo.tlsModuleIndex      = data.passUint16();
        this.fileinfo.tlsAlignShift       = data.passUint16();
        this.fileinfo.runtimeFileInfoSize = data.passUint32();

        // Section does not have strings
        // NOTE: Silently ignoring string offset out of bounds
        if (super.data!.byteLength === 0x60 || super.data!.byteLength <= this.fileinfo.stringsOffset) {
            this.strings = new StringStore();
            return this;
        }

        const stringData = super.data!.subarray(+this.fileinfo.stringsOffset);
        this.strings = new StringStore(stringData, +this.fileinfo.stringsOffset);
    }

    override get data(): ReadonlyDataWrapper {
        const buffer = new DataWrapper(new ArrayBuffer(0x60));
        buffer.dropUint16(this.fileinfo.magic);
        buffer.dropUint16(this.fileinfo.version);
        buffer.dropUint32(this.fileinfo.textSize);
        buffer.dropUint32(this.fileinfo.textAlign);
        buffer.dropUint32(this.fileinfo.dataSize);
        buffer.dropUint32(this.fileinfo.dataAlign);
        buffer.dropUint32(this.fileinfo.loadSize);
        buffer.dropUint32(this.fileinfo.loadAlign);
        buffer.dropUint32(this.fileinfo.tempSize);
        buffer.dropUint32(this.fileinfo.trampAdjust);
        buffer.dropUint32(this.fileinfo.sdaBase);
        buffer.dropUint32(this.fileinfo.sda2Base);
        buffer.dropUint32(this.fileinfo.stackSize);
        buffer.dropUint32(this.fileinfo.stringsOffset);
        buffer.dropUint32(this.fileinfo.flags);
        buffer.dropUint32(this.fileinfo.heapSize);
        buffer.dropUint32(this.fileinfo.tagOffset);
        buffer.dropUint32(this.fileinfo.minVersion);
        buffer.dropInt32(this.fileinfo.compressionLevel);
        buffer.dropUint32(this.fileinfo.trampAddition);
        buffer.dropUint32(this.fileinfo.fileInfoPad);
        buffer.dropUint32(this.fileinfo.cafeSdkVersion);
        buffer.dropUint32(this.fileinfo.cafeSdkRevision);
        buffer.dropUint16(this.fileinfo.tlsModuleIndex);
        buffer.dropUint16(this.fileinfo.tlsAlignShift);
        buffer.dropUint32(this.fileinfo.runtimeFileInfoSize);
        return new ReadonlyDataWrapper(Buffer.concat([buffer, this.strings.buffer]));
    }
    override get hasData(): true {
        return true;
    }

    override get size(): uint32 {
        return new uint32(0x60 + this.strings.size);
    }

    readonly fileinfo: Structs.RPLFileInfo = new Structs.RPLFileInfo;
    /** Array of null-terminated strings until the end of the section */
    readonly strings: StringStore;
}
