// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=fdf2ad9b82d79d50018575f85dbc1f85a0fcc82cb41117e8e5b2772a2a5101e9; dynamic any annotations are explicit draft gaps.
import { lstat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { readNativeText, requireNativePath } from "./operation-input.js";
import { decodeTokenRecords, mergeSaferRecord, atomicWrite } from "./storage.js";
import { readBinaryTokenRecords } from "./doublets.js";
const fail: any = (message?: any): any => (Object as any).assign(new (Error as any)(message), { code: 'token_import', exitCode: 2 });
const stat: any = async (path?: any): Promise<any> => lstat(path).catch((error?: any): null => { if (error.code === 'ENOENT')
    return null; throw error; });
function ordered(value?: any): any {
    if ((Array as any).isArray(value))
        return value.map(ordered);
    if (value && typeof value === 'object')
        return (Object as any).fromEntries((Object as any).keys(value).sort().map((key?: any): any => [key, ordered((value as any)[key])]));
    return value;
}
const same: any = (left?: any, right?: any): boolean => (JSON as any).stringify(ordered(left)) === (JSON as any).stringify(ordered(right));
async function recordsFromFile(path?: any): Promise<any> {
    await requireNativePath(path);
    const info: any = await stat(path);
    if (!info?.isFile())
        throw fail('Token import source is not a regular file');
    if (extname(path) === '.bin')
        return readBinaryTokenRecords(path);
    const source: string = await readNativeText(path);
    if (extname(path) === '.lino')
        return decodeTokenRecords(source);
    if (extname(path) === '.json') {
        const records: any = (JSON as any).parse(source);
        if (!(Array as any).isArray(records))
            throw fail('Token JSON export must be an array');
        return records;
    }
    throw fail('Token import requires a .lino, .bin or .json file');
}
export async function readTokenImportSource(path?: any, { cwd = (process as any).cwd(), validateRecord = (): void => { } }: any = {}): Promise<any> {
    (path as any) = resolve(cwd, path);
    await requireNativePath(path);
    const info: any = await stat(path);
    if (!info)
        throw fail('Token import source does not exist');
    const records: any = new (Map as any)();
    const merge: any = (values?: any): void => {
        const fileIds: any = new (Set as any)();
        for (const value of values as any) {
            (validateRecord as any)(value);
            if (fileIds.has(value.id))
                throw fail('Duplicate imported token id');
            fileIds.add(value.id);
            if (records.has(value.id))
                mergeSaferRecord(records.get(value.id), value);
            else
                records.set(value.id, structuredClone(value));
        }
    };
    if (info.isFile())
        merge(await recordsFromFile(path));
    else if (info.isDirectory()) {
        const filenames: Array<string> = ['tokens.lino', 'tokens.bin', 'tokens.json'];
        const holds: any = async (directory?: any): Promise<boolean> => (await (Promise as any).all(filenames.map((name?: any): any => stat(join(directory, name))))).some((info?: any): undefined | boolean => info?.isFile());
        if (!await holds(path) && await holds(join(path, 'data')))
            (path as any) = join(path, 'data');
        let files: any = 0;
        for (const name of filenames as any) {
            const file: string = join(path, name);
            if (await stat(file)) {
                merge(await recordsFromFile(file));
                files++;
            }
        }
        if (!files)
            throw fail('Token import directory holds no tokens.lino, tokens.bin or tokens.json');
    }
    else
        throw fail('Token import requires a file or directory');
    return [...records.values()].sort((left?: any, right?: any): any => (left.id.localeCompare as any)(right.id));
}
export async function importTokenRecords({ source, store, options = {}, dataDir, clock = (): number => (Math as any).floor((Date as any).now() / 1000) }: any): Promise<any> {
    const wanted: any = new (Set as any)(options.ids === undefined ? [] : (Array as any).isArray(options.ids) ? options.ids : [options.ids]);
    const report: any = { mode: options.replace ? 'replace' : 'merge-missing', dry_run: options.dry_run ?? false, source_records: source.length, target_records_before: 0,
        added: [], unchanged: [], conflicts: [], replaced: [], kept_revoked: [], missing_from_source: [...wanted].filter((id?: any): boolean => !(source.some as any)((record?: any): boolean => record.id === id)).sort() };
    const apply: any = async (records?: any): Promise<void> => {
        report.target_records_before = records.size;
        const updates: any = [];
        for (const incoming of source as any) {
            if (wanted.size && !wanted.has(incoming.id))
                continue;
            const existing: any = (records.get as any)(incoming.id);
            if (!existing) {
                report.added.push(incoming.id);
                updates.push(incoming);
                continue;
            }
            if (same(existing, incoming)) {
                report.unchanged.push(incoming.id);
                continue;
            }
            const fields: Array<string> = [...new (Set as any)([...(Object as any).keys(existing), ...(Object as any).keys(incoming)])].filter((key?: any): boolean => !same((existing as any)[key], (incoming as any)[key])).sort();
            if (!options.replace) {
                report.conflicts.push({ id: incoming.id, fields });
                continue;
            }
            const replacement: any = mergeSaferRecord(structuredClone(incoming), existing);
            if (existing.revoked)
                report.kept_revoked.push(incoming.id);
            if (same(existing, replacement)) {
                report.unchanged.push(incoming.id);
                continue;
            }
            report.replaced.push({ id: incoming.id, fields });
            updates.push(replacement);
        }
        if (report.dry_run || !updates.length)
            return;
        if (report.replaced.length) {
            const date: string = new (Date as any)(clock() * 1000).toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z');
            const backup: string = join(dataDir, 'token-import-backups', `tokens-${date}-${randomUUID().replaceAll('-', '').slice(0, 8)}.json`);
            await requireNativePath(backup);
            await atomicWrite(backup, (JSON as any).stringify([...records.values()].sort((a?: any, b?: any): any => (a.id.localeCompare as any)(b.id)), null, 2) + '\n');
            report.backup = backup;
        }
        for (const record of updates as any)
            (records.set as any)(record.id, structuredClone(record));
    };
    if (report.dry_run)
        await apply(new (Map as any)(((await store.list()).map as any)((record?: any): any => [record.id, record])));
    else
        await (store.transaction as any)(apply);
    return report;
}
