import { DataWrapper } from './datawrapper';
import { ABI, Class, Endian, ISA, Type, Version } from './enums';
import { Structs } from './structs';

export class Header extends Structs.Header {
    constructor(file: DataWrapper) {
        super();
        file.pos = 4; //? magic
        this.class = file.passUint8() as Class;
        this.endian = file.passUint8() as Endian;
        this.version = file.passUint8() as Version;
        this.abi = file.passUint8() as ABI;
        this.abiVersion = file.passUint8();
        file.pos += 7; //? padding
        this.type = file.passUint16() as Type;
        this.isa = file.passUint16() as ISA;
        this.isaVersion = file.passUint32();
        this.entryPoint = file.passUint32();
        this.programHeadersOffset = file.passUint32();
        this.sectionHeadersOffset = file.passUint32();
        this.isaFlags = file.passUint32();
        file.pos += 2; //? headerSize
        this.programHeadersEntrySize = file.passUint16();
        this.programHeadersEntryCount = file.passUint16();
        this.sectionHeadersEntrySize = file.passUint16();
        this._sectionHeadersEntryCount = file.passUint16(); //! [[DISCARDED @ RPL.constructor]]
        this._shstrIndex = file.passUint16();
    }

    override readonly class;
    override readonly endian;
    override readonly version;
    override readonly abi;
    override readonly abiVersion;
    override readonly type;
    override readonly isa;
    override readonly isaFlags;
    override readonly isaVersion;
    override readonly entryPoint;
    override readonly programHeadersOffset;
    override readonly programHeadersEntrySize;
    override readonly programHeadersEntryCount;
    override readonly sectionHeadersEntrySize;
    override readonly sectionHeadersOffset;
    /**
     * @internal Do not access outside of the Header class or the RPL class constructor.
     * This property is deleted outside of the Header class/RPL constructor as it's invalidated by RPL class in favor of `RPL.sections.length`.
     */
    protected override readonly _sectionHeadersEntryCount;
}
