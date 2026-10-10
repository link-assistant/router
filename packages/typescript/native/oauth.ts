// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=f8c6fed3f5e21acca111c2314fb10bec3415963cf64a8e31eea6844445245502; dynamic any annotations are explicit draft gaps.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { access, mkdir, open, realpath, rename, rm, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { constants } from 'node:fs';
import { tokenExpired } from "../portable/policy.js";
import { atomicWrite, decodeLino, encodeLino, serialized, withNativeFileLock } from "./storage.js";
import { RouterError } from "./tokens.js";
export const CLAUDE_CLIENT_ID: any = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
export const CODEX_CLIENT_ID: any = 'app_EMoamEEZ73f0CkXaXp7hrann';
export const CLAUDE_TOKEN_URL: any = 'https://platform.claude.com/v1/oauth/token';
export const CODEX_TOKEN_URL: any = 'https://auth.openai.com/oauth/token';
export const CLAUDE_AUTHORIZE_URL: any = 'https://claude.com/cai/oauth/authorize';
export const CLAUDE_REDIRECT_URI: any = 'https://platform.claude.com/oauth/code/callback';
export const CLAUDE_SCOPES: any = 'org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload';
export const CLAUDE_INFERENCE_SCOPE: any = 'user:inference';
export const CLAUDE_OAUTH_USER_AGENT: any = 'anthropic-sdk-typescript/0.112.1 userOAuthProvider';
const PENDING_FILE: any = '.link-assistant-router-claude-login.json';
const files: any = { claude: ['.credentials.json', 'credentials.json', 'auth.json', 'oauth.json', 'config.json'], codex: ['auth.json'] };
const flights: any = new (Map as any)();
const uncertain: any = new (Map as any)();
const nonempty: any = (value?: any): any => typeof value === 'string' && value.length ? value : null;
const field: any = (object?: any, ...names: any[]): any => names.map((name?: any): any => object?.[name]).find((value?: any): any => value != null) ?? null;
const fail: any = (code?: any, message?: any, status: any = 400): any => new (RouterError as any)(code, message, status);
const CREDENTIAL_FILE_LIMIT: any = 4 * 1024 * 1024;
const PENDING_FILE_LIMIT: any = 16 * 1024;
async function boundedOAuthFile(path?: any, { maxBytes = CREDENTIAL_FILE_LIMIT, optional = false, code = 'credential_read_failed', status = 401 }: any = {}): Promise<any> {
    let handle: any;
    try {
        handle = await open(path, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
    }
    catch (error: any) {
        if (optional && error.code === 'ENOENT')
            return null;
        throw fail(code, 'OAuth state file cannot be read', status);
    }
    try {
        const metadata: any = await handle.stat();
        if (!metadata.isFile())
            throw fail(code, 'OAuth state must be stored in a regular file', status);
        if (metadata.size > maxBytes)
            throw fail(code, 'OAuth state file exceeds the allowed size', status);
        const buffer: any = Buffer.alloc(Math.min(64 * 1024, maxBytes + 1));
        const decoder: any = new (TextDecoder as any)('utf-8', { fatal: true });
        let bytes: any = 0, text: any = '';
        for (;;) {
            const length: any = Math.min(buffer.length, maxBytes - bytes + 1);
            const { bytesRead }: any = await handle.read(buffer, 0, length, null);
            if (!bytesRead)
                break;
            bytes += bytesRead;
            if (bytes > maxBytes)
                throw fail(code, 'OAuth state file exceeds the allowed size', status);
            text += decoder.decode(buffer.subarray(0, bytesRead), { stream: true });
        }
        return text + decoder.decode();
    }
    catch (error: any) {
        if (error instanceof RouterError)
            throw error;
        throw fail(code, 'OAuth state file is unreadable or invalid UTF-8', status);
    }
    finally {
        await handle.close();
    }
}
export function subscriptionProvider(value?: any): any {
    const name: any = String(value).trim().toLowerCase();
    if (['claude', 'anthropic', 'claude-code'].includes(name))
        return 'claude';
    if (['codex', 'chatgpt', 'openai-codex'].includes(name))
        return 'codex';
    throw fail('native_unsupported', 'Native OAuth supports explicit Claude and Codex file credentials', 501);
}
function integer(value?: any, name?: any): any {
    if (value == null)
        return null;
    if (!Number.isSafeInteger(value))
        throw fail('credential_invalid', `${name} must be a safe integer`);
    return value;
}
function jwtHint(token?: any): any {
    try {
        const payload: any = (token.split('.') as any)[1];
        if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload))
            return null;
        const parsed: any = JSON.parse(Buffer.from(payload, 'base64url') as any);
        return parsed && typeof parsed === 'object' ? parsed : null;
    }
    catch {
        return null;
    }
}
function scopesFrom(block?: any): any {
    const scopes: any = block?.scopes ?? [];
    if (!Array.isArray(scopes) || scopes.some((value?: any): any => typeof value !== 'string'))
        throw fail('credential_invalid', 'Credential scopes must be strings');
    if (block?.scope != null && typeof block.scope !== 'string')
        throw fail('credential_invalid', 'Credential scope must be a string');
    return [...new (Set as any)([...scopes, ...(block?.scope?.split(/\s+/).filter(Boolean) ?? [])])];
}
export function parseCredentialDocument(provider?: any, input?: any): any {
    provider = subscriptionProvider(provider);
    let document: any;
    try {
        document = typeof input === 'string' ? JSON.parse(input as any) : structuredClone(input);
    }
    catch {
        throw fail('credential_invalid', 'Credential document is not valid JSON');
    }
    if (!document || typeof document !== 'object' || Array.isArray(document))
        throw fail('credential_invalid', 'Credential document must be an object');
    let token: any;
    if (provider === 'claude') {
        const nested: any = document.claudeAiOauth ?? document.claude_ai_oauth;
        const nestedAccess: any = nonempty(field(nested, 'accessToken', 'access_token')) ?? nonempty(field(nested, 'oauthToken', 'oauth_token', 'token'));
        const block: any = nestedAccess ? nested : document;
        const accessToken: any = nestedAccess ?? nonempty(field(block, 'accessToken', 'access_token')) ?? nonempty(field(block, 'oauthToken', 'oauth_token', 'token'));
        if (!accessToken)
            throw fail('credential_missing_token', 'Claude credential contains no access token', 401);
        token = { access_token: accessToken, refresh_token: nonempty(field(block, 'refreshToken', 'refresh_token')),
            expires_at_ms: integer(field(block, 'expiresAt', 'expires_at', 'expiryDate', 'expiry_date'), 'Credential expiry'), account_id: null, resource_url: null };
        return { document, token, scopes: scopesFrom(block) };
    }
    const block: any = document.tokens;
    const accessToken: any = nonempty(field(block, 'access_token', 'accessToken'));
    if (!accessToken)
        throw fail('credential_missing_token', 'Codex credential contains no subscription access token', 401);
    const hint: any = jwtHint(accessToken), idHint: any = jwtHint(field(block, 'id_token', 'idToken') ?? '');
    const exp: any = hint?.exp;
    const expiryHint: any = Number.isSafeInteger(exp) && Number.isSafeInteger(exp * 1000) ? exp * 1000 : null;
    const auth: any = idHint?.['https://api.openai.com/auth'];
    const account: any = nonempty(field(block, 'account_id', 'accountId')) ?? nonempty(field(document, 'account_id', 'accountId', 'chatgpt_account_id')) ?? nonempty(auth?.chatgpt_account_id ?? idHint?.chatgpt_account_id ?? auth?.account_id);
    token = { access_token: accessToken, refresh_token: nonempty(field(block, 'refresh_token', 'refreshToken')),
        expires_at_ms: integer(field(document, 'expiry_date', 'expiryDate', 'expiresAt', 'expires_at'), 'Credential expiry') ?? expiryHint, account_id: account, resource_url: null };
    return { document, token, scopes: scopesFrom(document) };
}
export function mergeCredentialDocument(provider?: any, document?: any, token?: any, nowMs?: any): any {
    provider = subscriptionProvider(provider);
    document = structuredClone(document);
    if (provider === 'claude') {
        const nestedName: any = Object.hasOwn(document, 'claudeAiOauth') ? 'claudeAiOauth' : Object.hasOwn(document, 'claude_ai_oauth') ? 'claude_ai_oauth' : null;
        const target: any = nestedName ? (document as any)[nestedName] : document;
        const key: any = (camel?: any, snake?: any): any => Object.hasOwn(target, snake) && !Object.hasOwn(target, camel) ? snake : camel;
        (target as any)[key('accessToken', 'access_token')] = token.access_token;
        if (token.refresh_token)
            (target as any)[key('refreshToken', 'refresh_token')] = token.refresh_token;
        if (token.expires_at_ms != null)
            (target as any)[key('expiresAt', 'expires_at')] = token.expires_at_ms;
    }
    else {
        document.tokens ??= {};
        document.tokens.access_token = token.access_token;
        if (token.refresh_token)
            document.tokens.refresh_token = token.refresh_token;
        document.last_refresh = new (Date as any)(nowMs).toISOString();
    }
    return document;
}
export function credentialFingerprint(token?: any): any {
    const hash: any = createHash('sha256');
    const string: any = (value?: any): any => {
        if (value == null) {
            hash.update(Buffer.from([0]));
            return;
        }
        const bytes: any = Buffer.from(value), length: any = Buffer.alloc(8);
        length.writeBigUInt64LE(BigInt(bytes.length));
        hash.update(Buffer.from([1]));
        hash.update(length);
        hash.update(bytes);
    };
    string(token.access_token);
    string(token.refresh_token);
    if (token.expires_at_ms == null)
        hash.update(Buffer.from([0]));
    else {
        const expiry: any = Buffer.alloc(8);
        expiry.writeBigInt64LE(BigInt(token.expires_at_ms));
        hash.update(Buffer.from([1]));
        hash.update(expiry);
    }
    string(token.account_id);
    string(token.resource_url);
    return hash.digest('hex');
}
export function validateOAuthEndpoint(value?: any, { allowLoopback = false, expected }: any = {}): any {
    let url: any;
    try {
        url = new (URL as any)(value);
    }
    catch {
        throw fail('invalid_oauth_endpoint', 'OAuth endpoint must be an absolute URL');
    }
    const loopback: any = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.hash || url.search || !['https:', 'http:'].includes(url.protocol) || url.protocol === 'http:' && !(allowLoopback && loopback))
        throw fail('invalid_oauth_endpoint', 'OAuth endpoint must use HTTPS or an explicitly allowed loopback test endpoint');
    if (expected && url.href.replace(/\/$/, '') !== new (URL as any)(expected).href.replace(/\/$/, '') && !(allowLoopback && loopback))
        throw fail('invalid_oauth_endpoint', 'OAuth token endpoint must match the configured provider');
    return url.href;
}
export function oauthHeaders(provider?: any, token?: any, { codexVersion = '0.154.0' }: any = {}): any {
    provider = subscriptionProvider(provider);
    if (provider === 'claude')
        return { 'anthropic-version': '2023-06-01', 'anthropic-beta': 'oauth-2025-04-20' };
    const headers: any = { originator: 'codex_cli_rs', 'user-agent': `codex_cli_rs/${codexVersion} (${process.platform}; ${process.arch}) unknown` };
    if (token.account_id && !/[\r\n\0]/.test(token.account_id))
        (headers as any)['chatgpt-account-id'] = token.account_id;
    return headers;
}
export class CredentialFileStore {
    declare account: any;
    declare clock: any;
    declare dataDir: any;
    declare home: any;
    declare lockPath: any;
    declare origin: any;
    declare path: any;
    declare provider: any;
    declare recoveryPath: any;
    declare write: any;
    constructor({ provider, home, path, dataDir, account = 'primary', origin = 'file', write = atomicWrite, clock = (): any => Math.floor(Date.now() / 1000) }: any) {
        this.provider = subscriptionProvider(provider);
        if (!home && !path)
            throw fail('invalid_argument', 'An explicit credential home or path is required');
        if (!['file', 'adopted', 'external', 'keychain', 'binary'].includes(origin))
            throw fail('invalid_argument', 'Unknown credential origin');
        if (['keychain', 'binary'].includes(origin))
            throw fail('native_unsupported', 'Native OAuth does not implement platform keychain or binary credential stores', 501);
        this.home = resolve(home ?? dirname(path));
        this.path = path ? resolve(path) : null;
        this.dataDir = resolve(dataDir ?? join(this.home, '.router'));
        this.account = account;
        this.origin = origin;
        this.write = write;
        this.clock = clock;
        const digest: any = createHash('sha256').update(account).digest('hex');
        this.recoveryPath = join(this.dataDir, 'refresh-recovery', `${this.provider}-${digest}.json`);
        this.lockPath = join(this.dataDir, 'refresh-recovery', `${this.provider}-${digest}.lock`);
    }
    async readPrimary(): Promise<any> {
        let lastError: any;
        for (const candidate of this.path ? [this.path] : (files as any)[this.provider].map((name?: any): any => join(this.home, name)) as any) {
            let raw: any;
            raw = await boundedOAuthFile(candidate, { optional: true });
            if (raw == null)
                continue;
            try {
                let parsed: any = JSON.parse(raw as any), target: any = candidate, origin: any = this.origin;
                const metadata: any = parsed?._link_assistant_router;
                if (metadata?.credential_source) {
                    const source: any = metadata.credential_source;
                    if (typeof source !== 'string' || !isAbsolute(source) || resolve(source) === resolve(candidate))
                        throw fail('credential_invalid', 'Adopted credential source is invalid');
                    target = await realpath(source);
                    parsed = JSON.parse(await boundedOAuthFile(target) as any);
                    if (parsed?._link_assistant_router?.credential_source)
                        throw fail('credential_invalid', 'Nested adopted credential sources are unsupported');
                    origin = 'adopted';
                }
                if (metadata?.refresh_owner === 'external' || parsed?._link_assistant_router?.refresh_owner === 'external')
                    origin = 'external';
                const normalized: any = parseCredentialDocument(this.provider, parsed);
                return { ...normalized, path: target, pointer: candidate, origin };
            }
            catch (error: any) {
                lastError = error;
            }
        }
        if (lastError)
            throw fail(lastError.code ?? 'credential_invalid', 'Subscription credential file is unusable', 401);
        return null;
    }
    async reload(): Promise<any> {
        const primary: any = await this.readPrimary();
        const raw: any = await boundedOAuthFile(this.recoveryPath, { optional: true, code: 'credential_recovery_invalid', status: 503 });
        if (raw == null)
            return primary;
        let record: any;
        try {
            record = JSON.parse(raw as any);
        }
        catch {
            throw fail('credential_recovery_invalid', 'Credential recovery record is unusable', 503);
        }
        if (record.version !== 1 || record.provider !== this.provider || typeof record.token?.access_token !== 'string' || !record.token.access_token || ['account_id', 'resource_url'].some((field?: any): any => (record.token as any)[field] != null && typeof (record.token as any)[field] !== 'string') || record.token.refresh_token != null && typeof record.token.refresh_token !== 'string' || record.baseline_fingerprint != null && !/^[a-f0-9]{64}$/.test(record.baseline_fingerprint))
            throw fail('credential_recovery_invalid', 'Credential recovery record is unusable', 503);
        integer(record.token.expires_at_ms, 'Recovery expiry');
        const primaryHash: any = primary ? credentialFingerprint(primary.token) : null, recoveredHash: any = credentialFingerprint(record.token);
        if (primaryHash === recoveredHash || primaryHash != null && primaryHash !== record.baseline_fingerprint) {
            await unlink(this.recoveryPath);
            return primary;
        }
        if (!primary)
            throw fail('credential_recovery_invalid', 'Recovery has no primary credential document', 503);
        try {
            await this.persistPrimary(primary, record.token);
            await unlink(this.recoveryPath);
        }
        catch { }
        return { ...primary, token: record.token, recovered: true };
    }
    async prepareRefresh(held?: any): Promise<any> {
        if (held.origin === 'external')
            throw fail('external_refresh_owner', 'Cannot spend an externally owned refresh chain', 401);
        if (!held.token.refresh_token)
            throw fail('no_refresh_token', 'Subscription credential has no refresh token', 401);
        await mkdir(dirname(this.recoveryPath), { recursive: true, mode: 0o700 });
        const probe: any = `${this.recoveryPath}.${randomUUID()}.probe`;
        let file: any;
        try {
            file = await open(probe, 'wx', 0o600);
            await file.writeFile('');
            await file.sync();
            await file.close();
            file = null;
        }
        catch {
            throw fail('credential_persistence_unavailable', 'A durable refresh recovery store is required', 503);
        }
        finally {
            await file?.close();
            await unlink(probe).catch((error?: any): any => { if (error.code !== 'ENOENT')
                throw error; });
        }
    }
    async persistPrimary(held?: any, token?: any): Promise<any> {
        if (held.origin === 'external')
            throw fail('external_refresh_owner', 'Cannot rewrite externally owned refresh credentials', 401);
        const document: any = mergeCredentialDocument(this.provider, held.document, token, this.clock() * 1000);
        await this.write(held.path, JSON.stringify(document, null, 2) + '\n');
    }
    async persist(held?: any, token?: any): Promise<any> {
        try {
            await this.persistPrimary(held, token);
            await unlink(this.recoveryPath).catch((error?: any): any => { if (error.code !== 'ENOENT')
                throw error; });
        }
        catch {
            const record: any = { version: 1, provider: this.provider, baseline_fingerprint: credentialFingerprint(held.token), token };
            try {
                await this.write(this.recoveryPath, JSON.stringify(record) + '\n');
            }
            catch {
                throw fail('credential_persistence_failed', 'Rotated credential could not be durably persisted', 503);
            }
        }
    }
    async transaction(operation?: any): Promise<any> { return serialized(this.lockPath, (): any => withNativeFileLock(this.lockPath, operation, 5000)); }
}
async function boundedJSON(response?: any, code?: any, maxBytes: any = 1024 * 1024): Promise<any> {
    const declared: any = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes)
        throw fail(code, 'OAuth response exceeds the allowed size', 502);
    const reader: any = response.body?.getReader();
    let text: any = '';
    if (reader) {
        const buffers: any = [];
        let bytes: any = 0;
        try {
            for (;;) {
                const part: any = await reader.read();
                if (part.done)
                    break;
                bytes += part.value.byteLength;
                if (bytes > maxBytes) {
                    await reader.cancel();
                    throw fail(code, 'OAuth response exceeds the allowed size', 502);
                }
                buffers.push(part.value);
            }
        }
        finally {
            reader.releaseLock();
        }
        text = Buffer.concat(buffers).toString('utf8');
    }
    else
        text = await response.text();
    try {
        return JSON.parse(text as any);
    }
    catch {
        throw fail(code, 'Provider returned an invalid JSON response', 502);
    }
}
export class OAuthManager {
    declare allowLoopback: any;
    declare clock: any;
    declare endpoints: any;
    declare fetch: any;
    declare timeoutMs: any;
    constructor({ fetch = globalThis.fetch, clock = (): any => Math.floor(Date.now() / 1000), endpoints = {}, allowLoopback = false, timeoutMs = 20000 }: any = {}) {
        if (typeof fetch !== 'function')
            throw fail('invalid_argument', 'OAuth requires a fetch implementation');
        this.fetch = fetch;
        this.clock = clock;
        this.allowLoopback = allowLoopback;
        this.timeoutMs = timeoutMs;
        this.endpoints = {};
        for (const [provider, official] of [['claude', CLAUDE_TOKEN_URL], ['codex', CODEX_TOKEN_URL]] as any)
            (this.endpoints as any)[provider] = validateOAuthEndpoint((endpoints as any)[provider] ?? official, { allowLoopback, expected: official });
    }
    async exchange(provider?: any, body?: any): Promise<any> {
        provider = subscriptionProvider(provider);
        const headers: any = { 'content-type': 'application/json' };
        if (provider === 'claude') {
            (headers as any)['anthropic-beta'] = 'oauth-2025-04-20';
            (headers as any)['user-agent'] = CLAUDE_OAUTH_USER_AGENT;
        }
        else
            Object.assign(headers, oauthHeaders(provider, {}));
        let response: any;
        try {
            response = await this.fetch((this.endpoints as any)[provider], { method: 'POST', headers, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs) });
        }
        catch {
            throw fail('oauth_exchange_uncertain', 'OAuth exchange outcome is uncertain; the refresh grant was not retried', 502);
        }
        if (!response.ok) {
            const data: any = await boundedJSON(response, 'oauth_response_invalid').catch((): any => ({}));
            const recognized: any = ['invalid_grant', 'invalid_client', 'unauthorized_client', 'unsupported_grant_type'].includes(data.error) ? data.error : 'oauth_rejected';
            throw fail(recognized, `OAuth token endpoint rejected the ${provider} grant`, response.status === 429 ? 429 : 401);
        }
        const data: any = await boundedJSON(response, 'oauth_response_invalid');
        if (!nonempty(data.access_token) || data.token_type != null && !/^bearer$/i.test(data.token_type))
            throw fail('oauth_response_invalid', 'OAuth response has no usable bearer access token', 502);
        if (data.expires_in != null && (!Number.isSafeInteger(data.expires_in) || data.expires_in < 0 || !Number.isSafeInteger(this.clock() * 1000 + data.expires_in * 1000)))
            throw fail('oauth_response_invalid', 'OAuth expiry is not representable', 502);
        if (data.refresh_token != null && typeof data.refresh_token !== 'string')
            throw fail('oauth_response_invalid', 'OAuth refresh token is invalid', 502);
        return data;
    }
    async getFresh(store?: any, { force = false }: any = {}): Promise<any> {
        if (!(store instanceof CredentialFileStore))
            throw fail('invalid_argument', 'A native file credential store is required');
        const key: any = store.lockPath;
        if (flights.has(key))
            return structuredClone(await flights.get(key));
        const flight: any = store.transaction(async (): Promise<any> => {
            const held: any = await store.reload();
            if (!held)
                throw fail('credentials_missing', 'Subscription credentials are absent', 401);
            const fingerprint: any = credentialFingerprint(held.token);
            if (uncertain.get(key) === fingerprint)
                throw fail('oauth_exchange_uncertain', 'Previous OAuth exchange is uncertain; credential must advance before another grant is spent', 503);
            if (uncertain.has(key))
                uncertain.delete(key);
            const nowMs: any = this.clock() * 1000;
            const due: any = force || held.token.expires_at_ms != null && tokenExpired(nowMs, held.token.expires_at_ms, -300000);
            if (!due || !held.token.refresh_token && (held.token.expires_at_ms == null || !tokenExpired(nowMs, held.token.expires_at_ms, 0)))
                return { ...held.token, scopes: held.scopes };
            await store.prepareRefresh(held);
            let response: any;
            try {
                response = await this.exchange(store.provider, { grant_type: 'refresh_token', refresh_token: held.token.refresh_token, client_id: store.provider === 'claude' ? CLAUDE_CLIENT_ID : CODEX_CLIENT_ID });
            }
            catch (error: any) {
                if (error.code === 'oauth_exchange_uncertain' || error.code === 'oauth_response_invalid')
                    uncertain.set(key, fingerprint);
                throw error;
            }
            const token: any = { ...held.token, access_token: response.access_token, refresh_token: nonempty(response.refresh_token) ?? held.token.refresh_token,
                expires_at_ms: response.expires_in == null ? null : nowMs + response.expires_in * 1000 };
            try {
                await store.persist(held, token);
            }
            catch (error: any) {
                uncertain.set(key, fingerprint);
                throw error;
            }
            return { ...token, scopes: held.scopes };
        });
        flights.set(key, flight);
        try {
            return structuredClone(await flight);
        }
        finally {
            if (flights.get(key) === flight)
                flights.delete(key);
        }
    }
    async headers(store?: any, options?: any): Promise<any> {
        const token: any = await this.getFresh(store, options);
        if (store.provider === 'claude' && token.scopes.length && !token.scopes.includes(CLAUDE_INFERENCE_SCOPE))
            throw fail('oauth_scope_missing', 'Claude credential lacks user:inference scope', 403);
        return { token, headers: oauthHeaders(store.provider, token) };
    }
}
export async function validateCredentialCatalog({ provider, token, fetch = globalThis.fetch, baseURL, allowLoopback = false, timeoutMs = 20000 }: any): Promise<any> {
    provider = subscriptionProvider(provider);
    const official: any = provider === 'claude' ? 'https://api.anthropic.com' : 'https://chatgpt.com/backend-api/codex';
    const base: any = validateOAuthEndpoint(baseURL ?? official, { allowLoopback, expected: official + '/' }).replace(/\/$/, '');
    const models: any = [], seen: any = new (Set as any)();
    let after: any = null;
    for (let page: any = 0; page < 16; page++) {
        const url: any = new (URL as any)(base + (provider === 'claude' ? '/v1/models' : '/models'));
        url.searchParams.set(provider === 'claude' ? 'limit' : 'client_version', provider === 'claude' ? '1000' : '0.154.0');
        if (after)
            url.searchParams.set('after_id', after);
        let response: any;
        try {
            response = await fetch(url, { method: 'GET', headers: { authorization: `Bearer ${token.access_token}`, ...oauthHeaders(provider, token) }, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
        }
        catch {
            throw fail('catalog_unverified', 'Subscription catalog could not be verified', 502);
        }
        if (!response.ok)
            throw fail('catalog_rejected', 'Subscription catalog rejected the credential', 401);
        const data: any = await boundedJSON(response, 'catalog_invalid', 4 * 1024 * 1024);
        const rows: any = provider === 'codex' ? data.models ?? data.data : data.data;
        if (!Array.isArray(rows) || rows.some((row?: any): any => !nonempty(row.id ?? row.slug)))
            throw fail('catalog_invalid', 'Subscription catalog has no exact model identities', 502);
        for (const row of rows as any) {
            const id: any = row.id ?? row.slug;
            if (!models.includes(id))
                models.push(id);
        }
        if (!data.has_more) {
            if (!models.length)
                throw fail('catalog_unverified', 'Subscription catalog returned no models', 403);
            return models;
        }
        const next: any = data.last_id;
        if (!nonempty(next) || seen.has(next))
            throw fail('catalog_invalid', 'Subscription catalog pagination is invalid', 502);
        seen.add(next);
        after = next;
    }
    throw fail('catalog_invalid', 'Subscription catalog exceeded pagination limits', 502);
}
function loginMode(value: any = 'full'): any {
    const normalized: any = String(value).trim().toLowerCase();
    if (['', 'full', 'login', 'default'].includes(normalized))
        return 'full';
    if (['setup-token', 'setup_token', 'inference', 'narrow'].includes(normalized))
        return 'setup-token';
    throw fail('invalid_argument', 'Claude login mode must be full or setup-token');
}
function acceptedModels(value?: any): any {
    if (!Array.isArray(value) || !value.length || value.some((model?: any): any => typeof model !== 'string' || !model))
        throw fail('catalog_unverified', 'Credential catalog acceptance requires exact nonempty model ids', 403);
    return [...new (Set as any)(value)];
}
async function installAcceptedDocument({ provider, document, sourcePath, destinationHome, dataDir, ifAbsent = false, follow = false, snapshot = false }: any): Promise<any> {
    const store: any = new (CredentialFileStore as any)({ provider, home: destinationHome, dataDir });
    return store.transaction(async (): Promise<any> => {
        const previous: any = await store.readPrimary();
        if (ifAbsent && previous)
            return { schema_version: 1, results: [{ provider, phase: 'preflight', outcome: 'already_present', transaction_id: null, previous_credential_safe: true }] };
        const destination: any = previous?.pointer ?? join(store.home, ((files as any)[store.provider] as any)[0]);
        const transactionId: any = randomUUID().replaceAll('-', '');
        let installed: any = structuredClone(document);
        if (follow)
            installed = { _link_assistant_router: { credential_source: await realpath(sourcePath), promotion_receipt: transactionId } };
        else {
            installed._link_assistant_router = { ...installed._link_assistant_router, promotion_receipt: transactionId };
            if (snapshot)
                installed._link_assistant_router.refresh_owner = 'external';
        }
        await atomicWrite(destination, JSON.stringify(installed, null, 2) + '\n');
        return { schema_version: 1, results: [{ provider, phase: 'promotion', outcome: 'promoted', transaction_id: transactionId, previous_credential_safe: true }] };
    });
}
export async function importCredential({ provider, sourceHome, destinationHome, dataDir, ifAbsent = false, snapshot = false, fetch = globalThis.fetch, clock = (): any => Math.floor(Date.now() / 1000), validateCatalog = validateCredentialCatalog, catalogBaseURL, allowLoopback = false }: any = {}): Promise<any> {
    provider = subscriptionProvider(provider);
    if (!sourceHome || !destinationHome || !dataDir)
        throw fail('invalid_argument', 'Import requires explicit source, destination and Router data directories');
    const source: any = new (CredentialFileStore as any)({ provider, home: sourceHome, dataDir: join(dataDir, 'import-source'), clock });
    const destination: any = new (CredentialFileStore as any)({ provider, home: destinationHome, dataDir, clock });
    if (resolve(sourceHome) === resolve(destinationHome))
        throw fail('invalid_argument', 'Credential import source and destination must differ');
    const existing: any = await destination.readPrimary();
    if (ifAbsent && existing)
        return { schema_version: 1, results: [{ provider, phase: 'preflight', outcome: 'already_present', transaction_id: null, previous_credential_safe: true }] };
    const held: any = await source.readPrimary();
    if (!held)
        throw fail('credentials_missing', 'Credential import source has no usable file credential', 401);
    if (existing?.path === held.path || await realpath(destinationHome).catch((): any => resolve(destinationHome)) === await realpath(sourceHome))
        throw fail('invalid_argument', 'Credential import source and destination must differ');
    if (held.token.expires_at_ms != null && tokenExpired(clock() * 1000, held.token.expires_at_ms, 0))
        throw fail('credential_expired', 'Import requires a live access token; externally owned grants are not spent', 401);
    if (held.origin === 'external' && !snapshot)
        throw fail('external_refresh_owner', 'A non-snapshot import requires a writable owning source file', 401);
    if (!snapshot) {
        try {
            await access(dirname(held.path), constants.W_OK);
            await access(held.path, constants.W_OK);
        }
        catch {
            throw fail('credential_persistence_unavailable', 'Owning source credential must be writable for safe refresh-chain import', 503);
        }
    }
    const stage: any = join(dataDir, 'auth-import-candidates', randomUUID().replaceAll('-', ''));
    const stagePath: any = join(stage, provider, ((files as any)[provider] as any)[0]);
    await atomicWrite(stagePath, JSON.stringify(held.document, null, 2) + '\n');
    try {
        const models: any = acceptedModels(await validateCatalog({ provider, token: held.token, fetch, baseURL: catalogBaseURL, allowLoopback }));
        const current: any = await source.readPrimary();
        if (!current || credentialFingerprint(current.token) !== credentialFingerprint(held.token))
            throw fail('credential_changed', 'Credential changed during import; retry validation', 409);
        return await installAcceptedDocument({ provider, document: held.document, sourcePath: held.path, destinationHome, dataDir, ifAbsent, follow: !snapshot, snapshot, models });
    }
    finally {
        await rm(stage, { recursive: true, force: true });
    }
}
export class ClaudeLogin {
    declare authorizeURL: any;
    declare clock: any;
    declare home: any;
    declare manager: any;
    declare mode: any;
    declare pendingClaimed: any;
    declare used: any;
    #pending;
    constructor({ home, mode = 'full', manager = new (OAuthManager as any)(), authorizeURL = CLAUDE_AUTHORIZE_URL, allowLoopback = false, clock = (): any => Math.floor(Date.now() / 1000), pending }: any = {}) {
        if (!home)
            throw fail('invalid_argument', 'Claude login requires an explicit credential home');
        this.home = resolve(home);
        this.mode = loginMode(mode);
        this.manager = manager;
        this.clock = clock;
        this.authorizeURL = validateOAuthEndpoint(authorizeURL, { allowLoopback, expected: CLAUDE_AUTHORIZE_URL });
        this.#pending = pending ?? { state: randomBytes(32).toString('base64url'), code_verifier: randomBytes(32).toString('base64url'), expires_at: clock() * 1000 + 600000 };
        this.used = false;
        this.pendingClaimed = false;
    }
    static async begin(options: any = {}): Promise<any> {
        const login: any = new (ClaudeLogin as any)(options);
        await atomicWrite(join(login.home, PENDING_FILE), encodeLino(login.#pending));
        return login;
    }
    static async resume(options: any = {}): Promise<any> {
        if (!options.home)
            throw fail('invalid_argument', 'Claude login requires an explicit credential home');
        const path: any = join(resolve(options.home), PENDING_FILE), claimed: any = `${path}.${randomUUID()}.claimed`;
        try {
            await rename(path, claimed);
        }
        catch {
            throw fail('pending_login_missing', 'No pending Claude authorization; begin a code flow first', 404);
        }
        let pending: any;
        try {
            const raw: any = await boundedOAuthFile(claimed, { maxBytes: PENDING_FILE_LIMIT, code: 'pending_login_invalid', status: 400 });
            pending = raw.trim().startsWith('{') ? JSON.parse(raw as any) : decodeLino(raw);
        }
        catch {
            throw fail('pending_login_invalid', 'Pending Claude authorization is invalid');
        }
        finally {
            await unlink(claimed);
        }
        const now: any = (options.clock?.() ?? Math.floor(Date.now() / 1000)) * 1000;
        if (!pending?.state || !pending.code_verifier || !Number.isSafeInteger(pending.expires_at) || pending.expires_at <= now)
            throw fail('pending_login_expired', 'Pending Claude authorization expired');
        const login: any = new (ClaudeLogin as any)({ ...options, pending });
        login.pendingClaimed = true;
        return login;
    }
    authorizationURL(): any {
        const url: any = new (URL as any)(this.authorizeURL);
        for (const [name, value] of Object.entries({ code: 'true', client_id: CLAUDE_CLIENT_ID, response_type: 'code', redirect_uri: CLAUDE_REDIRECT_URI,
            scope: this.mode === 'setup-token' ? CLAUDE_INFERENCE_SCOPE : CLAUDE_SCOPES,
            code_challenge: createHash('sha256').update(this.#pending.code_verifier).digest('base64url'), code_challenge_method: 'S256', state: this.#pending.state }) as any)
            url.searchParams.set(name, value);
        return url.href;
    }
    async complete(pasted?: any, { dataDir = join(this.home, '.router'), validateCatalog = validateCredentialCatalog, catalogBaseURL, allowLoopback = false }: any = {}): Promise<any> {
        if (this.used)
            throw fail('pending_login_consumed', 'Claude authorization code flow already consumed');
        if (!this.pendingClaimed) {
            const claimed: any = await ClaudeLogin.resume({ home: this.home, mode: this.mode, manager: this.manager, authorizeURL: this.authorizeURL, clock: this.clock, allowLoopback: this.manager.allowLoopback });
            if (claimed.#pending.state !== this.#pending.state)
                throw fail('pending_login_changed', 'Pending Claude authorization belongs to another login');
            this.pendingClaimed = true;
        }
        this.used = true;
        const [code, returnedState]: any = String(pasted).trim().split('#');
        if (!code)
            throw fail('invalid_argument', 'Claude authorization code is empty');
        if (returnedState != null && returnedState !== this.#pending.state)
            throw fail('oauth_state_mismatch', 'Claude authorization state did not match');
        if (this.#pending.expires_at <= this.clock() * 1000)
            throw fail('pending_login_expired', 'Pending Claude authorization expired');
        const response: any = await this.manager.exchange('claude', { grant_type: 'authorization_code', code, state: returnedState ?? this.#pending.state,
            client_id: CLAUDE_CLIENT_ID, redirect_uri: CLAUDE_REDIRECT_URI, code_verifier: this.#pending.code_verifier });
        const scopes: any = response.scope == null ? (this.mode === 'setup-token' ? CLAUDE_INFERENCE_SCOPE : CLAUDE_SCOPES).split(' ') : typeof response.scope === 'string' ? response.scope.split(/\s+/).filter(Boolean) : null;
        if (!scopes)
            throw fail('oauth_response_invalid', 'Claude response has invalid granted scopes', 502);
        const oauth: any = { accessToken: response.access_token, scopes, subscriptionType: response.subscription_type ?? null, rateLimitTier: response.rate_limit_tier ?? null };
        if (response.refresh_token)
            oauth.refreshToken = response.refresh_token;
        if (response.expires_in != null)
            oauth.expiresAt = this.clock() * 1000 + response.expires_in * 1000;
        if (response.refresh_token_expires_in != null) {
            if (!Number.isSafeInteger(response.refresh_token_expires_in) || response.refresh_token_expires_in < 0 || !Number.isSafeInteger(this.clock() * 1000 + response.refresh_token_expires_in * 1000))
                throw fail('oauth_response_invalid', 'Claude refresh expiry is invalid', 502);
            oauth.refreshTokenExpiresAt = this.clock() * 1000 + response.refresh_token_expires_in * 1000;
        }
        const document: any = { claudeAiOauth: oauth };
        const parsed: any = parseCredentialDocument('claude', document);
        const stage: any = join(dataDir, 'auth-import-candidates', randomUUID().replaceAll('-', ''));
        await atomicWrite(join(stage, 'claude', '.credentials.json'), JSON.stringify(document, null, 2) + '\n');
        let accepted: any = false;
        try {
            const models: any = acceptedModels(await validateCatalog({ provider: 'claude', token: parsed.token, fetch: this.manager.fetch, baseURL: catalogBaseURL, allowLoopback }));
            const report: any = await installAcceptedDocument({ provider: 'claude', document, destinationHome: this.home, dataDir, models });
            accepted = true;
            return report;
        }
        catch (error: any) {
            error.transaction_id = stage.split('/').at(-1);
            throw error;
        }
        finally {
            if (accepted)
                await rm(stage, { recursive: true, force: true });
        }
    }
}
export async function executeAuthOperation({ name, options = {}, core, config = core?.config ?? {}, env = {}, fetch = globalThis.fetch, clockSeconds = core?.clock ?? ((): any => Math.floor(Date.now() / 1000)), oauth = {} }: any = {}): Promise<any> {
    if (!['auth.import', 'auth.claude', 'auth.codex'].includes(name))
        throw fail('native_unsupported', 'Native OAuth operation is not implemented', 501);
    if (options.router || options.url || options.target)
        throw fail('native_unsupported', 'Native local credential adoption does not support remote deployment targets', 501);
    if (options.all || options.resume || options.force || options.clear || options.port || options.agent || options.device)
        throw fail('native_unsupported', 'Native OAuth does not implement bulk, rotating transaction resume, forced adoption or credential withdrawal', 501);
    const provider: any = subscriptionProvider(name === 'auth.import' ? options.provider : name.slice(5));
    const home: any = options.home ?? (provider === 'claude' ? config.claude_code_home ?? env.CLAUDE_CODE_HOME : config.codex_home ?? env.CODEX_HOME);
    if (!home)
        throw fail('invalid_argument', 'Native OAuth requires an explicit destination credential home');
    const sourceHome: any = options.dir ?? options.from_claude_home ?? options.from_codex_home;
    const manager: any = new (OAuthManager as any)({ fetch, clock: clockSeconds, ...oauth });
    if (name === 'auth.import' || sourceHome != null) {
        if (!sourceHome)
            throw fail('native_unsupported', 'Native import requires an explicit source directory; platform keychain defaults are not implemented', 501);
        return importCredential({ provider, sourceHome, destinationHome: home, dataDir: config.data_dir, ifAbsent: options.if_absent, snapshot: options.snapshot, fetch, clock: clockSeconds, ...oauth });
    }
    if (name === 'auth.codex')
        throw fail('native_unsupported', 'Native Codex browser/device authorization is not implemented; use an explicit validated file import', 501);
    if (options.flow && !['auto', 'code'].includes(options.flow))
        throw fail('native_unsupported', 'Native Claude authorization supports the code flow', 501);
    const loginOptions: any = { home, mode: options.mode, manager, clock: clockSeconds, ...oauth };
    if (!options.code) {
        const login: any = await ClaudeLogin.begin(loginOptions);
        return { output: [login.authorizationURL()] };
    }
    const login: any = await ClaudeLogin.resume(loginOptions);
    const result: any = await login.complete(options.code, { dataDir: config.data_dir, ...oauth });
    return { output: [`Claude authorization ${(result.results as any)[0].outcome}.`] };
}
