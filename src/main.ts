import path from 'path';
//import { debug } from './debug';
import { RPL } from './rpl';

function WSLSafePath(patharg: string): string {
    if (!process.env.WSL_DISTRO_NAME) return patharg;
    const { dir, name } = path.win32.parse(patharg);
    return path.posix.join('/mnt/', dir[0].toLowerCase(), dir.slice(3), name);
}

const RPX_PATH: string = WSLSafePath('Q:/.EmulatorGames/WiiU/Tools/SuperHacks/rpxs/red-pro2.vanilla.rpx');
console.log(RPX_PATH);
console.time('open rpx');
const rpx = new RPL(RPX_PATH);
console.timeEnd('open rpx');
rpx;

//console.log(rpx.sections[1]);

//await debug(rpx);
