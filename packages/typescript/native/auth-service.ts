// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=4055fb5b26af8a876f7df610103d942bfaf0321bb53aa1843b16986a872dc6c9; dynamic any annotations are explicit draft gaps.
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import * as oauthPrimitives from "./oauth.js";
import { CodexLogin } from "./codex-login.js";
const { CredentialFileStore, OAuthManager, ClaudeLogin, importCredential, validateCredentialCatalog, subscriptionHome }: any = oauthPrimitives;
const fail: any = (code?: any, message?: any, status: any = 400): any => (Object as any).assign(new (Error as any)(message), { code, status });
const providers: Array<string> = ['claude', 'codex', 'gemini', 'qwen'];
const pending: Set<string> = new (Set as any)(['awaiting_code', 'awaiting_callback', 'awaiting_device']);
const integer: any = (value?: any, fallback?: any, name?: any): any => {
    (value as any) = value ?? fallback;
    if (!(Number as any).isSafeInteger(value) || value <= 0)
        throw fail('invalid_login_config', `${name} must be a positive safe integer`);
    return value;
};
function homeFor(core?: any, provider?: any, env: any = {}): string { return subscriptionHome(provider, { config: core.config, env }); }
function safeCode(error?: any): any { return /^[a-z0-9_-]{1,100}$/i.test(error?.code ?? '') ? error.code : 'authorization_failed'; }
export async function nativeCredentialStatus(core?: any, { env = {}, fetch = core.oauth?.fetch ?? globalThis.fetch, validateCatalog = validateCredentialCatalog, catalogBaseURL, allowLoopback = false }: any = {}): Promise<any> {
    const credentials: any = [], sources: any = [];
    for (const provider of providers as any) {
        const home: string = homeFor(core, provider, env);
        let held: any, store: any;
        try {
            (store as any) = new (CredentialFileStore as any)({ provider, home, dataDir: core.config.data_dir, clock: core.clock });
            (held as any) = await store.transaction((): any => (store as any).reload());
            if (!held) {
                credentials.push({ provider, home, state: 'absent' });
                sources.push({ provider, source: { kind: 'absent' } });
                continue;
            }
            sources.push({ provider, source: (held as any).origin === 'adopted' ? { kind: 'followed', source: (held as any).path, present: true }
                    : (held as any).origin === 'external' ? { kind: 'externally-owned' } : { kind: 'owned' } });
            const token: any = await (core.oauth.getFresh as any)(store);
            const models: any = await validateCatalog({ provider, token, fetch, baseURL: typeof catalogBaseURL === 'object' ? (catalogBaseURL as any)[provider] : catalogBaseURL, allowLoopback });
            if (!(Array as any).isArray(models) || !models.some((model?: any): string | boolean => typeof model === 'string' && model.trim()))
                throw fail('catalog_unverified', 'Provider catalog did not verify an executable model', 502);
            credentials.push({ provider, home, state: 'usable' });
        }
        catch (error: any) {
            const code: any = safeCode(error), state: string = code === 'catalog_rejected' ? 'rejected' : /refresh|no_refresh_token|external_refresh_owner/.test(code) ? 'refresh-failed' : 'unverified';
            credentials.push({ provider, home, state, detail: `Credential inspection failed (${code})` });
        }
    }
    return { credentials, sources, api_key_providers: ((await core.providers.list()).map as any)((provider?: any): any => ({
            name: provider.name, kind: provider.kind ?? 'openai-compatible', base_url: provider.base_url,
            models: provider.models ?? [], supported_clients: provider.supported_clients ?? [],
            has_encrypted_api_key: Boolean(provider.has_encrypted_api_key ?? provider.api_key), enabled: provider.enabled !== false,
            intermediary_risk_acknowledged: Boolean(provider.intermediary_risk_acknowledged), unsupported_clients: provider.unsupported_clients ?? [],
            ...(Object as any).fromEntries(['api_key_env', 'default_model', 'subscriber_id'].filter((key?: any): boolean => (provider as any)[key] !== undefined).map((key?: any): any => [key, (provider as any)[key]])),
        })), output: [] };
}
export class NativeLoginManager {
    declare clock: any;
    declare core: any;
    declare enabled: any;
    declare env: any;
    declare factories: any;
    declare fetch: any;
    declare maxSessions: any;
    declare oauth: any;
    declare retentionSeconds: any;
    declare sessions: any;
    declare ttlSeconds: any;
    declare validateCatalog: any;
    constructor(core: any, { env = {}, fetch = core.oauth?.fetch ?? globalThis.fetch, clock = core.clock, loginFactories = {}, validateCatalog = validateCredentialCatalog, ...oauth }: any = {}) {
        this.core = core;
        this.env = env;
        this.fetch = fetch;
        this.clock = clock;
        this.factories = loginFactories;
        this.validateCatalog = validateCatalog;
        this.oauth = oauth;
        this.enabled = core.config.login?.enabled ?? core.config.disable_login_api !== true;
        this.maxSessions = integer(core.config.login?.max_sessions ?? core.config.login_max_sessions, 4, 'max_sessions');
        this.ttlSeconds = integer(core.config.login?.session_ttl_secs ?? core.config.login_session_ttl_secs, 900, 'session_ttl_secs');
        this.retentionSeconds = integer(core.config.login?.terminal_retention_secs, 60, 'terminal_retention_secs');
        this.sessions = new (Map as any)();
    }
    view(session?: any): any {
        return { login_id: session.id, provider: session.provider, status: session.status, session_expires_at: new (Date as any)(session.expires * 1000).toISOString(),
            ...(pending.has(session.status) && session.url ? { url: session.url } : {}),
            ...(pending.has(session.status) && session.userCode ? { user_code: session.userCode } : {}),
            ...(session.credentialExpiry !== undefined ? { expires_at: session.credentialExpiry } : {}),
            ...(session.error ? { error: session.error } : {}) };
    }
    async sweep(): Promise<void> {
        const now: any = this.clock();
        for (const [id, session] of this.sessions as any) {
            if (pending.has(session.status) && !session.promoting && session.expires <= now) {
                session.status = 'expired';
                session.error = 'login session expired before authorization completed';
                session.settled = now;
                session.controller.abort();
                if (!session.inFlight)
                    await rm(session.stage, { recursive: true, force: true });
            }
            else if (session.settled !== undefined && session.settled + this.retentionSeconds <= now)
                this.sessions.delete(id);
        }
    }
    async begin(body: any = {}): Promise<any> {
        if (!this.enabled)
            throw fail('login_disabled', 'the login API is disabled', 403);
        if (!body || typeof body !== 'object' || (Array as any).isArray(body))
            throw fail('invalid_login', 'login request must be an object');
        const provider: any = body.provider ?? 'claude';
        if (!providers.includes(provider))
            throw fail('invalid_provider', 'unknown subscription provider');
        await this.sweep();
        if ([...this.sessions.values()].filter((session?: any): boolean => pending.has(session.status)).length >= this.maxSessions)
            throw fail('too_many_sessions', `too many pending logins (limit ${this.maxSessions}); cancel one first`, 429);
        const factory: any = (this.factories as any)[provider] ?? (provider === 'claude' ? async (options?: any): Promise<any> => ClaudeLogin.begin(options)
            : provider === 'codex' ? async (options?: any): Promise<any> => CodexLogin.begin(options) : null);
        if (!factory)
            throw fail('native_unsupported', `${provider} native login driver is unavailable`, 501);
        const id: string = randomUUID(), stage: string = join(this.core.config.data_dir, 'native-login-sessions', id), home: string = join(stage, provider);
        const session: any = { id, provider, stage, home, status: provider === 'claude' ? 'awaiting_code' : 'awaiting_device', expires: this.clock() + this.ttlSeconds, controller: new (AbortController as any)(), inFlight: false };
        this.sessions.set(id, session);
        try {
            const fetch: any = (url?: any, options: any = {}): any => (this.fetch as any)(url, { ...options, signal: options.signal ? (AbortSignal as any).any([options.signal, session.controller.signal]) : session.controller.signal });
            const manager: any = new (OAuthManager as any)({ fetch, clock: this.clock, ...this.oauth });
            session.driver = await (factory as any)({ provider, home, manager, clock: this.clock, signal: session.controller.signal, mode: body.mode, flow: body.flow, dataDir: this.core.config.data_dir, validateCatalog: this.validateCatalog, ...this.oauth });
            if (this.sessions.get(id) !== session || session.controller.signal.aborted)
                throw fail('login_cancelled', 'login session cancelled', 409);
            session.url = typeof session.driver.authorizationURL === 'function' ? session.driver.authorizationURL() : session.driver.url;
            session.userCode = session.driver.userCode ?? session.driver.user_code;
            if (session.driver.status)
                session.status = session.driver.status;
            if (!pending.has(session.status) || typeof session.url !== 'string')
                throw fail('invalid_login_driver', 'login driver did not return a pending authorization URL', 502);
            if (session.status !== 'awaiting_code' && typeof session.driver.wait === 'function') {
                session.inFlight = true;
                session.background = this.finish(session, (): any => (session.driver.wait as any)({ signal: session.controller.signal })).finally((): void => { session.inFlight = false; });
            }
            return this.view(session);
        }
        catch (error: any) {
            this.sessions.delete(id);
            session.controller.abort();
            await rm(stage, { recursive: true, force: true });
            throw error;
        }
    }
    async status(id?: any): Promise<any> { await this.sweep(); const session: any = this.sessions.get(id); return session ? this.view(session) : null; }
    active(session?: any): void {
        if (this.sessions.get(session.id) !== session || session.controller.signal.aborted || !pending.has(session.status) || !session.promoting && session.expires <= this.clock())
            throw fail('login_cancelled', 'login no longer owns credential promotion', 409);
    }
    async finish(session?: any, complete?: any): Promise<any> {
        try {
            await complete();
            this.active(session);
            await importCredential({ provider: session.provider, sourceHome: session.home, destinationHome: homeFor(this.core, session.provider, this.env), dataDir: this.core.config.data_dir,
                fetch: this.fetch, clock: this.clock, validateCatalog: this.validateCatalog, owned: true, beforePromote: (): void => { this.active(session); session.promoting = true; }, ...this.oauth });
            this.active(session);
            const credential: any = await new (CredentialFileStore as any)({ provider: session.provider, home: homeFor(this.core, session.provider, this.env), dataDir: this.core.config.data_dir, clock: this.clock }).reload();
            if (!credential)
                throw fail('credential_missing', 'login did not persist a readable credential', 502);
            session.status = 'authorized';
            session.promoting = false;
            session.settled = this.clock();
            if (credential.token.expires_at_ms !== undefined)
                session.credentialExpiry = (Math as any).floor(credential.token.expires_at_ms / 1000);
            await rm(session.stage, { recursive: true, force: true });
        }
        catch (error: any) {
            session.promoting = false;
            if (this.sessions.get(session.id) === session && session.status !== 'expired') {
                session.status = 'failed';
                session.error = `Authorization failed (${safeCode(error)})`;
                session.settled = this.clock();
            }
            session.controller.abort();
        }
        return this.view(session);
    }
    async submitCode(id?: any, code?: any): Promise<any> {
        if (!this.enabled)
            throw fail('login_disabled', 'the login API is disabled', 403);
        await this.sweep();
        const session: any = this.sessions.get(id);
        if (!session)
            throw fail('login_not_found', 'unknown login_id', 404);
        if (session.status !== 'awaiting_code' || session.inFlight)
            throw fail('login_not_pending', `login is not awaiting a code (status: ${session.status})`, 409);
        if (typeof code !== 'string' || !code.trim() || (Buffer as any).byteLength(code) > 16384)
            throw fail('invalid_code', 'authorization code must be nonempty and within 16 KiB');
        session.inFlight = true;
        try {
            return await this.finish(session, (): any => (session.driver.complete as any)(code.trim(), { dataDir: this.core.config.data_dir, validateCatalog: this.validateCatalog, ...this.oauth }));
        }
        finally {
            session.inFlight = false;
        }
    }
    async cancel(id?: any): Promise<boolean> {
        const session: any = this.sessions.get(id);
        if (!session)
            return false;
        if (session.promoting)
            throw fail('login_promotion_in_progress', 'credential promotion has begun and cannot be cancelled', 409);
        this.sessions.delete(id);
        session.controller.abort();
        await session.driver?.cancel?.();
        if (!session.inFlight)
            await rm(session.stage, { recursive: true, force: true });
        return true;
    }
    async dispose(): Promise<void> { await (Promise as any).all([...this.sessions.keys()].map((id?: any): Promise<boolean> => this.cancel(id))); }
}
