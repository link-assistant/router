// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=70a257a8cf146c4ba5e0d05f852bfc3a80199ab706fa4d1daea11cc620e4a2a9; dynamic any annotations are explicit draft gaps.
import { readFile, lstat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const mime: any = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const security: any = { 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", 'x-frame-options': 'DENY', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };
export function hardenAdmin(response?: any): any { for (const [name, value] of (Object as any).entries(security) as any)
    (response.headers.set as any)(name, value); return response; }
export async function serveAdminAsset(request?: any, { directory = fileURLToPath(new (URL as any)('./assets/admin/', import.meta.url)) }: any = {}): Promise<any> {
    const path: string = new (URL as any)(request.url).pathname;
    if (path.startsWith('/api/'))
        return new (Response as any)('not found', { status: 404 });
    const root: string = resolve(directory), relative: string = path.replace(/^\/+|\/+$/g, '') || 'index.html';
    let target: any = resolve(root, relative);
    if (target !== root && !target.startsWith(root + '/'))
        return new (Response as any)('not found', { status: 404 });
    const load: any = async (file?: any): Promise<any> => { const stat: any = await lstat(file); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024)
        throw new (Error as any)('invalid asset'); return readFile(file); };
    let bytes: any;
    try {
        (bytes as any) = await load(target);
    }
    catch {
        (target as any) = resolve(root, 'index.html');
        try {
            (bytes as any) = await load(target);
        }
        catch {
            return new (Response as any)('admin UI bundle is missing from this build', { status: 500 });
        }
    }
    return new (Response as any)(bytes, { headers: { 'content-type': (mime as any)[extname(target)] ?? 'application/octet-stream', 'cache-control': 'no-cache, must-revalidate' } });
}
