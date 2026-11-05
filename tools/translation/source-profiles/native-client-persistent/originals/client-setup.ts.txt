// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=ba358b5f259a1ae3318537a771003f2c959e5931a904c2466668dc67c66d8614; dynamic any annotations are explicit draft gaps.
import { createHash } from 'node:crypto';
import { clientPaths, clientFailure, clientObject, optionalClientText, preferredClientPath, readClientEnvironment, writeClientEnvironment, writeClientMarker, removeClientFile } from "./client-files.js";
import { fetchNativeClientCatalog, clientRouterOrigin } from "./client-catalog.js";
import { setupClientJSON, removeClientJSON } from "./client-json.js";
import { nativeClientStatus } from "./client-status.js";
import { clientFileTransaction } from "./client-transaction.js";
import { selectedManagedTarget } from "./managed-server.js";
const implementedClients: Set<string> = new (Set as any)(['opencode', 'agent', 'qwen', 'grok']);
const completeBinding: any = (claims?: any, client?: any): any => {
    if (claims.client_kind !== client || typeof claims.principal_id !== 'string' || !claims.principal_id.trim() || typeof claims.sub !== 'string' || !claims.sub)
        throw clientFailure('Supplied token requires the exact canonical managed-client binding and subscriber principal');
    return { token_id: claims.sub, principal_id: claims.principal_id };
};
function decodedBinding(token?: any, client?: any): any {
    if ((Buffer as any).byteLength(token) > 65536 || !(token.startsWith as any)('la_sk_'))
        throw clientFailure('Supplied Router token requires la_sk_ prefix');
    const parts: any = ((token.slice as any)(6).split as any)('.');
    if (parts.length !== 3 || (parts.some as any)((part?: any): boolean => !part || !/^[A-Za-z0-9_-]+$/.test(part)))
        throw clientFailure('Invalid supplied Router token encoding');
    let claims: any;
    try {
        (claims as any) = (JSON as any).parse(new (TextDecoder as any)('utf8', { fatal: true }).decode((Buffer as any).from((parts as any)[1], 'base64url')));
    }
    catch {
        throw clientFailure('Invalid supplied Router token payload');
    }
    return completeBinding(claims, client);
}
function canonicalOrigin(value?: any): string { const origin: string = clientRouterOrigin(value), url: any = new (URL as any)(origin); if (url.pathname !== '/')
    throw clientFailure('Client setup requires a Router origin without a path'); return origin; }
function localOrigin(config?: any): string { let host: any = config.host ?? '127.0.0.1'; if (host === '0.0.0.0')
    (host as any) = '127.0.0.1'; if (host === '::')
    (host as any) = '::1'; if (((host as any).includes as any)(':') && !((host as any).startsWith as any)('['))
    (host as any) = `[${host}]`; return canonicalOrigin(`http://${host}:${config.port ?? 8080}`); }
const metadataPath: any = (paths?: any): any => preferredClientPath(paths.metadata, paths.legacyMetadata);
export async function setupNativeClient({ options, invocation = {}, core, env = {}, fetch, checkpoint }: any = {}): Promise<any> {
    const paths: any = clientPaths(options.client, { home: options.home, env, cwd: invocation.cwd }), { info }: any = paths;
    if (info.unsupported)
        throw clientFailure(info.unsupported);
    if (!implementedClients.has(info.client))
        throw clientFailure('Native Claude/Codex persistent writer contracts are not implemented');
    if (await optionalClientText(paths.config + '.with-router-state.json') !== null)
        throw clientFailure('Reversible global client state requires the full undo-state contract; existing setup preserved');
    if (options.management_server)
        throw clientFailure('Native remote client issuance and proof-of-possession are not implemented');
    if (!options.base_url && await selectedManagedTarget({ name: 'clients.setup', config: core.config, env, cwd: invocation.cwd }))
        throw clientFailure('clients setup mints locally; a selected remote Router requires configure or an explicit base URL');
    const origin: string = options.base_url ? canonicalOrigin(options.base_url) : localOrigin(core.config), context: any = { home: options.home, env, cwd: invocation.cwd };
    const status: any = await nativeClientStatus(info.client, context), oldEnvironment: any = await preferredClientPath(paths.environment, paths.legacyEnvironment), oldMetadata: any = await optionalClientText(await metadataPath(paths));
    const oldToken: any = readClientEnvironment(await optionalClientText(oldEnvironment), info.token), oldRecord: any = oldMetadata === null ? null : clientObject(oldMetadata, 'Ownership metadata');
    if (status.ownership_state === 'managed-intact' && oldRecord?.router === origin && oldToken) {
        try {
            completeBinding(await (core.tokens.validate as any)(oldToken), info.client);
            return { output: [`${info.client} is already configured in ${paths.config}`, `credentials: ${oldEnvironment} (mode 0600)`] };
        }
        catch { }
    }
    let token: any = options.token_stdin ? String(invocation.stdin ?? '').trim() : String(options.token ?? env.LINK_ASSISTANT_ROUTER_TOKEN ?? env.LINK_ASSISTANT_TOKEN ?? '').trim();
    let record: any, minted: any = null, catalog: any, foreign: any = false, setupBackup: any = null;
    try {
        if (token) {
            const decoded: any = decodedBinding(token, info.client);
            let local: any;
            try {
                (local as any) = await (core.tokens.validate as any)(token);
            }
            catch { }
            (foreign as any) = !local;
            const binding: any = local ? completeBinding(local, info.client) : decoded;
            (record as any) = { client: info.client, source: 'supplied', ...binding, label: null, issued_at: null, router: origin, principal_id: binding.principal_id, config_sha256: null };
        }
        else {
            const issued: any = await (core.tokens.issue as any)({ ttl_hours: options.ttl_hours === undefined ? 24 : Number(options.ttl_hours), label: `client-${info.client}`, account: 'primary', client_kind: info.client, principal_id: 'primary' });
            (token as any) = issued.token;
            (minted as any) = issued.id;
            (record as any) = { client: info.client, source: 'minted', token_id: issued.id, label: `client-${info.client}`, issued_at: core.clock(), router: origin, principal_id: 'primary', config_sha256: null };
        }
        if (info.client !== 'grok' || foreign) {
            const all: any = await fetchNativeClientCatalog(info.client, origin, token, { fetch, signal: invocation.signal });
            const preferred: any = info.owners.flatMap((owner?: any): any => all.filter((row?: any): boolean => row.owned_by === owner));
            (catalog as any) = info.owners.length && (preferred.length || info.strict) ? preferred : all;
        }
        else
            (catalog as any) = [];
        let backup: any;
        const result: any = await clientFileTransaction(paths, async (txn?: any): Promise<any> => {
            await (txn.verify as any)(paths.config);
            if (paths.marker)
                await (txn.verify as any)(paths.marker);
            const configured: any = info.client === 'grok' ? { path: paths.config, backup: null, changed: false } : await setupClientJSON(paths, origin + info.suffix, catalog, { onWrite: async (path?: any, result?: any): Promise<void> => { if (result?.backup)
                    (setupBackup as any) = result.backup; await (txn.advance as any)([path]); } });
            (backup as any) = configured.backup;
            await (txn.checkpoint as any)('config');
            await (txn.verify as any)(txn.environment);
            await writeClientEnvironment(paths, origin, token);
            await (txn.advance as any)([txn.environment]);
            await (txn.checkpoint as any)('environment');
            await (txn.verify as any)(txn.metadata);
            (record as any).config_sha256 = createHash('sha256').update(await optionalClientText(paths.config) ?? '').digest('hex');
            await writeClientMarker(txn.metadata, record);
            await (txn.advance as any)([txn.metadata]);
            await (txn.checkpoint as any)('metadata');
            return configured;
        }, { checkpoint });
        return { output: [info.client === 'grok' ? 'configured grok through its environment; its own config file was not changed' : `${result.changed ? 'configured' : 'already configured'} ${info.client} in ${paths.config}`, ...(backup ? [`backup: ${backup}`] : []), `credentials: ${await preferredClientPath(paths.environment, paths.legacyEnvironment)} (mode 0600)`, 'The token is not stored in the client config or printed to the terminal.'] };
    }
    catch (error: any) {
        if (minted)
            await (core.tokens.revoke as any)(minted);
        if (setupBackup)
            await removeClientFile(setupBackup);
        throw error;
    }
}
export async function removeNativeClient({ options, invocation = {}, core, env = {}, checkpoint }: any = {}): Promise<any> {
    const paths: any = clientPaths(options.client, { home: options.home, env, cwd: invocation.cwd }), { info }: any = paths;
    if (!implementedClients.has(info.client))
        throw clientFailure('Native persistent removal for this client is not implemented');
    if (await optionalClientText(paths.config + '.with-router-state.json') !== null)
        throw clientFailure('Reversible global client state requires the full undo-state contract; existing setup preserved');
    const path: any = await metadataPath(paths), source: any = await optionalClientText(path), record: any = source === null ? null : clientObject(source, 'Ownership metadata');
    if (record && (![info.client, info.legacy].includes(record.client) || !['minted', 'supplied'].includes(record.source)))
        throw clientFailure('Invalid managed credential metadata');
    if (record && (record.source === 'minted' || options.revoke_supplied)) {
        if (record.management_server)
            throw clientFailure('Remote managed credential revocation is not implemented; configuration preserved');
        if (typeof record.token_id !== 'string' || !record.token_id) {
            if (!options.force)
                throw clientFailure('Credential token ID is missing; configuration preserved');
        }
        else {
            const held: any = ((await core.tokens.list()).find as any)((token?: any): boolean => token.id === record.token_id);
            if (!held && !options.force)
                throw clientFailure('Managed token does not belong to this local store; configuration preserved');
            if (held)
                await (core.tokens.revoke as any)(record.token_id);
        }
    }
    const result: any = await clientFileTransaction(paths, async (txn?: any): Promise<any> => {
        const removed: any = info.client === 'grok' ? { path: paths.config, backup: null, changed: false } : await removeClientJSON(paths, { onWrite: (path?: any): any => (txn.advance as any)([path]) });
        await (txn.checkpoint as any)('config');
        await (txn.verify as any)(txn.environment);
        await removeClientFile(txn.environment);
        await (txn.advance as any)([txn.environment]);
        await (txn.verify as any)(txn.metadata);
        await removeClientFile(txn.metadata);
        await (txn.advance as any)([txn.metadata]);
        await (txn.checkpoint as any)('metadata');
        return removed;
    }, { checkpoint });
    return { output: [`Removed Router configuration for ${info.client}`, ...(result.backup ? [`backup: ${result.backup}`] : [])] };
}
