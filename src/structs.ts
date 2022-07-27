import { uint8, uint16, uint32, sint32 } from './primitives';
import * as Enums from './enums';
import { StringStore } from './stringstore';

export namespace Structs {
    export class Header {
        readonly  magic = '\x7FELF' as const;                     //! uint32
        public    class: Enums.Class = Enums.Class.None;          //* uint8
        public    endian: Enums.Endian = Enums.Endian.None;       //* uint8
        public    version: Enums.Version = Enums.Version.None;    //* uint8
        public    abi: Enums.ABI = Enums.ABI.SystemV;             //* uint8
        public    abiVersion: uint8 = new uint8;                  //* uint8
        readonly  padding = '\0\0\0\0\0\0\0' as const;            //* uint8[0x7]
        public    type: Enums.Type = Enums.Type.None;             //? uint16
        public    isa: Enums.ISA = Enums.ISA.None;                //? uint16
        public    isaVersion: uint32 = new uint32;                //! uint32
        public    entryPoint: uint32 = new uint32;                //! uint32
        public    programHeadersOffset: uint32 = new uint32;      //! uint32
        public    sectionHeadersOffset: uint32 = new uint32;      //! uint32
        public    isaFlags: uint32 = new uint32;                  //! uint32
        readonly  headerSize: uint16 = 0x0034 as const;           //? uint16
        public    programHeadersEntrySize: uint16 = new uint16;   //? uint16
        public    programHeadersEntryCount: uint16 = new uint16;  //? uint16
        public    sectionHeadersEntrySize: uint16 = new uint16;   //? uint16
        protected _sectionHeadersEntryCount: uint16 = new uint16; //? uint16
        protected _shstrIndex: uint16 = new uint16;               //? uint16
    }

    export class Section {
        /** Offset from the start of the {@link Header.shstrIndex section headers string table} 
          * to the address of this section's name in said table, if any. */
        public    nameOffset: uint32 = new uint32;    //! uint32
        public    type: Enums.SectionType = Enums.SectionType.Null; //! uint32
        public    flags: uint32 = new uint32;         //! uint32
        public    addr: uint32 = new uint32;          //! uint32
        protected storedOffset: uint32 = new uint32;  //! uint32
        protected storedSize: uint32 = new uint32;    //! uint32
        public    link: uint32 = new uint32;          //! uint32
        public    info: uint32 = new uint32;          //! uint32
        public    addrAlign: uint32 = new uint32;     //! uint32
        public    entSize: uint32 = new uint32;       //! uint32
    }

    export type RawSectionValues = { [K in keyof Section]: Section[K] };

    export class Symbol {
        /** Offset from the start of the {@link Section.link linked string table section} of 
          * this symbol's section, to the address of this symbol's name in said table, if any. */
        public   nameOffset: uint32 = new uint32; //! uint32
        /** The value of this symbol. The interpretation of the value is dependent on a few things but is generally an offset or address. */
        public   value: uint32 = new uint32;      //! uint32
        public   size: uint32 = new uint32;       //! uint32
        public   info: uint8 = new uint8;         //* uint8
        public   other: uint8 = new uint8;        //* uint8
        /** Section index for this symbol.
          * @summary This is the index of the section for this symbol. There are also special values 
          * such as 0xFFF1 for an absolute index symbol in a relocatable ELF file (object file). */
        public   shndx: uint16 = new uint16;      //? uint16
    }

    export class Relocation {
        /** The location at which to apply the relocation action.
          * @summary This member gives the location at which to apply the relocation action. For
          * a relocatable file, the value is the byte offset from the beginning of the
          * section to the storage unit affected by the relocation. For an executable file
          * or a shared object, the value is the virtual address of the storage unit affected by the relocation. */
        public   addr: uint32 = new uint32; //! uint32
        /** The symbol table index with respect to which the
          * relocation must be made, and the type of relocation to apply.
          * @summary This member gives both the symbol table index with respect to which the
          * relocation must be made, and the type of relocation to apply. For example,
          * a call instruction's relocation entry would hold the symbol table index of
          * the function being called. If the index is STN_UNDEF, the undefined symbol
          * index, the relocation uses 0 as the symbol value. Relocation types are
          * processor-specific; descriptions of their behavior appear in the processor
          * supplement. When the text in the processor supplement refers to a
          * relocation entry's relocation type or symbol table index, it means the result
          * of applying ELF32_R_TYPE or ELF32_R_SYM, respectively, to the entry's r_info member. */
        public   info: uint32 = new uint32; //! uint32
        /** A constant addend used to compute the value to be stored into the relocatable field. */
        public   addend?: sint32;           //? sint32
    }

    /** RPL-exclusive file information section data structure. */
    export class RPLFileInfo {
        /** Magic number of the RPL_FILEINFO section, always 0xCAFE */
        readonly magic = 0xCAFE as const;                  //? uint16
        public   version: uint16 = new uint16;             //? uint16
        public   textSize: uint32 = new uint32;            //* uint32
        public   textAlign: uint32 = new uint32;           //* uint32
        public   dataSize: uint32 = new uint32;            //* uint32
        public   dataAlign: uint32 = new uint32;           //* uint32
        public   loadSize: uint32 = new uint32;            //* uint32
        public   loadAlign: uint32 = new uint32;           //* uint32
        public   tempSize: uint32 = new uint32;            //* uint32
        public   trampAdjust: uint32 = new uint32;         //* uint32
        public   sdaBase: uint32 = new uint32;             //* uint32
        public   sda2Base: uint32 = new uint32;            //* uint32
        public   stackSize: uint32 = new uint32;           //* uint32
        /** The offset from the start of the section to the start of the strings array */
        public   stringsOffset: uint32 = new uint32;       //* uint32
        public   flags: uint32 = new uint32;               //* uint32
        public   heapSize: uint32 = new uint32;            //* uint32
        public   tagOffset: uint32 = new uint32;           //* uint32
        public   minVersion: uint32 = new uint32;          //* uint32
        public   compressionLevel: sint32 = new sint32;    //! sint32
        public   trampAddition: uint32 = new uint32;       //* uint32
        public   fileInfoPad: uint32 = new uint32;         //* uint32
        public   cafeSdkVersion: uint32 = new uint32;      //* uint32
        public   cafeSdkRevision: uint32 = new uint32;     //* uint32
        public   tlsModuleIndex: uint16 = new uint16;      //? uint16
        public   tlsAlignShift: uint16 = new uint16;       //? uint16
        public   runtimeFileInfoSize: uint32 = new uint32; //* uint32
        /** Array of null-terminated strings until the end of the section */
        public   strings?: StringStore;
    }
}
