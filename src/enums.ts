/** The architecture of the ELF file, either 32 or 64 bits. //* uint8 */
export enum Class {
    None  = 0x00,
    ELF32 = 0x01,
    ELF64 = 0x02
}

/** The endianness of the data in the ELF file. //* uint8 */
export enum Endian {
    None   = 0x00,
    Little = 0x01,
    Big    = 0x02
}

/** The version of the ELF file. There is currently only one version. //* uint8 */
export enum Version {
    None    = 0x00,
    Current = 0x01
}

/** The type of Application Binary Interface. //* uint8 */
export enum ABI {
    SystemV        = 0x00,
    CafeOS         = 0xCA,
    Standalone     = 0xFF
}

/** The type of ELF file. Executables are ELF files, while some other files (like .o or .so files)
  * are also ELF files but of different types. //? uint16 */
export enum Type {
    None        = 0x0000,
    RPL         = 0xFE01
}

/** The type of Instruction Set Architecture. //? uint16 */
export enum ISA {
    None          = 0x0000,
    PPC           = 0x0014,
    PPC64         = 0x0015
}

/** The type of section (section header entry). //! uint32 */
export enum SectionType {
    /** Inactive section with undefined values (SHT_NULL) */
    Null          = 0x00000000,
    /** Information defined by the program, includes executable code and data (SHT_PROGBITS) */
    ProgBits      = 0x00000001,
    /** Section data contains a symbol table (SHT_SYMTAB) */
    SymTab        = 0x00000002,
    /** Section data contains a string table (SHT_STRTAB) */
    StrTab        = 0x00000003,
    /** Section data contains relocation entries with explicit addends (SHT_RELA) */
    Rela          = 0x00000004,
    /** Section data contains information that marks the file in some way (SHT_NOTE) */
    Note          = 0x00000007,
    /** Section data occupies no space in the file but otherwise resembles SHT_PROGBITS (SHT_NOBITS) */
    NoBits        = 0x00000008,
    /** Section data contains relocation entries without explicit addends (SHT_REL) */
    Rel           = 0x00000009,
    /** RPL exports table (SHT_RPL_EXPORTS) */
    RPLExports    = 0x80000001,
    /** RPL imports table (SHT_RPL_IMPORTS) */
    RPLImports    = 0x80000002,
    /** RPL file CRC hashes (SHT_RPL_CRCS) */
    RPLCrcs       = 0x80000003,
    /** RPL file information (SHT_RPL_FILEINFO) */
    RPLFileInfo   = 0x80000004
}

/** Section header flags //! uint32 */
export enum SectionFlags {
    None            = 0x00000000,
    /** (SHF_WRITE) */
    Write           = 0x00000001,
    /** (SHF_ALLOC) */
    Alloc           = 0x00000002,
    /** (SHF_EXECINSTR) */
    Executable      = 0x00000004,
    /** (SHF_MERGE) */
    Merge           = 0x00000010,
    /** (SHF_STRINGS) */
    Strings         = 0x00000020,
    /** (SHF_INFO_LINK) */
    InfoLink        = 0x00000040,
    /** (SHF_LINK_ORDER) */
    LinkOrder       = 0x00000080,
    /** (SHF_OS_NONCONFORMING) */
    Nonconforming   = 0x00000100,
    /** (SHF_GROUP) */
    Group           = 0x00000200,
    /** (SHF_TLS) */
    TLS             = 0x00000400,
    /** (SHF_COMPRESSED) */
    Compressed      = 0x08000000,
    /** (SHF_AMD64_LARGE) */
    AMD64Large      = 0x10000000,
    /** (SHF_ORDERED) */
    Ordered         = 0x40000000,
    /** (SHF_EXCLUDE) */
    Exclude         = 0x80000000
}

/** The scope of the symbol. //* nybble */
export enum SymbolBinding {
    /** A local symbol is akin to a local variable. */
    Local  = 0x00 >> 4,
    /** A global symbol is akin to a global variable or function. */
    Global = 0x10 >> 4,
    /** A weak symbol is a symbol that can be replaced by a non-weak symbol in another object file when linking. */
    Weak   = 0x20 >> 4
}

/** The type of symbol. The most common symbol is a function or object,
  * but other kinds of symbols exist for keeping track of various things. //* nybble */
export enum SymbolType {
    None                       = 0x00 & 0xF,
    Object                     = 0x01 & 0xF,
    Function                   = 0x02 & 0xF,
    Section                    = 0x03 & 0xF,
    File                       = 0x04 & 0xF,
    Common                     = 0x05 & 0xF,
    ThreadLocalStorage         = 0x06 & 0xF,
    RelocationExpression       = 0x07 & 0xF,
    SignedRelocationExpression = 0x08 & 0xF
}

/** The visibility of a symbol. //* uint8 */
export enum SymbolVisibility {
    Default   = 0x00 & 0x3,
    Internal  = 0x01 & 0x3,
    Hidden    = 0x02 & 0x3,
    Protected = 0x03 & 0x3
}

/** The type of a relocation. //* uint8 */
export enum RelocationType {
    None = 0x00,
    /** (R_PPC_ADDR32) */
    PPCAddr32 = 0x01,
    /** (R_PPC_ADDR24) */
    PPCAddr24 = 0x02,
    /** (R_PPC_ADDR16) */
    PPCAddr16 = 0x03,
    /** (R_PPC_ADDR16_LO) */
    PPCAddr16Lo = 0x04,
    /** (R_PPC_ADDR16_HI) */
    PPCAddr16Hi = 0x05,
    /** (R_PPC_ADDR16_HA) */
    PPCAddr16Ha = 0x06,
    /** (R_PPC_ADDR14) */
    PPCAddr14 = 0x07,
    /** (R_PPC_ADDR14_BRTAKEN) */
    PPCAddr14BrTaken = 0x08,
    /** (R_PPC_ADDR14_BRNTAKEN) */
    PPCAddr14BrNotTaken = 0x09,
    /** (R_PPC_REL24) */
    PPCRel24 = 0x0A,
    /** (R_PPC_REL14) */
    PPCRel14 = 0x0B,
    /** (R_PPC_REL14_BRTAKEN) */
    PPCRel14BrTaken = 0x0C,
    /** (R_PPC_REL14_BRNTAKEN) */
    PPCRel14BrNotTaken = 0x0D,
    /** (R_PPC_GOT16) */
    PPCGot16 = 0x0E,
    /** (R_PPC_GOT16_LO) */
    PPCGot16Lo = 0x0F,
    /** (R_PPC_GOT16_HI) */
    PPCGot16Hi = 0x10,
    /** (R_PPC_GOT16_HA) */
    PPCGot16Ha = 0x11,
    /** (R_PPC_PLTREL24) */
    PPCPltRel24 = 0x12,
    /** (R_PPC_COPY) */
    PPCCopy = 0x13,
    /** (R_PPC_GLOB_DAT) */
    PPCGlobalData = 0x14,
    /** (R_PPC_JMP_SLOT) */
    PPCJumpSlot = 0x15,
    /** (R_PPC_RELATIVE) */
    PPCRelative = 0x16,
    /** (R_PPC_LOCAL24PC) */
    PPCLocal24PC = 0x17,
    /** (R_PPC_UADDR32) */
    PPCUAddr32 = 0x18,
    /** (R_PPC_UADDR16) */
    PPCUAddr16 = 0x19,
    /** (R_PPC_REL32) */
    PPCRel32 = 0x1A,
    /** (R_PPC_PLT32) */
    PPCPlt32 = 0x1B,
    /** (R_PPC_PLTREL32) */
    PPCPltRel32 = 0x1C,
    /** (R_PPC_PLT16_LO) */
    PPCPlt16Lo = 0x1D,
    /** (R_PPC_PLT16_HI) */
    PPCPlt16Hi = 0x1E,
    /** (R_PPC_PLT16_HA) */
    PPCPlt16Ha = 0x1F,
    /** (R_PPC_SDAREL16) */
    PPCSdaRel16 = 0x20,
    /** (R_PPC_SECTOFF) */
    PPCSectOff = 0x21,
    /** (R_PPC_SECTOFF_LO) */
    PPCSectOffLo = 0x22,
    /** (R_PPC_SECTOFF_HI) */
    PPCSectOffHi = 0x23,
    /** (R_PPC_SECTOFF_HA) */
    PPCSectOffHa = 0x24,
    /** (R_PPC_ADDR30) */
    PPCAddr30 = 0x25,

    // ...RESERVED...

    /** (R_PPC_EMB_START) */
    PPCEmbStart = 101,
    /** (R_PPC_EMB_END) */
    PPCEmbEnd = 200,

    // ...RESERVED...
}
