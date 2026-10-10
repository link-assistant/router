// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=48ade2b0bf44cd3f301842b0bd72ce266a7b91b4f75b21844216b9c0414d59c2; dynamic any annotations are explicit draft gaps.
import { open, lstat, readdir, mkdir, mkdtemp, rename, chmod, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, join, dirname, parse } from 'node:path';
import * as zlib from 'node:zlib';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { isIP } from 'node:net';
const exec: any = promisify(execFile);
const tlsTasks: any = new (Map as any)();
const MAX_BYTES: any = 256 * 1024 * 1024, MAX_FILES: any = 10000, MAX_DEPTH: any = 128;
const unsupported: any = (message?: any): any => Object.assign(new (Error as any)(message), { code: 'unsupported' });
const bad: any = (message?: any): any => Object.assign(new (Error as any)(message), { code: 'invalid_resource' });
export const supportedResourceOperations: any = Object.freeze({
    'logs.show': { status: 'partial', limitations: ['Local logs only; 256 MiB / 10000-file read budget; symlinks refused; zstd needs a Node runtime with zstdDecompressSync.'] },
    'logs.summary': { status: 'partial', limitations: ['Local logs only; 256 MiB / 10000-file read budget; symlinks refused; zstd needs a Node runtime with zstdDecompressSync.'] },
    'logs.anomalies': { status: 'partial', limitations: ['Local logs only; 256 MiB / 10000-file read budget; symlinks refused; zstd needs a Node runtime with zstdDecompressSync.'] },
    'tls.ca': { status: 'partial', limitations: ['Local generated certificate only; symlinks refused; PEM size bounded to 1 MiB.'] },
    'tls.generate': { status: 'partial', limitations: ['Local only; requires openssl on PATH; validates names; symlinks refused; existing complete pair reused.'] },
});
export function decodeLogLine(source?: any): any {
    const text: any = source.trim();
    if (!text)
        return undefined;
    if (/^[\[{]/.test(text)) {
        try {
            return JSON.parse(text as any);
        }
        catch {
            return undefined;
        }
    }
    let pos: any = 0;
    const space: any = (): any => { while (/\s/.test((text as any)[pos] ?? '') && pos < text.length)
        pos++; };
    const expect: any = (char?: any): any => { if ((text as any)[pos++] !== char)
        throw bad('Malformed log record'); };
    const quoted: any = (escaped?: any): any => {
        expect('"');
        let value: any = '', closed: any = false;
        while (pos < text.length) {
            const ch: any = (text as any)[pos++];
            if (ch === '"') {
                closed = true;
                break;
            }
            if (ch === '\\') {
                const next: any = (text as any)[pos++];
                if (next === undefined)
                    throw bad('Malformed quoted record');
                value += next === 'n' ? '\n' : next === 'r' ? '\r' : next;
            }
            else
                value += ch;
        }
        if (!closed)
            throw bad('Malformed quoted record');
        return escaped ? value === '%z' ? '' : value.replace(/%([0-9a-fA-F]{2})/g, (_?: any, hex?: any): any => String.fromCharCode(parseInt(hex, 16))) : value;
    };
    const value: any = (escaped: any = false, depth: any = 0): any => {
        if (depth > MAX_DEPTH)
            throw bad('Log record nesting exceeds 128');
        space();
        if ((text as any)[pos] === '"')
            return quoted(escaped);
        if ((text as any)[pos] !== '(') {
            const start: any = pos;
            while (pos < text.length && !/[\s()]/.test((text as any)[pos]))
                pos++;
            const token: any = text.slice(start, pos);
            if (['null', 'true', 'false'].includes(token))
                return JSON.parse(token as any);
            if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(token))
                throw bad('Malformed scalar record');
            const number: any = Number(token);
            if (!Number.isFinite(number))
                throw bad('Invalid number');
            return number;
        }
        pos++;
        space();
        let marker: any = null;
        if ((text as any)[pos] === '#') {
            marker = text.slice(pos, pos + 2);
            pos += 2;
            if (!['#a', '#o'].includes(marker))
                throw bad('Invalid marker');
        }
        const object: any = Object.create(null), items: any = [];
        let keyed: any = true, pairs: any = 0;
        while (true) {
            space();
            if (pos >= text.length)
                throw bad('Unclosed record');
            if ((text as any)[pos] === ')') {
                pos++;
                break;
            }
            if (marker === '#o' || (!marker && (text as any)[pos] === '(' && (text as any)[pos + 1] === ':')) {
                expect('(');
                if (!marker)
                    expect(':');
                space();
                const name: any = quoted(marker === '#o');
                (object as any)[name] = value(marker === '#o', depth + 1);
                space();
                expect(')');
                pairs++;
            }
            else {
                keyed = false;
                items.push(value(marker === '#a', depth + 1));
            }
        }
        if (marker === '#o' || (!marker && keyed && pairs))
            return object;
        if (!marker && !pairs && !items.length)
            return null;
        return items;
    };
    try {
        const record: any = value((text as any)[0] !== '(');
        space();
        return pos === text.length ? record : undefined;
    }
    catch {
        return undefined;
    }
}
async function statOptional(path?: any): Promise<any> { try {
    return await lstat(path);
}
catch (error: any) {
    if (error.code === 'ENOENT')
        return null;
    throw error;
} }
async function noLinks(path?: any): Promise<any> {
    let current: any = resolve(path), hops: any = 0;
    while (true) {
        const stat: any = await statOptional(current);
        if (stat?.isSymbolicLink())
            throw bad(`Resource path contains a symlink: ${current}`);
        if (current === parse(current).root)
            break;
        current = dirname(current);
        if (++hops > 256)
            throw bad('Resource path is too deep');
    }
}
async function boundedFile(path?: any, budget?: any): Promise<any> {
    await noLinks(path);
    const handle: any = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    try {
        const stat: any = await handle.stat();
        if (!stat.isFile())
            throw bad(`Resource requires a regular file: ${path}`);
        if (stat.size > budget.remaining)
            throw unsupported(`Resource read exceeds the ${budget.limit} byte budget`);
        const chunks: any = [];
        let total: any = 0;
        while (true) {
            const chunk: any = Buffer.alloc(Math.min(65536, budget.remaining - total + 1));
            const { bytesRead }: any = await handle.read(chunk, 0, chunk.length, null);
            if (!bytesRead)
                break;
            total += bytesRead;
            if (total > budget.remaining)
                throw unsupported(`Resource read exceeds the ${budget.limit} byte budget`);
            chunks.push(chunk.subarray(0, bytesRead));
        }
        budget.remaining -= total;
        return Buffer.concat(chunks, total);
    }
    finally {
        await handle.close();
    }
}
function utf8(bytes?: any, path?: any): any {
    try {
        return new (TextDecoder as any)('utf-8', { fatal: true }).decode(bytes);
    }
    catch {
        throw bad(`Resource is not valid UTF-8: ${path}`);
    }
}
async function readLogs(root?: any, token?: any): Promise<any> {
    await noLinks(root);
    const rootStat: any = await statOptional(root);
    if (!rootStat?.isDirectory())
        return { files: [], bytes: 0, unparsable: 0 };
    const files: any = [];
    for (const name of (await readdir(root)).sort() as any) {
        if (token !== undefined && !name.startsWith(token))
            continue;
        const directory: any = join(root, name), stat: any = await lstat(directory);
        if (stat.isSymbolicLink())
            throw bad(`Request-log directory is a symlink: ${directory}`);
        if (!stat.isDirectory())
            continue;
        for (const filename of ['requests.lino', 'requests.jsonl'] as any) {
            const path: any = join(directory, filename), info: any = await statOptional(path);
            if (!info)
                continue;
            if (info.isSymbolicLink() || !info.isFile())
                throw bad(`Request-log path is not a regular file: ${path}`);
            files.push(path);
            if (files.length > MAX_FILES)
                throw unsupported('Request-log file count exceeds 10000');
        }
    }
    const budget: any = { remaining: MAX_BYTES, limit: MAX_BYTES }, decoded: any = [];
    let unparsable: any = 0;
    for (const path of files.sort() as any) {
        const bytes: any = await boundedFile(path, budget);
        const text: any = utf8(bytes, path);
        const records: any = [];
        for (const line of text.split(/\r?\n/) as any) {
            if (!line.trim())
                continue;
            const record: any = decodeLogLine(line);
            if (record === undefined)
                unparsable++;
            else
                records.push(record);
        }
        decoded.push(records);
    }
    return { files: decoded, bytes: MAX_BYTES - budget.remaining, unparsable };
}
const terminates: any = (text?: any): any => ['message_stop', '[DONE]', 'response.completed', 'finishReason'].some((marker?: any): any => text.includes(marker));
function encoding(header?: any): any { return (header ?? 'identity').split(',').map((s?: any): any => s.trim()).filter(Boolean).at(-1)?.toLowerCase() ?? 'identity'; }
function base64Bytes(text?: any): any { return typeof text === 'string' && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text) ? Buffer.from(text, 'base64') : null; }
function decompress(bytes?: any, kind?: any): any {
    if (kind === 'identity' || !bytes.length)
        return null;
    const decoders: any = { gzip: (zlib as any).gunzipSync, 'x-gzip': (zlib as any).gunzipSync, deflate: (zlib as any).inflateRawSync, br: (zlib as any).brotliDecompressSync, zstd: (zlib as any).zstdDecompressSync };
    if (kind === 'zstd' && !decoders.zstd)
        throw unsupported('zstd request-log decoding requires a Node runtime with zstdDecompressSync');
    if (!(decoders as any)[kind])
        return null;
    try {
        const decoded: any = (decoders as any)[kind](bytes, { finishFlush: (zlib as any).constants.Z_SYNC_FLUSH, maxOutputLength: MAX_BYTES });
        return decoded.length ? decoded.toString('utf8') : null;
    }
    catch (error: any) {
        if (error.code === 'ERR_BUFFER_TOO_LARGE')
            throw unsupported('Decoded request body exceeds the 256 MiB budget');
        return null;
    }
}
function exchanges(log?: any): any {
    const map: any = new (Map as any)();
    for (const record of log.files.flat() as any) {
        if (!record || typeof record.correlation_id !== 'string')
            continue;
        const id: any = record.correlation_id;
        const x: any = map.get(id) ?? { id, records: 0, streamed: false, evidence: false, requested: false, inspectable: true, terminated: false, undecodable: 0, encoded: [], kind: 'identity' };
        map.set(id, x);
        x.records++;
        if (record.phase === 'client_request') {
            if (record.body && typeof record.body === 'object' && 'base64' in record.body)
                x.undecodable++;
            if (record.body?.json?.stream === true)
                x.requested = true;
        }
        if (['client_response', 'upstream_response'].includes(record.phase)) {
            const status: any = Number.isSafeInteger(record.status) && record.status >= 0 ? record.status : undefined;
            if (record.phase === 'client_response')
                x.status = status;
            else
                x.upstream = status;
            if (typeof record.headers?.['content-encoding'] === 'string')
                x.kind = encoding((record.headers as any)['content-encoding']);
            const type: any = record.headers?.['content-type'];
            if (typeof type === 'string' && (type.split(';') as any)[0].trim()) {
                x.evidence = true;
                x.streamed = (type.split(';') as any)[0].trim().toLowerCase() === 'text/event-stream';
            }
        }
        if (['client_response_body', 'upstream_response_body'].includes(record.phase)) {
            if (typeof record.body?.base64 === 'string') {
                if (record.phase === 'upstream_response_body') {
                    x.undecodable++;
                    const bytes: any = base64Bytes(record.body.base64);
                    if (bytes)
                        x.encoded.push(bytes);
                }
            }
            else if (record.body != null && terminates(typeof record.body === 'string' ? record.body : JSON.stringify(record.body)))
                x.terminated = true;
        }
        if (record.phase === 'stream_end') {
            if (!x.evidence)
                x.streamed = true;
            x.outcome = typeof record.outcome === 'string' ? record.outcome : undefined;
            x.complete = typeof record.complete === 'boolean' ? record.complete : undefined;
            if (typeof record.inspectable === 'boolean')
                x.inspectable = record.inspectable;
        }
    }
    for (const x of map.values() as any) {
        if (!['identity', 'gzip', 'x-gzip', 'deflate', 'br', 'zstd'].includes(x.kind))
            x.inspectable = false;
        else if (x.kind !== 'identity' && x.encoded.length) {
            const decoded: any = decompress(Buffer.concat(x.encoded), x.kind);
            if (!decoded)
                x.inspectable = false;
            else {
                x.inspectable = true;
                x.undecodable = 0;
                x.error = decoded.split(/\r?\n/).some((line?: any): any => {
                    const text: any = line.trim();
                    if (text.toLowerCase() === 'event: error')
                        return true;
                    if (!text.startsWith('data:'))
                        return false;
                    try {
                        return JSON.parse(text.slice(5).trim() as any).type === 'error';
                    }
                    catch {
                        return false;
                    }
                });
                if (terminates(decoded)) {
                    x.terminated = true;
                    if (x.complete === false) {
                        x.complete = true;
                        x.outcome = 'completed';
                    }
                }
            }
        }
        if (!x.evidence && x.requested)
            x.streamed = true;
    }
    return [...map.values()].sort((a?: any, b?: any): any => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
const incomplete: any = (x?: any): any => x.streamed && x.inspectable && x.complete === false;
const unterminated: any = (x?: any): any => x.streamed && x.inspectable && x.outcome === undefined && !x.terminated;
const unverifiable: any = (x?: any): any => x.streamed && !x.inspectable;
function summary(log?: any, all?: any): any {
    const result: any = { exchanges: all.length, records: 0, bytes: log.bytes, statuses: {}, streamed: 0, non_streamed: 0, incomplete_streams: 0, unterminated_streams: 0, unverifiable_streams: 0, unparsable_records: log.unparsable, undecodable_bodies: 0 };
    for (const x of all as any) {
        result.records += x.records;
        result.undecodable_bodies += x.undecodable;
        const status: any = x.status ?? x.upstream;
        if (status !== undefined)
            (result.statuses as any)[status] = ((result.statuses as any)[status] ?? 0) + 1;
        (result as any)[x.streamed ? 'streamed' : 'non_streamed']++;
        if (incomplete(x))
            result.incomplete_streams++;
        if (unterminated(x))
            result.unterminated_streams++;
        if (unverifiable(x))
            result.unverifiable_streams++;
    }
    return result;
}
function anomalies(all?: any): any {
    const result: any = [], add: any = (kind?: any, detail?: any, test?: any, minimum: any = 1): any => {
        const ids: any = all.filter(test).map((x?: any): any => x.id);
        if (ids.length >= minimum)
            result.push({ kind, detail: typeof detail === 'function' ? detail(ids.length) : detail, correlation_ids: ids });
    };
    add('stream_ended_without_terminator', 'a streamed turn stopped before its dialect terminator; the client saw a truncated answer while the status line said 200', incomplete);
    add('no_terminal_record', 'a streamed exchange has no terminal record, so how it ended is unknown', unterminated);
    add('stream_carried_an_error', 'a streamed turn carried an error event while the status line said 200, so the transport reported success for a turn that failed', (x?: any): any => x.error);
    add('stream_not_verifiable', 'a streamed exchange was relayed under an encoding this router cannot decode, so its frames cannot be inspected for a terminator; how it ended is not knowable from the log', unverifiable);
    add('repeated_authentication_failure', (n?: any): any => `${n} exchanges were refused with 401/403, which is misconfiguration rather than load`, (x?: any): any => [401, 403].includes(x.status), 2);
    add('rate_limited', (n?: any): any => `${n} exchanges were rate limited`, (x?: any): any => x.status === 429);
    add('undecodable_bodies', 'bodies are compressed or binary, so their contents cannot be inspected from the log; recorded so absence of evidence is not read as evidence', (x?: any): any => x.undecodable > 0);
    return result;
}
function show(log?: any, id?: any): any {
    const records: any = [];
    for (const file of log.files as any) {
        const selected: any = file.filter((record?: any): any => record?.correlation_id === id);
        const header: any = selected.find((record?: any): any => typeof record.headers?.['content-encoding'] === 'string')?.headers['content-encoding'];
        const stored: any = selected.map((record?: any): any => base64Bytes(record.body?.base64)).filter(Boolean);
        const decoded: any = decompress(Buffer.concat(stored), encoding(header));
        const first: any = selected.findIndex((record?: any): any => typeof record.body?.base64 === 'string');
        for (const [index, record] of selected.entries() as any)
            records.push(decoded && typeof record.body?.base64 === 'string' ? { ...record, body: index === first ? decoded : '[decoded with the first frame: only the whole stream decodes]' } : record);
    }
    const output: any = records.length ? records.flatMap((record?: any): any => JSON.stringify(record, null, 2).split('\n')) : [`no records for correlation id ${id}`];
    return { correlation_id: id, records, output };
}
async function tlsGenerate(dataDir?: any, dns?: any): Promise<any> {
    const directory: any = join(dataDir, 'tls'), cert: any = join(directory, 'cert.pem'), key: any = join(directory, 'key.pem');
    await noLinks(directory);
    await noLinks(cert);
    await noLinks(key);
    const certStat: any = await statOptional(cert), keyStat: any = await statOptional(key);
    if (certStat?.isFile() && keyStat?.isFile())
        return { output: [cert] };
    if ((certStat && !certStat.isFile()) || (keyStat && !keyStat.isFile()))
        throw bad('TLS certificate and key paths must be regular files');
    const names: any = [...new (Set as any)(String(dns ?? 'localhost').split(',').map((s?: any): any => s.trim()).filter(Boolean).concat('localhost', '127.0.0.1'))];
    if (names.length > 100 || names.some((name?: any): any => !isIP(name) && !/^(?:\*\.)?[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/.test(name)))
        throw bad('TLS names must be DNS names or IP addresses (at most 100 names)');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    const temporary: any = await mkdtemp(join(directory, '.generate-'));
    try {
        await exec('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes', '-sha256', '-days', '3650', '-subj', '/CN=rcgen self signed cert', '-addext', `subjectAltName=${names.map((name?: any): any => `${isIP(name) ? 'IP' : 'DNS'}:${name}`).join(',')}`, '-keyout', join(temporary, 'key.pem'), '-out', join(temporary, 'cert.pem')], { timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true });
        await chmod(join(temporary, 'key.pem'), 0o600);
        await chmod(join(temporary, 'cert.pem'), 0o600);
        await rename(join(temporary, 'cert.pem'), cert);
        await rename(join(temporary, 'key.pem'), key);
    }
    catch (error: any) {
        if (error.code === 'ENOENT')
            throw unsupported('Native tls.generate requires openssl on PATH');
        throw bad('Could not generate a self-signed TLS certificate');
    }
    finally {
        await rm(temporary, { recursive: true, force: true });
    }
    return { output: [cert] };
}
async function serializedTlsGenerate(dataDir?: any, dns?: any): Promise<any> {
    const before: any = tlsTasks.get(dataDir) ?? Promise.resolve();
    const task: any = before.catch((): any => { }).then((): any => tlsGenerate(dataDir, dns));
    tlsTasks.set(dataDir, task);
    try {
        return await task;
    }
    finally {
        if (tlsTasks.get(dataDir) === task)
            tlsTasks.delete(dataDir);
    }
}
export async function executeResourceOperation({ name, options = {}, config = {}, core }: any): Promise<any> {
    if (!(supportedResourceOperations as any)[name])
        throw unsupported(`Native resource operation ${name} is unavailable`);
    const accepted: any = new (Set as any)(['data_dir', 'home', 'local', 'json', ...(name.startsWith('logs.') ? ['token', 'correlation_id', 'request_log'] : name === 'tls.generate' ? ['dns'] : [])]);
    for (const [key, value] of Object.entries(options) as any)
        if (value !== undefined && value !== false && !accepted.has(key))
            throw unsupported(`Native ${name} does not support option ${key}`);
    const resolvedConfig: any = core?.config ?? config;
    const dataDir: any = options.data_dir ?? resolvedConfig.data_dir ?? resolvedConfig.dataDir;
    if (typeof dataDir !== 'string' || !dataDir)
        throw bad('Resource operation requires a resolved data directory');
    if (name === 'tls.generate')
        return serializedTlsGenerate(resolve(dataDir), options.dns);
    if (name === 'tls.ca') {
        const path: any = join(resolve(dataDir), 'tls', 'cert.pem');
        try {
            const bytes: any = await boundedFile(path, { remaining: 1024 * 1024, limit: 1024 * 1024 });
            const output: any = utf8(bytes, path).split(/\r?\n/);
            if (output.at(-1) === '')
                output.pop();
            return { output };
        }
        catch (error: any) {
            if (error.code === 'ENOENT')
                throw bad(`no generated certificate at ${path}; start the router with TLS_SELF_SIGNED=1 first`);
            throw error;
        }
    }
    if (options.token !== undefined && typeof options.token !== 'string')
        throw bad('Log token filter must be a string');
    if (name === 'logs.show' && typeof options.correlation_id !== 'string')
        throw bad('logs.show requires correlation_id');
    const root: any = options.request_log ?? resolvedConfig.request_log ?? join(dataDir, 'requests');
    const log: any = await readLogs(root, options.token);
    if (name === 'logs.show')
        return show(log, options.correlation_id);
    const all: any = exchanges(log);
    if (name === 'logs.summary')
        return summary(log, all);
    const found: any = anomalies(all);
    if (found.length)
        throw Object.assign(new (Error as any)('Request-log anomalies found'), { data: found, exitCode: 1 });
    return found;
}
