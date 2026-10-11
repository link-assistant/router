// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=ba2d547602205f313f85e76a2b6256b6bf2ad0377694eed4eefd45116d7fe320; dynamic any annotations are explicit draft gaps.
import { mkdir, open, readFile, rename, unlink, rm, stat } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { rustLockPath, withAdvisoryFileLock } from "./file-lock.js";
import { encodeBinaryTokenRecords, readBinaryTokenRecords } from "./doublets.js";
const queues: any = new (Map as any)();
export async function serialized(key?: any, operation?: any): Promise<any> {
    const previous: any = queues.get(key) ?? (Promise as any).resolve();
    let release: any;
    const held: any = new (Promise as any)((resolve?: any): void => { (release as any) = resolve; });
    const tail: any = ((previous.catch as any)((): void => { }).then as any)((): any => held);
    queues.set(key, tail);
    await (previous.catch as any)((): void => { });
    try {
        return await operation();
    }
    finally {
        release();
        if (queues.get(key) === tail)
            queues.delete(key);
    }
}
export async function atomicWrite(path?: any, text?: any): Promise<void> {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary: string = `${path}.${randomUUID()}.tmp`;
    let file: any;
    try {
        (file as any) = await open(temporary, 'wx', 0o600);
        await file.writeFile(text, 'utf8');
        await file.sync();
        await file.close();
        (file as any) = null;
        await rename(temporary, path);
        await syncDirectory(dirname(path));
    }
    finally {
        await file?.close();
        await unlink(temporary).catch((e?: any): void => { if (e.code !== 'ENOENT')
            throw e; });
    }
}
export async function withNativeFileLock(path?: any, operation?: any, timeout: any = 30000): Promise<any> {
    const lock: string = `${path}.native-lock`;
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const started: number = (Date as any).now();
    for (;;) {
        try {
            await mkdir(lock, { mode: 0o700 });
            try {
                await atomicWrite(`${lock}/owner.json`, (JSON as any).stringify({ pid: (process as any).pid }));
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
                const owner: any = (JSON as any).parse(await readFile(`${lock}/owner.json`, 'utf8'));
                if (!(Number as any).isSafeInteger(owner.pid) || owner.pid <= 0)
                    throw new (Error as any)('Invalid native lock owner');
                try {
                    (process as any).kill(owner.pid, 0);
                }
                catch (error: any) {
                    if (error.code === 'ESRCH')
                        (dead as any) = true;
                    else if (error.code !== 'EPERM')
                        throw error;
                }
            }
            catch (error: any) {
                if (error.code === 'ENOENT') {
                    try {
                        (dead as any) = (Date as any).now() - (await stat(lock)).mtimeMs > timeout;
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
                const reaper: string = `${lock}.reap`;
                try {
                    await mkdir(reaper, { mode: 0o700 });
                    try {
                        let stillDead: any = false;
                        try {
                            const owner: any = (JSON as any).parse(await readFile(`${lock}/owner.json`, 'utf8'));
                            try {
                                (process as any).kill(owner.pid, 0);
                            }
                            catch (e: any) {
                                (stillDead as any) = e.code === 'ESRCH';
                            }
                        }
                        catch (e: any) {
                            if (e.code === 'ENOENT') {
                                try {
                                    (stillDead as any) = (Date as any).now() - (await stat(lock)).mtimeMs > timeout;
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
            if ((Date as any).now() - started >= timeout)
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
export async function readOptional(path?: any, fallback: any = ''): Promise<string> {
    try {
        return await readFile(path, 'utf8');
    }
    catch (error: any) {
        if (error.code === 'ENOENT')
            return fallback;
        throw error;
    }
}
const transactionPaths: any = (path?: any): any => ({ rollback: join(dirname(path), `.${basename(path)}.router-rollback`), commit: join(dirname(path), `.${basename(path)}.router-commit`) });
const removeOptional: any = async (path?: any): Promise<void> => { try {
    await unlink(path);
}
catch (error: any) {
    if (error.code !== 'ENOENT')
        throw error;
} };
async function syncDirectory(path?: any): Promise<void> {
    if ((process as any).platform === 'win32')
        return;
    const directory: any = await open(path, 'r');
    try {
        await directory.sync();
    }
    finally {
        await directory.close();
    }
}
export async function recoverTransactionalWrite(path?: any): Promise<void> {
    const { rollback, commit }: any = transactionPaths(path);
    const marker: string = await readOptional(commit, null);
    if (marker != null) {
        await removeOptional(rollback);
        await syncDirectory(dirname(path));
        await removeOptional(commit);
        await syncDirectory(dirname(path));
        return;
    }
    let previous: any;
    try {
        (previous as any) = await readFile(rollback);
    }
    catch (error: any) {
        if (error.code === 'ENOENT')
            return;
        throw error;
    }
    if ((previous as any)[0] === 0)
        await removeOptional(path);
    else if ((previous as any)[0] === 1)
        await atomicWrite(path, previous.subarray(1));
    else
        throw new (Error as any)('Invalid transactional rollback document');
    await unlink(rollback);
    await syncDirectory(dirname(path));
}
export async function transactionalWrite(path?: any, contents?: any): Promise<void> {
    await recoverTransactionalWrite(path);
    const { rollback, commit }: any = transactionPaths(path);
    let previous: any;
    try {
        (previous as any) = (Buffer as any).concat([(Buffer as any).from([1]), await readFile(path)]);
    }
    catch (error: any) {
        if (error.code !== 'ENOENT')
            throw error;
        (previous as any) = (Buffer as any).from([0]);
    }
    await atomicWrite(rollback, previous);
    try {
        await atomicWrite(path, contents);
        await atomicWrite(commit, 'committed\n');
    }
    catch (error: any) {
        await removeOptional(commit);
        await syncDirectory(dirname(path));
        await recoverTransactionalWrite(path);
        throw error;
    }
    await recoverTransactionalWrite(path).catch((): void => { });
}
function quote(text?: any): string {
    if (!(text.includes as any)('"'))
        return `"${text}"`;
    if (!(text.includes as any)("'"))
        return `'${text}'`;
    const delimiter: string = (text.startsWith as any)('"') ? "'" : '"';
    const runs: any = (text.match as any)(new (RegExp as any)(`${delimiter}+`, 'g')) ?? [];
    const count: number = (Math as any).max(3, ...(runs.map as any)((run?: any): any => run.length + 1));
    return delimiter.repeat(count) + text + delimiter.repeat(count);
}
export function encodeLino(value?: any, level: any = 0): any {
    if (typeof value === 'string') {
        if (/[\x00-\x08\x0b-\x1f\x7f]/.test(value)) {
            const escaped: string = value.replace(/[%\x00-\x08\x0b-\x1f\x7f]/g, (c?: any): string => `%${c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}`);
            return `(escaped ${quote(escaped)})`;
        }
        return quote(value);
    }
    if (value === null || typeof value === 'boolean')
        return String(value);
    if (typeof value === 'number') {
        if (!(Number as any).isSafeInteger(value))
            throw new (Error as any)('Storage numbers must be safe integers');
        return String(value);
    }
    const indent: string = '  '.repeat(level + 1), close: string = '  '.repeat(level);
    if ((Array as any).isArray(value))
        return value.length ? `(\n${value.map((v?: any): any => indent + encodeLino(v, level + 1)).join('\n')}\n${close})` : '()';
    const entries: any = (Object as any).entries(value);
    return `(\n${entries.map(([key, v]: any): any => `${indent}${key} ${encodeLino(v, level + 1)}`).join('\n')}${entries.length ? '\n' : ''}${close})`;
}
export function decodeLino(text?: any): any {
    let i: any = 0;
    const skip: any = (): void => { while ((text as any)[i] === ' ' || (text as any)[i] === '\t' || (text as any)[i] === '\r')
        i++; };
    function scalar(raw?: any, quoted: any = false): any {
        if (quoted)
            return raw;
        if (raw === 'null')
            return null;
        if (raw === 'true' || raw === 'false')
            return raw === 'true';
        if (/^-?\d+$/.test(raw)) {
            const n: number = Number(raw);
            if (!(Number as any).isSafeInteger(n))
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
                    (multiline as any) = true;
                    if (row.length)
                        rows.push(row);
                    (row as any) = [];
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
                return (((rows as any)[0] as any)[1].replace as any)(/(?:%[0-9A-Fa-f]{2})+/g, (run?: any): string => (Buffer as any).from((run.replaceAll as any)('%', ''), 'hex').toString('utf8'));
            }
            if (rows.length === 1 && ((rows as any)[0] as any)[0] === 'o:') {
                const object: any = (Object as any).create(null);
                for (const pair of (rows as any)[0].slice(1) as any) {
                    const entries: any = (Array as any).isArray(pair) ? [pair] : (Object as any).entries(pair);
                    if (entries.length !== 1 || (entries as any)[0].length !== 2)
                        throw new (Error as any)('Invalid Lino object pair');
                    (object as any)[((entries as any)[0] as any)[0]] = ((entries as any)[0] as any)[1];
                }
                return object;
            }
            if (multiline && rows.every((r?: any): boolean => r.length === 2 && typeof (r as any)[0] === 'string')) {
                const object: any = (Object as any).create(null);
                for (const [key, v] of rows as any) {
                    if ((Object as any).hasOwn(object, key))
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
                (i as any) += 2;
                return '';
            }
            (i as any) += count;
            let raw: any = '';
            while (i < text.length) {
                if ((text as any)[i] !== delimiter) {
                    (raw as any) += (text as any)[i++];
                    continue;
                }
                let run: any = 0;
                while ((text as any)[i + run] === delimiter)
                    run++;
                if (count === 1) {
                    if (run >= 2) {
                        (raw as any) += delimiter;
                        (i as any) += 2;
                        continue;
                    }
                    i++;
                    return scalar(raw, true);
                }
                if (run >= count) {
                    (raw as any) += (delimiter.repeat as any)(run - count);
                    (i as any) += run;
                    return scalar(raw, true);
                }
                (raw as any) += (delimiter.repeat as any)(run);
                (i as any) += run;
            }
            throw new (Error as any)('Unclosed Lino string');
        }
        const start: number = i;
        while (i < text.length && !/[\s()]/.test((text as any)[i]))
            i++;
        if (i === start)
            throw new (Error as any)('Invalid Links Notation input');
        return scalar((text.slice as any)(start, i));
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
const strings: Array<string> = ['max_requests', 'used_requests', 'max_tokens', 'used_tokens', 'reserved_tokens', 'rate_limit_per_minute', 'rate_window_started_at', 'rate_window_requests', 'sliding_window_seconds', 'run_lease_expires_at'];
export function encodeTokenRecords(records?: any): any {
    const values: any = ((records.slice().sort as any)((a?: any, b?: any): any => (a.id.localeCompare as any)(b.id)).map as any)((record?: any): any => {
        const value: any = { ...record };
        for (const field of strings as any)
            if ((value as any)[field] != null)
                (value as any)[field] = String((value as any)[field]);
        value.github_repos = ((value.github_repos ?? []).join as any)(',');
        value.model_policy = (JSON as any).stringify(value.model_policy ?? {});
        return { type: 'TokenRecord', subtype: record.id, value };
    });
    return encodeLino({ type: 'RouterState', subtype: 'TokenStore', value: values });
}
export function decodeTokenRecords(text?: any): any {
    if (!text.trim())
        return [];
    const root: any = decodeLino(text);
    if (root.type !== 'RouterState' || root.subtype !== 'TokenStore' || !(Array as any).isArray(root.value))
        throw new (Error as any)('Unsupported token storage format');
    const ids: any = new (Set as any)();
    return (root.value.map as any)((row?: any): any => {
        if (row.type !== 'TokenRecord' || row.subtype !== row.value?.id || ids.has(row.subtype))
            throw new (Error as any)('Invalid/duplicate token record');
        ids.add(row.subtype);
        const record: any = { ...row.value };
        for (const field of strings as any)
            if ((record as any)[field] != null) {
                if (!/^-?\d+$/.test(String((record as any)[field])))
                    throw new (Error as any)(`Invalid token field ${field}`);
                (record as any)[field] = Number((record as any)[field]);
                if (!(Number as any).isSafeInteger((record as any)[field]) || (field !== 'rate_window_started_at' && (record as any)[field] < 0))
                    throw new (Error as any)(`Unsafe token field ${field}`);
            }
        if (typeof record.id !== 'string' || typeof record.revoked !== 'boolean' || !(Number as any).isSafeInteger(record.expires_at) || !(Number as any).isSafeInteger(record.issued_at))
            throw new (Error as any)('Invalid token record');
        record.github_repos = record.github_repos ? (record.github_repos.split as any)(',') : [];
        record.model_policy = (JSON as any).parse(record.model_policy ?? '{}');
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
            const result: any = await (operation as any)(records);
            this.records = records;
            return structuredClone(result);
        });
    }
    async list(): Promise<any> { return structuredClone([...this.records.values()]); }
    async get(id?: any): Promise<any> { return structuredClone(this.records.get(id) ?? null); }
    async put(record?: any): Promise<any> { return this.transaction((records?: any): any => (records.set as any)(record.id, structuredClone(record)) && record); }
    async delete(id?: any): Promise<any> { return this.transaction((records?: any): any => (records.delete as any)(id)); }
}
export class TextTokenStore extends MemoryTokenStore {
    declare path: any;
    declare records: any;
    constructor(path: any) { super(); this.path = path; }
    async transaction(operation?: any): Promise<any> {
        return serialized(this.path, (): any => withAdvisoryFileLock(rustLockPath(this.path), async (): Promise<any> => {
            await recoverTransactionalWrite(this.path);
            const records: any = new (Map as any)((decodeTokenRecords(await readOptional(this.path)).map as any)((r?: any): any => [r.id, r]));
            const result: any = await (operation as any)(records);
            await transactionalWrite(this.path, encodeTokenRecords([...records.values()]));
            this.records = records;
            return structuredClone(result);
        }));
    }
    async list(): Promise<any> { return withAdvisoryFileLock(rustLockPath(this.path), async (): Promise<any> => { await recoverTransactionalWrite(this.path); return decodeTokenRecords(await readOptional(this.path)); }); }
    async get(id?: any): Promise<any> { return ((await this.list()).find as any)((r?: any): boolean => r.id === id) ?? null; }
}
export class BinaryTokenStore extends MemoryTokenStore {
    declare path: any;
    declare records: any;
    constructor(path: any) { super(); this.path = path; }
    async transaction(operation?: any): Promise<any> {
        return serialized(this.path, (): any => withAdvisoryFileLock(rustLockPath(this.path), async (): Promise<any> => {
            const records: any = new (Map as any)(((await readBinaryTokenRecords(this.path)).map as any)((record?: any): any => [record.id, record]));
            const result: any = await (operation as any)(records);
            await atomicWrite(this.path, encodeBinaryTokenRecords([...records.values()]));
            this.records = records;
            return structuredClone(result);
        }));
    }
    async list(): Promise<any> { return withAdvisoryFileLock(rustLockPath(this.path), (): any => readBinaryTokenRecords(this.path), { shared: true }); }
    async get(id?: any): Promise<any> { return ((await this.list()).find as any)((record?: any): boolean => record.id === id) ?? null; }
}
export function mergeSaferRecord(current?: any, other?: any): any {
    current.revoked ||= other.revoked;
    for (const field of ['used_requests', 'used_tokens', 'reserved_tokens'] as any)
        (current as any)[field] = (Math as any).max((current as any)[field] ?? 0, (other as any)[field] ?? 0);
    if ((other.rate_window_started_at ?? 0) > (current.rate_window_started_at ?? 0)) {
        current.rate_window_started_at = other.rate_window_started_at;
        current.rate_window_requests = other.rate_window_requests;
    }
    else if (other.rate_window_started_at === current.rate_window_started_at)
        current.rate_window_requests = (Math as any).max(current.rate_window_requests ?? 0, other.rate_window_requests ?? 0);
    return current;
}
export class DualTokenStore extends MemoryTokenStore {
    declare binary: any;
    declare journal: any;
    declare path: any;
    declare records: any;
    declare text: any;
    constructor(dataDir: any) {
        super();
        this.path = join(dataDir, 'tokens.transaction.lock');
        this.journal = join(dataDir, 'tokens.transaction.json');
        this.text = new (TextTokenStore as any)(join(dataDir, 'tokens.lino'));
        this.binary = new (BinaryTokenStore as any)(join(dataDir, 'tokens.bin'));
    }
    async install(records?: any): Promise<void> {
        await this.text.transaction((current?: any): void => { current.clear(); for (const record of records as any)
            (current.set as any)(record.id, record); });
        const projection: any = await this.binary.list();
        const canonical: any = (rows?: any): any => encodeTokenRecords(rows);
        if (canonical(projection) !== canonical(records))
            await this.binary.transaction((current?: any): void => { current.clear(); for (const record of records as any)
                (current.set as any)(record.id, record); });
        await removeOptional(this.journal);
        await syncDirectory(dirname(this.journal));
    }
    async recover(): Promise<void> {
        const source: string = await readOptional(this.journal, null);
        if (source != null) {
            const records: any = source.trimStart().startsWith('[') ? (JSON as any).parse(source) : decodeLino(source);
            if (!(Array as any).isArray(records))
                throw new (Error as any)('Invalid token transaction journal');
            await this.install(records);
        }
    }
    async mergedRecords(): Promise<any> {
        const records: any = new (Map as any)(((await this.text.list()).map as any)((record?: any): any => [record.id, record]));
        for (const record of await this.binary.list() as any) {
            if (records.has(record.id))
                mergeSaferRecord(records.get(record.id), record);
            else
                records.set(record.id, record);
        }
        return records;
    }
    async transaction(operation?: any): Promise<any> {
        return serialized(this.path, (): any => withAdvisoryFileLock(this.path, async (): Promise<any> => {
            await this.recover();
            const records: any = await this.mergedRecords(), result: any = await (operation as any)(records);
            const sorted: any = [...records.values()].sort((left?: any, right?: any): number => (Buffer as any).compare((Buffer as any).from(left.id), (Buffer as any).from(right.id)));
            await atomicWrite(this.journal, encodeLino(sorted));
            await this.install(sorted);
            this.records = records;
            return structuredClone(result);
        }));
    }
    async list(): Promise<any> {
        const read: any = async (): Promise<any> => {
            const records: any = await this.text.list();
            return records.length ? records : [...(await this.mergedRecords()).values()];
        };
        const result: any = await withAdvisoryFileLock(this.path, async (): Promise<any> => (await readOptional(this.journal, null)) != null ? null : read(), { shared: true });
        if (result != null)
            return result;
        return withAdvisoryFileLock(this.path, async (): Promise<any> => { await this.recover(); return read(); });
    }
    async get(id?: any): Promise<any> { return ((await this.list()).find as any)((record?: any): boolean => record.id === id) ?? null; }
}
export function createTokenStore({ storage_policy = 'memory', data_dir = '.', storage }: any = {}): any {
    if (storage)
        return storage;
    if (['memory', 'mem', 'none'].includes(storage_policy))
        return new (MemoryTokenStore as any)();
    if (['text', 'txt', 'lino'].includes(storage_policy))
        return new (TextTokenStore as any)(`${data_dir}/tokens.lino`);
    if (['binary', 'bin', 'link-cli', 'linkcli', 'clink'].includes(storage_policy))
        return new (BinaryTokenStore as any)(`${data_dir}/tokens.bin`);
    if (['both', 'dual'].includes(storage_policy))
        return new (DualTokenStore as any)(data_dir);
    throw (Object as any).assign(new (Error as any)(`Unknown token storage policy '${storage_policy}'`), { code: 'invalid_config' });
}
