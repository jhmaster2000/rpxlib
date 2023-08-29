# RPXLib
A general purpose RPL/RPX library.

[![GitHub version][github-image]][github-url]
[![downloads][downloads-image]][npm-url]
[![GitHub code size in bytes][size-image]][github-url]

[![npm release][npm-image]][npm-url]
[![node-current][node-image]][node-url]
[![license][license-image]][license-url]

* Single dependency
* Reading and writing support
* Balanced between speed and data integrity

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
    * However `RPL.addressRanges` is provided to assist with finding the right values to use.
* Relocation sections are not parsed by default as they can be very large and slow to parse, it is recommended to read relocations manually from the raw data as you need them.
    * If you really want relocations parsed, you can pass an options object with `parseRelocs: true` to the `RPL` constructor.
        * You will be blocked from writing to the raw data of relocation sections if the relocations are parsed.
* Most special section types do not allow writing directly to their raw data to prevent desync from the parsed data and the raw data.
    * The parsed data of special sections will be serialized and overwrite the raw data upon each request to read the raw data.
        * For this reason it's highly recommended to not repeatedly call `Section.data` without need as you will be repeatedly regenerating the data for special sections.
        * It's also highly recommended to use `Section.size` over `Section.data.byteLength`, as the former does not require the generation of the entire raw section data for special sections.
* Program headers (segments) are parsed as read-only without data references and cannot be saved back.

[github-url]:https://github.com/jhmaster2000/rpxlib
[github-image]:https://img.shields.io/github/package-json/v/jhmaster2000/rpxlib.svg
[license-url]:https://github.com/jhmaster2000/rpxlib/blob/master/LICENSE.md
[license-image]:https://img.shields.io/npm/l/rpxlib.svg
[npm-url]:http://npmjs.org/package/rpxlib
[npm-image]:https://img.shields.io/npm/v/rpxlib.svg?color=darkred&label=npm%20release
[downloads-image]:https://img.shields.io/npm/dt/rpxlib.svg
[node-url]:https://nodejs.org/en/download
[node-image]:https://img.shields.io/node/v/rpxlib.svg
[size-image]:https://img.shields.io/github/languages/code-size/jhmaster2000/rpxlib.svg
