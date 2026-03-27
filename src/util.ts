import path from 'node:path';

namespace Util {
    export function resolve(relativePath: string, from: string = process.cwd()) {
        return path.resolve(from, relativePath);
    }

    /** Align `n` to nearest multiple of `mult`. */
    export function roundUp(n: number, mult: number): number {
        if (mult <= 1) return n;
        return Math.ceil(n / mult) * mult;
    }

    /**
     * Fast align `n` to nearest multiple of a power of 2.
     * 
     * Doesn't work with non-powers-of-2, input is not validated, output will simply be wrong. */
    export function roundUpPow2(n: number, powerOf2: number): number {
        if (powerOf2 <= 1) return n;
        return (n + powerOf2 - 1) & ~(powerOf2 - 1);
    }
}

export default Util;
