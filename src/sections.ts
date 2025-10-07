import { CodeBaseAddress, DataBaseAddress, LoadBaseAddress, uint32 } from './primitives.js';
import { DataWrapper, ReadonlyDataWrapper } from './datawrapper.js';
import { SectionFlags, SectionType } from './enums.js';
import { StringStore } from './stringstore.js';
import { ELFSymbol } from './symbol.js';
import { Structs } from './structs.js';
import { crc32 } from '@foxglove/crc';
import { RPL } from './rpl.js';
import Util from './util.js';
import zlib from 'node:zlib';
import { RelocationStore } from './relocationstore.js';

const SPECIAL_SECTIONS_STRINGS: Record<number, string> = {
    0x00000002: 'Symbol Table',
    0x00000003: 'String Table',
    0x00000004: 'Reloc. w/ addends',
    0x00000008: 'No Bits',
    0x00000009: 'Relocations',
    0x80000003: 'RPL CRCs',
    0x80000004: 'RPL File Info'
};
const SPECIAL_SECTIONS = [
    SectionType.NoBits, SectionType.StrTab, SectionType.SymTab, SectionType.Rel, SectionType.Rela, SectionType.RPLCrcs, SectionType.RPLFileInfo
] as const;

export class Section extends Structs.Section {
    constructor(inputdata: DataWrapper | Structs.SectionValues & { data?: Uint8Array | null }, rpx: RPL) {
        super();
        this.rpx = rpx;
        if (!(inputdata instanceof DataWrapper)) {
            if (SPECIAL_SECTIONS.includes(+inputdata.type) && !Reflect.get(inputdata, 'fromSuper'))
                throw new TypeError(`Special section of type ${SPECIAL_SECTIONS_STRINGS[+inputdata.type]!} must be constructed with its dedicated constructor.`);
            this.nameOffset = new uint32(inputdata.nameOffset);
            this.type = new uint32(inputdata.type) as SectionType;
            this.flags = new uint32(inputdata.flags);
            this.addr = new uint32(inputdata.addr);
            this.link = new uint32(inputdata.link);
            this.info = new uint32(inputdata.info);
            this.addrAlign = new uint32(inputdata.addrAlign);
            this.entSize = new uint32(inputdata.entSize);
            this.storedOffset = new uint32(0);
            this.storedSize = new uint32(0);
            const sectionType = +inputdata.type;
            if (sectionType !== SectionType.NoBits && sectionType !== SectionType.Null) {
                this.storedOffset = new uint32(0xFFFFFFFF); // Special value to indicate that the offset is not yet known but is non-zero.
                this.storedSize = new uint32(0xFFFFFFFF); // Special value to indicate that the size is not yet known but is non-zero.
                if (!inputdata.data) {
                    if (Reflect.get(inputdata, 'fromSuper')) return this;
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
                const decompressed = zlib.inflateSync(file.subarray(<number>this.storedOffset + 4, <number>this.storedOffset + <number>this.storedSize));
                this.#data = decompressed.subarray(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength);
            } else {
                // Section is not compressed
                this.#data = file.subarray(<number>this.storedOffset, <number>this.storedOffset + <number>this.storedSize);
            }
        }
    }

    override readonly type: SectionType;
    protected override readonly storedOffset: uint32;
    protected override readonly storedSize: uint32;

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
            const off = <number>this.rpx.headerSize
                //+ <number>this.rpx.programHeadersEntrySize * this.rpx.programs.length
                + <number>this.rpx.sectionHeadersEntrySize * this.rpx.sections.length;
            return new uint32(off);
        }
        const prevSect = sections[idx - 1]!;
        const off = <number>prevSect.offset + <number>prevSect.size;
        return new uint32(off);
    }

    get size(): uint32 {
        return new uint32(this.data?.byteLength ?? 0);
    }

    get linkedSection(): Section | null {
        return +this.link ? this.rpx.sections[+this.link] ?? null : null;
    }

    get crc32Hash(): uint32 {
        if (this.data instanceof ReadonlyDataWrapper) {
            const data = ReadonlyDataWrapper['@@unlock'](this.data);
            const hash = new uint32(crc32(data));
            ReadonlyDataWrapper['@@lock'](data);
            return hash;
        } else {
            return new uint32(this.hasData ? crc32(this.data!) : 0x00000000);
        }
    }

    get data(): Uint8Array | null {
        return this.#data;
    }
    set data(value: Uint8Array | null) {
        if (!this.hasData) throw new TypeError('Cannot set data of Null section.');
        if (value === null || value.byteLength === 0) throw new TypeError('Cannot set data of section to empty or null.');
        this.#data = value;
    }

    get hasData(): boolean {
        return this.#data !== null;
    }

    /** @internal The RPL/RPX file this Section belongs to. */
    protected readonly rpx: RPL;
    #data: Uint8Array | null = null;
}

export class NoBitsSection extends Section {
    constructor(inputdata: DataWrapper | Omit<Structs.SectionValues, 'type'> & { size?: number }, rpx: RPL) {
        if (!(inputdata instanceof DataWrapper)) {
            Reflect.set(inputdata, 'type', SectionType.NoBits);
            Reflect.set(inputdata, 'fromSuper', true);
            super(<Structs.SectionValues>inputdata, rpx);
            Reflect.set(this, 'storedSize', new uint32(inputdata.size ?? 0));
            return this;
        }
        super(inputdata, rpx);
    }

    override get size(): uint32 { return Reflect.get(this, 'storedSize') as uint32; }
    override set size(v: uint32) { Reflect.set(this, 'storedSize', v); }
    override get data(): null { return null; }
    override get hasData(): false { return false; }
}

export class StringSection extends Section {
    constructor(inputdata: DataWrapper | Omit<Structs.SectionValues, 'type'>, rpx: RPL) {
        if (!(inputdata instanceof DataWrapper)) {
            Reflect.set(inputdata, 'type', SectionType.StrTab);
            Reflect.set(inputdata, 'fromSuper', true);
            super(<Structs.SectionValues>inputdata, rpx);
            this.strings = new StringStore(); // Use `StringStore.add()` to add strings to manually created StrTab sections
            return this;
        }
        super(inputdata, rpx);
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
    constructor(inputdata: DataWrapper | Omit<Structs.SectionValues, 'type'> & { symbols?: ELFSymbol[] }, rpx: RPL) {
        if (!(inputdata instanceof DataWrapper)) {
            Reflect.set(inputdata, 'type', SectionType.SymTab);
            Reflect.set(inputdata, 'fromSuper', true);
            super(<Structs.SectionValues>inputdata, rpx);
            this.symbols = inputdata.symbols ?? [];
            return this;
        }
        super(inputdata, rpx);
        if (!super.hasData) throw new Error('Symbol section cannot be empty.');
        const data = new DataWrapper(super.data!);
        const num = super.data!.byteLength / (<number>this.entSize);

        this.symbols = [];
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
        const buffer = new DataWrapper(Buffer.allocUnsafe(<number>this.entSize * this.symbols.length));
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

    symbols: ELFSymbol[];
}

export class RelocationSection extends Section {
    constructor(
        inputdata: DataWrapper | Omit<Structs.SectionValues, 'type'> & { relocations?: RelocationStore, type: SectionType.Rel | SectionType.Rela },
        rpx: RPL, parseRelocs = false
    ) {
        if (!(inputdata instanceof DataWrapper)) {
            Reflect.set(inputdata, 'fromSuper', true);
            super(inputdata, rpx);
            this.parsed = true;
            this.relocations = inputdata.relocations ?? new RelocationStore(null, +inputdata.type === SectionType.Rela);
            if (
                this.relocations.rela && +inputdata.type !== SectionType.Rela ||
                !this.relocations.rela && +inputdata.type !== SectionType.Rel
            ) throw new Error('Requested relocation section type and provided relocations type mismatch.');
            return this;
        }
        super(inputdata, rpx);
        if (!super.hasData) throw new Error('Relocation section cannot be empty.');
        this.parsed = parseRelocs;
        this.relocations = new RelocationStore(parseRelocs ? new DataWrapper(super.data!) : null, +this.type === SectionType.Rela);
    }

    override set data(value: Uint8Array) {
        if (this.parsed) throw new Error('Cannot directly modify data of parsed relocation section.');
        else super.data = value;
    }
    override get data(): ReadonlyDataWrapper {
        if (!this.parsed) return new ReadonlyDataWrapper(super.data!);
        else return new ReadonlyDataWrapper(this.relocations.buffer);
    }
    override get hasData(): true {
        return true;
    }
    override get size(): uint32 {
        return new uint32(this.parsed ? this.relocations.size : super.data!.byteLength);
    }

    parsed: boolean;
    relocations: RelocationStore;
}

export class RPLCrcSection extends Section {
    constructor(inputdata: DataWrapper | Omit<Structs.SectionValues, 'type'>, rpx: RPL) {
        if (!(inputdata instanceof DataWrapper)) {
            Reflect.set(inputdata, 'type', SectionType.RPLCrcs);
            Reflect.set(inputdata, 'fromSuper', true);
            super(<Structs.SectionValues>inputdata, rpx);
            return this;
        }
        super(inputdata, rpx);
        if (!super.hasData) throw new Error('RPL CRCs section cannot be empty.');
    }

    override get data(): ReadonlyDataWrapper {
        return new ReadonlyDataWrapper(new Uint32Array(this.crcs.map(x => +x))).swap32();
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

    /** @warning This will trigger the data generation of all sections. **SLOW** */
    get crcs() {
        const hashes: uint32[] = [];
        for (let i = 0; i < this.rpx.sections.length; i++) hashes.push(this.rpx.sections[i]!.crc32Hash);
        return hashes;
    }
}

export class RPLFileInfoSection extends Section {
    constructor(inputdata: DataWrapper | Omit<Structs.SectionValues, 'type'> & { fileinfo?: Structs.RPLFileInfo }, rpx: RPL) {
        if (!(inputdata instanceof DataWrapper)) {
            Reflect.set(inputdata, 'type', SectionType.RPLFileInfo);
            Reflect.set(inputdata, 'fromSuper', true);
            super(<Structs.SectionValues>inputdata, rpx);
            this.fileinfo = inputdata.fileinfo ?? new Structs.RPLFileInfo;
            this.strings = new StringStore(undefined, +this.fileinfo.stringsOffset); // Use `StringStore.add()` to add strings to manually created RPLFileInfo sections
            return this;
        }
        super(inputdata, rpx);
        if (!super.hasData) throw new Error('RPL File Info section cannot be empty.');
        if (super.data!.byteLength < 0x60) throw new Error('RPL File Info section is too small, must be at least 0x60 in size.');

        this.fileinfo = new Structs.RPLFileInfo();

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
        // NOTE: Silently ignoring string offset out of bounds for now
        if (super.data!.byteLength === 0x60 || +this.fileinfo.stringsOffset < 0x60 || super.data!.byteLength <= +this.fileinfo.stringsOffset) {
            this.strings = new StringStore();
            return this;
        }

        const stringData = super.data!.subarray(+this.fileinfo.stringsOffset);
        this.strings = new StringStore(stringData, +this.fileinfo.stringsOffset);
    }

    override get data(): ReadonlyDataWrapper {
        const buffer = new DataWrapper(Buffer.allocUnsafe(0x60));
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
        return new ReadonlyDataWrapper(Buffer.concat([
            buffer, new Uint8Array(<number>this.fileinfo.stringsOffset - 0x60), this.strings.buffer
        ]));
    }
    override get hasData(): true {
        return true;
    }
    override get size(): uint32 {
        return new uint32(0x60 + (<number>this.fileinfo.stringsOffset - 0x60) + this.strings.size);
    }

    /** These are not the actual sizes stored on the section,
     *  but rather the ideal calculated values for each of them.
     *  @see `RPLFileInfoSection.adjustFileInfoSizes()` */
    get fileinfoSizes() {
        const info = { textSize: 0, dataSize: 0, loadSize: 0, tempSize: 0 };

        for (const section of this.rpx.sections) {
            const size = +section.size;
            const addr = +section.addr;
            if (addr >= CodeBaseAddress && addr < DataBaseAddress) {
                const val = +section.addr + +section.size - CodeBaseAddress;
                if (val > info.textSize) info.textSize = val;
            } else if (addr >= DataBaseAddress && addr < LoadBaseAddress) {
                const val = +section.addr + +section.size - DataBaseAddress;
                if (val > info.dataSize) info.dataSize = val;
            } else if (addr >= LoadBaseAddress) {
                const val = +section.addr + +section.size - LoadBaseAddress;
                if (val > info.loadSize) info.loadSize = val;
            } else if (+section.addr === 0 && +section.type !== SectionType.RPLCrcs && +section.type !== SectionType.RPLFileInfo) {
                info.tempSize += size + 0x80;
            }
        }
        const { textAlign, dataAlign, loadAlign } = this.fileinfo;
        info.textSize = Util.roundUp(info.textSize, +textAlign);
        info.dataSize = Util.roundUp(info.dataSize, +dataAlign);
        info.loadSize = Util.roundUp(info.loadSize, +loadAlign);
        return info;
    }

    /** Set the stored text, data, load and temp sizes to their ideal values. */
    adjustFileInfoSizes(): void {
        const { textSize, dataSize, loadSize, tempSize } = this.fileinfoSizes;
        this.fileinfo.textSize = new uint32(textSize);
        this.fileinfo.dataSize = new uint32(dataSize);
        this.fileinfo.loadSize = new uint32(loadSize);
        this.fileinfo.tempSize = new uint32(tempSize);
    }

    readonly fileinfo: Structs.RPLFileInfo;
    /** Array of null-terminated strings until the end of the section */
    readonly strings: StringStore;
}
