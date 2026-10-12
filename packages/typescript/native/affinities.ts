// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=87d34e1c119076caebdd5b29a2f43ebec3f4e5872c125d512f493f4e0540aa57; dynamic any annotations are explicit draft gaps.
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { transactionalWrite, recoverTransactionalWrite, encodeLino, serialized } from "./storage.js";
import { rustLockPath, withAdvisoryFileLock } from "./file-lock.js";
import { RouterError } from "./tokens.js";
import { decodeAffinityFile, validateAffinityValue, exactInteger, integerABI, affinityExpiry, U64_MAX } from "./affinity-schema.js";
const resourceNames: any = { responses: 'responses', 'chat/completions': 'chat', conversations: 'conversations',
    'conversations/items': 'conversation_items', 'realtime/calls': 'realtime_calls', files: 'files',
    'messages/batches': 'batches', skills: 'skills', 'skills/versions': 'skill_versions',
    'mcp/sessions': 'mcp_sessions', 'plugins/installs': 'plugin_installs', 'plugins/uploads': 'plugin_uploads',
    'workspace/plugins': 'workspace_plugins' };
export function affinityNamespace(namespace?: any): any {
    if (typeof namespace !== 'string' || !namespace)
        throw new (RouterError as any)('invalid_argument', 'Resource namespace is required');
    const codexBackend: any = /^\/api\/services\/codex\/backend-api\/(plugin-uploads|plugin-installs|public\/plugins\/workspace)$/.exec(namespace);
    if (codexBackend)
        return ({ 'plugin-uploads': 'codex_plugin_uploads', 'plugin-installs': 'codex_plugin_installs', 'public/plugins/workspace': 'codex_workspace_plugins' } as any)[(codexBackend as any)[1]];
    const match: any = /^\/api\/services\/(openai|anthropic|codex|qwen)\/v1\/(.+)$/.exec(namespace);
    if (!match)
        return namespace;
    const resource: any = (resourceNames as any)[(match as any)[2]];
    if (!resource)
        throw new (RouterError as any)('invalid_argument', 'Unknown resource namespace');
    return `${(match as any)[1] === 'openai' ? 'open_ai' : (match as any)[1]}_${resource}`;
}
function validId(value?: any): boolean {
    return typeof value === 'string' && value.length > 0 && (Buffer as any).byteLength(value) <= 256 && !/[\/\x00-\x1f\x7f-\x9f]/u.test(value);
}
function ownerValue(owner?: any): any {
    if (typeof owner === 'object' && owner !== null && typeof owner.client_kind === 'string' && owner.client_kind.trim() &&
        typeof owner.principal_id === 'string' && owner.principal_id.trim())
        return { client_kind: owner.client_kind, principal_id: owner.principal_id };
    throw new (RouterError as any)('invalid_argument', 'Resource affinity requires a stable managed-client owner');
}
function sameOwner(left?: any, right?: any): boolean { return left.client_kind === right.client_kind && left.principal_id === right.principal_id; }
function destinationValue(destination?: any): any {
    if (!destination || typeof destination.base_url !== 'string')
        throw new (RouterError as any)('invalid_argument', 'Resource destination is required');
    if (destination.kind === 'stored_provider')
        return { kind: destination.kind, name: destination.name, provider_kind: persistedProviderKind(destination.provider_kind), base_url: destination.base_url };
    if (destination.kind === 'subscription')
        return { kind: destination.kind, provider: destination.provider, account: destination.account,
            ...(destination.upstream_account_id != null ? { upstream_account_id: destination.upstream_account_id } : {}), base_url: destination.base_url };
    if (destination.destination_kind === 'stored_provider' || ['openai-compatible', 'lefine', 'z.ai-coding-plan'].includes(destination.provider_kind ?? destination.kind)) {
        return { kind: 'stored_provider', name: destination.provider, provider_kind: persistedProviderKind(destination.provider_kind ?? destination.kind), base_url: destination.base_url };
    }
    return { kind: 'subscription', provider: destination.oauth_provider ?? destination.provider_kind ?? destination.provider, account: destination.account,
        ...(destination.account_id != null ? { upstream_account_id: destination.account_id } : {}), base_url: destination.base_url };
}
function persistedProviderKind(kind?: any): any { return kind === 'z.ai-coding-plan' ? 'zai-coding-plan' : kind; }
function sameDestination(left?: any, right?: any): boolean {
    return left.kind === right.kind && left.base_url === right.base_url && (left.kind === 'stored_provider'
        ? left.name === right.name && left.provider_kind === right.provider_kind
        : left.provider === right.provider && left.account === right.account && left.upstream_account_id === right.upstream_account_id);
}
function matchesExpectedRecord(record?: any, expected?: any): boolean {
    if (!sameDestination(record.destination, destinationValue(expected.destination ?? expected)))
        return false;
    if (!(Object as any).hasOwn(expected, 'response_id'))
        return true;
    return record.namespace === affinityNamespace(expected.namespace) && record.response_id === expected.response_id &&
        sameOwner(record.owner, expected.owner) && (record.parent_id ?? null) === (expected.parent_id ?? null) &&
        record.created_at === expected.created_at && record.expires_at === expected.expires_at;
}
function view(record?: any): any {
    if (!record)
        return null;
    const value: any = record.destination;
    return { ...structuredClone(record), id: record.response_id, destination: value.kind === 'stored_provider'
            ? { provider: value.name, account: value.name, protocol: 'openai', provider_kind: value.provider_kind === 'zai-coding-plan' ? 'z.ai-coding-plan' : value.provider_kind, destination_kind: value.kind, base_url: value.base_url }
            : { provider: value.provider, account: value.account, protocol: value.provider === 'claude' ? 'anthropic' : 'responses',
                provider_kind: value.provider, destination_kind: value.kind, base_url: value.base_url, ...(value.upstream_account_id != null ? { account_id: value.upstream_account_id } : {}) } };
}
export class AffinityStore {
    declare clock: any;
    declare maxRecords: any;
    declare path: any;
    declare persistent: any;
    declare records: any;
    declare ttl: any;
    constructor({ dataDir, persistent = true, clock = (): number => (Math as any).floor((Date as any).now() / 1000), ttl = 30 * 24 * 3600, maxRecords = 10000 }: any) {
        try {
            exactInteger(ttl, 1n, U64_MAX);
        }
        catch {
            throw new (RouterError as any)('invalid_config', 'response-affinity TTL and capacity must be non-zero');
        }
        try {
            (maxRecords as any) = integerABI(exactInteger(maxRecords, 1n, U64_MAX));
        }
        catch {
            throw new (RouterError as any)('invalid_config', 'response-affinity TTL and capacity must be non-zero');
        }
        this.path = join(dataDir, 'response-affinities.lino');
        this.persistent = persistent;
        this.clock = clock;
        this.ttl = ttl;
        this.maxRecords = maxRecords;
        this.records = [];
    }
    async load(): Promise<any> {
        if (!this.persistent)
            return validateAffinityValue({ version: 1, records: structuredClone(this.records) });
        let source: any;
        try {
            (source as any) = new (TextDecoder as any)('utf-8', { fatal: true, ignoreBOM: true }).decode(await readFile(this.path));
        }
        catch (error: any) {
            if (error.code === 'ENOENT')
                return { version: 1, records: [] };
            throw new (RouterError as any)('invalid_storage', `response-affinity storage failed: ${error.message}`, 503);
        }
        let file: any;
        try {
            (file as any) = decodeAffinityFile(source);
        }
        catch (error: any) {
            throw new (RouterError as any)('invalid_storage', `response-affinity document is invalid: ${error.message}`, 503);
        }
        if ((file as any).version !== 1)
            throw new (RouterError as any)('invalid_storage', `unsupported response-affinity document version ${(file as any).version}`, 503);
        return file;
    }
    async verify(): Promise<any> { return this.transaction((): undefined => undefined, { prune: false }); }
    async transaction(operation?: any, { prune = true, now: givenNow }: any = {}): Promise<any> {
        const execute: any = async (): Promise<any> => {
            if (this.persistent) {
                try {
                    await recoverTransactionalWrite(this.path);
                }
                catch (error: any) {
                    throw new (RouterError as any)('invalid_storage', `response-affinity storage failed: ${error.message}`, 503);
                }
            }
            const file: any = await this.load();
            const oldLength: any = file.records.length;
            let now: any;
            if (prune) {
                (now as any) = exactInteger(givenNow ?? this.clock());
                file.records = (file.records.filter as any)((record?: any): boolean => exactInteger(record.expires_at) > now);
            }
            const state: any = { records: file.records, changed: file.records.length !== oldLength, now };
            const result: any = await (operation as any)(state);
            if (state.changed && this.persistent) {
                try {
                    await transactionalWrite(this.path, encodeLino(validateAffinityValue({ version: 1, records: state.records })));
                }
                catch (error: any) {
                    throw new (RouterError as any)('invalid_storage', `response-affinity storage failed: ${error.message}`, 503);
                }
            }
            this.records = state.records;
            return structuredClone(result);
        };
        return serialized(this.path, async (): Promise<any> => {
            try {
                return await (this.persistent ? withAdvisoryFileLock(rustLockPath(this.path), execute) : execute());
            }
            catch (error: any) {
                if (error instanceof RouterError || !error.code)
                    throw error;
                throw new (RouterError as any)('invalid_storage', `response-affinity storage failed: ${error.message}`, 503);
            }
        });
    }
    async get(namespace?: any, owner?: any, id?: any, parentId?: any): Promise<any> {
        if (!validId(id) || parentId != null && !validId(parentId))
            return null;
        let normalized: any;
        try {
            (normalized as any) = ownerValue(owner);
        }
        catch {
            return null;
        }
        (namespace as any) = affinityNamespace(namespace);
        return this.transaction(({ records }: any): any => {
            const matching: any = (records.filter as any)((record?: any): boolean => record.namespace === namespace && record.response_id === id && sameOwner(record.owner, normalized) &&
                (parentId === undefined || record.parent_id === parentId));
            return matching.length === 1 ? view((matching as any)[0]) : null;
        });
    }
    async set(namespace?: any, owner?: any, id?: any, { destination, parent_id, model }: any = {}): Promise<any> {
        if (!validId(id) || parent_id != null && !validId(parent_id))
            throw new (RouterError as any)('invalid_argument', 'Invalid resource id');
        (owner as any) = ownerValue(owner);
        (namespace as any) = affinityNamespace(namespace);
        (destination as any) = validateAffinityValue(destinationValue(destination), 'AffinityDestination');
        const requestedNow: bigint = exactInteger(this.clock());
        return this.transaction((state?: any): any => {
            const existing: any = (state.records.find as any)((record?: any): boolean => record.namespace === namespace && record.response_id === id && sameOwner(record.owner, owner) && (record.parent_id ?? null) === (parent_id ?? null));
            if (existing) {
                if (!sameDestination(existing.destination, destination))
                    throw new (RouterError as any)('affinity_collision', 'Resource id is bound to another upstream', 409);
                state.changed = false;
                return view(existing);
            }
            const now: any = integerABI(state.now);
            const record: any = validateAffinityValue({ namespace, response_id: id, owner, destination, ...(parent_id != null ? { parent_id } : {}), created_at: now, expires_at: affinityExpiry(now, this.ttl) }, 'ResponseAffinity');
            if (model != null)
                (Object as any).defineProperty(record, 'model', { value: model, enumerable: false });
            (state.records.push as any)(record);
            state.changed = true;
            if (state.records.length > this.maxRecords) {
                (state.records.sort as any)((left?: any, right?: any): number => left.created_at < right.created_at ? -1 : left.created_at > right.created_at ? 1 : 0);
                (state.records.splice as any)(0, state.records.length - this.maxRecords);
            }
            return view(record);
        }, { now: requestedNow });
    }
    async delete(namespace?: any, owner?: any, id?: any, parentOrExpected?: any, expected?: any): Promise<any> {
        (owner as any) = ownerValue(owner);
        (namespace as any) = affinityNamespace(namespace);
        const parentId: any = typeof parentOrExpected === 'string' ? parentOrExpected : undefined;
        (expected as any) ??= typeof parentOrExpected === 'object' ? parentOrExpected : undefined;
        return this.transaction((state?: any): boolean => {
            const oldLength: any = state.records.length;
            state.records = (state.records.filter as any)((record?: any): any => record.namespace !== namespace || record.response_id !== id || !sameOwner(record.owner, owner) || parentId !== undefined && record.parent_id !== parentId ||
                expected && !matchesExpectedRecord(record, expected));
            state.changed ||= state.records.length !== oldLength;
            return state.records.length !== oldLength;
        }, { prune: false });
    }
    async list(namespace?: any, owner?: any, parentId?: any): Promise<any> {
        (owner as any) = ownerValue(owner);
        (namespace as any) = affinityNamespace(namespace);
        return this.transaction(({ records }: any): any => ((records.filter as any)((record?: any): boolean => record.namespace === namespace && sameOwner(record.owner, owner) &&
            (parentId === undefined || record.parent_id === parentId)).map as any)(view));
    }
    async deleteChildren(namespace?: any, owner?: any, parentId?: any, destination?: any): Promise<any> {
        (owner as any) = ownerValue(owner);
        (namespace as any) = affinityNamespace(namespace);
        (destination as any) = destinationValue(destination);
        return this.transaction((state?: any): number => {
            const oldLength: any = state.records.length;
            state.records = (state.records.filter as any)((record?: any): boolean => record.namespace !== namespace || record.parent_id !== parentId || !sameOwner(record.owner, owner) || !sameDestination(record.destination, destination));
            state.changed ||= state.records.length !== oldLength;
            return oldLength - state.records.length;
        }, { prune: false });
    }
}
