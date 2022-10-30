import path from 'path';

namespace Util {
    export function resolve(relativePath: string, from: string = process.cwd()) {
        return path.resolve(from, relativePath);
    }

    export function roundUp(n: number, multiple: number): number {
        return Math.ceil(n / multiple) * multiple;
    }
}

export default Util;
