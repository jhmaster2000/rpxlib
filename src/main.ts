import path from 'path';
import { debug } from './debug'; debug;
import { RPL } from './rpl';

function WSLSafePath(patharg: string): string {
    if (!process.env.WSL_DISTRO_NAME) return patharg;
    const { dir, name } = path.win32.parse(patharg);
    return path.posix.join('/mnt/', dir[0].toLowerCase(), dir.slice(3), name);
}

console.time('total');

const RPX_PATH: string = WSLSafePath('Q:/.EmulatorGames/WiiU/Tools/SuperHacks/rpxs/red-pro2.vanilla.rpx');
console.time('open file');
const RPX_DATA: ArrayBuffer = await Bun.file(RPX_PATH).arrayBuffer();
console.timeEnd('open file');
console.time('parse file');
const rpx = new RPL(RPX_DATA);
console.timeEnd('parse file');

console.time('debug file');
await debug(rpx, { rplcrcs: true });
console.timeEnd('debug file');

console.timeEnd('total');
