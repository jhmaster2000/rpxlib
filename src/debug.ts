import {
    ABI, Class, Endian, ISA, Type, Version,
    SymbolBinding, SymbolType, SymbolVisibility, 
    ProgramFlags, ProgramType,
    SectionFlags, SectionType,
} from './enums.js';
import { RelocationSection, RPLCrcSection, RPLFileInfoSection, StringSection, SymbolSection } from './sections.js';
import { type int, sint16, sint32, sint8 } from './primitives.js';
import { RPL } from './rpl.js';

function log<T>(label: string, value: T, formatter: (v: T) => string = String, parenFormatter?: (v: T) => string, endline = true) {
    process.stdout.write(
        '   ' + label + ' | ' + formatter(value) +
        (parenFormatter ? ` (${parenFormatter(value)})` : '') +
        (endline ? '\n' : '')
    );
}

const hex   = (v: number | int, pad = 0) => '0x' + v.toString(16).toUpperCase().padStart(pad, '0');
const hex8  = (v: number | int) => hex(v, 2);
const hex16 = (v: number | int) => hex(v, 4);
const hex32 = (v: number | int) => hex(v, 8);

const hexSInt = (bits: 4 | 8 | 16 | 24 | 32, num: number | sint8 | sint16 | sint32) => {
    num = +num;
    if (num as number < 0) num = ((0x100 ** (bits / 8)) - 1) + <number>num + 1;
    return '0x'+num.toString(16).toUpperCase().padStart(bits / 4, '0');
};

const stringifyClass = (v: Class) => !+v ? 'None' : (+v === Class.ELF32 ? '32 bit' : '64 bit');
const stringifyEndian = (v: Endian) => Endian[v] ?? 'Unknown';
const stringifyVersion = (v: Version) => Version[v] ?? 'Unknown';
const stringifyABI = (v: ABI) => ABI[v] ?? 'Unknown';
const stringifyType = (v: Type) => {
    const TypeStrings = {
        [Type.None]: 'None',
        [Type.Rel]: 'Relocatable',
        [Type.Exec]: 'Executable',
        [Type.Dyn]: 'Dynamic',
        [Type.Core]: 'Core',
        [Type.LowOS]: 'OS-Specific', // (start)
        [Type.SIE]: 'SIE',
        [Type.RPL]: 'RPL',
        [Type.HighOS]: 'OS-Specific', // (end)
        [Type.LowProc]: 'Processor-Specific', // (start)
        [Type.HighProc]: 'Processor-Specific', // (end)
    };
    const str = TypeStrings[v];
    if (str) return str;
    if (v >= Type.LowOS && v <= Type.HighOS) return 'OS-Specific';
    if (v >= Type.LowProc && v <= Type.HighProc) return 'Processor-Specific';
    return 'Unknown';

};
const stringifyISA = (v: ISA) => {
    const isaStrings = {
        [ISA.None]:  'None',
        [ISA.PPC]:   'PowerPC',
        [ISA.PPC64]: 'PowerPC-64',
    };
    return isaStrings[v] ?? 'Unknown';
};
const stringifyProgramType = (v: ProgramType) => {
    const ProgramTypeStrings = {
        [ProgramType.Null]: 'Null',
        [ProgramType.Load]: 'Loadable',
        [ProgramType.Dynamic]: 'Dynamic',
        [ProgramType.Interp]: 'Interpreter',
        [ProgramType.Note]: 'Note',
        [ProgramType.ShLib]: 'Shared Library',
        [ProgramType.Phdr]: 'Program Headers Table',
        [ProgramType.TLS]: 'Thread Local Storage',
        [ProgramType.LoOS]: 'OS-Specific', // (start)
        [ProgramType.GNUEhFrame]: 'GNU Exception Handling Frame',
        [ProgramType.GNUStack]: 'GNU Stack',
        [ProgramType.GNURelRo]: 'GNU Read-only After Reloc.',
        [ProgramType.SunwBss]: 'SUNW .bss/Low SUNW',
        [ProgramType.SunwStack]: 'SUNW Stack',
        [ProgramType.HiOS]: 'OS-Specific', // (end)
        [ProgramType.LoProc]: 'Processor-Specific', // (start)
        [ProgramType.HiProc]: 'Processor-Specific', // (end)
        [ProgramType.SHT_ARM_ExIdx]: 'ARM Exception Index Table',
        [ProgramType.SHT_ARM_PreemptMap]: 'ARM DLL Link Preemption Map',
        [ProgramType.SHT_ARM_Attributes]: 'ARM Attributes',
        [ProgramType.SHT_ARM_DebugOverlay]: 'ARM Debug Overlay',
        [ProgramType.SHT_ARM_OverlaySection]: 'ARM Overlay Section',
    };
    const str = ProgramTypeStrings[v];
    if (str) return str;
    if (v >= ProgramType.LoOS && v <= ProgramType.HiOS) return 'OS-Specific';
    if (v >= ProgramType.LoProc && v <= ProgramType.HiProc) return 'Processor-Specific';
    return 'Unknown';
};
const stringifyProgramFlags = (v: ProgramFlags) => {
    const str: string[] = ['-', '-', '-'];
    if (v & ProgramFlags.Read)       str[0] = 'R';
    if (v & ProgramFlags.Write)      str[1] = 'W';
    if (v & ProgramFlags.Executable) str[2] = 'X';
    return str.join('');
};
const stringifySectionType = (v: SectionType) => {
    const SectionTypeStrings = {
        [SectionType.Null]: 'Null',
        [SectionType.ProgBits]: 'Program Bits',
        [SectionType.SymTab]: 'Symbol Table',
        [SectionType.StrTab]: 'String Table',
        [SectionType.Rela]: 'Reloc. w/ addends',
        [SectionType.Hash]: 'Hash Table',
        [SectionType.Dynamic]: 'Dynamic Linking',
        [SectionType.Note]: 'Note',
        [SectionType.NoBits]: 'No Bits',
        [SectionType.Rel]: 'Relocations',
        [SectionType.ShLib]: 'Shared Library',
        [SectionType.DynSym]: 'Dynamic Symbol Table',
        [SectionType.InitArray]: 'Constructor Array',
        [SectionType.FiniArray]: 'Destructor Array',
        [SectionType.PreInitArray]: 'Preinit. Array',
        [SectionType.Group]: 'Group',
        [SectionType.SymTabShndx]: 'Symbol Table Index',
        [SectionType.LoOS]: 'OS-Specific', // (start)
        [SectionType.GNUAttributes]: 'GNU Attributes',
        [SectionType.GNUHash]: 'GNU Hash',
        [SectionType.GNULibList]: 'GNU Library List',
        [SectionType.DSOChecksum]: 'DSO Checksum',
        [SectionType.SunwMove]: 'SUNW Move',
        [SectionType.SunwCOMDAT]: 'SUNW COMDAT',
        [SectionType.SunwSymInfo]: 'SUNW Symbol Info',
        [SectionType.GNUVerDef]: 'GNU Version Definition',
        [SectionType.GNUVerNeed]: 'GNU Version Needs',
        [SectionType.GNUVerSym]: 'GNU Version Symbol Table', // (end OS-Specific)
        [SectionType.LoProc]: 'Processor-Specific', // (start)
        [SectionType.HiProc]: 'Processor-Specific', // (end)
        [SectionType.LoUser]: 'User-Specific', // (start)
        [SectionType.HiUser]: 'User-Specific', // (end)
        [SectionType.RPLExports]: 'RPL Exports',
        [SectionType.RPLImports]: 'RPL Imports',
        [SectionType.RPLCrcs]: 'RPL CRCs',
        [SectionType.RPLFileInfo]: 'RPL File Info'
    };
    const str = SectionTypeStrings[v];
    if (str) return str;
    if (v >= SectionType.LoOS && v <= SectionType.HiOS) return 'OS-Specific';
    if (v >= SectionType.LoProc && v <= SectionType.HiProc) return 'Processor-Specific';
    if (v >= SectionType.LoUser && v <= SectionType.HiUser) return 'User-Specific';
    return 'Unknown';
};
const stringifySectionFlags = (v: SectionFlags) => {
    const str: string[] = [];
    if (v & SectionFlags.Write)         str.push('Write');
    if (v & SectionFlags.Alloc)         str.push('Alloc');
    if (v & SectionFlags.Executable)    str.push('Exec');
    if (v & SectionFlags.Merge)         str.push('Merge');
    if (v & SectionFlags.Strings)       str.push('Strings');
    if (v & SectionFlags.InfoLink)      str.push('Info Link');
    if (v & SectionFlags.LinkOrder)     str.push('Link Order');
    if (v & SectionFlags.Nonconforming) str.push('Nonconforming');
    if (v & SectionFlags.Group)         str.push('Group');
    if (v & SectionFlags.TLS)           str.push('Thread Local Storage');
    if (v & SectionFlags.Compressed)    str.push('Compressed');
    if (v & SectionFlags.AMD64Large)    str.push('AMD64 Large');
    if (v & SectionFlags.Ordered)       str.push('Ordered');
    if (v & SectionFlags.Exclude)       str.push('Exclude');
    return str.length === 0 ? '<none>' : str.join(' | ');
};
const stringifySymbolType = (v: SymbolType) => SymbolType[v] ?? 'Unknown';
const stringifySymbolBinding = (v: SymbolBinding) => SymbolBinding[v] ?? 'Unknown';
const stringifySymbolVisibility = (v: SymbolVisibility) => SymbolVisibility[v] ?? 'Unknown';

interface SpecialSectionsOptions {
    strings?: boolean;
    symbols?: boolean;
    relocations?: boolean;
    rplcrcs?: boolean;
    rplfileinfo?: boolean;
}
interface DebugOptions {
    logHeader?: boolean;
    logProgramHeaders?: boolean;
    logSectionHeaders?: boolean;
    logSpecialSections?: boolean | SpecialSectionsOptions;
    logPerformance?: boolean;
}

export function debug(rpx: RPL, options: DebugOptions = {}): void {
    let logperf: (msg: string, startPerf: number) => void;
    if (options.logPerformance) logperf = (msg: string, startPerf: number) => console.log(msg, performance.now() - startPerf, 'ms');
    else logperf = () => void 0;

    options.logHeader ??= true;
    options.logProgramHeaders ??= true;
    options.logSectionHeaders ??= true;
    const specialSections = options.logSpecialSections ?? false;

    const debugPerf = performance.now();
    let perf: number;
    if (options.logHeader) {
        perf = performance.now();
        console.log('[ELF Header]');
        log('Magic                    ', '\x7FELF');
        log('Class                    ', rpx.class, stringifyClass, hex8);
        log('Endian                   ', rpx.endian, stringifyEndian, hex8);
        log('Version                  ', rpx.version, stringifyVersion, hex8);
        log('ABI                      ', rpx.abi, stringifyABI, hex8);
        log('ABI Version              ', rpx.abiVersion, hex8);
        log('Type                     ', rpx.type, stringifyType, hex16);
        log('ISA                      ', rpx.isa, stringifyISA, hex16);
        log('ISA Version              ', rpx.isaVersion, hex32);
        log('Entry Point              ', rpx.entryPoint, hex32);
        log('Prog. H. Offset          ', rpx.programHeadersOffset, hex32);
        log('Sect. H. Offset          ', rpx.sectionHeadersOffset, hex32);
        log('ISA Flags                ', rpx.isaFlags, hex32);
        log('Header Size              ', rpx.headerSize, hex16);
        log('Prog. H. Entry Size      ', rpx.programHeadersEntrySize, hex16);
        log('Prog. H. Entry Count     ', rpx.programHeadersEntryCount, hex16);
        log('Sect. H. Entry Size      ', rpx.sectionHeadersEntrySize, hex16);
        log('Sect. H. Entry Count     ', rpx.sectionHeadersEntryCount, hex16);
        log('Sect. H. StrTab Sect. Idx', rpx.shstrIndex, hex16, String);
        logperf('Got ELF header in', perf);
    }

    if (options.logProgramHeaders) {
        let perfx: number;
        let perfList = performance.now();
        console.log('\n[Segments]');
        console.log('    ##  Type                            Offset      Virt.Addr.  Phys.Addr.  File Size   Mem. Size   Flags             Align');
        for (let i = 0; i < rpx.programs.length; i++) {
            perf = performance.now();
            const program = rpx.programs[i]!;
            let str = '    ' + i.toString().padEnd(2) + '  ';
            perfx = performance.now();
            str += (stringifyProgramType(program.type) + ' (' + hex32(program.type) + ')').padEnd(32);
            logperf('Got program.type in', perfx);
            perfx = performance.now();
            str += hex32(program.storedOffset) + '  ';
            logperf('Got program.offset in', perfx);
            perfx = performance.now();
            str += hex32(program.virtualAddr) + '  ';
            logperf('Got program.virtualAddr in', perfx);
            perfx = performance.now();
            str += hex32(program.physicalAddr) + '  ';
            logperf('Got program.physicalAddr in', perfx);
            perfx = performance.now();
            str += hex32(program.programFileSize) + '  ';
            logperf('Got program.fileSize in', perfx);
            perfx = performance.now();
            str += hex32(program.programMemorySize) + '  ';
            logperf('Got program.memorySize in', perfx);
            perfx = performance.now();
            str += stringifyProgramFlags(program.flags as ProgramFlags) + ' (' + hex32(program.flags) + ')  ';
            logperf('Got program.flags in', perfx);
            perfx = performance.now();
            str += hex32(program.align) + '  ';
            logperf('Got program.align in', perfx);
            console.log(str);
            logperf('Got whole program in', perf);
        }
        logperf('Got entire program list in', perfList);
    }

    if (options.logSectionHeaders) {
        let perfx: number;
        let perfList = performance.now();
        console.log('\n[Sections]');
        console.log('    ##  Name                      Type                            Virt.Addr.  Offset      Size        Ent. Size   Link  Info        Align       Flags');
        for (let i = 0; i < rpx.sections.length; i++) {
            perf = performance.now();
            const section = rpx.sections[i]!;
            let str = '    ';
            str += i.toString().padEnd(2) + '  ';
            perfx = performance.now();
            str += section.name.padEnd(24) + '  ';
            logperf('\nGot section.name in', perfx);
            perfx = performance.now();
            str += (stringifySectionType(section.type) + ' (' + hex32(section.type) + ')').padEnd(32);
            logperf('Got section.type in', perfx);
            perfx = performance.now();
            str += hex32(section.addr) + '  ';
            logperf('Got section.addr in', perfx);
            perfx = performance.now();
            str += hex32(section.offset) + '  ';
            logperf('Got section.offset in', perfx);
            perfx = performance.now();
            str += hex32(section.size) + '  ';
            logperf('Got section.size in', perfx);
            perfx = performance.now();
            str += hex32(section.entSize) + '  ';
            logperf('Got section.entSize in', perfx);
            perfx = performance.now();
            str += (+section.link ? section.link.toString() : '').padStart(4) + '  ';
            logperf('Got section.link in', perfx);
            perfx = performance.now();
            str += (+section.info ? hex32(section.info) : '').padStart(10) + '  ';
            logperf('Got section.info in', perfx);
            perfx = performance.now();
            str += hex32(section.addrAlign) + '  ';
            logperf('Got section.addrAlign in', perfx);
            perfx = performance.now();
            str += stringifySectionFlags(section.flags as SectionFlags) + ' (' + hex32(section.flags) + ')';
            logperf('Got section.flags in', perfx);
            console.log(str);
            logperf('Got whole section in', perf);
        }
        logperf('Got entire section list in', perfList);
    }

    if (specialSections) {
        let perfList = performance.now();
        console.log('\n[Special Sections]');
        for (let i = 0; i < rpx.sections.length; i++) {
            switch (+rpx.sections[i]!.type) {
                case SectionType.StrTab: {
                    if (typeof specialSections !== 'boolean' && !specialSections.strings) break;
                    const section = rpx.sections[i] as StringSection;
                    console.log(`    Section #${i} - String Table:`);
                    perf = performance.now();
                    for (const [addr, str] of Object.entries(section.strings)) {
                        console.log(`        ${hex32(+addr)} = ${str as string}`);
                    }
                    logperf('Traversed StringSection.strings in', perf);
                    break;
                }
                case SectionType.SymTab: {
                    if (typeof specialSections !== 'boolean' && !specialSections.symbols) break;
                    const section = rpx.sections[i] as SymbolSection;
                    console.log(`    Section #${i} - Symbol Table:`);
                    console.log('        Value       Size        Type                    Binding  Visibility  Info Othr  Shndx  Name');
                    perf = performance.now();
                    for (const sym of section.symbols) {
                        let symstr = '        ';
                        symstr += hex32(sym.value) + '  ' + hex32(sym.size) + '  ';
                        symstr += stringifySymbolType(sym.type).padEnd(16);
                        symstr += stringifySymbolBinding(sym.binding).padEnd(9);
                        symstr += stringifySymbolVisibility(sym.visibility).padEnd(12);
                        symstr += hex8(sym.info) + ' ' + hex8(sym.other) + '  ';
                        symstr += sym.shndx.toString().padStart(5) + '  ' + sym.name;
                        console.log(symstr);
                    }
                    logperf('Traversed SymbolSection.symbols in', perf);
                    break;
                }
                case SectionType.Rel: //! fallthrough
                case SectionType.Rela: {
                    if (typeof specialSections !== 'boolean' && !specialSections.relocations) break;
                    const section = rpx.sections[i] as RelocationSection;
                    console.log(`    Section #${i} - Relocations${+section.type === SectionType.Rela ? ' with addends' : ''}:`);
                    console.log('        Addr.       Addend      Info        Type  Sym.Index');
                    perf = performance.now();
                    for (const rel of section.relocations) {
                        let relstr = '        ';
                        relstr += hex32(rel.addr) + '  ' + (+section.type === SectionType.Rela ? hexSInt(32, rel.addend!) : '   N / A  ') + '  ';
                        relstr += `${hex32(rel.info)}  ${hex8(rel.type)}  ${rel.symbolIndex}`;
                        console.log(relstr);
                    }
                    process.stdout.write('\n');
                    logperf('Traversed RelocationSection.relocations in', perf);
                    break;
                }
                case SectionType.RPLCrcs: {
                    if (typeof specialSections !== 'boolean' && !specialSections.rplcrcs) break;
                    const section = rpx.sections[i] as RPLCrcSection;
                    console.log(`    Section #${i} - RPL CRCs:`);
                    perf = performance.now();
                    const crcs = section.crcs;
                    logperf('Computed RPLCrcSection.crcs in', perf);
                    process.stdout.write('        ');
                    for (let i = 0; i < crcs.length; i++) {
                        process.stdout.write(crcs[i]!.toString(16).toUpperCase().padStart(8, '0') + '    ');
                        if ((i + 1) % 10 === 0) process.stdout.write('\n        ');
                    }
                    process.stdout.write('\n\n');
                    break;
                }
                case SectionType.RPLFileInfo: {
                    if (typeof specialSections !== 'boolean' && !specialSections.rplfileinfo) break;
                    const section = rpx.sections[i] as RPLFileInfoSection;
                    perf = performance.now();
                    console.log(`    Section #${i} - RPL File Info:`);
                    console.log('        Magic:', hex16(section.fileinfo.magic));
                    console.log('        Version:', hex16(section.fileinfo.version));
                    console.log('        textSize:', hex32(section.fileinfo.textSize));
                    console.log('        textAlign:', hex32(section.fileinfo.textAlign));
                    console.log('        dataSize:', hex32(section.fileinfo.dataSize));
                    console.log('        dataAlign:', hex32(section.fileinfo.dataAlign));
                    console.log('        loadSize:', hex32(section.fileinfo.loadSize));
                    console.log('        loadAlign:', hex32(section.fileinfo.loadAlign));
                    console.log('        tempSize:', hex32(section.fileinfo.tempSize));
                    console.log('        trampAdjust:', hex32(section.fileinfo.trampAdjust));
                    console.log('        sdaBase:', hex32(section.fileinfo.sdaBase));
                    console.log('        sda2Base:', hex32(section.fileinfo.sda2Base));
                    console.log('        stackSize:', hex32(section.fileinfo.stackSize));
                    console.log('        stringsOffset:', hex32(section.fileinfo.stringsOffset));
                    console.log('        flags:', hex32(section.fileinfo.flags));
                    console.log('        heapSize:', hex32(section.fileinfo.heapSize));
                    console.log('        tagOffset:', hex32(section.fileinfo.tagOffset));
                    console.log('        minVersion:', hex32(section.fileinfo.minVersion));
                    console.log('        compressionLevel:', hexSInt(32, section.fileinfo.compressionLevel));
                    console.log('        trampAddition:', hex32(section.fileinfo.trampAddition));
                    console.log('        fileInfoPad:', hex32(section.fileinfo.fileInfoPad));
                    console.log('        cafeSdkVersion:', hex32(section.fileinfo.cafeSdkVersion));
                    console.log('        cafeSdkRevision:', hex32(section.fileinfo.cafeSdkRevision));
                    console.log('        tlsModuleIndex:', hex16(section.fileinfo.tlsModuleIndex));
                    console.log('        tlsAlignShift:', hex16(section.fileinfo.tlsAlignShift));
                    console.log('        runtimeFileInfoSize:', hex32(section.fileinfo.runtimeFileInfoSize));
                    console.log('        Strings:', section.strings);
                    logperf('Traversed RPLFileInfoSection.fileinfo in', perf);
                    break;
                }
                default: continue;
            }
        }
        logperf('Got all special sections in', perfList);
    }
    logperf('\nFinished debugging in', debugPerf);
}
