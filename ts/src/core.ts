// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=832837a7b064ba7bc8b8ac95a4c333b5f2b953625fbda95d2b1e44f4d47707be; dynamic any annotations are explicit draft gaps.
import { loadConfig, ProviderStore, nativeConfigEnvironment } from "./config.js";
import { createTokenStore } from "./storage.js";
import { TokenManager, RouterError } from "./tokens.js";
import { AccountRouter, principalAccountName, principalAccountScope } from "./accounts.js";
import { OAuthManager, CredentialFileStore, subscriptionProvider, subscriptionHome, subscriptionBaseURL } from "./oauth.js";
import { modelCandidates, catalogModels } from "./routing.js";
import { AffinityStore } from "./affinities.js";
import { AdminClaim } from "./admin.js";
import { NativeLoginManager, nativeCredentialStatus } from "./auth-service.js";
import { ManagementAccess } from "./management-access.js";
import { EmergencyAuthentication, AuthenticationDiagnostics, withAuthenticationScope } from "./emergency-auth.js";
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
export class RouterCore {
    declare accounts: any;
    declare admin: any;
    declare affinities: any;
    declare clock: any;
    declare config: any;
    declare contexts: any;
    declare credentialStatus: any;
    declare credentialStores: any;
    declare diagnostics: any;
    declare emergency: any;
    declare env: any;
    declare fetch: any;
    declare login: any;
    declare managementAccess: any;
    declare oauth: any;
    declare oauthOptions: any;
    declare providers: any;
    declare tokens: any;
    declare withAuthenticationScope: any;
    constructor({ config, storage, clock = (): number => (Math as any).floor((Date as any).now() / 1000), env = (process as any).env, fetch = globalThis.fetch, oauth = {}, management = {} }: any) {
        this.config = config;
        this.clock = clock;
        this.env = env;
        this.fetch = fetch;
        this.oauthOptions = oauth;
        this.contexts = new (Map as any)();
        this.emergency = new (EmergencyAuthentication as any)({ config: config.emergency, clock });
        this.emergency.start([config.host]);
        this.diagnostics = new (AuthenticationDiagnostics as any)({ clock });
        this.withAuthenticationScope = withAuthenticationScope;
        this.tokens = new (TokenManager as any)({ secret: config.token_secret, store: createTokenStore({ ...config, storage }), clock, emergency: this.emergency, diagnostics: this.diagnostics });
        this.providers = new (ProviderStore as any)({ dataDir: config.data_dir, secret: config.token_secret, env, records: config.providers, persistent: config.storage_policy !== 'memory' });
        this.accounts = new (AccountRouter as any)({ config, clock });
        this.oauth = new (OAuthManager as any)({ fetch, clock, env, ...oauth });
        this.credentialStores = new (Map as any)();
        this.affinities = new (AffinityStore as any)({ dataDir: config.data_dir, persistent: config.storage_policy !== 'memory', clock });
        this.admin = new (AdminClaim as any)(this, { env });
        this.login = new (NativeLoginManager as any)(this, { env, fetch, clock, ...oauth });
        this.credentialStatus = (): any => nativeCredentialStatus(this, { env, fetch, ...oauth });
        this.managementAccess = new (ManagementAccess as any)({ config: config.management, dataDir: config.data_dir, persistent: config.storage_policy !== 'memory', clock, ...management });
    }
    async listProviders(): Promise<any> { return this.providers.list(); }
    async showProvider(name?: any): Promise<any> { return this.providers.get(name); }
    async upsertProvider(input?: any): Promise<any> {
        const result: any = await this.providers.upsert(input);
        this.activateProviderAccount(input);
        return result;
    }
    async installProvider(input?: any): Promise<any> {
        const result: any = await this.providers.install(input);
        if (result.outcome !== 'already_present')
            this.activateProviderAccount(result.record);
        return result;
    }
    activateProviderAccount(input?: any): void {
        if (![...this.accounts.records.values()].some((a?: any): boolean => a.provider === input.name)) {
            const fresh: any = new (AccountRouter as any)({ config: { ...this.config, accounts: [], providers: [input] }, clock: this.clock });
            for (const [name, account] of fresh.records as any)
                this.accounts.records.set(name, account);
        }
    }
    async removeProvider(name?: any): Promise<any> { return this.providers.remove(name); }
    async listAccounts(): Promise<any> { return this.accounts.list(); }
    async accountAction(name?: any, action?: any, body: any = {}): Promise<any> {
        if (action === 'pause')
            return this.accounts.pause(name, body);
        if (action === 'resume')
            return this.accounts.resume(name);
        if (action === 'policy')
            return this.accounts.policy(name, body.policy ?? body);
        throw new (TypeError as any)(`Unknown account action: ${action}`);
    }
    async updateRouting({ strategy }: any = {}): Promise<any> { if (typeof strategy !== 'string')
        throw new (TypeError as any)('strategy is required'); return this.accounts.setStrategy(strategy); }
    async resetCooldowns(): Promise<any> { return this.accounts.resetCooldowns(); }
    async resetCooldown(name?: any, model?: any): Promise<any> { return this.accounts.resetCooldowns(name, model); }
    async models(): Promise<any> { return catalogModels(await this.providers.resolve(), this.accounts.records); }
    async catalogFor(context: any = {}): Promise<any> {
        const { client, provider }: any = context, pinnedAccount: any = context.pinnedAccount ?? context.pinned_account;
        const providers: any = (await this.providers.resolve()).filter((record?: any): any => (!provider || record.name === provider) && (!client || (record.supported_clients.includes as any)(client)));
        const accounts: any = principalAccountScope(this.accounts.records, providers, context);
        if (pinnedAccount && !this.accounts.records.has(pinnedAccount))
            throw new (RouterError as any)('unknown_pinned_account', 'Pinned account does not exist', 404);
        return catalogModels(providers, accounts);
    }
    async candidates(context: any = {}): Promise<any> {
        const providers: any = await this.providers.resolve();
        const scoped: any = principalAccountScope(this.accounts.records, providers, context);
        const ordered: any = this.accounts.order(modelCandidates(providers, scoped, context), context);
        return this.attachCredentials(ordered, providers);
    }
    attachCredentials(ordered?: any, providers?: any): any {
        for (const candidate of ordered as any) {
            const account: any = this.accounts.records.get(candidate.account), provider: any = (providers.find as any)((p?: any): boolean => p.name === candidate.provider);
            candidate.native_account = principalAccountName(account, provider);
            const subscription: boolean = ['anthropic', 'claude', 'codex', 'gemini', 'qwen'].includes(provider?.kind);
            const home: any = account?.credential_home ?? account?.oauth?.home ?? provider?.credential_home ?? provider?.oauth?.home ?? (subscription ? account?.home ?? subscriptionHome(provider.kind, { config: this.config, env: this.env }) : null);
            if (home) {
                const kind: string = subscriptionProvider(account?.oauth_provider ?? account?.oauth?.provider ?? provider?.oauth?.provider ?? provider.kind);
                const key: string = `${kind}\0${candidate.account}\0${home}`;
                if (!this.credentialStores.has(key))
                    this.credentialStores.set(key, new (CredentialFileStore as any)({ provider: kind, home, dataDir: this.config.data_dir, account: candidate.native_account, clock: this.clock }));
                candidate.auth_type = 'oauth';
                candidate.oauth_provider = kind;
                (Object as any).defineProperty(candidate, 'credential_key', { value: key, enumerable: false });
            }
        }
        return ordered;
    }
    async nativeCandidates(context: any = {}): Promise<any> {
        const service: any = context.service;
        const kinds: any = { openai: ['openai-compatible', 'openai', 'litellm'], anthropic: ['anthropic', 'claude'], codex: ['codex'],
            'codex-backend': ['codex'], qwen: ['qwen'], gemini: ['gemini'], vertex: ['vertex', 'vertex-ai'], bedrock: ['bedrock'] };
        if (!(kinds as any)[service])
            throw new (RouterError as any)('invalid_argument', 'Unknown native service');
        const providers: any = (await this.providers.resolve()).filter((provider?: any): any => ((kinds as any)[service].includes as any)(provider.kind));
        const recorded: any = context.resourceDestination;
        if (recorded && (!['stored_provider', 'subscription'].includes(recorded.destination_kind) || recorded.provider !== context.provider))
            throw new (RouterError as any)('invalid_argument', 'Invalid recorded resource destination');
        const configured: any = recorded ? undefined : this.config.services?.[service]?.provider ?? (service === 'openai' ? this.config.openai_compatible_provider_name : undefined);
        const selected: any = providers.filter((provider?: any): any => (!context.provider || context.provider === provider.name || context.provider === (provider.kind === 'anthropic' ? 'claude' : provider.kind)) &&
            (!configured || provider.name === configured) && (!context.client || (provider.supported_clients.includes as any)(context.client)));
        if (!selected.length)
            throw new (RouterError as any)('native_provider_unavailable', 'Native service provider is unavailable', 503);
        if (service === 'openai' && selected.length > 1 && !configured && !context.provider)
            throw new (RouterError as any)('provider_conflict', 'Native OpenAI service requires an exact provider selection', 409);
        const scoped: any = principalAccountScope(this.accounts.records, selected, context);
        if (!scoped.size && (context.pinnedAccount ?? context.pinned_account ?? context.principalAccount))
            throw new (RouterError as any)('pinned_account_unavailable', 'The bound subscription account is unavailable', 503);
        let candidates: any;
        if (context.model)
            (candidates as any) = modelCandidates(selected, scoped, { ...context, provider: undefined });
        else
            (candidates as any) = selected.flatMap((provider?: any): any => [...scoped.values()].filter((account?: any): boolean => account.provider === provider.name && account.enabled !== false).map((account?: any): any => ({
                provider: provider.name, kind: provider.kind, account: account.name, base_url: provider.base_url, baseUrl: provider.base_url,
                api_key: account.api_key ?? provider.api_key, apiKey: account.api_key ?? provider.api_key, protocol: provider.protocol,
                headers: { ...account.policy.headers }, supported_clients: provider.supported_clients, default_model: provider.default_model,
            })));
        for (const candidate of candidates as any) {
            const subscription: boolean = !['openai-compatible', 'openai', 'litellm'].includes(candidate.kind);
            candidate.provider_kind = candidate.kind === 'anthropic' ? 'claude' : ['openai', 'litellm'].includes(candidate.kind) ? 'openai-compatible' : candidate.kind;
            candidate.destination_kind = subscription ? 'subscription' : 'stored_provider';
        }
        return this.attachCredentials(this.accounts.order(candidates, context), selected);
    }
    async prepareCandidate(candidate?: any): Promise<any> {
        if (!this.accounts.serves(candidate.account, candidate.model))
            throw new (RouterError as any)('account_unavailable', 'Account became unavailable', 503);
        if (candidate.auth_type !== 'oauth')
            return candidate;
        const store: any = this.credentialStores.get(candidate.credential_key);
        if (!store)
            throw new (RouterError as any)('credentials_missing', 'Credential route is not configured', 401);
        const { token, headers }: any = await this.oauth.headers(store);
        if (!this.accounts.serves(candidate.account, candidate.model))
            throw new (RouterError as any)('account_unavailable', 'Account became unavailable during credential preparation', 503);
        const { credential_key, ...prepared }: any = candidate;
        return { ...prepared, api_key: token.access_token, apiKey: token.access_token, account_id: token.account_id, oauth_headers: headers,
            ...(store.provider === 'qwen' && token.resource_url ? { base_url: subscriptionBaseURL('qwen', token), baseUrl: subscriptionBaseURL('qwen', token) } : {}),
            ...(store.provider === 'codex' ? { endpointPath: '/responses', protocol: 'responses' } : {}) };
    }
    async resolveCandidates(model?: any, context: any = {}): Promise<any> { return this.candidates({ ...context, model }); }
    async route(context: any = {}): Promise<any> { const candidate: any = await this.prepareCandidate(((await this.candidates(context)) as any)[0]); this.accounts.recordUse(candidate, context); return candidate; }
    async reportFailure(candidate?: any, details?: any): Promise<any> { return this.accounts.reportFailure(candidate, details); }
    async reportSuccess(candidate?: any): Promise<void> { return this.accounts.reportSuccess(candidate); }
    async authenticate(token?: any, options?: any): Promise<any> {
        if (options?.admin && (this.config.allow_anonymous_admin || await this.admin.verify(token))) {
            try {
                return await this.tokens.validate(token, options);
            }
            catch {
                return { scope: 'admin', is_admin: true, admin_credential_kind: this.config.allow_anonymous_admin ? 'anonymous' : this.admin.envKey ? 'environment' : 'legacy_opaque', record: null };
            }
        }
        return options?.admin ? this.tokens.validate(token, options) : this.tokens.authenticateIncoming(token, options);
    }
    async withConfig(overrides: any = {}, { env = this.env, cwd = (process as any).cwd() }: any = {}): Promise<any> {
        const input: any = { ...this.config, ...overrides };
        for (const [environment, field] of (Object as any).entries(nativeConfigEnvironment) as any)
            if (!(Object as any).hasOwn(overrides, field) && (env as any)[environment] !== (this.env as any)[environment])
                (input as any)[field] = (env as any)[environment];
        if (overrides.data_dir != null || overrides.dataDir != null)
            input.data_dir = resolve(cwd, overrides.data_dir ?? overrides.dataDir);
        if (overrides.home != null)
            input.home = resolve(cwd, overrides.home);
        const config: any = await loadConfig({ config: input, env });
        const identity: string = createHash('sha256').update((JSON as any).stringify([config.data_dir, config.storage_policy, config.token_secret])).digest('hex');
        const baseIdentity: string = createHash('sha256').update((JSON as any).stringify([this.config.data_dir, this.config.storage_policy, this.config.token_secret])).digest('hex');
        if (identity !== baseIdentity) {
            if (!this.contexts.has(identity))
                this.contexts.set(identity, await createRouterCore({ config, env, clock: this.clock, fetch: this.fetch, oauth: this.oauthOptions }));
            return (this.contexts.get(identity).withConfig as any)({}, { env, cwd });
        }
        const context: any = (Object as any).assign((Object as any).create((Object as any).getPrototypeOf(this)), this, { config, env });
        context.oauth = (Object as any).assign((Object as any).create((Object as any).getPrototypeOf(this.oauth)), this.oauth, { env });
        context.providers = (Object as any).assign((Object as any).create((Object as any).getPrototypeOf(this.providers)), this.providers, { env });
        (Object as any).defineProperty(context.providers, 'records', { get: (): any => this.providers.records, set: (value?: any): void => { this.providers.records = value; }, enumerable: true });
        context.accounts = (Object as any).assign((Object as any).create((Object as any).getPrototypeOf(this.accounts)), this.accounts, { config });
        for (const key of ['cursor', 'failoverCursor'] as any)
            (Object as any).defineProperty(context.accounts, key, { get: (): any => (this.accounts as any)[key], set: (value?: any): void => { (this.accounts as any)[key] = value; }, enumerable: true });
        if (overrides.account_strategy != null)
            (context.accounts.setStrategy as any)(config.account_strategy);
        context.admin = (Object as any).assign((Object as any).create((Object as any).getPrototypeOf(this.admin)), this.admin, { core: context, envKey: config.token_admin_key });
        for (const key of ['file', 'candidate'] as any)
            (Object as any).defineProperty(context.admin, key, { get: (): any => (this.admin as any)[key], set: (value?: any): void => { (this.admin as any)[key] = value; }, enumerable: true });
        context.login = (Object as any).assign((Object as any).create((Object as any).getPrototypeOf(this.login)), this.login, { core: context, env, enabled: config.login?.enabled ?? !config.disable_login_api,
            maxSessions: config.login?.max_sessions ?? config.login_max_sessions ?? this.login.maxSessions,
            ttlSeconds: config.login?.session_ttl_secs ?? config.login_session_ttl_secs ?? this.login.ttlSeconds });
        context.credentialStatus = (): any => nativeCredentialStatus(context, { env, fetch: this.fetch, ...this.oauthOptions });
        context.managementAccess = (Object as any).assign((Object as any).create((Object as any).getPrototypeOf(this.managementAccess)), this.managementAccess, { policy: config.management });
        return context;
    }
}
export async function createOperationContext(baseCore?: any, { configOverrides = {}, env, cwd = (process as any).cwd(), signal }: any = {}): Promise<any> {
    (env as any) = { ...baseCore.env, ...env };
    const core: any = await (baseCore.withConfig as any)(configOverrides, { env, cwd });
    return { core, config: core.config, env, cwd, signal };
}
export async function createRouterCore(options: any = {}): Promise<any> {
    const config: any = await loadConfig(options);
    const core: any = new (RouterCore as any)({ ...options, config });
    const providers: any = await core.providers.resolve();
    core.accounts = new (AccountRouter as any)({ config: { ...config, providers }, clock: core.clock });
    await core.accounts.load();
    if (core.affinities?.verify)
        await core.affinities.verify();
    return core;
}
export { TokenManager, RouterError, codexTokenAlias } from "./tokens.js";
export { loadConfig, normalizeConfig, ProviderStore } from "./config.js";
export { nativeConfigOptions } from "./config.js";
export { MemoryTokenStore, TextTokenStore, BinaryTokenStore, DualTokenStore, createTokenStore } from "./storage.js";
export { AffinityStore } from "./affinities.js";
export { AccountRouter } from "./accounts.js";
export { OAuthManager, CredentialFileStore, ClaudeLogin, importCredential, executeAuthOperation } from "./oauth.js";
