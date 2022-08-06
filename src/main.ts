import { debug } from './debug'; debug;
import { RPL } from './rpl';
import { WSLSafePath } from './wslsafepath';
import { SectionFlags, SectionType } from './enums';
import { CodeBaseAddress, DataBaseAddress } from './primitives';
import { Section } from './sections';
import fs from 'fs';

console.time('total');

const RPX_PATH = WSLSafePath('Q:/.EmulatorGames/WiiU/Tools/SuperHacks/rpxs/red-pro2.vanilla.rpx');
console.time('load file');
const RPX_DATA = fs.readFileSync(RPX_PATH);
console.timeEnd('load file');
console.time('parse file');
const rpx = new RPL(RPX_DATA);
console.timeEnd('parse file');

//console.time('debug file');
//await debug(rpx);
//console.timeEnd('debug file');

const rplcrcsStrAddr = rpx.shstrSection.strings.add('.rplcrcs');
const rplfileinfoStrAddr = rpx.shstrSection.strings.add('.rplfileinfo');
rpx.crcSection.nameOffset = rplcrcsStrAddr;
rpx.fileinfoSection.nameOffset = rplfileinfoStrAddr;

const nextFreeTextAddr = rpx.addressRanges.free.find(([startAddr]) => startAddr >= CodeBaseAddress && startAddr < DataBaseAddress)![0];

const syscall = new Section({
    nameOffset: rpx.shstrSection.strings.add('.haxx.syscall'),
    type: SectionType.ProgBits,
    flags: SectionFlags.Executable | SectionFlags.Alloc,
    addr: nextFreeTextAddr,
    link: 0,
    info: 0,
    addrAlign: 0x20,
    entSize: 0,
    data: Buffer.from('60000000600000004E800020', 'hex')
}, rpx);
rpx.pushSection(syscall);

rpx.fileinfoSection.adjustFileInfoSizes();

console.time('save file');
const savedTo = rpx.save('output3');
console.log(`Saved file to: ${savedTo}`);
console.timeEnd('save file');

//const RPX_PATH2 = './output.rpx';
//const RPX_DATA2 = fs.readFileSync(RPX_PATH2);
//const out = new RPL(RPX_DATA2);
//console.log(out.toString());

console.timeEnd('total');
