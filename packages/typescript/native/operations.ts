// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=977f2f364b9c77b7dd8c9e756c1b31ae25f3091fe66679f26dabd4e01dec6821; dynamic any annotations are explicit draft gaps.
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { executeResourceOperation, supportedResourceOperations } from "./resources.js";
import { executeAuthOperation } from "./oauth.js";
import { executeManagedOperation, supportedManagedOperations, selectedManagedServer } from "./managed-server.js";
import Ajv2020 from 'ajv/dist/2020.js';
export const catalog: any = JSON.parse(readFileSync(new (URL as any)('../catalog.json', import.meta.url), 'utf8') as any);
export const version: any = catalog.version;
export const operationNames: any = Object.freeze(catalog.operations.map((operation?: any): any => operation.name));
const camel: any = (value?: any): any => value.replace(/[-_]([a-z])/g, (_?: any, letter?: any): any => letter.toUpperCase());
const snake: any = (value?: any): any => value.replace(/[A-Z]/g, (letter?: any): any => '_' + letter.toLowerCase()).replaceAll('-', '_');
const validators: any = new (Map as any)();
const ajv: any = new (Ajv2020 as any)({ strict: true, allowUnionTypes: true, validateFormats: false });
export class NativeRouterError extends Error {
    declare code: any;
    declare exitCode: any;
    declare name: any;
    declare result: any;
    declare stderr: any;
    constructor(message: any, { code = 'operation', result = null, cause }: any = {}) {
        super(message, { cause });
        this.name = 'NativeRouterError';
        this.code = code;
        this.result = result;
        this.exitCode = result?.exit_code ?? null;
        this.stderr = result?.diagnostics.join('\n') ?? '';
    }
}
export function validateNativeResult(name?: any, result?: any): any {
    if (!validators.has(name)) {
        const schema: any = JSON.parse(readFileSync(new (URL as any)(`../schemas/${name.replaceAll('.', '-')}.v1.json`, import.meta.url), 'utf8') as any);
        validators.set(name, ajv.compile(schema));
    }
    if (!validators.get(name)(result))
        throw new (NativeRouterError as any)(`Invalid ${name} contract: ${ajv.errorsText(validators.get(name).errors)}`, { code: 'schema', result });
    return result;
}
export function operationResult(name?: any, data?: any, diagnostics: any = [], exitCode: any = 0): any {
    return validateNativeResult(name, {
        schema: `link-assistant-router/${name.replaceAll('.', '-')}/v1`, operation: name,
        success: exitCode === 0, exit_code: exitCode, data, diagnostics,
    });
}
const output: any = (...lines: any[]): any => ({ output: lines });
const unsupported: any = (message?: any): any => { throw new (NativeRouterError as any)(message, { code: 'unsupported' }); };
export const nativeOperationSupport: any = Object.freeze({
    ...Object.fromEntries(Object.entries(supportedResourceOperations).map(([name, support]: any): any => [name, support.status])),
    ...Object.fromEntries(Object.keys(supportedManagedOperations).map((name?: any): any => [name, 'partial'])),
    'auth.import': 'partial', 'auth.claude': 'partial', 'auth.codex': 'partial',
    version: 'implemented', contracts: 'implemented',
    'accounts.list': 'partial', 'accounts.pause': 'partial', 'accounts.resume': 'partial', 'accounts.policy': 'partial',
    'tokens.issue': 'partial', 'tokens.list': 'partial', 'tokens.show': 'partial', 'tokens.revoke': 'partial',
    'tokens.import': 'partial', 'tokens.expire': 'partial', 'tokens.rotate': 'partial', 'tokens.recover-admin': 'partial',
    'providers.list': 'partial', 'providers.show': 'partial', 'providers.add': 'partial', 'providers.remove': 'partial',
    'providers.import': 'partial', 'models.explain': 'partial', serve: 'partial', doctor: 'partial', 'auth.status': 'partial',
});
function normalizeOptions(operation?: any, options?: any): any {
    const allowed: any = new (Map as any)(operation.options.map((option?: any): any => [snake(option.name), option]));
    const normalized: any = {};
    for (const [key, value] of Object.entries(options) as any) {
        if (value === undefined || value === null)
            continue;
        const name: any = snake(key), option: any = allowed.get(name);
        if (!option)
            throw new (NativeRouterError as any)(`Unknown ${operation.name} option: ${key}`, { code: 'options' });
        if (option.secret)
            throw new (NativeRouterError as any)(`${key} is secret; use invocation env or stdin`, { code: 'secret-argv' });
        if (option.boolean && typeof value !== 'boolean')
            throw new (NativeRouterError as any)(`${key} must be boolean`, { code: 'options' });
        (normalized as any)[name] = value;
    }
    for (const option of operation.options as any)
        if (option.required && (normalized as any)[option.name] === undefined)
            throw new (NativeRouterError as any)(`Missing ${operation.name} option: ${camel(option.name)}`, { code: 'options' });
    return normalized;
}
function localOnly(options?: any, accepted: any = []): any {
    const consumed: any = new (Set as any)(['local', ...accepted]);
    for (const [name, value] of Object.entries(options) as any) {
        if (value === false)
            continue;
        if (!consumed.has(name))
            unsupported(`Native local operation does not support ${name}; configure the native runtime explicitly or use the Rust wrapper`);
    }
}
function redactedProvider(provider?: any): any {
    return {
        name: provider.name, kind: provider.kind ?? 'openai-compatible', base_url: provider.base_url,
        models: provider.models ?? [], supported_clients: provider.supported_clients ?? [],
        has_encrypted_api_key: Boolean(provider.has_encrypted_api_key ?? provider.api_key),
        enabled: provider.enabled !== false, intermediary_risk_acknowledged: Boolean(provider.intermediary_risk_acknowledged),
        unsupported_clients: provider.unsupported_clients ?? [],
        ...Object.fromEntries(['api_key_env', 'default_model', 'subscriber_id'].filter((key?: any): any => (provider as any)[key] !== undefined).map((key?: any): any => [key, (provider as any)[key]])),
    };
}
function tokenOptions(options?: any): any {
    const result: any = {};
    for (const key of ['ttl_hours', 'max_requests', 'max_tokens', 'rate_limit_per_minute'] as any) {
        if ((options as any)[key] === undefined)
            continue;
        const number: any = Number((options as any)[key]);
        if (!Number.isSafeInteger(number) || number < 0 || (key === 'ttl_hours' && number === 0))
            throw new (NativeRouterError as any)(`${key} must be a positive safe integer (limits may be zero)`, { code: 'options' });
        (result as any)[key] = number;
    }
    for (const key of ['label', 'account'] as any)
        if ((options as any)[key] !== undefined)
            (result as any)[key] = (options as any)[key];
    if (options.admin)
        result.scope = 'admin';
    if (options.github_repo)
        result.github_repos = Array.isArray(options.github_repo) ? options.github_repo : [options.github_repo];
    if (options.allowed_model)
        result.model_policy = { allowed_models: Array.isArray(options.allowed_model) ? options.allowed_model : [options.allowed_model] };
    return result;
}
const find: any = (records?: any, key?: any, value?: any): any => {
    const record: any = records.find((record?: any): any => (record as any)[key] === value);
    if (!record)
        throw new (NativeRouterError as any)(`Unknown ${key}: ${value}`, { code: 'not-found' });
    return record;
};
async function runtimeFor(router?: any): Promise<any> {
    router.corePromise ??= router.options.core ? Promise.resolve(router.options.core)
        : import("./core.js").then(({ createRouterCore }: any): any => createRouterCore(router.options));
    return router.corePromise;
}
async function dispatch(router?: any, name?: any, options?: any, invocation?: any): Promise<any> {
    if (name === 'version') {
        localOnly(options);
        return { version, source_commit: 'unknown' };
    }
    if (name === 'contracts') {
        localOnly(options);
        return catalog;
    }
    if (!(nativeOperationSupport as any)[name])
        unsupported(`Native operation ${name} is not implemented in this draft; use the explicit Rust Router wrapper`);
    const core: any = await runtimeFor(router);
    const env: any = router.options.env ?? process.env;
    if ((supportedManagedOperations as any)[name])
        return executeManagedOperation({ name, options, invocation, core, config: core.config, env, routerOptions: router.options });
    if (options.local !== true && await selectedManagedServer({ core, config: core.config ?? {}, env }))
        unsupported('Native remote delegation is not implemented; use local:true to explicitly operate on local state or use the Rust wrapper');
    if (['auth.import', 'auth.claude', 'auth.codex'].includes(name)) {
        const accepted: any = name === 'auth.import' ? ['provider', 'dir', 'home', 'if_absent', 'snapshot', 'follow']
            : name === 'auth.claude' ? ['home', 'code', 'flow', 'mode', 'from_claude_home'] : ['home', 'from_codex_home'];
        localOnly(options, accepted);
        if (options.follow && options.snapshot)
            throw new (NativeRouterError as any)('follow and snapshot cannot be combined', { code: 'options' });
        const data: any = await executeAuthOperation({ name, options, core, config: core.config, env, fetch: router.options.fetch,
            clockSeconds: core.clock, oauth: router.options.oauth });
        return name !== 'auth.import' && data.results ? output(`${name.slice(5)} credential ${(data.results as any)[0].outcome}.`) : data;
    }
    if ((supportedResourceOperations as any)[name]) {
        localOnly(options, name.startsWith('logs.') ? ['correlation_id', 'token'] : name === 'tls.generate' ? ['dns'] : []);
        return executeResourceOperation({ name, options, invocation, core, config: core.config });
    }
    if (name === 'accounts.list') {
        localOnly(options);
        return { accounts: (await core.accounts.list()).map((account?: any): any => ({
                name: account.name, healthy: account.healthy ?? !account.paused,
                paused: Boolean(account.limits?.pause && (account.limits.pause.until_unix == null || account.limits.pause.until_unix > core.clock())),
                ...(account.policy ? { routing_policy: account.policy } : {}),
                ...(account.limits?.pause ? { pause: account.limits.pause } : {}),
            })) };
    }
    if (name === 'accounts.pause') {
        localOnly(options, ['name', 'reason', 'until']);
        let until: any;
        if (options.until !== undefined) {
            until = Number(options.until);
            if (!Number.isFinite(until))
                until = Date.parse(options.until) / 1000;
            if (!Number.isFinite(until))
                throw new (NativeRouterError as any)('until must be Unix seconds or an ISO timestamp', { code: 'options' });
        }
        await core.accounts.pause(options.name, { reason: options.reason, until_unix: until });
        return output(`Paused account ${options.name}`);
    }
    if (name === 'accounts.resume') {
        localOnly(options, ['name']);
        await core.accounts.resume(options.name);
        return output(`Resumed account ${options.name}`);
    }
    if (name === 'accounts.policy') {
        localOnly(options, ['name', 'file']);
        if (options.file) {
            const policy: any = JSON.parse(await readFile(options.file, 'utf8') as any);
            operationResult(name, policy);
            await core.accounts.policy(options.name, policy);
        }
        const account: any = find(await core.accounts.list(), 'name', options.name);
        return account.policy ?? account.routing_policy ?? {};
    }
    if (name.startsWith('tokens.')) {
        const tokens: any = core.tokens;
        if (name === 'tokens.import') {
            localOnly(options, ['from', 'ids', 'dry_run']);
            if (!options.from.endsWith('.json'))
                unsupported('Native token import supports JSON token export files only; binary, lino and deployment directory imports remain incomplete');
            const source: any = JSON.parse(await readFile(options.from, 'utf8') as any);
            if (!Array.isArray(source))
                throw new (NativeRouterError as any)('Token export must be an array', { code: 'options' });
            const ids: any = new (Set as any)();
            for (const record of source as any) {
                operationResult('tokens.show', record);
                if (ids.has(record.id))
                    throw new (NativeRouterError as any)('Duplicate imported token id', { code: 'options' });
                ids.add(record.id);
            }
            const wanted: any = options.ids ? (Array.isArray(options.ids) ? options.ids : [options.ids]) : [];
            const report: any = { mode: 'merge-missing', dry_run: options.dry_run ?? false, source_records: source.length,
                target_records_before: 0, added: [], unchanged: [], conflicts: [], replaced: [], kept_revoked: [],
                missing_from_source: wanted.filter((id?: any): any => !ids.has(id)).sort() };
            const apply: any = (records?: any): any => {
                report.target_records_before = records.size;
                for (const incoming of source.slice().sort((a?: any, b?: any): any => a.id.localeCompare(b.id)) as any) {
                    if (wanted.length && !wanted.includes(incoming.id))
                        continue;
                    const existing: any = records.get(incoming.id);
                    if (!existing) {
                        report.added.push(incoming.id);
                        if (!options.dry_run)
                            records.set(incoming.id, structuredClone(incoming));
                    }
                    else {
                        const fields: any = [...new (Set as any)([...Object.keys(existing), ...Object.keys(incoming)])].filter((key?: any): any => JSON.stringify((existing as any)[key]) !== JSON.stringify((incoming as any)[key])).sort();
                        if (fields.length)
                            report.conflicts.push({ id: incoming.id, fields });
                        else
                            report.unchanged.push(incoming.id);
                    }
                }
            };
            if (options.dry_run)
                apply(new (Map as any)((await tokens.list()).map((record?: any): any => [record.id, record])));
            else
                await tokens.store.transaction(apply);
            if (report.conflicts.length || report.missing_from_source.length) {
                const error: any = new (NativeRouterError as any)('Token import has unresolved conflicts or missing requested IDs', { code: 'import-conflict' });
                error.data = report;
                error.exitCode = 2;
                throw error;
            }
            return report;
        }
        if (name === 'tokens.list') {
            localOnly(options);
            return await tokens.list();
        }
        if (name === 'tokens.show') {
            localOnly(options, ['id']);
            return find(await tokens.list(), 'id', options.id);
        }
        if (['tokens.revoke', 'tokens.expire'].includes(name)) {
            localOnly(options, ['id']);
            find(await tokens.list(), 'id', options.id);
            await (tokens as any)[(name.split('.') as any)[1]](options.id);
            return output(`${(name.split('.') as any)[1]}: ${options.id}`);
        }
        const allowed: any = ['ttl_hours', 'label', 'account', 'max_requests', 'max_tokens', 'rate_limit_per_minute', 'admin', 'github_repo', 'allowed_model'];
        if (name === 'tokens.issue') {
            localOnly(options, allowed);
            const issued: any = await tokens.issue(tokenOptions(options));
            return { token: issued.token };
        }
        if (name === 'tokens.rotate') {
            localOnly(options, ['id', ...allowed]);
            find(await tokens.list(), 'id', options.id);
            const issued: any = await tokens.rotate(options.id, tokenOptions(options));
            return { token: issued.token };
        }
        if (name === 'tokens.recover-admin') {
            localOnly(options, ['ttl_hours', 'label', 'revoke_others']);
            const admins: any = (await tokens.list()).filter((record?: any): any => record.scope === 'admin' && !record.revoked);
            const issued: any = await tokens.issue(tokenOptions({ ttl_hours: options.ttl_hours, label: options.label ?? 'recovered-admin', admin: true }));
            const revoked: any = [];
            if (options.revoke_others)
                for (const record of admins as any) {
                    await tokens.revoke(record.id);
                    revoked.push(record.id);
                }
            return { recovered: true, token: issued.token, token_id: issued.id, retained_admins: options.revoke_others ? 0 : admins.length, revoked };
        }
    }
    if (name.startsWith('providers.')) {
        const providers: any = core.providers;
        if (name === 'providers.list') {
            localOnly(options);
            return (await providers.list()).map(redactedProvider);
        }
        if (name === 'providers.show') {
            localOnly(options, ['name']);
            return redactedProvider(find(await providers.list(), 'name', options.name));
        }
        if (name === 'providers.remove') {
            localOnly(options, ['name']);
            find(await providers.list(), 'name', options.name);
            await providers.remove(options.name);
            return output(`Removed provider ${options.name}`);
        }
        if (name === 'providers.add') {
            localOnly(options, ['name', 'kind', 'base_url', 'model', 'models', 'supported_clients', 'api_key_env', 'api_key_stdin', 'enabled', 'if_absent']);
            if (options.kind && options.kind !== 'openai-compatible')
                unsupported('Native provider provisioning currently supports openai-compatible only; specialized provider validation is incomplete');
            const existing: any = (await providers.list()).find((provider?: any): any => provider.name === options.name);
            if (existing && options.if_absent)
                return { ...redactedProvider(existing), outcome: 'already_present' };
            const models: any = Array.isArray(options.models) ? options.models : options.models ? [options.models] : options.model ? [options.model] : [];
            const apiKey: any = options.api_key_stdin ? String(invocation.stdin ?? '').trim() : undefined;
            if (options.api_key_stdin && !apiKey)
                throw new (NativeRouterError as any)('api-key-stdin requires nonempty stdin', { code: 'options' });
            const provider: any = { name: options.name, kind: 'openai-compatible', base_url: options.base_url, models,
                default_model: options.model ?? (models as any)[0], supported_clients: options.supported_clients ?? [],
                api_key_env: options.api_key_env, ...(apiKey ? { api_key: apiKey } : {}), enabled: options.enabled ?? true };
            if (core.upsertProvider)
                await core.upsertProvider(provider);
            else
                await providers.upsert(provider);
            return { ...redactedProvider(provider), outcome: existing ? 'replaced' : 'created' };
        }
        if (name === 'providers.import') {
            localOnly(options, ['path']);
            const imported: any = JSON.parse(await readFile(options.path, 'utf8') as any);
            const records: any = Array.isArray(imported) ? imported : imported.providers;
            if (!Array.isArray(records))
                throw new (NativeRouterError as any)('Import requires an array or {providers: []}', { code: 'options' });
            for (const record of records as any) {
                if (record.kind && record.kind !== 'openai-compatible')
                    unsupported('Import of specialized provider kinds is incomplete');
                if (typeof record.name !== 'string' || !record.name || !['http:', 'https:'].includes(new (URL as any)(record.base_url).protocol))
                    throw new (NativeRouterError as any)('Invalid imported provider', { code: 'options' });
            }
            for (const record of records as any) {
                if (core.upsertProvider)
                    await core.upsertProvider(record);
                else
                    await providers.upsert(record);
            }
            return output(`Imported ${records.length} providers`);
        }
    }
    if (name === 'serve') {
        localOnly(options, ['host', 'port']);
        const port: any = options.port === undefined ? undefined : Number(options.port);
        if (port !== undefined && (!Number.isInteger(port) || port < 0 || port > 65535))
            throw new (NativeRouterError as any)('port must be in 0..65535', { code: 'options' });
        const server: any = await router.listen({ host: options.host, port });
        return output('Native server is listening');
    }
    if (name === 'models.explain') {
        localOnly(options, ['id', 'client']);
        const candidates: any = await core.candidates({ model: options.id });
        const model: any = (await core.models()).find((model?: any): any => model.id === options.id);
        const healthy: any = [...new (Set as any)(candidates.map((candidate?: any): any => candidate.provider?.name ?? candidate.provider).filter((name?: any): any => typeof name === 'string'))];
        const route: any = { protocols: ['openai-chat'], ...(model?.provider ? { provider: model.provider } : {}) };
        return { contract_version: 1, requested_selector: options.id, selector_kind: 'concrete',
            model_descriptor: { selector_kind: 'concrete', requested_selector: options.id, route, capabilities: {},
                capability_provenance: { source: 'native-config', verified: false }, allow_substitution: false },
            client_representation: { client: options.client ?? 'generic', advertisements: [] }, route_scope: route,
            capability_provenance: { source: 'native-config', verified: false }, model_policy: { allow_substitution: false },
            health: { healthy_providers: healthy, starting_providers: [], degraded_providers: [], degraded_reasons: {} },
            routing: { state: candidates.length ? 'available' : 'unavailable', candidate_count: candidates.length, catalog_conflicts: [] },
            output: ['Native local candidate inspection; live catalog capabilities and client advertisements are not implemented'] };
    }
    if (name === 'auth.status') {
        localOnly(options);
        return { credentials: [], sources: [], api_key_providers: (await core.providers.list()).map(redactedProvider),
            output: ['Native draft inspects configured API-key providers; subscription OAuth credential discovery is not implemented'] };
    }
    if (name === 'doctor') {
        localOnly(options);
        const config: any = core.config ?? router.options.config ?? {};
        return { status: 'partial', version, checks: [{ name: 'native-runtime', state: 'ok' }, { name: 'subscription-auth', state: 'unverified', detail: 'OAuth discovery and provider verification are not implemented' }],
            providers: [], deployments: [], recommended_models: [], data_dir: config.data_dir ?? '',
            listen_addr: `${config.host ?? '127.0.0.1'}:${config.port ?? 3000}`, forwarded_headers: [],
            output: ['Native configuration loaded; provider connectivity and host deployment checks remain unimplemented'] };
    }
    unsupported(`Native operation ${name} is not implemented`);
}
export class NativeRouter {
    declare corePromise: any;
    declare deploy: any;
    declare deployStatus: any;
    declare logs: any;
    declare options: any;
    declare serverPromise: any;
    declare with: any;
    constructor(options: any = {}) {
        this.options = options;
        this.corePromise = null;
        this.serverPromise = null;
        for (const operation of catalog.operations as any) {
            let namespace: any = this;
            const names: any = operation.name.split('.').map(camel);
            for (const name of names.slice(0, -1) as any)
                namespace = (namespace as any)[name] ??= {};
            (namespace as any)[names.at(-1)] = (options: any = {}, invocation: any = {}): any => this.invoke(operation.name, options, invocation);
        }
        this.deployStatus = (options: any = {}, invocation: any = {}): any => this.deploy({ ...options, status: true }, invocation);
        this.logs = Object.assign((options: any = {}, invocation: any = {}): any => this.invoke('logs.show', options, invocation), this.logs);
        const launch: any = this.with;
        this.with = (client?: any, args?: any, options: any = {}, invocation: any = {}): any => typeof client === 'string'
            ? launch({ ...options, client, clientArgs: args }, invocation) : launch(client, args);
    }
    async execute(name?: any, options: any = {}, invocation: any = {}): Promise<any> {
        const operation: any = catalog.operations.find((operation?: any): any => operation.name === name);
        if (!operation)
            return operationResult('cli-error', output(), [`Unknown operation: ${name}`], 2);
        try {
            for (const key of ['env', 'cwd', 'deadlineMs', 'maxOutputBytes'] as any)
                if ((invocation as any)[key] !== undefined)
                    unsupported(`Native per-invocation ${key} is not implemented; configure the runtime at construction`);
            if (invocation.signal?.aborted)
                throw new (NativeRouterError as any)('Operation cancelled', { code: 'cancelled' });
            const normalized: any = normalizeOptions(operation, options);
            const data: any = await dispatch(this, name, normalized, invocation);
            return operationResult(name, data);
        }
        catch (error: any) {
            return operationResult(name, error.data ?? output(), [`${error.code ?? 'operation'}: ${error.message}`], (Number.isInteger(error.exitCode) && error.exitCode > 0 ? error.exitCode : null) ?? (error.code === 'options' || error.code === 'secret-argv' ? 2 : 1));
        }
    }
    async invoke(name?: any, options: any = {}, invocation: any = {}): Promise<any> {
        const result: any = await this.execute(name, options, invocation);
        if (!result.success)
            throw new (NativeRouterError as any)(result.diagnostics.join('; '), { result,
                code: (result.diagnostics as any)[0]?.split(':')[0] ?? 'operation' });
        return result;
    }
    async runtime(): Promise<any> {
        this.serverPromise ??= Promise.all([runtimeFor(this), import("./server.js")]).then(([core, { createNativeRouter }]: any): any => createNativeRouter({ ...this.options, core, clock: this.options.serverClock ?? Date.now }));
        return this.serverPromise;
    }
    async fetch(request?: any): Promise<any> { return (await this.runtime()).fetch(request); }
    async listen(options?: any): Promise<any> { return (await this.runtime()).listen(options); }
    async close(): Promise<any> { if (this.serverPromise)
        await (await this.serverPromise).close(); }
}
export const createNativeRouter: any = (options?: any): any => new (NativeRouter as any)(options);
