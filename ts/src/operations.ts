// SOURCE DRAFT: paired configure/global undo dispatch substitutions.
// Canonical regeneration and all new verification remain UNRUN.
import { readFileSync } from 'node:fs';
import { executeCredentialOperation, credentialWithdrawal } from "./credential-operations.js";
import { readNativeText } from "./operation-input.js";
import { readTokenImportSource, importTokenRecords } from "./token-import.js";
import { executeResourceOperation, supportedResourceOperations } from "./resources.js";
import { executeAuthOperation } from "./oauth.js";
import { CodexLogin } from "./codex-login.js";
import { nativeCredentialStatus } from "./auth-service.js";
import { nativeConfigOptions } from "./config.js";
import { parseProviderImport } from "./provider-manifest.js";
import { provisionLocalProvider, importLocalProviders } from "./provider-provision.js";
import { parsePauseUntil } from "./remote-operations.js";
import { clientIntegrations } from "./client-files.js";
import { nativeClientStatus } from "./client-status.js";
import { setupNativeClient, removeNativeClient } from "./client-setup.js";
import { executeManagedOperation, supportedManagedOperations, selectedManagedTarget } from "./managed-server.js";
import { executeRemoteOperation, remoteStateFamilies } from "./remote-operations.js";
import Ajv2020 from 'ajv/dist/2020.js';
export const catalog: any = (JSON as any).parse(readFileSync(new (URL as any)('../catalog.json', import.meta.url), 'utf8'));
export const version: any = catalog.version;
const sharedOptions: any = new (Set as any)(((catalog.operations.find as any)((operation?: any): boolean => operation.name === 'version').options.map as any)((option?: any): any => option.name));
export const operationNames: any = (Object as any).freeze((catalog.operations.map as any)((operation?: any): any => operation.name));
const camel: any = (value?: any): any => (value.replace as any)(/[-_]([a-z])/g, (_?: any, letter?: any): any => letter.toUpperCase());
const snake: any = (value?: any): any => ((value.replace as any)(/[A-Z]/g, (letter?: any): string => '_' + letter.toLowerCase()).replaceAll as any)('-', '_');
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
        const schema: any = (JSON as any).parse(readFileSync(new (URL as any)(`../schemas/${(name.replaceAll as any)('.', '-')}.v1.json`, import.meta.url), 'utf8'));
        validators.set(name, (ajv.compile as any)(schema));
    }
    if (!(validators.get(name) as any)(result))
        throw new (NativeRouterError as any)(`Invalid ${name} contract: ${(ajv.errorsText as any)(validators.get(name).errors)}`, { code: 'schema', result });
    return result;
}
export function operationResult(name?: any, data?: any, diagnostics: any = [], exitCode: any = 0): any {
    return validateNativeResult(name, {
        schema: `link-assistant-router/${(name.replaceAll as any)('.', '-')}/v1`, operation: name,
        success: exitCode === 0, exit_code: exitCode, data, diagnostics,
    });
}
const output: any = (...lines: any[]): any => ({ output: lines });
const unsupported: any = (message?: any): any => { throw new (NativeRouterError as any)(message, { code: 'unsupported' }); };
export const nativeOperationSupport: any = (Object as any).freeze({
    ...(Object as any).fromEntries((Object as any).entries(supportedResourceOperations).map(([name, support]: any): any => [name, support.status])),
    ...(Object as any).fromEntries((Object as any).keys(supportedManagedOperations).map((name?: any): any => [name, 'partial'])),
    'auth.import': 'partial', 'auth.claude': 'partial', 'auth.codex': 'partial', 'auth.clear': 'partial', 'auth.gh': 'partial',
    version: 'implemented', contracts: 'implemented', configure:'partial',with:'partial',
    'accounts.list': 'partial', 'accounts.pause': 'partial', 'accounts.resume': 'partial', 'accounts.policy': 'partial',
    'tokens.issue': 'partial', 'tokens.list': 'partial', 'tokens.show': 'partial', 'tokens.revoke': 'partial',
    'tokens.import': 'partial', 'tokens.expire': 'partial', 'tokens.rotate': 'partial', 'tokens.recover-admin': 'partial',
    'providers.list': 'partial', 'providers.show': 'partial', 'providers.add': 'partial', 'providers.remove': 'partial',
    'providers.import': 'partial', 'models.explain': 'partial', serve: 'partial', doctor: 'partial', 'auth.status': 'partial',
    'clients.list': 'partial', 'clients.show': 'partial', 'clients.setup': 'partial', 'clients.remove': 'partial',
});
function normalizeOptions(operation?: any, options?: any): any {
    const allowed: any = new (Map as any)((operation.options.map as any)((option?: any): any => [snake(option.name), option]));
    const normalized: any = {};
    for (const [key, value] of (Object as any).entries(options) as any) {
        if (value === undefined || value === null)
            continue;
        const name: any = snake(key), option: any = allowed.get(name);
        if (!option)
            throw new (NativeRouterError as any)(`Unknown ${operation.name} option: ${key}`, { code: 'options' });
        if (option.secret && !((operation.name.startsWith as any)('logs.') && name === 'token'))
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
function localOnly(options?: any, accepted: any = []): void {
    const consumed: any = new (Set as any)(['local', ...nativeConfigOptions, ...accepted]);
    for (const [name, value] of (Object as any).entries(options) as any) {
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
        ...(Object as any).fromEntries(['api_key_env', 'default_model', 'subscriber_id'].filter((key?: any): boolean => (provider as any)[key] !== undefined).map((key?: any): any => [key, (provider as any)[key]])),
    };
}
function tokenOptions(options?: any): any {
    const result: any = {};
    for (const key of ['ttl_hours', 'max_requests', 'max_tokens', 'rate_limit_per_minute'] as any) {
        if ((options as any)[key] === undefined)
            continue;
        const number: number = Number((options as any)[key]);
        if (!(Number as any).isSafeInteger(number) || number < 0 || (key === 'ttl_hours' && number === 0))
            throw new (NativeRouterError as any)(`${key} must be a positive safe integer (limits may be zero)`, { code: 'options' });
        (result as any)[key] = number;
    }
    for (const key of ['label', 'account'] as any)
        if ((options as any)[key] !== undefined)
            (result as any)[key] = (options as any)[key];
    if (options.admin)
        result.scope = 'admin';
    if (options.github_repo)
        result.github_repos = (Array as any).isArray(options.github_repo) ? options.github_repo : [options.github_repo];
    if (options.allowed_model)
        result.model_policy = { allowed_models: (Array as any).isArray(options.allowed_model) ? options.allowed_model : [options.allowed_model] };
    return result;
}
const find: any = (records?: any, key?: any, value?: any): any => {
    const record: any = (records.find as any)((record?: any): boolean => (record as any)[key] === value);
    if (!record)
        throw new (NativeRouterError as any)(`Unknown ${key}: ${value}`, { code: 'not-found' });
    return record;
};
async function runtimeFor(router?: any): Promise<any> {
    router.corePromise ??= router.options.core ? (Promise as any).resolve(router.options.core)
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
    const env: any = { ...(router.options.env ?? (process as any).env), ...(invocation.env ?? {}) };
    if (['clients.list', 'clients.show'].includes(name)) {
        for (const key of (Object as any).keys(options) as any)
            if (!['home', 'local', ...(name === 'clients.show' ? ['client'] : [])].includes(key))
                unsupported(`Client observation does not consume ${key}`);
        if (invocation.deadlineMs !== undefined || invocation.maxOutputBytes !== undefined)
            unsupported('Client observation does not yet implement invocation deadline/output limits');
        const context: any = { home: options.home, env, cwd: invocation.cwd };
        if (name === 'clients.show') {
            const row: any = await nativeClientStatus(options.client, context);
            if (row.unreadable) {
                const error: any = new (NativeRouterError as any)(row.unreadable, { code: 'client' });
                error.data = row;
                throw error;
            }
            return row;
        }
        const rows: any = [];
        for (const client of clientIntegrations as any)
            rows.push(await nativeClientStatus(client.client, context));
        if (rows.some((row?: any): any => row.unreadable || row.conflicts.some((key?: any): boolean => key.endsWith(':invalid')))) {
            const error: any = new (NativeRouterError as any)('One or more client configurations could not be read', { code: 'client' });
            error.data = rows;
            throw error;
        }
        return rows;
    }
    if (['auth.status', 'auth.clear', 'auth.gh'].includes(name) || credentialWithdrawal(name, options)) {
        const target: any = await selectedManagedTarget({ name, options, config: router.options.config, env, cwd: invocation.cwd });
        if (target) {
            if (credentialWithdrawal(name, options))
                unsupported('Credential withdrawal removes local files and cannot clear a selected remote deployment; pass local to act on this machine');
            return executeRemoteOperation({ name, options, invocation, target, fetch: router.options.fetch });
        }
        const accepted: Array<string> = name === 'auth.status' ? ['clear_all', 'yes'] : name === 'auth.clear' ? ['provider', 'all', 'yes'] : name === 'auth.gh' ? ['from_gh_config', 'token_stdin', 'status', 'clear'] : ['clear', 'home'];
        localOnly(options, accepted);
        const inherited: any = router.options.core ?? (router.corePromise ? await router.corePromise : undefined);
        return executeCredentialOperation({ name, options, invocation, routerOptions: { ...router.options, ...(inherited ? { core: inherited } : {}) }, env });
    }
    if (remoteStateFamilies.has(((name.split as any)('.') as any)[0])) {
        const target: any = await selectedManagedTarget({ name, options, config: router.options.config, env, cwd: invocation.cwd });
        if (target)
            return executeRemoteOperation({ name, options, invocation, target, fetch: router.options.fetch });
    }
    if (!(nativeOperationSupport as any)[name])
        unsupported(`Native operation ${name} is not implemented in this draft; use the explicit Rust Router wrapper`);
    for (const key of ['deadlineMs', 'maxOutputBytes'] as any)
        if ((invocation as any)[key] !== undefined && name !== 'auth.codex' && !(name==='with'&&!options.global&&!options.undo))
            unsupported(`Native local per-invocation ${key} requires operation cancellation and output accounting`);
    const configOverrides: any = (Object as any).fromEntries((Object as any).entries(options).filter(([key]: any): boolean => sharedOptions.has(key)));
    for (const key of (Object as any).keys(configOverrides) as any)
        if (!nativeConfigOptions.has(key))
            unsupported(`Native configuration does not implement ${key}`);
  if(name==='with'&&!options.global&&!options.undo)requestNativeRunModelPolicy(options.client,options);
    const baseCore: any = await runtimeFor(router);
    let core: any = baseCore;
    if ((Object as any).keys(configOverrides).length || invocation.env || invocation.cwd) {
        if (!baseCore.withConfig)
            unsupported('Injected runtime cannot apply an operation context');
        (core as any) = (await (await import("./core.js")).createOperationContext(baseCore, { configOverrides, env, cwd: invocation.cwd, signal: invocation.signal })).core;
    }
    if (invocation.signal?.aborted)
        throw new (NativeRouterError as any)('Operation cancelled', { code: 'cancelled' });
    if(['configure','with'].includes(name)){localOnly(options,['client','all','undo','global','server','management_server','managed','token','token_stdin','ttl_hours','client_args',...(name==='with'?['non_interactive','interactive','extend_global_config','isolated_config','reset_to_default_configuration','yes','pick_model','model','allowed_models','allow_model_substitution','label','run_ttl_hours','fixed_run_ttl','run_max_requests']:[])]);return executeNativeConfigure({name,options,invocation,core,env,fetch:router.options.fetch});}
    if (['clients.setup', 'clients.remove'].includes(name)) {
        localOnly(options, name === 'clients.setup' ? ['client', 'token', 'token_stdin', 'base_url', 'management_server', 'ttl_hours'] : ['client', 'revoke_supplied', 'force']);
        return (name === 'clients.setup' ? setupNativeClient : removeNativeClient)({ options, invocation, core, env, fetch: router.options.fetch });
    }
    if ((supportedManagedOperations as any)[name])
        return executeManagedOperation({ name, options, invocation, core, config: (core as any).config, env, routerOptions: router.options });
    if (['auth.import', 'auth.claude', 'auth.codex'].includes(name)) {
        const accepted: Array<string> = name === 'auth.import' ? ['provider', 'dir', 'home', 'if_absent', 'snapshot', 'follow']
            : name === 'auth.claude' ? ['home', 'code', 'flow', 'mode', 'from_claude_home'] : ['home', 'from_codex_home'];
        localOnly(options, [...accepted, ...(name === 'auth.codex' ? ['flow', 'port'] : [])]);
        if (name === 'auth.codex' && !options.from_codex_home) {
            const login: any = await CodexLogin.begin({ home: (core as any).config.codex_home ?? env.CODEX_HOME ?? (await import('node:path')).join((core as any).config.data_dir, 'codex'), manager: (core as any).oauth, clock: (core as any).clock, dataDir: (core as any).config.data_dir, flow: options.flow, port: options.port, signal: invocation.signal, ...(invocation.deadlineMs !== undefined ? { timeoutMs: invocation.deadlineMs } : {}), ...router.options.oauth });
            invocation.onProgress?.(`Open this URL:\n${login.authorizationURL()}${login.userCode ? `\nEnter this one-time code:\n${login.userCode}` : ''}`);
            try {
                await login.wait();
                return output(`Codex authorization saved in ${login.home}`);
            }
            finally {
                await login.cancel();
            }
        }
        if (options.follow && options.snapshot)
            throw new (NativeRouterError as any)('follow and snapshot cannot be combined', { code: 'options' });
        const data: any = await executeAuthOperation({ name, options, core, config: (core as any).config, env, fetch: router.options.fetch,
            clockSeconds: (core as any).clock, oauth: router.options.oauth });
        return name !== 'auth.import' && data.results ? output(`${(name.slice as any)(5)} credential ${(data.results as any)[0].outcome}.`) : data;
    }
    if ((supportedResourceOperations as any)[name]) {
        localOnly(options, (name.startsWith as any)('logs.') ? ['correlation_id', 'token'] : name === 'tls.generate' ? ['dns'] : []);
        return executeResourceOperation({ name, options, invocation, core, config: (core as any).config });
    }
    if (name === 'accounts.list') {
        localOnly(options);
        return { accounts: ((await (core as any).accounts.list()).map as any)((account?: any): any => ({
                name: account.name, healthy: account.healthy ?? !account.paused,
                paused: Boolean(account.limits?.pause && (account.limits.pause.until_unix == null || account.limits.pause.until_unix > (core as any).clock())),
                ...(account.policy ? { routing_policy: account.policy } : {}),
                ...(account.limits?.pause ? { pause: account.limits.pause } : {}),
            })) };
    }
    if (name === 'accounts.pause') {
        localOnly(options, ['name', 'reason', 'until']);
        const until: any = options.until !== undefined ? parsePauseUntil(options.until, (core as any).clock()) : undefined;
        await ((core as any).accounts.pause as any)(options.name, { reason: options.reason, until_unix: until });
        return output(`Paused account ${options.name}`);
    }
    if (name === 'accounts.resume') {
        localOnly(options, ['name']);
        await ((core as any).accounts.resume as any)(options.name);
        return output(`Resumed account ${options.name}`);
    }
    if (name === 'accounts.policy') {
        localOnly(options, ['name', 'file']);
        if (options.file) {
            const policy: any = (JSON as any).parse(await readNativeText(options.file, { cwd: invocation.cwd }));
            operationResult(name, policy);
            await ((core as any).accounts.policy as any)(options.name, policy);
        }
        const account: any = find(await (core as any).accounts.list(), 'name', options.name);
        return account.policy ?? account.routing_policy ?? {};
    }
    if ((name.startsWith as any)('tokens.')) {
        const tokens: any = (core as any).tokens;
        if (name === 'tokens.import') {
            localOnly(options, ['from', 'ids', 'dry_run', 'replace']);
            const source: any = await readTokenImportSource(options.from, { cwd: invocation.cwd, validateRecord: (record?: any): any => operationResult('tokens.show', record) });
            const report: any = await importTokenRecords({ source, store: tokens.store, options, dataDir: (core as any).config.data_dir, clock: (core as any).clock });
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
            await ((tokens as any)[((name.split as any)('.') as any)[1]] as any)(options.id);
            return output(`${((name.split as any)('.') as any)[1]}: ${options.id}`);
        }
        const allowed: Array<string> = ['ttl_hours', 'label', 'account', 'max_requests', 'max_tokens', 'rate_limit_per_minute', 'admin', 'github_repo', 'allowed_model'];
        if (name === 'tokens.issue') {
            localOnly(options, allowed);
            const issued: any = await (tokens.issue as any)(tokenOptions(options));
            return { token: issued.token };
        }
        if (name === 'tokens.rotate') {
            localOnly(options, ['id', ...allowed]);
            find(await tokens.list(), 'id', options.id);
            const issued: any = await (tokens.rotate as any)(options.id, tokenOptions(options));
            return { token: issued.token };
        }
        if (name === 'tokens.recover-admin') {
            localOnly(options, ['ttl_hours', 'label', 'revoke_others']);
            const admins: any = ((await tokens.list()).filter as any)((record?: any): boolean => record.scope === 'admin' && !record.revoked);
            const issued: any = await (tokens.issue as any)(tokenOptions({ ttl_hours: options.ttl_hours, label: options.label ?? 'recovered-admin', admin: true }));
            const revoked: any = [];
            if (options.revoke_others)
                for (const record of admins as any) {
                    await (tokens.revoke as any)(record.id);
                    revoked.push(record.id);
                }
            return { recovered: true, token: issued.token, token_id: issued.id, retained_admins: options.revoke_others ? 0 : admins.length, revoked };
        }
    }
    if ((name.startsWith as any)('providers.')) {
        const providers: any = (core as any).providers;
        if (name === 'providers.list') {
            localOnly(options);
            return ((await providers.list()).map as any)(redactedProvider);
        }
        if (name === 'providers.show') {
            localOnly(options, ['name']);
            return redactedProvider(find(await providers.list(), 'name', options.name));
        }
        if (name === 'providers.remove') {
            localOnly(options, ['name']);
            find(await providers.list(), 'name', options.name);
            await (providers.remove as any)(options.name);
            return output(`Removed provider ${options.name}`);
        }
        if (name === 'providers.add') {
            localOnly(options, ['name', 'kind', 'base_url', 'model', 'models', 'supported_clients', 'api_key_env', 'api_key_stdin', 'enabled', 'if_absent']);
            const models: any = (Array as any).isArray(options.models) ? options.models : options.models ? [options.models] : options.model ? [options.model] : [];
            const apiKey: any = options.api_key_stdin ? String(invocation.stdin ?? '').trim() : undefined;
            if (options.api_key_stdin && !apiKey)
                throw new (NativeRouterError as any)('api-key-stdin requires nonempty stdin', { code: 'options' });
            const provider: any = { name: options.name, kind: options.kind ?? 'openai-compatible', base_url: options.base_url, models,
                default_model: options.model, if_absent: options.if_absent ?? false, supported_clients: options.supported_clients ?? [],
                api_key_env: options.api_key_env, ...(apiKey ? { api_key: apiKey } : {}), enabled: options.enabled ?? true };
            return provisionLocalProvider(core, provider);
        }
        if (name === 'providers.import') {
            localOnly(options, ['path']);
            const records: any = parseProviderImport(await readNativeText(options.path, { cwd: invocation.cwd }));
            const report: any = await importLocalProviders(core, records);
            const data: any = output((JSON as any).stringify(report, null, 2));
            if (!report.complete) {
                const error: any = new (NativeRouterError as any)('Provider import stopped after a rejected candidate', { code: 'provider_acceptance' });
                error.exitCode = 1;
                error.data = data;
                throw error;
            }
            return data;
        }
    }
    if (name === 'serve') {
        localOnly(options, ['host', 'port']);
        const port: any = options.port === undefined ? undefined : Number(options.port);
        if (port !== undefined && (!(Number as any).isInteger(port) || port < 0 || port > 65535))
            throw new (NativeRouterError as any)('port must be in 0..65535', { code: 'options' });
        const server: any = await (router.listen as any)({ host: options.host, port }, core);
        return output('Native server is listening');
    }
    if (name === 'models.explain') {
        localOnly(options, ['id', 'client']);
        const candidates: any = await ((core as any).candidates as any)({ model: options.id });
        const model: any = ((await (core as any).models()).find as any)((model?: any): boolean => model.id === options.id);
        const healthy: any = [...new (Set as any)(((candidates.map as any)((candidate?: any): any => candidate.provider?.name ?? candidate.provider).filter as any)((name?: any): boolean => typeof name === 'string'))];
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
        return (core as any).credentialStatus ? (core as any).credentialStatus() : nativeCredentialStatus(core, { env, fetch: router.options.fetch, ...router.options.oauth });
    }
    if (name === 'doctor') {
        localOnly(options);
        const config: any = (core as any).config ?? router.options.config ?? {};
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
    declare serverContexts: any;
    declare serverPromise: any;
    declare with: any;
    constructor(options: any = {}) {
        this.options = options;
        this.corePromise = null;
        this.serverPromise = null;
        for (const operation of catalog.operations as any) {
            let namespace: any = this;
            const names: any = ((operation.name.split as any)('.').map as any)(camel);
            for (const name of (names.slice as any)(0, -1) as any)
                (namespace as any) = (namespace as any)[name] ??= {};
            (namespace as any)[(names.at as any)(-1)] = (options: any = {}, invocation: any = {}): any => this.invoke(operation.name, options, invocation);
        }
        this.deployStatus = (options: any = {}, invocation: any = {}): any => (this.deploy as any)({ ...options, status: true }, invocation);
        this.logs = (Object as any).assign((options: any = {}, invocation: any = {}): any => this.invoke('logs.show', options, invocation), this.logs);
        const launch: any = this.with;
        this.with = (client?: any, args?: any, options: any = {}, invocation: any = {}): any => typeof client === 'string'
            ? (launch as any)({ ...options, client, clientArgs: args }, invocation) : (launch as any)(client, args);
    }
    async execute(name?: any, options: any = {}, invocation: any = {}): Promise<any> {
        const operation: any = (catalog.operations.find as any)((operation?: any): boolean => operation.name === name);
        if (!operation)
            return operationResult('cli-error', output(), [`Unknown operation: ${name}`], 2);
        try {
            if (invocation.signal?.aborted)
                throw new (NativeRouterError as any)('Operation cancelled', { code: 'cancelled' });
            const normalized: any = normalizeOptions(operation, options);
            const data: any = await dispatch(this, name, normalized, invocation);
            return operationResult(name, data);
        }
        catch (error: any) {
            return operationResult(name, error.data ?? output(), [`${error.code ?? 'operation'}: ${error.message}`], ((Number as any).isInteger(error.exitCode) && error.exitCode > 0 ? error.exitCode : null) ?? (error.code === 'options' || error.code === 'secret-argv' ? 2 : 1));
        }
    }
    async invoke(name?: any, options: any = {}, invocation: any = {}): Promise<any> {
        const result: any = await this.execute(name, options, invocation);
        if (!result.success)
            throw new (NativeRouterError as any)((result.diagnostics.join as any)('; '), { result,
                code: (result.diagnostics as any)[0]?.split(':')[0] ?? 'operation' });
        return result;
    }
    async runtime(core?: any): Promise<any> {
        if (core) {
            this.serverContexts ??= new (Map as any)();
            const key: string = (JSON as any).stringify(core.config);
            if (!(this.serverContexts.has as any)(key))
                (this.serverContexts.set as any)(key, import("./server.js").then(({ createNativeRouter }: any): any => createNativeRouter({ ...this.options, core, clock: this.options.serverClock ?? (Date as any).now })));
            this.serverPromise ??= (this.serverContexts.get as any)(key);
            return (this.serverContexts.get as any)(key);
        }
        this.serverPromise ??= (Promise as any).all([runtimeFor(this), import("./server.js")]).then(([core, { createNativeRouter }]: any): any => createNativeRouter({ ...this.options, core, clock: this.options.serverClock ?? (Date as any).now }));
        return this.serverPromise;
    }
    async fetch(request?: any): Promise<any> { return ((await this.runtime()).fetch as any)(request); }
    async listen(options?: any, core?: any): Promise<any> { return ((await this.runtime(core)).listen as any)(options); }
    async close(): Promise<void> { if (this.serverPromise)
        await (await this.serverPromise).close(); for (const runtime of this.serverContexts?.values() ?? [] as any)
        await (await runtime).close(); }
}
export const createNativeRouter: any = (options?: any): any => new (NativeRouter as any)(options);

import {executeNativeConfigure} from './client-configure.js';

import {preflightNativeClientLaunch} from './client-launch-plan.js';

import {requestNativeRunModelPolicy} from './client-run-credential.js';
