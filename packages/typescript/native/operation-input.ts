// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=677d0996e2a07183d5a7d031f2a6de0d411aefc2f8109c4118db2a28f0d92daf; dynamic any annotations are explicit draft gaps.
import { open, lstat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, dirname, parse } from 'node:path';
const fail: any = (message?: any): any => (Object as any).assign(new (Error as any)(message), { code: 'operation_input', exitCode: 2 });
export async function requireNativePath(path?: any): Promise<any> {
    for (let current: any = resolve(path);;) {
        let stat: any;
        try {
            (stat as any) = await lstat(current);
        }
        catch (error: any) {
            if (error.code !== 'ENOENT')
                throw error;
        }
        if (stat?.isSymbolicLink())
            throw fail('Operation input contains a symlink');
        if (current === parse(current).root)
            return stat;
        (current as any) = dirname(current);
    }
}
export async function readNativeText(path?: any, { cwd = (process as any).cwd(), maxBytes = 64 * 1024 * 1024 }: any = {}): Promise<string> {
    (path as any) = resolve(cwd, path);
    await requireNativePath(path);
    const file: any = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    try {
        const stat: any = await file.stat();
        if (!stat.isFile() || stat.size > maxBytes)
            throw fail('Operation input requires a regular file within its byte budget');
        const chunks: any = [];
        let bytes: any = 0;
        while (true) {
            const buffer: any = (Buffer as any).alloc((Math as any).min(65536, maxBytes - bytes + 1)), part: any = await file.read(buffer, 0, buffer.length, null);
            if (!part.bytesRead)
                break;
            (bytes as any) += part.bytesRead;
            if (bytes > maxBytes)
                throw fail('Operation input exceeds its byte budget');
            chunks.push(buffer.subarray(0, part.bytesRead));
        }
        return new (TextDecoder as any)('utf-8', { fatal: true, ignoreBOM: true }).decode((Buffer as any).concat(chunks, bytes));
    }
    finally {
        await file.close();
    }
}
