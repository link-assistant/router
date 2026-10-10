// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=18e282b7099a3f8ed4180c35d6afb0589d2265d9efef7ada7c6dd969bfc5802b; dynamic any annotations are explicit draft gaps.
import { mkdir, open, readFile, rename, unlink, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
const queues: any = new (Map as any)();
export async function serialized(key?: any, operation?: any): Promise<any> {
    const previous: any = queues.get(key) ?? Promise.resolve();
    let release: any;
    const held: any = new (Promise as any)((resolve?: any): any => { release = resolve; });
    const tail: any = previous.catch((): any => { }).then((): any => held);
    queues.set(key, tail);
    await previous.catch((): any => { });
    try {
        return await operation();
    }
    finally {
        release();
        if (queues.get(key) === tail)
            queues.delete(key);
    }
}
export async function atomicWrite(path?: any, text?: any): Promise<any> {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary: any = `${path}.${randomUUID()}.tmp`;
    let file: any;
    try {
        file = await open(temporary, 'wx', 0o600);
        await file.writeFile(text, 'utf8');
        await file.sync();
        await file.close();
        file = null;
        await rename(temporary, path);
        const directory: any = await open(dirname(path), 'r');
        try {
            await directory.sync();
        }
        finally {
            await directory.close();
        }
    }
    finally {
        await file?.close();
        await unlink(temporary).catch((e?: any): any => { if (e.code !== 'ENOENT')
            throw e; });
    }
}
export async function withNativeFileLock(path?: any, operation?: any, timeout: any = 30000): Promise<any> {
    const lock: any = `${path}.native-lock`;
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const started: any = Date.now();
    for (;;) {
        try {
            await mkdir(lock, { mode: 0o700 });
            try {
                await atomicWrite(`${lock}/owner.json`, JSON.stringify({ pid: process.pid }));
            }
            catch (error: any) {
                await rm(lock, { recursive: true, force: true });
                throw error;
            }
            break;
        }
        catch (error: any) {
            if (error.code !== 'EEXIST')
                throw error;
            let dead: any = false;
            try {
                const owner: any = JSON.parse(await readFile(`${lock}/owner.json`, 'utf8') as any);
                if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0)
                    throw new (Error as any)('Invalid native lock owner');
                try {
                    process.kill(owner.pid, 0);
                }
                catch (error: any) {
                    if (error.code === 'ESRCH')
                        dead = true;
                    else if (error.code !== 'EPERM')
                        throw error;
                }
            }
            catch (error: any) {
                if (error.code === 'ENOENT') {
                    try {
                        dead = Date.now() - (await stat(lock)).mtimeMs > timeout;
                    }
                    catch (e: any) {
                        if (e.code !== 'ENOENT')
                            throw e;
                    }
                }
                else
                    throw error;
            }
            if (dead) {
                const reaper: any = `${lock}.reap`;
                try {
                    await mkdir(reaper, { mode: 0o700 });
                    try {
                        let stillDead: any = false;
                        try {
                            const owner: any = JSON.parse(await readFile(`${lock}/owner.json`, 'utf8') as any);
                            try {
                                process.kill(owner.pid, 0);
                            }
                            catch (e: any) {
                                stillDead = e.code === 'ESRCH';
                            }
                        }
                        catch (e: any) {
                            if (e.code === 'ENOENT') {
                                try {
                                    stillDead = Date.now() - (await stat(lock)).mtimeMs > timeout;
                                }
                                catch { }
                            }
                        }
                        if (stillDead)
                            await rm(lock, { recursive: true, force: true });
                    }
                    finally {
                        await rm(reaper, { recursive: true, force: true });
                    }
                }
                catch (e: any) {
                    if (e.code !== 'EEXIST')
                        throw e;
                }
                continue;
            }
            if (Date.now() - started >= timeout)
                throw new (Error as any)('Timed out waiting for native storage lock');
            await new (Promise as any)((resolve?: any): any => setTimeout(resolve, 20));
        }
    }
    try {
        return await operation();
    }
    finally {
        await rm(lock, { recursive: true, force: true });
    }
}
export async function readOptional(path?: any, fallback: any = ''): Promise<any> {
    try {
        return await readFile(path, 'utf8');
    }
    catch (error: any) {
        if (error.code === 'ENOENT')
            return fallback;
        throw error;
    }
}
function quote(text?: any): any {
    if (!text.includes('"'))
        return `"${text}"`;
    if (!text.includes("'"))
        return `'${text}'`;
    const delimiter: any = text.startsWith('"') ? "'" : '"';
    const runs: any = text.match(new (RegExp as any)(`${delimiter}+`, 'g')) ?? [];
    const count: any = Math.max(3, ...runs.map((run?: any): any => run.length + 1));
    return delimiter.repeat(count) + text + delimiter.repeat(count);
}
export function encodeLino(value?: any, level: any = 0): any {
    if (typeof value === 'string') {
        if (/[\x00-\x08\x0b-\x1f\x7f]/.test(value)) {
            const escaped: any = value.replace(/[%\x00-\x08\x0b-\x1f\x7f]/g, (c?: any): any => `%${c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}`);
            return `(escaped ${quote(escaped)})`;
        }
        return quote(value);
    }
    if (value === null || typeof value === 'boolean')
        return String(value);
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value))
            throw new (Error as any)('Storage numbers must be safe integers');
        return String(value);
    }
    const indent: any = '  '.repeat(level + 1), close: any = '  '.repeat(level);
    if (Array.isArray(value))
        return value.length ? `(\n${value.map((v?: any): any => indent + encodeLino(v, level + 1)).join('\n')}\n${close})` : '()';
    const entries: any = Object.entries(value);
    return `(\n${entries.map(([key, v]: any): any => `${indent}${key} ${encodeLino(v, level + 1)}`).join('\n')}${entries.length ? '\n' : ''}${close})`;
}
export function decodeLino(text?: any): any {
    let i: any = 0;
    const skip: any = (): any => { while ((text as any)[i] === ' ' || (text as any)[i] === '\t' || (text as any)[i] === '\r')
        i++; };
    function scalar(raw?: any, quoted: any = false): any {
        if (quoted)
            return raw;
        if (raw === 'null')
            return null;
        if (raw === 'true' || raw === 'false')
            return raw === 'true';
        if (/^-?\d+$/.test(raw)) {
            const n: any = Number(raw);
            if (!Number.isSafeInteger(n))
                throw new (Error as any)('Unsafe storage integer');
            return n;
        }
        return raw;
    }
    function value(): any {
        skip();
        if ((text as any)[i] === '(') {
            i++;
            skip();
            const rows: any = [];
            let row: any = [], multiline: any = false;
            while (i < text.length && (text as any)[i] !== ')') {
                if ((text as any)[i] === '\n') {
                    multiline = true;
                    if (row.length)
                        rows.push(row);
                    row = [];
                    i++;
                    skip();
                    continue;
                }
                row.push(value());
                skip();
            }
            if ((text as any)[i++] !== ')')
                throw new (Error as any)('Unclosed Links Notation container');
            if (row.length)
                rows.push(row);
            if (rows.length === 1 && ((rows as any)[0] as any)[0] === 'escaped' && (rows as any)[0].length === 2) {
                return ((rows as any)[0] as any)[1].replace(/(?:%[0-9A-Fa-f]{2})+/g, (run?: any): any => Buffer.from(run.replaceAll('%', ''), 'hex').toString('utf8'));
            }
            if (rows.length === 1 && ((rows as any)[0] as any)[0] === 'o:') {
                const object: any = Object.create(null);
                for (const pair of (rows as any)[0].slice(1) as any) {
                    const entries: any = Array.isArray(pair) ? [pair] : Object.entries(pair);
                    if (entries.length !== 1 || (entries as any)[0].length !== 2)
                        throw new (Error as any)('Invalid Lino object pair');
                    (object as any)[((entries as any)[0] as any)[0]] = ((entries as any)[0] as any)[1];
                }
                return object;
            }
            if (multiline && rows.every((r?: any): any => r.length === 2 && typeof (r as any)[0] === 'string')) {
                const object: any = Object.create(null);
                for (const [key, v] of rows as any) {
                    if (Object.hasOwn(object, key))
                        throw new (Error as any)('Duplicate Lino key');
                    (object as any)[key] = v;
                }
                return object;
            }
            return rows.flat();
        }
        if ((text as any)[i] === '"' || (text as any)[i] === "'" || (text as any)[i] === '`') {
            const delimiter: any = (text as any)[i];
            let count: any = 0;
            while ((text as any)[i + count] === delimiter)
                count++;
            if (count === 2) {
                i += 2;
                return '';
            }
            i += count;
            let raw: any = '';
            while (i < text.length) {
                if ((text as any)[i] !== delimiter) {
                    raw += (text as any)[i++];
                    continue;
                }
                let run: any = 0;
                while ((text as any)[i + run] === delimiter)
                    run++;
                if (count === 1) {
                    if (run >= 2) {
                        raw += delimiter;
                        i += 2;
                        continue;
                    }
                    i++;
                    return scalar(raw, true);
                }
                if (run >= count) {
                    raw += delimiter.repeat(run - count);
                    i += run;
                    return scalar(raw, true);
                }
                raw += delimiter.repeat(run);
                i += run;
            }
            throw new (Error as any)('Unclosed Lino string');
        }
        const start: any = i;
        while (i < text.length && !/[\s()]/.test((text as any)[i]))
            i++;
        if (i === start)
            throw new (Error as any)('Invalid Links Notation input');
        return scalar(text.slice(start, i));
    }
    while (/\s/.test((text as any)[i] ?? '') && i < text.length)
        i++;
    const result: any = value();
    while (/\s/.test((text as any)[i] ?? '') && i < text.length)
        i++;
    if (i !== text.length)
        throw new (Error as any)('Trailing Links Notation data');
    return result;
}
const strings: any = ['max_requests', 'used_requests', 'max_tokens', 'used_tokens', 'reserved_tokens', 'rate_limit_per_minute', 'rate_window_started_at', 'rate_window_requests', 'sliding_window_seconds', 'run_lease_expires_at'];
export function encodeTokenRecords(records?: any): any {
    const values: any = records.slice().sort((a?: any, b?: any): any => a.id.localeCompare(b.id)).map((record?: any): any => {
        const value: any = { ...record };
        for (const field of strings as any)
            if ((value as any)[field] != null)
                (value as any)[field] = String((value as any)[field]);
        value.github_repos = (value.github_repos ?? []).join(',');
        value.model_policy = JSON.stringify(value.model_policy ?? {});
        return { type: 'TokenRecord', subtype: record.id, value };
    });
    return encodeLino({ type: 'RouterState', subtype: 'TokenStore', value: values });
}
export function decodeTokenRecords(text?: any): any {
    if (!text.trim())
        return [];
    const root: any = decodeLino(text);
    if (root.type !== 'RouterState' || root.subtype !== 'TokenStore' || !Array.isArray(root.value))
        throw new (Error as any)('Unsupported token storage format');
    const ids: any = new (Set as any)();
    return root.value.map((row?: any): any => {
        if (row.type !== 'TokenRecord' || row.subtype !== row.value?.id || ids.has(row.subtype))
            throw new (Error as any)('Invalid/duplicate token record');
        ids.add(row.subtype);
        const record: any = { ...row.value };
        for (const field of strings as any)
            if ((record as any)[field] != null) {
                if (!/^-?\d+$/.test(String((record as any)[field])))
                    throw new (Error as any)(`Invalid token field ${field}`);
                (record as any)[field] = Number((record as any)[field]);
                if (!Number.isSafeInteger((record as any)[field]) || (field !== 'rate_window_started_at' && (record as any)[field] < 0))
                    throw new (Error as any)(`Unsafe token field ${field}`);
            }
        if (typeof record.id !== 'string' || typeof record.revoked !== 'boolean' || !Number.isSafeInteger(record.expires_at) || !Number.isSafeInteger(record.issued_at))
            throw new (Error as any)('Invalid token record');
        record.github_repos = record.github_repos ? record.github_repos.split(',') : [];
        record.model_policy = JSON.parse(record.model_policy ?? '{}' as any);
        return record;
    });
}
export class MemoryTokenStore {
    declare key: any;
    declare records: any;
    constructor(records: any = []) { this.records = new (Map as any)(records.map((r?: any): any => [r.id, structuredClone(r)])); this.key = {}; }
    async transaction(operation?: any): Promise<any> {
        return serialized(this.key, async (): Promise<any> => {
            const records: any = new (Map as any)([...this.records].map(([id, r]: any): any => [id, structuredClone(r)]));
            const result: any = await operation(records);
            this.records = records;
            return structuredClone(result);
        });
    }
    async list(): Promise<any> { return structuredClone([...this.records.values()]); }
    async get(id?: any): Promise<any> { return structuredClone(this.records.get(id) ?? null); }
    async put(record?: any): Promise<any> { return this.transaction((records?: any): any => records.set(record.id, structuredClone(record)) && record); }
    async delete(id?: any): Promise<any> { return this.transaction((records?: any): any => records.delete(id)); }
}
export class TextTokenStore extends MemoryTokenStore {
    declare path: any;
    declare records: any;
    constructor(path: any) { super(); this.path = path; }
    async transaction(operation?: any): Promise<any> {
        return serialized(this.path, (): any => withNativeFileLock(this.path, async (): Promise<any> => {
            const records: any = new (Map as any)(decodeTokenRecords(await readOptional(this.path)).map((r?: any): any => [r.id, r]));
            const result: any = await operation(records);
            await atomicWrite(this.path, encodeTokenRecords([...records.values()]));
            this.records = records;
            return structuredClone(result);
        }));
    }
    async list(): Promise<any> { return decodeTokenRecords(await readOptional(this.path)); }
    async get(id?: any): Promise<any> { return (await this.list()).find((r?: any): any => r.id === id) ?? null; }
}
export function createTokenStore({ storage_policy = 'memory', data_dir = '.', storage }: any = {}): any {
    if (storage)
        return storage;
    if (['memory', 'mem', 'none'].includes(storage_policy))
        return new (MemoryTokenStore as any)();
    if (storage_policy === 'text')
        return new (TextTokenStore as any)(`${data_dir}/tokens.lino`);
    throw Object.assign(new (Error as any)(`Native token storage '${storage_policy}' is not implemented; select text or memory explicitly`), { code: 'native_unsupported' });
}
