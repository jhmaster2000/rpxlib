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
    None     = 0x0000,
    Rel      = 0x0001,
    Exec     = 0x0002,
    Dyn      = 0x0003,
    Core     = 0x0004,
    LowOS    = 0xFE00,
    SIE      = 0xFE18,
    RPL      = 0xFE01,
    HighOS   = 0xFEFF,
    LowProc  = 0xFF00,
    HighProc = 0xFFFF,
}

/** The type of Instruction Set Architecture. //? uint16 */
export enum ISA {
    None           = 0x0000, // No machine
    M32            = 0x0001, // AT&T WE 32100
    SPARC          = 0x0002, // SPARC
    Intel386       = 0x0003, // Intel 80386
    Motorola68K    = 0x0004, // Motorola 68000
    Motorola88K    = 0x0005, // Motorola 88000
    //_reserved6   = 0x0006, // Reserved for future use (was EM_486)
    Intel860       = 0x0007, // Intel 80860
    MIPS           = 0x0008, // MIPS I Architecture
    S370           = 0x0009, // IBM System/370 Processor
    MIPS_RS3_LE    = 0x000A, // MIPS RS3000 Little-endian
    //_reserved11  = 0x000B, // Reserved for future use
    //_reserved12  = 0x000C, // Reserved for future use
    //_reserved13  = 0x000D, // Reserved for future use
    //_reserved14  = 0x000E, // Reserved for future use
    PARISC         = 0x000F, // Hewlett-Packard PA-RISC
    //_reserved16  = 0x0010, // Reserved for future use
    VPP500         = 0x0011, // Fujitsu VPP500
    SPARC32PLUS    = 0x0012, // Enhanced instruction set SPARC
    Intel960       = 0x0013, // Intel 80960
    PPC            = 0x0014, // PowerPC
    PPC64          = 0x0015, // 64-bit PowerPC
    S390           = 0x0016, // IBM System/390 Processor
    //_reserved23  = 0x0017, // Reserved for future use
    //_reserved24  = 0x0018, // Reserved for future use
    //_reserved25  = 0x0019, // Reserved for future use
    //_reserved26  = 0x001A, // Reserved for future use
    //_reserved27  = 0x001B, // Reserved for future use
    //_reserved28  = 0x001C, // Reserved for future use
    //_reserved29  = 0x001D, // Reserved for future use
    //_reserved30  = 0x001E, // Reserved for future use
    //_reserved31  = 0x001F, // Reserved for future use
    //_reserved32  = 0x0020, // Reserved for future use
    //_reserved33  = 0x0021, // Reserved for future use
    //_reserved34  = 0x0022, // Reserved for future use
    //_reserved35  = 0x0023, // Reserved for future use
    V800           = 0x0024, // NEC V800
    FR20           = 0x0025, // Fujitsu FR20
    RH32           = 0x0026, // TRW RH-32
    RCE            = 0x0027, // Motorola RCE
    ARM            = 0x0028, // Advanced RISC Machines ARM
    ALPHA          = 0x0029, // Digital Alpha
    SH             = 0x002A, // Hitachi SH
    SPARCV9        = 0x002B, // SPARC Version 9
    TRICORE        = 0x002C, // Siemens TriCore embedded processor
    ARC            = 0x002D, // Argonaut RISC Core, Argonaut Technologies Inc.
    H8_300         = 0x002E, // Hitachi H8/300
    H8_300H        = 0x002F, // Hitachi H8/300H
    H8S            = 0x0030, // Hitachi H8S
    H8_500         = 0x0031, // Hitachi H8/500
    IA_64          = 0x0032, // Intel IA-64 processor architecture
    MIPS_X         = 0x0033, // Stanford MIPS-X
    COLDFIRE       = 0x0034, // Motorola ColdFire
    Motorola68HC12 = 0x0035, // Motorola M68HC12
    MMA            = 0x0036, // Fujitsu MMA Multimedia Accelerator
    PCP            = 0x0037, // Siemens PCP
    NCPU           = 0x0038, // Sony nCPU embedded RISC processor
    NDR1           = 0x0039, // Denso NDR1 microprocessor
    STARCORE       = 0x003A, // Motorola Star*Core processor
    ME16           = 0x003B, // Toyota ME16 processor
    ST100          = 0x003C, // STMicroelectronics ST100 processor
    TINYJ          = 0x003D, // Advanced Logic Corp. TinyJ embedded processor family
    X86_64         = 0x003E, // AMD x86-64 architecture
    PDSP           = 0x003F, // Sony DSP Processor
    PDP10          = 0x0040, // Digital Equipment Corp. PDP-10
    PDP11          = 0x0041, // Digital Equipment Corp. PDP-11
    FX66           = 0x0042, // Siemens FX66 microcontroller
    ST9PLUS        = 0x0043, // STMicroelectronics ST9+ 8/16 bit microcontroller
    ST7            = 0x0044, // STMicroelectronics ST7 8-bit microcontroller
    Motorola68HC16 = 0x0045, // Motorola MC68HC16 Microcontroller
    Motorola68HC11 = 0x0046, // Motorola MC68HC11 Microcontroller
    Motorola68HC08 = 0x0047, // Motorola MC68HC08 Microcontroller
    Motorola68HC05 = 0x0048, // Motorola MC68HC05 Microcontroller
    SVX            = 0x0049, // Silicon Graphics SVx
    //unknown      = 0x004A, // ???
    ST19           = 0x004B, // Digital VAX
    CRIS           = 0x004C, // Axis Communications 32-bit embedded processor
    JAVELIN        = 0x004D, // Infineon Technologies 32-bit embedded processor
    FIREPATH       = 0x004E, // Element 14 64-bit DSP Processor
    ZSP            = 0x004F, // LSI Logic 16-bit DSP Processor
    MMIX           = 0x0050, // Donald Knuth's educational 64-bit processor
    HUANY          = 0x0051, // Harvard University machine-independent object files
    PRISM          = 0x0052, // SiTera Prism
    AVR            = 0x0053, // Atmel AVR 8-bit microcontroller
    FR30           = 0x0054, // Fujitsu FR30
    D10V           = 0x0055, // Mitsubishi D10V
    D30V           = 0x0056, // Mitsubishi D30V
    V850           = 0x0057, // NEC v850
    M32R           = 0x0058, // Mitsubishi M32R
    MN10300        = 0x0059, // Matsushita MN10300
    MN10200        = 0x005A, // Matsushita MN10200
    PJ             = 0x005B, // picoJava
    OPENRISC       = 0x005C, // OpenRISC 32-bit embedded processor
    ARC_A5         = 0x005D, // ARC Cores Tangent-A5
    XTENSA         = 0x005E, // Tensilica Xtensa Architecture
    VIDEOCORE      = 0x005F, // Alphamosaic VideoCore processor
    TMM_GPP        = 0x0060, // Thompson Multimedia General Purpose Processor
    NS32K          = 0x0061, // National Semiconductor 32000 series
    TPC            = 0x0062, // Tenor Network TPC processor
    SNP1K          = 0x0063, // Trebia SNP 1000 processor
    ST200          = 0x0064, // STMicroelectronics (www.st.com) ST200 microcontroller
    IP2K           = 0x0065, // Ubicom IP2xxx microcontroller family
    MAX            = 0x0066, // MAX Processor
    CR             = 0x0067, // National Semiconductor CompactRISC microprocessor
    F2MC16         = 0x0068, // Fujitsu F2MC16
    MSP430         = 0x0069, // Texas Instruments embedded microcontroller msp430
    BLACKFIN       = 0x006A, // Analog Devices Blackfin (DSP) processor
    SE_C33         = 0x006B, // S1C33 Family of Seiko Epson processors
    SEP            = 0x006C, // Sharp embedded microprocessor
    ARCA           = 0x006D, // Arca RISC Microprocessor
    UNICORE        = 0x006E, // Microprocessor series from PKU-Unity Ltd. and MPRC of Peking University
}

/** The type of program (program header entry, AKA segments). //! uint32 */
export enum ProgramType {
    Null                     = 0x00000000,
    Load                     = 0x00000001,
    Dynamic                  = 0x00000002,
    Interp                   = 0x00000003,
    Note                     = 0x00000004,
    ShLib                    = 0x00000005,
    Phdr                     = 0x00000006,
    TLS                      = 0x00000007,
    LoOS                     = 0x60000000,
    GNUEhFrame               = 0x6474E550,
    GNUStack                 = 0x6474E551,
    GNURelRo                 = 0x6474E552,
    LoSunw                   = 0x6FFFFFFA,
    SunwBss                  = 0x6FFFFFFA, // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
    SunwStack                = 0x6FFFFFFB,
    HiSunw                   = 0x6FFFFFFF,
    HiOS                     = 0x6FFFFFFF, // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
    LoProc                   = 0x70000000,
    // ARM-specific program types
    SHT_ARM_ExIdx            = 0x70000001,
    SHT_ARM_PreemptMap       = 0x70000002,
    SHT_ARM_Attributes       = 0x70000003,
    SHT_ARM_DebugOverlay     = 0x70000004,
    SHT_ARM_OverlaySection   = 0x70000005,
    // End ARM-specific program types
    HiProc                   = 0x7FFFFFFF,
}

/** Program header flags //! uint32 */
export enum ProgramFlags {
    None          = 0x00000000,
    Executable    = 0x00000001,
    Write         = 0x00000002,
    Read          = 0x00000004,
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
    /** Section data contains a hash table (SHT_HASH) */
    Hash          = 0x00000005,
    /** Section data contains information for dynamic linking (SHT_DYNAMIC) */
    Dynamic       = 0x00000006,
    /** Section data contains information that marks the file in some way (SHT_NOTE) */
    Note          = 0x00000007,
    /** Section data occupies no space in the file but otherwise resembles SHT_PROGBITS (SHT_NOBITS) */
    NoBits        = 0x00000008,
    /** Section data contains relocation entries without explicit addends (SHT_REL) */
    Rel           = 0x00000009,
    /** Section is reserved but has unspecified semantics (SHT_SHLIB) */
    ShLib         = 0x0000000A,
    /** Section data contains a DLL symbol table (SHT_DYNSYM) */
    DynSym        = 0x0000000B,
    /** Section data contains an array of constructors (SHT_INIT_ARRAY) */
    InitArray     = 0x0000000E,
    /** Section data contains an array of destructors (SHT_FINI_ARRAY) */
    FiniArray     = 0x0000000F,
    /** Section data contains an array of pre-constructors (SHT_PREINIT_ARRAY) */
    PreInitArray  = 0x00000010,
    /** Section group (SHT_GROUP) */
    Group         = 0x00000011,
    /** Extended section indices (SHT_SYMTAB_SHNDX) */
    SymTabShndx   = 0x00000012,

    /** Lowest OS-specific section type (SHT_LOOS) */
    LoOS          = 0x60000000,
    /** GNU Object Attributes (SHT_GNU_ATTRIBUTES) */
    GNUAttributes = 0x6FFFFFF5,
    /** GNU-style hash table (SHT_GNU_HASH) */
    GNUHash       = 0x6FFFFFF6,
    /** Prelink library list (SHT_GNU_LIBLIST) */
    GNULibList    = 0x6FFFFFF7,
    /** Checksum for DSO content (SHT_CHECKSUM) */
    DSOChecksum   = 0x6FFFFFF8,
    /** Sun-specific low bound (SHT_LOSUNW) */
    LoSunw        = 0x6FFFFFFA,
    SunwMove      = 0x6FFFFFFA, // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
    SunwCOMDAT    = 0x6FFFFFFB,
    SunwSymInfo   = 0x6FFFFFFC,
    /** Version definition section (SHT_GNU_verdef) */
    GNUVerDef     = 0x6FFFFFFD,
    /** Version needs section (SHT_GNU_verneed) */
    GNUVerNeed    = 0x6FFFFFFE,
    /** Version symbol table (SHT_GNU_versym) */
    GNUVerSym     = 0x6FFFFFFF,
    /** Sun-specific high bound (SHT_HISUNW) */
    HiSunw        = 0x6FFFFFFF, // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
    /** Highest OS-specific section type (SHT_HIOS) */
    HiOS          = 0x6FFFFFFF, // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
    /** Start of processor-specific section type (SHT_LOPROC) */
    LoProc        = 0x70000000,
    /** End of processor-specific section type (SHT_HIPROC) */
    HiProc        = 0x7FFFFFFF,
    /** Start of application-specific (SHT_LOUSER) */
    LoUser        = 0x80000000,
    /** End of application-specific (SHT_HIUSER) */
    HiUser        = 0x8FFFFFFF,

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
    /** (R_PPC_NONE) [none] */
    None = 0x00,
    /** (R_PPC_ADDR32) [word32] */
    PPCAddr32 = 0x01,
    /** (R_PPC_ADDR24) [low24*] */
    PPCAddr24 = 0x02,
    /** (R_PPC_ADDR16) [half16*] */
    PPCAddr16 = 0x03,
    /** (R_PPC_ADDR16_LO) [half16] */
    PPCAddr16Lo = 0x04,
    /** (R_PPC_ADDR16_HI) [half16] */
    PPCAddr16Hi = 0x05,
    /** (R_PPC_ADDR16_HA) [half16] */
    PPCAddr16Ha = 0x06,
    /** (R_PPC_ADDR14) [low14*] */
    PPCAddr14 = 0x07,
    /** (R_PPC_ADDR14_BRTAKEN) [low14*] */
    PPCAddr14BrTaken = 0x08,
    /** (R_PPC_ADDR14_BRNTAKEN) [low14*] */
    PPCAddr14BrNotTaken = 0x09,
    /** (R_PPC_REL24) [low24*] */
    PPCRel24 = 0x0A,
    /** (R_PPC_REL14) [low14*] */
    PPCRel14 = 0x0B,
    /** (R_PPC_REL14_BRTAKEN) [low14*] */
    PPCRel14BrTaken = 0x0C,
    /** (R_PPC_REL14_BRNTAKEN) [low14*] */
    PPCRel14BrNotTaken = 0x0D,
    /** (R_PPC_GOT16) [half16*] */
    PPCGot16 = 0x0E,
    /** (R_PPC_GOT16_LO) [half16] */
    PPCGot16Lo = 0x0F,
    /** (R_PPC_GOT16_HI) [half16] */
    PPCGot16Hi = 0x10,
    /** (R_PPC_GOT16_HA) [half16] */
    PPCGot16Ha = 0x11,
    /** (R_PPC_PLTREL24) [low24*] */
    PPCPltRel24 = 0x12,
    /** (R_PPC_COPY) [none/special_size4] */
    PPCCopy = 0x13,
    /** (R_PPC_GLOB_DAT) [word32] */
    PPCGlobalData = 0x14,
    /** (R_PPC_JMP_SLOT) [none/special_size4] */
    PPCJumpSlot = 0x15,
    /** (R_PPC_RELATIVE) [word32] */
    PPCRelative = 0x16,
    /** (R_PPC_LOCAL24PC) [low24*] */
    PPCLocal24PC = 0x17,
    /** (R_PPC_UADDR32) [word32] */
    PPCUAddr32 = 0x18,
    /** (R_PPC_UADDR16) [half16*] */
    PPCUAddr16 = 0x19,
    /** (R_PPC_REL32) [word32] */
    PPCRel32 = 0x1A,
    /** (R_PPC_PLT32) [word32] */
    PPCPlt32 = 0x1B,
    /** (R_PPC_PLTREL32) [word32] */
    PPCPltRel32 = 0x1C,
    /** (R_PPC_PLT16_LO) [half16] */
    PPCPlt16Lo = 0x1D,
    /** (R_PPC_PLT16_HI) [half16] */
    PPCPlt16Hi = 0x1E,
    /** (R_PPC_PLT16_HA) [half16] */
    PPCPlt16Ha = 0x1F,
    /** (R_PPC_SDAREL16) [half16*] */
    PPCSdaRel16 = 0x20,
    /** (R_PPC_SECTOFF) [half16*] */
    PPCSectOff = 0x21,
    /** (R_PPC_SECTOFF_LO) [half16] */
    PPCSectOffLo = 0x22,
    /** (R_PPC_SECTOFF_HI) [half16] */
    PPCSectOffHi = 0x23,
    /** (R_PPC_SECTOFF_HA) [half16] */
    PPCSectOffHa = 0x24,
    /** (R_PPC_ADDR30) [word30] */
    PPCAddr30 = 0x25,

    // ...RESERVED...

    /** (R_PPC_EMB_START) [pseudo] */
    PPCEmbStart = 101,
    /** (R_PPC_EMB_END) [pseudo] */
    PPCEmbEnd = 200,

    // ...RESERVED...
}

/** The type of a relocation field.
 * 
 * This is used to determine the size of data altered at the target address.
 */
export enum RelocationFieldType {
    none = 0, //! size: 0
    /** This specifies a 32-bit field occupying 4 bytes, 
    the alignment of which is 4 bytes unless otherwise specified. */
    word32 = 1, //! size: 4
    /** This specifies a 30-bit field contained within bits 0-29 of a word with
    4-byte alignment. The two least significant bits of the word are unchanged. */
    word30 = 2, //! size: 4
    /** This specifies a 24-bit field contained within a word with 4-byte
    alignment. The six most significant and the two least significant bits of the
    word are ignored and unchanged (for example, "Branch" instruction). */
    low24  = 3, //! size: 4
    /** This specifies a 14-bit field contained within a word with 4-byte
    alignment, comprising a conditional branch instruction. The 14-bit
    relative displacement in bits 16-29, and possibly the "branch prediction
    bit" (bit 10), are altered; all other bits remain unchanged. */
    low14  = 4, //! size: 4
    /** This specifies a 16-bit field occupying 2 bytes with 2-byte alignment
    (for example, the immediate field of an "Add Immediate" instruction). */
    half16 = 5, //! size: 2
}
