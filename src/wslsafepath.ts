import path from 'path';

/**
 * Converts Windows paths to WSL Windows paths if on a WSL environment.
 *
 * - Paths that are already valid Linux paths or WSL Windows paths will not be modified.
 * - If on Windows and outside of WSL, paths with backslashes will be converted to forward slashes.
 * - Windows paths with mixed slashes are supported. Linux paths with mixed slashes are not.
 * @example `C:\\root\\pop\\bob\\foobar.jpeg` -> `/mnt/c/root/pop/bob/foobar.jpeg`
 * @param absolutePath The given path must be absolute,
 * since relative paths are completely ambiguous whether they are Windows, WSL, or Linux.
 * @returns The output path, converted or unmodified as appropriate based on the above conditions.
 */
export function WSLSafePath(absolutePath: string): string {
    if (process.platform === 'linux') {
        // Not running on WSL: the path can only be a valid Linux path
        if (!process.env.WSL_DISTRO_NAME)
            return absolutePath;
        // Running on WSL: Linux path, does not need changes
        if (absolutePath.startsWith('/'))
            return absolutePath;
        // Running on WSL, Windows path, convert to Linux path at /mnt/<drive>/*
        absolutePath = absolutePath.replaceAll('\\', '/');
        const { dir } = path.win32.parse(absolutePath);
        return path.posix.join('/mnt/', dir[0].toLowerCase(), dir.slice(3), path.win32.basename(absolutePath));
    } else {
        // Not running on Linux: the path can only be a valid Windows path
        // However let's convert it to forward slashes because they're better, and so we
        // don't need to deal with backslashes anywhere else when using this WSLSafePath function.
        return absolutePath.replaceAll('\\', '/');
    }
}
