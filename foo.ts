// NO ESLINT
console.log();

import path from 'path';

function WSLSafePath(patharg: string): string {
    if (!process.env.WSL_DISTRO_NAME) return patharg;
    const parsed = path.win32.parse(patharg);
    console.dir(parsed);
    return path.posix.join('/mnt/', parsed.root[0]!.toLowerCase(), parsed.dir.slice(parsed.root.length), parsed.base);
}

const FILEPATH: string = WSLSafePath('C:/foo/bar/baz/myfile.jpeg');
console.log(FILEPATH);
