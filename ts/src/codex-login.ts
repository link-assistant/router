// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=109c0f4459b73b8c928c195a7eff8abe3108a1ff7c22f2dcdc5d7a8387f10fa2; dynamic any annotations are explicit draft gaps.
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { atomicWrite } from "./storage.js";
import { CODEX_CLIENT_ID, importCredential, validateCredentialCatalog } from "./oauth.js";
const fail: any = (code?: any, message?: any, status: any = 400): any => (Object as any).assign(new (Error as any)(message), { code, status });
const nonce: any = (): string => randomUUID().replaceAll('-', '');
const encode: any = (value?: any): string => encodeURIComponent(value).replace(/[!'()*]/g, (char?: any): string => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
const nonempty: any = (value?: any): boolean => typeof value === 'string' && value.trim().length > 0;
function issuerOrigin(value?: any, allowLoopback?: any): string {
    let url: any;
    try {
        (url as any) = new (URL as any)(value);
    }
    catch {
        throw fail('invalid_oauth_endpoint', 'Codex issuer must be an absolute URL');
    }
    const local: boolean = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname) || url.origin !== 'https://auth.openai.com' && !(allowLoopback && local && ['http:', 'https:'].includes(url.protocol)))
        throw fail('invalid_oauth_endpoint', 'Codex issuer must be official or an explicitly allowed loopback fixture');
    return url.origin;
}
async function json(response?: any, signal?: any): Promise<any> {
    const chunks: any = [];
    let bytes: any = 0;
    const reader: any = response.body?.getReader();
    const abort: any = new (Promise as any)((_?: any, reject?: any): void => { const stop: any = (): void => reject(fail('login_cancelled', 'Codex authorization cancelled', 409)); if (signal.aborted)
        stop();
    else
        (signal.addEventListener as any)('abort', stop, { once: true }); });
    try {
        if (reader)
            while (true) {
                const part: any = await (Promise as any).race([reader.read(), abort]);
                if (part.done)
                    break;
                (bytes as any) += part.value.byteLength;
                if (bytes > 1024 * 1024)
                    throw fail('oauth_response_invalid', 'Codex response exceeds 1 MiB', 502);
                chunks.push(part.value);
            }
        const text: string = new (TextDecoder as any)('utf-8', { fatal: true }).decode((Buffer as any).concat(chunks, bytes));
        return text ? (JSON as any).parse(text) : {};
    }
    catch (error: any) {
        if (error.code)
            throw error;
        throw fail('oauth_response_invalid', 'Codex response is not valid UTF-8 JSON', 502);
    }
    finally {
        if (reader) {
            (Promise as any).resolve(reader.cancel()).catch((): void => { });
            try {
                reader.releaseLock();
            }
            catch { }
        }
    }
}
export class CodexLogin {
    declare allowLoopback: any;
    declare callback: any;
    declare catalogBaseURL: any;
    declare clock: any;
    declare controller: any;
    declare dataDir: any;
    declare deviceId: any;
    declare flow: any;
    declare handled: any;
    declare home: any;
    declare interval: any;
    declare issuer: any;
    declare manager: any;
    declare port: any;
    declare redirectURI: any;
    declare server: any;
    declare signal: any;
    declare state: any;
    declare status: any;
    declare timeoutMs: any;
    declare url: any;
    declare used: any;
    declare userCode: any;
    declare validateCatalog: any;
    declare verifier: any;
    constructor({ home, manager, clock = (): number => (Math as any).floor((Date as any).now() / 1000), signal, issuer = 'https://auth.openai.com', codexIssuer, allowLoopback = false, timeoutMs = 900000, dataDir, validateCatalog = validateCredentialCatalog, catalogBaseURL, port = 1455, flow = 'auto' }: any = {}) {
        if (!home || !manager?.fetch || !(Number as any).isSafeInteger(timeoutMs) || timeoutMs <= 0)
            throw fail('invalid_login_config', 'Codex login requires a home, fetch manager and positive deadline');
        this.home = home;
        this.manager = manager;
        this.clock = clock;
        this.issuer = issuerOrigin(codexIssuer ?? issuer, allowLoopback);
        this.allowLoopback = allowLoopback;
        this.timeoutMs = timeoutMs;
        this.dataDir = dataDir ?? join(home, '.router');
        this.validateCatalog = validateCatalog;
        this.catalogBaseURL = catalogBaseURL ?? (allowLoopback && this.issuer !== 'https://auth.openai.com' ? this.issuer : undefined);
        this.port = Number(port);
        this.flow = flow;
        this.controller = new (AbortController as any)();
        this.signal = signal ? (AbortSignal as any).any([signal, this.controller.signal]) : this.controller.signal;
        this.used = false;
    }
    static async begin(options: any = {}): Promise<any> {
        const login: any = new (CodexLogin as any)(options);
        if (['auto', 'device'].includes(login.flow))
            await login.beginDevice();
        else if (login.flow === 'loopback')
            await login.bindCallback();
        else
            throw fail('invalid_argument', 'Codex supports device or loopback authorization');
        return login;
    }
    authorizationURL(): undefined | string { return this.url; }
    async request(path?: any, { body, form = false }: any = {}): Promise<any> {
        const signal: any = (AbortSignal as any).any([this.signal, (AbortSignal as any).timeout((Math as any).min(this.timeoutMs, 20000))]);
        const abort: any = new (Promise as any)((_?: any, reject?: any): void => { const stop: any = (): void => reject(fail('login_cancelled', 'Codex authorization cancelled or its request deadline elapsed', 409)); if (signal.aborted)
            stop();
        else
            signal.addEventListener('abort', stop, { once: true }); });
        let response: any;
        try {
            (response as any) = await (Promise as any).race([(this.manager.fetch as any)(this.issuer + path, { method: 'POST', redirect: 'error', signal, headers: { 'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json' }, body: form ? body : (JSON as any).stringify(body) }), abort]);
        }
        catch (error: any) {
            if (error.code === 'login_cancelled')
                throw error;
            throw fail('oauth_exchange_uncertain', 'Codex authorization request outcome is uncertain', 502);
        }
        if ((response as any).url && new (URL as any)((response as any).url).origin !== this.issuer)
            throw fail('invalid_oauth_endpoint', 'Codex response changed issuer origin', 502);
        return { status: (response as any).status, ok: (response as any).ok, body: await json(response, signal) };
    }
    async beginDevice(): Promise<void> {
        const response: any = await this.request('/api/accounts/deviceauth/usercode', { body: { client_id: CODEX_CLIENT_ID } });
        if (!response.ok)
            throw fail('device_authorization_rejected', response.status === 404 ? 'Codex device authorization is disabled; use loopback flow' : 'Codex device authorization could not be started', response.status);
        const device: any = response.body, interval: any = typeof device.interval === 'string' && /^\s*\d+\s*$/.test(device.interval) ? Number(device.interval) : device.interval;
        if (!nonempty(device.device_auth_id) || !nonempty(device.user_code ?? device.usercode) || !(Number as any).isSafeInteger(interval) || interval < 0)
            throw fail('oauth_response_invalid', 'Codex device response lacks a usable ID, code or interval', 502);
        this.deviceId = device.device_auth_id;
        this.userCode = device.user_code ?? device.usercode;
        this.interval = interval;
        this.url = this.issuer + '/codex/device';
        this.status = 'awaiting_device';
    }
    async bindCallback(): Promise<void> {
        if (this.signal.aborted)
            throw fail('login_cancelled', 'Codex callback cancelled', 409);
        if (!(Number as any).isInteger(this.port) || this.port < 0 || this.port > 65535 || this.issuer === 'https://auth.openai.com' && ![1455, 1457].includes(this.port))
            throw fail('invalid_argument', 'Codex OAuth registers loopback ports 1455 and 1457 only');
        this.state = nonce();
        this.verifier = nonce() + nonce();
        let settle: any;
        this.callback = new (Promise as any)((resolve?: any, reject?: any): any => (settle as any) = { resolve, reject });
        this.callback.catch((): void => { });
        this.signal.addEventListener('abort', (): any => ((settle as any).reject as any)(fail('login_cancelled', 'Codex callback cancelled', 409)), { once: true });
        this.server = createServer((request?: any, response?: any): void => {
            const url: any = new (URL as any)(request.url, 'http://localhost');
            if (request.method !== 'GET' || url.pathname !== '/auth/callback') {
                response.writeHead(404);
                response.end();
                return;
            }
            if (url.searchParams.get('state') !== this.state) {
                response.writeHead(400);
                response.end('OAuth state did not match; authorization is still waiting');
                return;
            }
            if (this.handled) {
                response.writeHead(409);
                response.end('Authorization callback was already handled');
                return;
            }
            this.handled = true;
            const providerError: any = url.searchParams.get('error'), code: any = url.searchParams.get('code');
            if (providerError || !code) {
                const safe: any = ['access_denied', 'server_error', 'temporarily_unavailable'].includes(providerError) ? providerError : 'provider_error';
                ((settle as any).reject as any)(fail('authorization_failed', `Codex callback failed (${safe})`));
                response.writeHead(400);
                response.end('Authorization failed. You can close this window.');
            }
            else {
                ((settle as any).resolve as any)(code);
                response.writeHead(200);
                response.end('Authorization received. You can close this window.');
            }
        });
        this.server.maxHeadersCount = 32;
        this.server.headersTimeout = 10000;
        this.server.requestTimeout = 10000;
        await new (Promise as any)((resolve?: any, reject?: any): void => { this.server.once('error', reject); this.server.listen(this.port, '127.0.0.1', resolve); });
        this.port = this.server.address().port;
        this.redirectURI = `http://localhost:${this.port}/auth/callback`;
        const pairs: any = { response_type: 'code', client_id: CODEX_CLIENT_ID, redirect_uri: this.redirectURI, scope: 'openid profile email offline_access api.connectors.read api.connectors.invoke', code_challenge: createHash('sha256').update(this.verifier).digest('base64url'), code_challenge_method: 'S256', id_token_add_organizations: 'true', codex_cli_simplified_flow: 'true', state: this.state, originator: 'codex_cli_rs' };
        this.url = this.issuer + '/oauth/authorize?' + (Object as any).entries(pairs).map(([key, value]: any): string => `${encode(key)}=${encode(value)}`).join('&');
        this.status = 'awaiting_callback';
    }
    async stopCallback(): Promise<void> {
        if (!this.server)
            return;
        const server: any = this.server;
        this.server = null;
        await new (Promise as any)((resolve?: any): void => { server.close(resolve); server.closeAllConnections(); });
    }
    async cancel(): Promise<void> { this.controller.abort(); await this.stopCallback(); }
    async wait({ dataDir = this.dataDir, validateCatalog = this.validateCatalog, catalogBaseURL = this.catalogBaseURL, signal }: any = {}): Promise<any> {
        if (this.used)
            throw fail('pending_login_consumed', 'Codex authorization was already consumed', 409);
        this.used = true;
        const timer: any = setTimeout((): void => this.controller.abort(), this.timeoutMs), extraAbort: any = (): void => this.controller.abort();
        signal?.addEventListener('abort', extraAbort, { once: true });
        if (signal?.aborted)
            extraAbort();
        try {
            let code: any, verifier: any, redirect: any;
            if (this.flow === 'loopback') {
                (code as any) = await this.callback;
                await this.stopCallback();
                (verifier as any) = this.verifier;
                (redirect as any) = this.redirectURI;
            }
            else
                while (true) {
                    const response: any = await this.request('/api/accounts/deviceauth/token', { body: { device_auth_id: this.deviceId, user_code: this.userCode } });
                    if (response.ok) {
                        const value: any = response.body;
                        if (!nonempty(value.authorization_code) || !nonempty(value.code_verifier) || value.code_challenge !== createHash('sha256').update(value.code_verifier).digest('base64url'))
                            throw fail('oauth_pkce_mismatch', 'Codex device authorization returned inconsistent PKCE values', 502);
                        (code as any) = value.authorization_code;
                        (verifier as any) = value.code_verifier;
                        (redirect as any) = this.issuer + '/deviceauth/callback';
                        break;
                    }
                    const providerError: string = String(response.body.error ?? '').toLowerCase();
                    if (response.status === 429 || providerError === 'slow_down')
                        this.interval += 5;
                    else if (['expired_token', 'access_denied'].includes(providerError))
                        throw fail('authorization_failed', `Codex device authorization failed (${providerError})`, 401);
                    else if (![403, 404].includes(response.status) && providerError !== 'authorization_pending')
                        throw fail('device_authorization_rejected', `Codex device endpoint returned ${response.status}`, response.status);
                    await sleep(this.interval * 1000, undefined, { signal: this.signal });
                }
            const body: string = (Object as any).entries({ grant_type: 'authorization_code', code, redirect_uri: redirect, client_id: CODEX_CLIENT_ID, code_verifier: verifier }).map(([key, value]: any): string => `${encode(key)}=${encode(value)}`).join('&');
            const response: any = await this.request('/oauth/token', { body, form: true });
            if (!response.ok)
                throw fail('authorization_failed', `Codex token endpoint returned ${response.status}`, response.status);
            const tokens: any = response.body;
            if (!['id_token', 'access_token', 'refresh_token'].every((key?: any): boolean => nonempty((tokens as any)[key])))
                throw fail('oauth_response_invalid', 'Codex token response lacks required credential fields', 502);
            const document: any = { auth_mode: 'chatgpt', tokens: (Object as any).fromEntries(['id_token', 'access_token', 'refresh_token'].map((key?: any): any => [key, (tokens as any)[key]])), last_refresh: new (Date as any)(this.clock() * 1000).toISOString() };
            const stage: string = join(dataDir, 'auth-import-candidates', nonce()), sourceHome: string = join(stage, 'codex');
            await atomicWrite(join(sourceHome, 'auth.json'), (JSON as any).stringify(document, null, 2) + '\n');
            try {
                const result: any = await importCredential({ provider: 'codex', sourceHome, destinationHome: this.home, dataDir, owned: true, fetch: this.manager.fetch, clock: this.clock, validateCatalog, catalogBaseURL, allowLoopback: this.allowLoopback, beforePromote: (): void => { if (this.signal.aborted)
                        throw fail('login_cancelled', 'Codex authorization cancelled before promotion', 409); } });
                await rm(stage, { recursive: true, force: true });
                return result;
            }
            catch (error: any) {
                error.transaction_id = stage.split('/').at(-1);
                throw error;
            }
        }
        finally {
            clearTimeout(timer);
            signal?.removeEventListener('abort', extraAbort);
            await this.stopCallback();
        }
    }
}
