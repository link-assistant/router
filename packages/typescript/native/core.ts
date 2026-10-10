// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=3b96885704dfbd38c532fbacd4e95f02fe10ddfcead8cde4c554c4b14b69d9a1; dynamic any annotations are explicit draft gaps.
import { loadConfig, ProviderStore } from "./config.js";
import { createTokenStore } from "./storage.js";
import { TokenManager, RouterError } from "./tokens.js";
import { AccountRouter } from "./accounts.js";
import { OAuthManager, CredentialFileStore, subscriptionProvider } from "./oauth.js";
import { modelCandidates, catalogModels } from "./routing.js";
export class RouterCore {
    declare accounts: any;
    declare clock: any;
    declare config: any;
    declare credentialStores: any;
    declare oauth: any;
    declare providers: any;
    declare tokens: any;
    constructor({ config, storage, clock = (): any => Math.floor(Date.now() / 1000), env = process.env, fetch = globalThis.fetch, oauth = {} }: any) {
        this.config = config;
        this.clock = clock;
        this.tokens = new (TokenManager as any)({ secret: config.token_secret, store: createTokenStore({ ...config, storage }), clock });
        this.providers = new (ProviderStore as any)({ dataDir: config.data_dir, secret: config.token_secret, env, records: config.providers, persistent: config.storage_policy !== 'memory' });
        this.accounts = new (AccountRouter as any)({ config, clock });
        this.oauth = new (OAuthManager as any)({ fetch, clock, ...oauth });
        this.credentialStores = new (Map as any)();
    }
    async listProviders(): Promise<any> { return this.providers.list(); }
    async showProvider(name?: any): Promise<any> { return this.providers.get(name); }
    async upsertProvider(input?: any): Promise<any> {
        const result: any = await this.providers.upsert(input);
        if (![...this.accounts.records.values()].some((a?: any): any => a.provider === input.name)) {
            const fresh: any = new (AccountRouter as any)({ config: { ...this.config, accounts: [], providers: [input] }, clock: this.clock });
            for (const [name, account] of fresh.records as any)
                this.accounts.records.set(name, account);
        }
        return result;
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
    async catalogFor({ client, pinnedAccount, provider }: any = {}): Promise<any> {
        const providers: any = (await this.providers.resolve()).filter((record?: any): any => (!provider || record.name === provider) && (!client || record.supported_clients.includes(client)));
        const accounts: any = new (Map as any)([...this.accounts.records].filter(([, account]: any): any => !pinnedAccount || account.name === pinnedAccount));
        if (pinnedAccount && !accounts.size)
            throw new (RouterError as any)('unknown_pinned_account', 'Pinned account does not exist', 404);
        return catalogModels(providers, accounts);
    }
    async candidates(context: any = {}): Promise<any> {
        const providers: any = await this.providers.resolve();
        const ordered: any = this.accounts.order(modelCandidates(providers, this.accounts.records, context), context);
        for (const candidate of ordered as any) {
            const account: any = this.accounts.records.get(candidate.account), provider: any = providers.find((p?: any): any => p.name === candidate.provider);
            const home: any = account?.credential_home ?? account?.oauth?.home ?? provider?.credential_home ?? provider?.oauth?.home ?? ((provider?.kind === 'anthropic' || provider?.kind === 'codex') ? account?.home : null);
            if (home) {
                const kind: any = subscriptionProvider(account?.oauth_provider ?? account?.oauth?.provider ?? provider?.oauth?.provider ?? provider.kind);
                const key: any = `${kind}\0${candidate.account}\0${home}`;
                if (!this.credentialStores.has(key))
                    this.credentialStores.set(key, new (CredentialFileStore as any)({ provider: kind, home, dataDir: this.config.data_dir, account: candidate.account, clock: this.clock }));
                candidate.auth_type = 'oauth';
                candidate.oauth_provider = kind;
                Object.defineProperty(candidate, 'credential_key', { value: key, enumerable: false });
            }
        }
        return ordered;
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
            ...(store.provider === 'codex' ? { endpointPath: '/responses', protocol: 'responses' } : {}) };
    }
    async resolveCandidates(model?: any, context: any = {}): Promise<any> { return this.candidates({ ...context, model }); }
    async route(context: any = {}): Promise<any> { const candidate: any = await this.prepareCandidate(((await this.candidates(context)) as any)[0]); this.accounts.recordUse(candidate, context); return candidate; }
    async reportFailure(candidate?: any, details?: any): Promise<any> { return this.accounts.reportFailure(candidate, details); }
    async reportSuccess(candidate?: any): Promise<any> { return this.accounts.reportSuccess(candidate); }
    async authenticate(token?: any, options?: any): Promise<any> { return this.tokens.validate(token, options); }
}
export async function createRouterCore(options: any = {}): Promise<any> {
    const config: any = await loadConfig(options);
    const core: any = new (RouterCore as any)({ ...options, config });
    const providers: any = await core.providers.resolve();
    core.accounts = new (AccountRouter as any)({ config: { ...config, providers }, clock: core.clock });
    await core.accounts.load();
    return core;
}
export { TokenManager, RouterError, codexTokenAlias } from "./tokens.js";
export { loadConfig, normalizeConfig, ProviderStore } from "./config.js";
export { MemoryTokenStore, TextTokenStore, createTokenStore } from "./storage.js";
export { AccountRouter } from "./accounts.js";
export { OAuthManager, CredentialFileStore, ClaudeLogin, importCredential, executeAuthOperation } from "./oauth.js";
