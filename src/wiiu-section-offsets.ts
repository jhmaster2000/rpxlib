import { SectionFlags, SectionType, Type } from './enums.js';
import { type Section } from './sections.js';
import { type RPL } from './rpl.js';

/**
 * The Wii U RPL loader requires the data (not headers) of all sections to be arranged in a specific order in the file.
 *
 * This is not required by Cemu, but real Wii U consoles will reject loading RPLs with incorrectly ordered section data.
 *
 * ? Required section data file offset order:
 * 1. RPLCrcs section
 * 2. RPLFileInfo section
 * 3. DATA (0x10000000) sections <flags = +Write && +Alloc && -Exec>
 * 4. LOAD (0xC0000000) sections <flags = -Write && +Alloc && -Exec> || <type = RPLExports || RPLImports>
 * 5. CODE (0x02000000) sections <flags =                     +Exec> [a.k.a TEXT]
 * 6. TEMP (no v. addr) sections <flags =           -Alloc && -Exec>
 *
 * The placement of "NO DATA" sections (such as NoBits/.bss or Null)
 * is irrelevant as they will just be skipped during serialization anyway.
 */
export function sortSectionsForWiiU(file: RPL) {
    if (+file.type !== Type.RPL) throw new Error('Cannot apply Wii U section data ordering to non-RPL file.');

    const sortedSections: Section[] = [];
    // DATA_sections are pushed directly to sortedSections
    const LOAD_sections: Section[] = [];
    const CODE_sections: Section[] = [];
    const TEMP_sections: Section[] = [];

    //* RPLCrcs & RPLFileInfo
    const { crcSection, fileinfoSection } = file;
    sortedSections.push(crcSection!, fileinfoSection!);

    const SectionFlags_WriteAlloc = SectionFlags.Write | SectionFlags.Alloc;
    const SectionFlags_WriteExec = SectionFlags.Write | SectionFlags.Executable;

    // Slice off RPL CRCs and FileInfo from the end
    for (const section of file.sections.slice(0, -2)) {
        //* DATA sections
        if (
            (+section.flags & SectionFlags_WriteAlloc) === SectionFlags_WriteAlloc &&
            !(+section.flags & SectionFlags.Executable)
        ) {
            sortedSections.push(section);
            continue;
        }

        //* LOAD sections
        if (
            // These types need special-casing because .fimport_*/.fexports have the Exec flag but still belong in the LOAD group.
            +section.type === SectionType.RPLExports || +section.type === SectionType.RPLImports ||
            ((+section.flags & SectionFlags.Alloc) && !(+section.flags & SectionFlags_WriteExec)) // String/Symbol Table sections
        ) {
            LOAD_sections.push(section);
            continue;
        }

        //* CODE sections
        if (+section.flags & SectionFlags.Executable) {
            CODE_sections.push(section);
            continue;
        }

        //* TEMP sections
        // -Alloc condition implicitly fullfilled here by DATA+LOAD+CODE consuming all possible +Alloc sections
        // -Exec condition implicitly fullfilled here by CODE consuming all +Exec sections
        // As a sanity check, we'll just check if the section has no virtual address (it probably shouldn't be in TEMP if it has)
        if (+section.addr === 0) {
            TEMP_sections.push(section);
            continue;
        }

        //! Uncategorized section
        throw new Error(`Section #${section.index} (${section.name}) could not be categorized for Wii U required section data ordering.`);
    }
    // Merge all sorted categories into final order result
    sortedSections.push(...LOAD_sections, ...CODE_sections, ...TEMP_sections);
    return sortedSections;
}
