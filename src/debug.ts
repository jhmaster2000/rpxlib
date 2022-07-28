import { ABI, Class, Endian, ISA, SectionFlags, SectionType, SymbolBinding, SymbolType, SymbolVisibility, Type, Version } from './enums';
import { int, sint16, sint32, sint8, uint32 } from './primitives';
import { RPL } from './rpl';
import { RelocationSection, RPLCrcSection, RPLFileInfoSection, StringSection, SymbolSection } from './sections';

async function log<T>(label: string, value: T, formatter: (v: T) => string = String, parenFormatter?: (v: T) => string, endline = true) {
    await Bun.write(Bun.stdout,
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
    if (num < 0) num = ((0x100 ** (bits / 8)) - 1) + <number>num + 1;
    return '0x'+num.toString(16).toUpperCase().padStart(bits / 4, '0');
};

const stringifyClass = (v: Class) => {
    if (!+v) return 'None';
    return +v === Class.ELF32 ? '32 bit' : '64 bit';
};
const stringifyEndian = (v: Endian) => {
    if (!+v) return 'None';
    return +v === Endian.Little ? 'Little' : 'Big';
};
const stringifyVersion = (v: Version) => {
    return +v === Version.Current ? 'Current' : 'None';
};
const stringifyABI = (v: ABI) => {
    if (!+v) return 'SystemV';
    return +v === ABI.CafeOS ? 'CafeOS' : 'Standalone';
};
const stringifyType = (v: Type) => {
    return +v === Type.RPL ? 'RPL' : 'None';
};
const stringifyISA = (v: ISA) => {
    if (!+v) return 'None';
    return +v === ISA.PPC ? 'PowerPC' : 'PowerPC 64';
};
const stringifySectionType = (v: SectionType) => {
    const SectionTypeStrings = {
        0x00000000: 'Null',
        0x00000001: 'Program Bits',
        0x00000002: 'Symbol Table',
        0x00000003: 'String Table',
        0x00000004: 'Reloc. w/ addends',
        0x00000007: 'Note',
        0x00000008: 'No Bits',
        0x00000009: 'Relocations',
        0x80000001: 'RPL Exports',
        0x80000002: 'RPL Imports',
        0x80000003: 'RPL CRCs',
        0x80000004: 'RPL File Info'
    };
    return SectionTypeStrings[v];
};
const stringifySectionFlags = (v: uint32) => {
    let str: string[] = [];
    if (<number>v & SectionFlags.Write)         str.push('Write');
    if (<number>v & SectionFlags.Alloc)         str.push('Alloc');
    if (<number>v & SectionFlags.Executable)    str.push('Exec');
    if (<number>v & SectionFlags.Merge)         str.push('Merge');
    if (<number>v & SectionFlags.Strings)       str.push('Strings');
    if (<number>v & SectionFlags.InfoLink)      str.push('Info Link');
    if (<number>v & SectionFlags.LinkOrder)     str.push('Link Order');
    if (<number>v & SectionFlags.Nonconforming) str.push('Nonconforming');
    if (<number>v & SectionFlags.Group)         str.push('Group');
    if (<number>v & SectionFlags.TLS)           str.push('Thread Local Storage');
    if (<number>v & SectionFlags.Compressed)    str.push('Compressed');
    if (<number>v & SectionFlags.AMD64Large)    str.push('AMD64 Large');
    if (<number>v & SectionFlags.Ordered)       str.push('Ordered');
    if (<number>v & SectionFlags.Exclude)       str.push('Exclude');
    return str.length === 0 ? '<none>' : str.join(' | ');
};
const stringifySymbolType = (v: SymbolType) => {
    return SymbolType[v] ?? 'Unknown';
};
const stringifySymbolBinding = (v: SymbolBinding) => {
    return SymbolBinding[v] ?? 'Unknown';
};
const stringifySymbolVisibility = (v: SymbolVisibility) => {
    return SymbolVisibility[v] ?? 'Unknown';
};

interface SpecialSectionsOptions {
    strings?: boolean;
    symbols?: boolean;
    relocations?: boolean;
    rplcrcs?: boolean;
    rplfileinfo?: boolean;
}

export async function debug(rpx: RPL, specialSections: boolean | SpecialSectionsOptions = false, logPerfs = false): Promise<void> {
    let logperf: (msg: string, startPerf: number) => void;
    if (logPerfs) logperf = (msg: string, startPerf: number) => console.log(msg, performance.now() - startPerf, 'ms');
    else logperf = () => { return; };

    const debugPerf = performance.now();
    let perf = performance.now();
    console.log('[ELF Header]');
    await log('Magic                    ', rpx.magic);
    await log('Class                    ', rpx.class, stringifyClass, hex8);
    await log('Endian                   ', rpx.endian, stringifyEndian, hex8);
    await log('Version                  ', rpx.version, stringifyVersion, hex8);
    await log('ABI                      ', rpx.abi, stringifyABI, hex8);
    await log('ABI Version              ', rpx.abiVersion, hex8);
    await log('Type                     ', rpx.type, stringifyType, hex16);
    await log('ISA                      ', rpx.isa, stringifyISA, hex16);
    await log('ISA Version              ', rpx.isaVersion, hex32);
    await log('Entry Point              ', rpx.entryPoint, hex32);
    await log('Prog. H. Offset          ', rpx.programHeadersOffset, hex32);
    await log('Sect. H. Offset          ', rpx.sectionHeadersOffset, hex32);
    await log('ISA Flags                ', rpx.isaFlags, hex32);
    await log('Header Size              ', rpx.headerSize, hex16);
    await log('Prog. H. Entry Size      ', rpx.programHeadersEntrySize, hex16);
    await log('Prog. H. Entry Count     ', rpx.programHeadersEntryCount, hex16);
    await log('Sect. H. Entry Size      ', rpx.sectionHeadersEntrySize, hex16);
    await log('Sect. H. Entry Count     ', rpx.sectionHeadersEntryCount, hex16);
    await log('Sect. H. StrTab Sect. Idx', rpx.shstrIndex, hex16);
    logperf('Got ELF header in', perf);

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
        str += stringifySectionFlags(section.flags) + ' (' + hex32(section.flags) + ')';
        logperf('Got section.flags in', perfx);
        console.log(str);
        logperf('Got whole section in', perf);
    }
    logperf('Got entire section list in', perfList);

    if (specialSections) {
        perfList = performance.now();
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
                case SectionType.Rela: {
                    if (typeof specialSections !== 'boolean' && !specialSections.relocations) break;
                    const section = rpx.sections[i] as RelocationSection;
                    console.log(`    Section #${i} - Relocations with addends:`);
                    console.log('        Addr.       Addend      Info        Type  Sym.Index');
                    perf = performance.now();
                    for (const rel of section.relocations) {
                        let relstr = '        ';
                        relstr += hex32(rel.addr) + '  ' + hexSInt(32, rel.addend!) + '  ';
                        relstr += `${hex32(rel.info)}  ${hex8(rel.type)}  ${rel.symbolIndex}`;
                        console.log(relstr);
                    }
                    await Bun.write(Bun.stdout, '\n');
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
                    await Bun.write(Bun.stdout, '        ');
                    for (let i = 0; i < crcs.length; i++) {
                        await Bun.write(Bun.stdout, crcs[i]!.toString(16).toUpperCase().padStart(8, '0') + '    ');
                        if ((i + 1) % 10 === 0) await Bun.write(Bun.stdout, '\n        ');
                    }
                    await Bun.write(Bun.stdout, '\n\n');
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
                    console.log('        Strings:', section.fileinfo.strings);
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
