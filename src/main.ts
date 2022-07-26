import path from 'path';
import { debug } from './debug'; debug;
import { RPL } from './rpl';

function WSLSafePath(patharg: string): string {
    if (!process.env.WSL_DISTRO_NAME) return patharg;
    const { dir, name } = path.win32.parse(patharg);
    return path.posix.join('/mnt/', dir[0].toLowerCase(), dir.slice(3), name);
}

const RPX_PATH: string = WSLSafePath('Q:/.EmulatorGames/WiiU/Tools/SuperHacks/rpxs/red-pro2.vanilla.rpx');
console.time('open rpx');
const RPX_DATA: ArrayBuffer = await Bun.file(RPX_PATH).arrayBuffer();
const rpx = new RPL(RPX_DATA);
console.timeEnd('open rpx');
rpx;

await debug(rpx);
