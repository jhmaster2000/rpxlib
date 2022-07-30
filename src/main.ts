import { debug } from './debug'; debug;
import { RPL } from './rpl';
import { WSLSafePath } from './wslsafepath';

console.time('total');

const RPX_PATH: string = WSLSafePath('Q:/.EmulatorGames/WiiU/Tools/SuperHacks/rpxs/red-pro2.vanilla.rpx');
console.time('open file');
const RPX_DATA: ArrayBuffer = await Bun.file(RPX_PATH).arrayBuffer();
console.timeEnd('open file');
console.time('parse file');
const rpx = new RPL(RPX_DATA);
console.timeEnd('parse file');

//console.time('debug file');
//await debug(rpx, { rplcrcs: true });
//console.timeEnd('debug file');

console.time('save file');
await rpx.save('output.elf');
console.timeEnd('save file');

console.timeEnd('total');
