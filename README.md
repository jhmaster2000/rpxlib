# RPXLib

A general purpose RPL/RPX library.

## Usage
```ts
import * as rpxlib from 'rpxlib';
import fs from 'fs';

const rpxFileData = fs.readFileSync('./path/to/file.rpx');
const rpx = new rpxlib.RPL(rpxFileData);

// Modify rpx as desired

// Do not include the extension!
rpx.save('./path/to/save/file', true);
// Modified RPX will be at ./path/to/save/file.rpx
```

## Notes

* The library automatically handles and calculates section offsets, sizes, indexes, among other values and as such doesn't allow manually setting those.
* In contrast, section virtual addresses are *NOT* handled or checked, the user must ensure those are valid manually.
    * However `RPX.addressRanges` is provided to assist with finding the right values to use.
* Relocation sections are not parsed by default as they can be very large and slow to parse, it is recommended to read relocations manually from the raw data as you need them.
    * If you really want relocations parsed, you can pass an options object with `parseRelocs: true` to the `RPL` constructor.
        * You will be blocked from writing to the raw data of relocation sections if the relocations are parsed.
* Most special section types do not allow writing directly to their raw data to prevent desync from the parsed data and the raw data.
    * The parsed data of special sections will be serialized and overwrite the raw data upon each request to read the raw data.
        * For this reason it's highly recommended to not repeatedly call `Section.data` without need as you will be repeatedly regenerating the data for special sections.
        * It's also highly recommended to use `Section.size` over `Section.data.byteLength`, as the former does not require the generation of the entire raw section data for special sections.
* Segment headers and data are not parsed since RPL/RPX files are not known to use those.
