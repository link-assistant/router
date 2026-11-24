// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=41b335b19f7e9edb7da76cc5f6ee81e5aaf8210c8300dfd1fd9fae60e33f94c0; dynamic any annotations are explicit draft gaps.
import { lstat, mkdir, chmod, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { optionalClientText, clientFailure, removeClientFile } from "./client-files.js";
import { requireNativePath } from "./operation-input.js";
import { atomicWrite, serialized } from "./storage.js";
import { withAdvisoryFileLock } from "./file-lock.js";
const hash: any = (value?: any): null | string => value === null ? null : createHash('sha256').update(value).digest('hex');
async function state(path?: any): Promise<any> { const source: any = await optionalClientText(path); return { source, hash: hash(source), mode: source !== null ? (await lstat(path)).mode & 0o7777 : null }; }
export async function clientFileTransaction(paths?: any, operation?: any, { checkpoint = (): void => { } }: any = {}): Promise<any> {
    const lock: string = join(paths.configHome, 'link-assistant-router/clients', `${paths.info.client}.repair.lock`);
    await requireNativePath(lock);
    return serialized(lock, (): any => withAdvisoryFileLock(lock, async (): Promise<any> => {
        const id: string = randomUUID().replaceAll('-', ''), root: string = join(paths.configHome, 'link-assistant-router/repairs', id);
        await requireNativePath(root);
        await mkdir(root, { recursive: true, mode: 0o700 });
        await chmod(root, 0o700);
        const allowed: any = [paths.config, await (await import("./client-files.js")).preferredClientPath(paths.environment, paths.legacyEnvironment), await (await import("./client-files.js")).preferredClientPath(paths.metadata, paths.legacyMetadata), ...(paths.marker ? [paths.marker] : [])].sort();
        const entries: any = [];
        try {
            for (const [index, path] of [...new (Set as any)(allowed)].entries() as any) {
                const before: any = await state(path), backup: any = before.source !== null ? `${index}.backup` : null;
                if (backup)
                    await atomicWrite(join(root, backup), before.source);
                entries.push({ path, existed: before.source !== null, mode: before.mode, before_sha256: before.hash, after_sha256: before.hash, backup });
            }
            const manifest: any = { version: 1, id, client: paths.info.client, entries };
            const persist: any = (): Promise<void> => atomicWrite(join(root, 'manifest.json'), (JSON as any).stringify(manifest, null, 2) + '\n');
            await persist();
            const verify: any = async (path?: any): Promise<void> => { const entry: any = entries.find((entry?: any): boolean => entry.path === path); if (!entry)
                throw clientFailure('Client path is outside its transaction allow-list'); if ((await state(path)).hash !== entry.after_sha256)
                throw clientFailure('Client configuration changed concurrently; retry'); };
            const advance: any = async (changed?: any): Promise<void> => { for (const path of changed as any) {
                const entry: any = entries.find((entry?: any): boolean => entry.path === path);
                if (!entry)
                    throw clientFailure('Client path is outside its transaction allow-list');
                entry.after_sha256 = (await state(path)).hash;
            } await persist(); };
            for (const path of allowed as any)
                await verify(path);
            try {
                const result: any = await (operation as any)({ verify, advance, checkpoint, snapshot: id, environment: allowed.find((path?: any): boolean => path === paths.environment || path === paths.legacyEnvironment), metadata: allowed.find((path?: any): boolean => path === paths.metadata || path === paths.legacyMetadata) });
                await advance(allowed);
                await rm(root, { recursive: true });
                return result;
            }
            catch (error: any) {
                let blocked: any = false;
                for (const entry of entries as any) {
                    if ((await state(entry.path)).hash !== entry.after_sha256) {
                        (blocked as any) = true;
                        continue;
                    }
                    if (entry.backup) {
                        const source: any = await optionalClientText(join(root, entry.backup));
                        if (hash(source) !== entry.before_sha256)
                            throw clientFailure('Client transaction snapshot is damaged');
                        await atomicWrite(entry.path, source);
                        if (entry.mode !== null)
                            await chmod(entry.path, entry.mode);
                    }
                    else
                        await removeClientFile(entry.path);
                }
                if (blocked)
                    throw clientFailure('Client transaction failed; concurrent edits were preserved and its private snapshot retained');
                await rm(root, { recursive: true });
                throw error;
            }
        }
        catch (error: any) {
            throw error;
        }
    }));
}
