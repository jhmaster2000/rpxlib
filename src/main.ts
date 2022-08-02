import { debug } from './debug'; debug;
import { RPL } from './rpl';
import { WSLSafePath } from './wslsafepath';
import fs from 'fs';

console.time('total');

const RPX_PATH = WSLSafePath('Q:/.EmulatorGames/WiiU/Tools/SuperHacks/rpxs/red-pro2.vanilla.rpx');
const RPX_DATA = fs.readFileSync(RPX_PATH);
console.time('parse file');
const rpx = new RPL(RPX_DATA);
console.timeEnd('parse file');

//console.time('debug file');
//await debug(rpx, { rplfileinfo: true });
//console.timeEnd('debug file');

console.time('save file');
rpx.save('output.elf');
console.timeEnd('save file');

//const RPX_PATH2 = './output.rpx';
//const RPX_DATA2 = fs.readFileSync(RPX_PATH2);
//const out = new RPL(RPX_DATA2);
//console.log(out.toString());

console.timeEnd('total');
