import { debug } from './debug'; debug;
import { RPL } from './rpl';
import { WSLSafePath } from './wslsafepath';
import fs from 'fs';

console.time('total');

const RPX_PATH: string = WSLSafePath('Q:/.EmulatorGames/WiiU/Tools/SuperHacks/rpxs/red-pro2.vanilla.rpx');
const RPX_DATA = fs.readFileSync(RPX_PATH);
console.time('parse file');
const rpx = new RPL(RPX_DATA);
console.timeEnd('parse file');

//console.time('debug file');
//await debug(rpx, { rplcrcs: true });
//console.timeEnd('debug file');

console.time('save file');
rpx.save('output.elf');
console.timeEnd('save file');

console.timeEnd('total');
