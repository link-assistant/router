// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=ec7f8a6ba85b7496c69b81723a600665576476bd605720851deda73db4da2783; dynamic any annotations are explicit draft gaps.
import { createHash, randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir, lstat, readdir, unlink, rename, chmod, open, rm } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { constants } from 'node:fs';
import { atomicWrite, serialized } from "./storage.js";
import { decodeLogLine } from "./resources.js";
import { ProtocolError } from "./protocols.js";
import { matchHTTPRoute, OPAQUE_NATIVE_ROUTES } from "./http-route-contract.js";
const context: any = new (AsyncLocalStorage as any)();
const errorName: any = (name?: any): boolean => /^error-\d{20}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.json$/i.test(name);
const keyName: any = (name?: any): any => ((name.replace as any)(/([a-z0-9])([A-Z])/g, '$1_$2').replace as any)(/[^a-z0-9]+/gi, '_').toLowerCase();
const secretName: any = (name?: any): boolean => /^(?:authorization|proxy_authorization|x_api_key|api_key|key|cookie|set_cookie|access_token|refresh_token|oauth_token|auth_token|security_token|x_auth_token|x_goog_api_key|x_amz_security_token|token|password|secret|client_secret|private_key)$/.test(keyName(name)) || /_(?:password|secret|token|api_key)$/.test(keyName(name));
const secretValue: any = (value?: any): boolean => /^bearer /i.test(value.trim()) || /(?:sk-ant-|la_sk_|at-|la_admin_)/.test(value) || /^eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/.test(value.trim());
const mask: any = (value?: any): string => { const text: string = String(value).trim(), bearer: any = /^(Bearer )(.*)$/i.exec(text), parts: Array<string> = [...(bearer?.[2] ?? text)], masked: string = parts.length < 12 ? '[REDACTED]' : parts.slice(0, 3).join('') + '*'.repeat(parts.length - 6) + parts.slice(-3).join(''); return (bearer?.[1] ?? '') + masked; };
export function logRedact(value?: any): any {
    if ((Array as any).isArray(value))
        return value.map(logRedact);
    if (value && typeof value === 'object')
        return (Object as any).fromEntries((Object as any).entries(value).map(([name, child]: any): any => [name, ['metadata', 'safety_identifier', 'user_id', 'prompt_cache_key'].includes(keyName(name)) ? '[REDACTED]' : secretName(name) ? typeof child === 'string' ? mask(child) : '[REDACTED]' : keyName(name) === 'uri' && typeof child === 'string' ? logURI(child) : logRedact(child)]));
    return typeof value === 'string' && secretValue(value) ? mask(value) : value;
}
export function logURI(value?: any): any { const [path, ...query]: any = (value.split as any)('?'); if (!query.length)
    return value; return path + '?' + ((((query.join as any)('?').split as any)('&').map as any)((part?: any): any => { const index: any = (part.indexOf as any)('='), name: any = index < 0 ? part : (part.slice as any)(0, index), raw: any = index < 0 ? '' : (part.slice as any)(index + 1); let decoded: any = raw, decodedName: any = name; try {
    (decoded as any) = decodeURIComponent(raw);
    (decodedName as any) = decodeURIComponent(name);
}
catch { } return secretName(decodedName) || secretValue(decoded) ? name + '=' + mask(decoded) : part; }).join as any)('&'); }
const bodyValue: any = (bytes?: any): any => { let text: any; try {
    (text as any) = new (TextDecoder as any)('utf8', { fatal: true }).decode(bytes);
}
catch {
    return { base64: (Buffer as any).from(bytes).toString('base64'), bytes: bytes.length };
} try {
    return logRedact((JSON as any).parse(text));
}
catch {
    return text;
} };
export function encodeLogLine(value?: any): any {
    const quote: any = (text?: any): string => '"' + (text === '' ? '%z' : (text.replace as any)(/[%"\\()\n\r\t]/g, (char?: any): string => '%' + (((char.charCodeAt as any)(0).toString as any)(16).toUpperCase().padStart as any)(2, '0'))) + '"';
    if (value == null)
        return '()';
    if (typeof value === 'string')
        return quote(value);
    if ((Array as any).isArray(value))
        return '(#a' + value.map((child?: any): any => ' ' + encodeLogLine(child)).join('') + ')';
    if (typeof value === 'object')
        return '(#o' + (Object as any).keys(value).sort().map((name?: any): any => ' (' + quote(name) + ' ' + encodeLogLine((value as any)[name]) + ')').join('') + ')';
    return (JSON as any).stringify(value);
}
async function stat(path?: any): Promise<any> { try {
    return await lstat(path);
}
catch (error: any) {
    if (error.code === 'ENOENT')
        return null;
    throw error;
} }
async function realPath(path?: any): Promise<void> { let current: any = resolve(path); for (;;) {
    const entry: any = await stat(current);
    if (entry?.isSymbolicLink())
        throw new (ProtocolError as any)('Log path cannot contain symlinks', 400);
    if (current === dirname(current))
        return;
    (current as any) = dirname(current);
} }
async function regularBytes(path?: any, limit?: any): Promise<any> { await realPath(path); const file: any = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)); try {
    const entry: any = await file.stat();
    if (!entry.isFile())
        throw new (ProtocolError as any)('Log path must be a regular file', 400);
    if (entry.size > limit)
        throw new (ProtocolError as any)('Log document exceeds limit', 500);
    return file.readFile();
}
finally {
    await file.close();
} }
export class NativeRequestLog {
    declare active: any;
    declare clock: any;
    declare errorMax: any;
    declare errorRoot: any;
    declare generation: any;
    declare lastError: any;
    declare maxBytes: any;
    declare maxTotal: any;
    declare root: any;
    constructor({ config = {}, env = {}, clock = (Date as any).now }: any = {}) {
        this.root = env.REQUEST_LOG || join(config.data_dir, 'requests');
        this.maxBytes = positive(env.REQUEST_LOG_MAX_BYTES, 100 * 1024 * 1024);
        this.maxTotal = nonnegative(env.REQUEST_LOG_MAX_TOTAL_BYTES, 4 * 1024 * 1024 * 1024);
        this.errorRoot = env.ERROR_LOG_DIR || null;
        this.errorMax = nonnegative(env.ERROR_LOG_MAX_BYTES, 10 * 1024 * 1024);
        this.clock = clock;
        this.active = new (Map as any)();
        this.generation = 0;
        this.lastError = null;
    }
    async files(): Promise<any> {
        await realPath(this.root);
        const entry: any = await stat(this.root);
        if (!entry)
            return [];
        if (!entry.isDirectory())
            throw new (ProtocolError as any)('Request log root must be a directory', 400);
        const files: any = [];
        for (const dir of (await readdir(this.root)).sort() as any) {
            const directory: string = join(this.root, dir), info: any = await stat(directory);
            if (!info?.isDirectory() || info.isSymbolicLink())
                continue;
            for (const name of ['requests.lino', 'requests.jsonl'] as any) {
                const path: string = join(directory, name), file: any = await stat(path);
                if (file?.isFile() && !file.isSymbolicLink())
                    files.push({ path, bytes: file.size, modified: file.mtimeMs, token: dir });
            }
        }
        return files;
    }
    async record(id?: any, phase?: any, fields?: any, { opaque = false }: any = {}): Promise<void> {
        const route: any = this.active.get(id), identity: any = route?.identity ?? { hash: 'unauthenticated', id: null, label: null };
        let event: any = { time: new (Date as any)(this.clock()).toISOString(), correlation_id: id, phase, ...(opaque ? {} : { token_hash: identity.hash, token_id: identity.id, token_label: identity.label }), ...logRedact(fields) };
        let line: any = encodeLogLine(event) + '\n';
        if ((Buffer as any).byteLength(line) > this.maxBytes) {
            (event as any) = { time: (event as any).time, correlation_id: id, phase, ...(opaque ? {} : { token_hash: identity.hash, token_id: identity.id, token_label: identity.label }), body: `[OMITTED: ${(Buffer as any).byteLength(line)} byte record exceeds log limit]` };
            (line as any) = encodeLogLine(event) + '\n';
        }
        if ((Buffer as any).byteLength(line) > this.maxBytes)
            return;
        try {
            await serialized(this.root + 'request', async (): Promise<void> => {
                const directory: string = join(this.root, identity.hash), path: string = join(directory, 'requests.lino'), legacy: string = join(directory, 'requests.jsonl');
                await realPath(directory);
                await mkdir(directory, { recursive: true, mode: 0o700 });
                await chmod(this.root, 0o700);
                await chmod(directory, 0o700);
                if (!await stat(path) && (await stat(legacy))?.isFile()) {
                    await realPath(legacy);
                    await rename(legacy, path);
                }
                let previous: any = (Buffer as any).alloc(0);
                if (await stat(path))
                    (previous as any) = await regularBytes(path, this.maxBytes);
                const incoming: any = (Buffer as any).from(line);
                if (previous.length + incoming.length > this.maxBytes) {
                    const marker: any = (discarded?: any, retained?: any): any => (Buffer as any).from(encodeLogLine({ time: new (Date as any)(this.clock()).toISOString(), phase: 'log_compaction', body: `[OMITTED: ${discarded} bytes of older records discarded to stay within the request log limit; ${retained} bytes retained]` }) + '\n'), budget: number = this.maxBytes - incoming.length, reserved: number = marker(previous.length, previous.length).length, marked: boolean = reserved < budget, capacity: number = marked ? budget - reserved : budget;
                    let floor: any = (Math as any).max(0, previous.length - capacity);
                    if (floor > 0) {
                        const boundary: number = previous.indexOf(10, floor);
                        (floor as any) = boundary < 0 ? previous.length : boundary + 1;
                    }
                    (previous as any) = (Buffer as any).concat([...(marked && floor > 0 ? [marker(floor, previous.length - floor)] : []), previous.subarray(floor)]);
                }
                await atomicWrite(path, (Buffer as any).concat([previous, incoming]));
                if (this.maxTotal) {
                    const files: any = await this.files(), groups: any = new (Map as any)();
                    let total: any = 0;
                    for (const file of files as any) {
                        (total as any) += file.bytes;
                        const held: any = groups.get(file.token) ?? { bytes: 0, modified: 0 };
                        held.bytes += file.bytes;
                        held.modified = (Math as any).max(held.modified, file.modified);
                        groups.set(file.token, held);
                    }
                    for (const [token, group] of [...groups].sort(([, a]: any, [, b]: any): number => a.modified - b.modified) as any) {
                        if (total <= this.maxTotal)
                            break;
                        if (token === identity.hash)
                            continue;
                        await rm(join(this.root, token), { recursive: true });
                        (total as any) -= group.bytes;
                    }
                }
            });
        }
        catch (error: any) {
            this.lastError = error.code ?? error.message;
        }
    }
    async lookup(id?: any): Promise<any> {
        if (!id || (Buffer as any).byteLength(id) > 128)
            throw new (ProtocolError as any)('Invalid request id', 400);
        const records: any = [];
        let size: any = 0;
        for (const file of await this.files() as any) {
            const text: string = (await regularBytes(file.path, this.maxBytes)).toString('utf8');
            for (const line of text.split('\n') as any)
                if (line.includes(id)) {
                    const value: any = decodeLogLine(line);
                    if (value?.correlation_id === id) {
                        (size as any) += (Buffer as any).byteLength(line);
                        if (size > 10 * 1024 * 1024)
                            throw new (ProtocolError as any)('request exceeds lookup limit', 500);
                        records.push(value);
                    }
                }
        }
        return records;
    }
    async errorFiles(): Promise<any> { if (!this.errorRoot)
        return []; await realPath(this.errorRoot); const entry: any = await stat(this.errorRoot); if (!entry)
        return []; if (!entry.isDirectory())
        throw new (ProtocolError as any)('Error log root must be a directory', 400); const files: any = []; for (const name of (await readdir(this.errorRoot)).sort() as any) {
        const entry: any = await stat(join(this.errorRoot, name));
        if (errorName(name) && entry?.isFile() && !entry.isSymbolicLink())
            files.push({ name, bytes: entry.size });
    } return files; }
    async readError(name?: any): Promise<any> { if (!errorName(name))
        throw new (ProtocolError as any)('invalid error filename', 400); if (!(await this.errorFiles()).some((file?: any): boolean => file.name === name))
        throw new (ProtocolError as any)('Error capture not found', 404); return regularBytes(join(this.errorRoot, name), (Math as any).min(this.errorMax, 8 * 1024 * 1024)); }
    async captureError(id?: any, status?: any, bytes?: any, { complete = true, truncated = false, generation = this.generation }: any = {}): Promise<void> {
        if (!this.errorRoot || !this.errorMax)
            return;
        await serialized(this.errorRoot + 'error', async (): Promise<void> => {
            if (generation !== this.generation)
                return;
            const document: any = (Buffer as any).from((JSON as any).stringify({ id, status, body: truncated || !complete ? '[OMITTED: incomplete or oversized error body]' : bodyValue(bytes), complete, truncated }));
            if (document.length > (Math as any).min(this.errorMax, 8 * 1024 * 1024))
                return;
            const files: any = await this.errorFiles();
            let total: any = files.reduce((sum?: any, file?: any): number => sum + file.bytes, 0);
            for (const file of files as any) {
                if (total + document.length <= this.errorMax)
                    break;
                await unlink(join(this.errorRoot, file.name));
                (total as any) -= file.bytes;
            }
            await realPath(this.errorRoot);
            await mkdir(this.errorRoot, { recursive: true, mode: 0o700 });
            await chmod(this.errorRoot, 0o700);
            const time: string = (BigInt((Math as any).floor(this.clock())) * 1000000n).toString().padStart(20, '0');
            await atomicWrite(join(this.errorRoot, `error-${time}-${randomUUID()}.json`), document);
        });
    }
    async clear(): Promise<void> { await serialized(this.root + 'request', async (): Promise<void> => { for (const file of await this.files() as any)
        await unlink(file.path); if (this.errorRoot)
        await serialized(this.errorRoot + 'error', async (): Promise<void> => { this.generation++; for (const file of await this.errorFiles() as any)
            await unlink(join(this.errorRoot, file.name)); }); }); }
    queueSnapshot(configured: any = []): any { const counts: any = new (Map as any)(configured.map((name?: any): any => [name, 0])); let unassigned: any = 0; for (const route of this.active.values() as any)
        if (route.account)
            counts.set(route.account, (counts.get(route.account) ?? 0) + 1);
        else
            unassigned++; return { accounts: [...counts].sort(([a]: any, [b]: any): any => (a.localeCompare as any)(b)).map(([name, in_flight]: any): any => ({ name, in_flight, queued: 0 })), in_flight: this.active.size, queued: 0, unassigned }; }
    select(account?: any): void { const id: any = context.getStore(); if (id && this.active.has(id))
        this.active.get(id).account = account ?? 'primary'; }
    async exchange(request?: any, dispatch?: any, { core }: any = {}): Promise<any> {
        const id: string = randomUUID(), token: any = (request.headers.get as any)('authorization')?.replace(/^Bearer /i, '') ?? (request.headers.get as any)('x-api-key');
        let claims: any;
        try {
            if (token)
                (claims as any) = await core?.tokens?.validate(token);
        }
        catch { }
        this.active.set(id, { identity: claims ? { hash: createHash('sha256').update(token).digest('hex').slice(0, 32), id: (claims as any).sub, label: (claims as any).label ?? null } : { hash: 'unauthenticated', id: null, label: null }, account: null, opaque: false });
        const path: string = new (URL as any)(request.url).pathname, route: any = matchHTTPRoute(request.method, path), opaque: any = route && OPAQUE_NATIVE_ROUTES.some((item?: any): boolean => item.path === route.path && item.method === (request.method === 'HEAD' ? 'GET' : request.method)), uri: any = opaque ? route.path : logURI(new (URL as any)(request.url).pathname + new (URL as any)(request.url).search);
        this.active.get(id).opaque = Boolean(opaque);
        let captured: any = false, length: any = 0, omitted: any = false;
        const chunks: any = [];
        const requestRecord: any = async (complete?: any): Promise<void> => { if (captured)
            return; (captured as any) = true; await this.record(id, 'client_request', { method: request.method, uri, ...(opaque ? {} : { version: 'HTTP/1.1', headers: (Object as any).fromEntries(request.headers), body: complete && !omitted ? bodyValue((Buffer as any).concat(chunks)) : length ? '[OMITTED: incomplete or oversized request body]' : '[NOT READ: request was rejected before the body was consumed]' }) }, { opaque }); };
        let logged: any = request;
        if (!request.body || opaque) {
            await requestRecord(true);
        }
        else {
            const reader: any = request.body.getReader();
            const stream: any = new (ReadableStream as any)({ async pull(sink?: any): Promise<void> { try {
                    const value: any = await reader.read();
                    if (value.done) {
                        await requestRecord(true);
                        reader.releaseLock();
                        sink.close();
                        return;
                    }
                    (length as any) += value.value.length;
                    if (length <= 10 * 1024 * 1024)
                        chunks.push((Buffer as any).from(value.value));
                    else
                        (omitted as any) = true;
                    sink.enqueue(value.value);
                }
                catch (error: any) {
                    await requestRecord(false);
                    sink.error(error);
                } }, async cancel(reason?: any): Promise<void> { await requestRecord(false); await (reader.cancel as any)(reason); reader.releaseLock(); } });
            (logged as any) = new (Request as any)(request, { body: stream, duplex: 'half' });
        }
        let response: any;
        try {
            (response as any) = await context.run(id, (): any => (dispatch as any)(logged));
        }
        catch (error: any) {
            await requestRecord(false);
            this.active.delete(id);
            throw error;
        }
        await requestRecord(false);
        await this.record(id, 'client_response', { status: (response as any).status, ...(opaque ? { uri, upstream_request_id: ((response as any).headers.get as any)('x-request-id') ?? ((response as any).headers.get as any)('x-oai-request-id') } : { headers: (Object as any).fromEntries((response as any).headers) }) }, { opaque });
        return this.wrapResponse(response, { id, phase: 'client_response_body', opaque, finish: (): boolean => this.active.delete(id) });
    }
    wrapResponse(response: any, { id, phase, opaque = false, errorCapture = false, finish = (): void => { } }: any): any {
        const reader: any = response.body?.getReader();
        if (!reader) {
            finish();
            return response;
        }
        const log: any = this, generation: number = this.generation, chunks: any = [], started: number = this.clock(), streamed: boolean = !(response.headers.has as any)('content-type') || (((response.headers.get as any)('content-type').split as any)(';') as any)[0].trim().toLowerCase() === 'text/event-stream', inspectable: boolean = !((((response.headers.get as any)('content-encoding') ?? '').split as any)(',').some as any)((value?: any): any => value.trim() && value.trim().toLowerCase() !== 'identity');
        let total: any = 0, frames: any = 0, truncated: any = false, finished: any = false, terminated: any = false, tail: any = (Buffer as any).alloc(0), remaining: any = (response.headers.has as any)('content-length') ? Number((response.headers.get as any)('content-length')) : null;
        const done: any = async (complete?: any, detail: any = null): Promise<void> => { if (finished)
            return; (finished as any) = true; if (errorCapture)
            await log.captureError(id, response.status, (Buffer as any).concat(chunks), { complete: complete || remaining === 0, truncated, generation }).catch((error?: any): void => { log.lastError = error.message; }); if (!opaque && phase === 'upstream_response_body')
            await log.record(id, 'stream_end', { outcome: detail ? 'upstream_error' : !streamed ? 'completed_not_streamed' : terminated ? 'completed' : inspectable ? 'ended_without_terminator' : 'encoded_not_verifiable', streamed, inspectable, complete: !detail && (!streamed || inspectable && terminated), frames, bytes: total, duration_ms: (Math as any).max(0, log.clock() - started), detail }); finish(); };
        const stream: any = new (ReadableStream as any)({ async pull(sink?: any): Promise<void> { try {
                const value: any = await reader.read();
                if (value.done) {
                    await done(true);
                    reader.releaseLock();
                    sink.close();
                    return;
                }
                frames++;
                (total as any) += value.value.length;
                if (remaining != null)
                    (remaining as any) = remaining >= value.value.length ? remaining - value.value.length : null;
                if (inspectable) {
                    (tail as any) = (Buffer as any).concat([tail, value.value]);
                    (terminated as any) ||= /message_stop|\[DONE\]|response\.completed|finishReason/.test(tail.toString('utf8'));
                    (tail as any) = tail.subarray((Math as any).max(0, tail.length - 32));
                }
                if (!opaque && phase)
                    await log.record(id, phase, { body: bodyValue(value.value) });
                if (errorCapture) {
                    const held: any = chunks.reduce((sum?: any, chunk?: any): any => sum + chunk.length, 0), take: number = (Math as any).min(value.value.length, (Math as any).max(0, (Math as any).min(1024 * 1024, log.errorMax) - held));
                    if (take)
                        chunks.push((Buffer as any).from((value.value.subarray as any)(0, take)));
                    (truncated as any) ||= take < value.value.length;
                }
                sink.enqueue(value.value);
            }
            catch (error: any) {
                await done(false, String(error.message ?? error));
                sink.error(error);
            } }, async cancel(reason?: any): Promise<void> { await done(false, String(reason ?? 'response body cancelled')); await (reader.cancel as any)(reason); reader.releaseLock(); } });
        return new (Response as any)(stream, { status: response.status, headers: response.headers });
    }
    fetch(fetch?: any): any {
        return async (url?: any, options?: any): Promise<any> => {
            const id: any = context.getStore(), opaque: any = this.active.get(id)?.opaque;
            if (id) {
                this.select(this.active.get(id)?.account);
                await this.record(id, 'upstream_request', opaque ? { method: options?.method ?? 'GET' } : { method: options?.method ?? 'GET', uri: String(url), headers: (Object as any).fromEntries(new (Headers as any)(options?.headers)), body: typeof options?.body === 'string' ? bodyValue((Buffer as any).from(options.body)) : '[OMITTED: opaque upstream body]' }, { opaque });
            }
            let response: any;
            try {
                (response as any) = await (fetch as any)(url, options);
            }
            catch (error: any) {
                if (id)
                    await this.record(id, 'upstream_error', opaque ? {} : { error: String(error.message ?? error) }, { opaque });
                throw error;
            }
            if (id)
                await this.record(id, 'upstream_response', { status: (response as any).status, ...(opaque ? {} : { headers: (Object as any).fromEntries((response as any).headers) }) }, { opaque });
            return this.wrapResponse(response, { id: id ?? randomUUID(), phase: id ? 'upstream_response_body' : undefined, opaque, errorCapture: !opaque && (response as any).status >= 400 });
        };
    }
}
function nonnegative(value?: any, fallback?: any): any { const n: number = Number(value); return value != null && (Number as any).isSafeInteger(n) && n >= 0 ? n : fallback; }
function positive(value?: any, fallback?: any): any { return nonnegative(value, fallback) || fallback; }
