// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=07ae423f0dab9701eb03abf2066b053c5905e6e2d4b57f4e25b33f018144a47f; dynamic any annotations are explicit draft gaps.
import { createServer } from 'node:http';
import { createServer as createHTTPSServer } from 'node:https';
import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { timingSafeEqual } from 'node:crypto';
import { ProtocolError, translateRequest, translateResponse, normalizeUsage, projectModels } from "./protocols.js";
import { translateStream, monitorNativeStream } from "./streams.js";
import { ResponsesStore, responseOwner, normalizeResponseInput } from "./responses.js";
import { createNativeService, boundedBytes } from "./native-service.js";
import { estimateRequestBudget } from "./token-reservation.js";
import { retryableStatus } from "./accounts.js";
import { managementOperation } from "./http-management.js";
import { relayWebSocket } from "./websocket-relay.js";
import { UsageTracker } from "./usage.js";
import { activityResponse } from "./activitypub.js";
import { githubConfiguration, relayGithub } from "./github-proxy.js";
import { relayGit } from "./git-proxy.js";
import { serveAdminAsset, hardenAdmin } from "./admin-assets.js";
import { matchHTTPRoute, HTTP_ROUTES } from "./http-route-contract.js";
import { isIP } from 'node:net';
import { NativeRequestLog } from "./request-log.js";
const JSON_HEADERS: any = { 'content-type': 'application/json; charset=utf-8' };
const json: any = (body?: any, status: any = 200, headers: any = {}): any => new (Response as any)((JSON as any).stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
const redactedKeys: any = /(?:api[_-]?key|password|secret|authorization|credential|cookie|(?:access|refresh|id)[_-]?token|^token$)/i;
export function redact(value?: any): any {
    if ((Array as any).isArray(value))
        return value.map(redact);
    if (!value || typeof value !== 'object')
        return value;
    return (Object as any).fromEntries((Object as any).entries(value).map(([key, v]: any): any => [key, redactedKeys.test(key) ? '[REDACTED]' : redact(v)]));
}
const equal: any = (a?: any, b?: any): boolean => typeof a === 'string' && typeof b === 'string' && (Buffer as any).byteLength(a) === (Buffer as any).byteLength(b) && timingSafeEqual((Buffer as any).from(a), (Buffer as any).from(b));
function socketPeer(peer?: any): undefined | string {
    if (typeof peer !== 'string' || !isIP(peer))
        return undefined;
    if (isIP(peer) === 4)
        return peer;
    const normalized: string = new (URL as any)(`http://[${peer}]/`).hostname.slice(1, -1), mapped: any = /^::ffff:([a-f0-9]+):([a-f0-9]+)$/i.exec(normalized);
    if (!mapped)
        return normalized;
    const high: number = parseInt((mapped as any)[1], 16), low: number = parseInt((mapped as any)[2], 16);
    return `${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`;
}
const bearer: any = (headers?: any): any => { const a: any = (headers.get as any)('authorization'); return a?.match(/^Bearer\s+(.+)$/i)?.[1] ?? (headers.get as any)('x-api-key'); };
const protocolOf: any = (candidate?: any): string => {
    const value: any = candidate.protocol ?? candidate.provider?.protocol ?? candidate.provider?.type ?? candidate.provider;
    if (['anthropic', 'messages'].includes(value))
        return 'anthropic';
    if (['responses', 'openai-responses', 'codex'].includes(value))
        return 'responses';
    if (['chat', 'openai', 'openai-compatible', 'openai_compatible'].includes(value))
        return 'chat';
    if (['gemini', 'vertex'].includes(value))
        return 'gemini';
    throw new (ProtocolError as any)(`Unsupported upstream protocol ${typeof value === 'string' ? value : 'unknown'}`, 501);
};
const paths: any = { chat: 'chat/completions', anthropic: 'messages', responses: 'responses' };
const serviceOf: any = (path?: any): undefined | string => /^\/api\/services\/(openai|anthropic|codex|qwen|gemini|vertex|bedrock)(?:\/|$)/.exec(path)?.[1];
function upstreamURL(base?: any, protocol?: any, endpointPath?: any): any {
    let u: any;
    try {
        (u as any) = new (URL as any)(base);
    }
    catch {
        throw new (ProtocolError as any)('Provider base URL is invalid', 500);
    }
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash)
        throw new (ProtocolError as any)('Provider base URL must be an HTTP(S) URL without credentials, query or fragment', 500);
    if (endpointPath !== undefined) {
        if (typeof endpointPath !== 'string' || !/^\/[a-zA-Z0-9/:_-]+$/.test(endpointPath) || endpointPath.startsWith('//'))
            throw new (ProtocolError as any)('Provider endpoint path is invalid', 500);
        u.pathname = `${u.pathname.replace(/\/$/, '')}${endpointPath}`;
    }
    else
        u.pathname = `${u.pathname.replace(/\/$/, '')}${/\/v1$/.test(u.pathname.replace(/\/$/, '')) ? '/' : '/v1/'}${(paths as any)[protocol]}`;
    return u;
}
function upstreamHeaders(candidate?: any, protocol?: any, request?: any): any {
    const headers: any = new (Headers as any)({ 'content-type': 'application/json', accept: 'application/json, text/event-stream' });
    const forbidden: any = /^(?:authorization|x-api-key|x-goog-api-key|anthropic-auth-token|chatgpt-account-id|cookie|set-cookie|host|connection|content-length|content-encoding|transfer-encoding|upgrade|te|trailer|keep-alive|proxy-.*|forwarded|x-forwarded-.*|x-router-.*|x-link-assistant-.*)$/i;
    const copies: any = new (Set as any)(['x-request-id', 'x-correlation-id', 'traceparent', 'tracestate', 'x-claude-code-session-id', 'x-codex-session-id', 'x-session-id', 'session-id']);
    for (const [key, value] of (Object as any).entries(candidate.headers ?? candidate.account?.headers ?? {}) as any) {
        if (forbidden.test(key))
            continue;
        if (typeof value !== 'string')
            continue;
        if (value.startsWith('$')) {
            const source: string = value.slice(1).toLowerCase();
            if (copies.has(source) && (request.headers.has as any)(source))
                headers.set(key, (request.headers.get as any)(source));
        }
        else
            headers.set(key, value);
    }
    const key: any = candidate.apiKey ?? candidate.api_key ?? candidate.account?.api_key;
    if (key)
        headers.set(protocol === 'anthropic' && candidate.auth_type !== 'oauth' ? 'x-api-key' : 'authorization', protocol === 'anthropic' && candidate.auth_type !== 'oauth' ? key : `Bearer ${key}`);
    if (protocol === 'anthropic')
        headers.set('anthropic-version', '2023-06-01');
    if (candidate.auth_type === 'oauth') {
        for (const [key, value] of (Object as any).entries(candidate.oauth_headers ?? {}) as any)
            if (['anthropic-beta', 'anthropic-version', 'chatgpt-account-id', 'originator'].includes(key.toLowerCase()) && typeof value === 'string')
                headers.set(key, value);
    }
    const requestId: any = (request.headers.get as any)('x-request-id');
    if (requestId && /^[a-zA-Z0-9._:-]{1,128}$/.test(requestId))
        headers.set('x-request-id', requestId);
    return headers;
}
function relayHeaders(upstream?: any): any {
    const result: any = {};
    for (const [key, value] of upstream.headers as any)
        if (/^(?:x-request-id|request-id|retry-after|x-ratelimit-[a-z_-]+|anthropic-ratelimit-[a-z_-]+)$/.test(key))
            (result as any)[key] = value;
    return result;
}
async function boundedJSON(request?: any, maxBytes?: any, objectOnly: any = true): Promise<any> {
    if (!request.body)
        throw new (ProtocolError as any)('Request body is required');
    const length: number = Number((request.headers.get as any)('content-length'));
    if ((Number as any).isFinite(length) && length > maxBytes)
        throw new (ProtocolError as any)('Request body exceeds limit', 413);
    const reader: any = request.body.getReader();
    const parts: any = [];
    let total: any = 0;
    try {
        while (true) {
            const { value, done }: any = await reader.read();
            if (done)
                break;
            (total as any) += value.byteLength;
            if (total > maxBytes) {
                await reader.cancel();
                throw new (ProtocolError as any)('Request body exceeds limit', 413);
            }
            parts.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    let value: any;
    try {
        (value as any) = (JSON as any).parse((Buffer as any).concat(parts).toString('utf8'));
    }
    catch {
        throw new (ProtocolError as any)('Request body must contain valid JSON');
    }
    if (objectOnly && (!value || typeof value !== 'object' || (Array as any).isArray(value)))
        throw new (ProtocolError as any)('Request body must be a JSON object');
    return value;
}
export function createNativeRouter(options: any = {}): any {
    const { core, authenticate, fetch: suppliedFetch = globalThis.fetch, clock = (Date as any).now, maxBodyBytes = 4 * 1024 * 1024, maxResponseBytes = 32 * 1024 * 1024, timeoutMs = 120000, maxAttempts = 3 }: any = options;
    if (!core)
        throw new (TypeError as any)('createNativeRouter requires core; use startNativeServer to create one from configuration');
    const tlsConfig: any = { ...core.config, ...options };
    const useTLS: boolean = Boolean(tlsConfig.tls_self_signed || tlsConfig.tlsSelfSigned || tlsConfig.tls_cert || tlsConfig.tlsCert || tlsConfig.tls_key || tlsConfig.tlsKey || tlsConfig.https || tlsConfig.tls || (((Array as any).isArray(tlsConfig.listeners) ? tlsConfig.listeners : (Object as any).values(tlsConfig.listeners ?? {})).some as any)((listener?: any): any => listener?.tls || listener?.https || listener?.protocol === 'https' || typeof listener === 'string' && listener.startsWith('https:')));
    const responseStore: any = options.responseStore ?? new (ResponsesStore as any)({ clock, ...options.responseStoreOptions });
    const logs: any = [];
    const counters: any = { requests: 0, failures: 0, upstream_attempts: 0, input_tokens: 0, output_tokens: 0 };
    const peers: any = new (WeakMap as any)();
    const requestLog: any = options.requestLog ?? core.requestLog ?? (core.config?.data_dir ? new (NativeRequestLog as any)({ config: core.config, env: options.env ?? core.env ?? {}, clock }) : null);
    if (requestLog && !core.requestLog)
        core.requestLog = requestLog;
    const upstreamFetch: any = requestLog ? (requestLog.fetch as any)(suppliedFetch) : suppliedFetch;
    const listenerKind: any = options.listenerKind ?? (core.config?.inference_only ? 'inference-only' : 'combined');
    let githubConfig: any;
    let server: any;
    const configuration: any = (): any => core.config ?? options.config ?? {};
    const errorResponse: any = (error?: any, protocol?: any): any => {
        const status: any = error.status ?? 500;
        const message: any = status >= 500 && !(error instanceof ProtocolError) ? 'Router request failed' : error.message;
        return json(protocol === 'gemini' ? { error: { code: status, message, status: (({ 400: 'INVALID_ARGUMENT', 401: 'PERMISSION_DENIED', 403: 'PERMISSION_DENIED', 404: 'NOT_FOUND', 429: 'RESOURCE_EXHAUSTED', 503: 'UNAVAILABLE' }) as any)[status] ?? 'INTERNAL' } } : protocol === 'anthropic' ? { type: 'error', error: { type: status === 401 ? 'authentication_error' : status === 429 ? 'rate_limit_error' : 'api_error', message } } : { error: { message, type: status === 401 ? 'authentication_error' : status === 400 ? 'invalid_request_error' : 'api_error', code: error.code ?? null } }, status);
    };
    async function authorize(request?: any, admin?: any, model?: any): Promise<any> {
        if (authenticate) {
            const claims: any = await (authenticate as any)(request, { admin, model });
            if (!claims)
                throw new (ProtocolError as any)('Invalid or missing Router credential', 401);
            if (admin && claims.admin !== true && claims.is_admin !== true)
                throw new (ProtocolError as any)('Administrator credential required', 403);
            return claims;
        }
        const token: any = bearer(request.headers), config: any = configuration();
        if (core.authenticate)
            return (core.authenticate as any)(token, { admin, model, headers: request.headers, listener: listenerKind, repository: (request.headers.get as any)('x-router-repository') ?? undefined });
        const adminKey: any = config.admin_token ?? config.adminToken ?? config.api?.admin_token;
        if (adminKey && equal(token, adminKey))
            return { admin: true };
        const clientKey: any = config.api_key ?? config.apiKey ?? config.client_token;
        if (!admin && clientKey && equal(token, clientKey))
            return { admin: false };
        const claims: any = token && core.tokens?.validate ? await (core.tokens.validate as any)(token, { admin, model, repository: (request.headers.get as any)('x-router-repository') ?? undefined }) : null;
        if (claims)
            return claims;
        throw new (ProtocolError as any)(admin ? 'Administrator credential required' : 'Invalid or missing Router credential', 401);
    }
    function routingContext(request?: any, claims?: any): any {
        const path: string = new (URL as any)(request.url).pathname, service: any = serviceOf(path);
        const client: any = typeof claims.client === 'string' ? claims.client : typeof claims.client_kind === 'string' ? claims.client_kind : undefined;
        const pin: any = service ? configuration().services?.[service]?.provider : undefined;
        if (pin !== undefined && (typeof pin !== 'string' || !pin))
            throw new (ProtocolError as any)('Configured service provider pin is invalid', 500);
        return { client, principalAccount: claims.account ?? undefined, provider: pin, service, path };
    }
    const nativeService: any = createNativeService({ core, authorize, routingContext, fetch: upstreamFetch, maxBodyBytes, maxResponseBytes, timeoutMs, affinities: options.affinities ?? core.affinities });
    async function models(request?: any, claims?: any): Promise<any> {
        if ((claims.sub ?? claims.id) && !claims.record && !(claims.label === 'emergency-bypass' && claims.sub?.startsWith('emergency-bypass-')))
            throw new (ProtocolError as any)('Durable model authority is unavailable', 403);
        const context: any = routingContext(request, claims);
        const value: any = core.catalogFor ? await (core.catalogFor as any)(context) : core.models ? await core.models() : configuration().models ?? [];
        const list: any = (Array as any).isArray(value) ? value : value?.data ?? (Object as any).keys(value ?? {});
        const allowed: any = claims.record?.model_policy?.allowed_models ?? [];
        const filtered: any = ((list.map as any)((m?: any): any => typeof m === 'string' ? { id: m, object: 'model', created: 0, owned_by: 'router' } : { object: 'model', created: 0, owned_by: m.provider ?? 'router', ...m, id: m.id ?? m.name }).filter as any)((m?: any): any => (!allowed.length || (allowed.includes as any)(m.id)) && (!context.client || m.supported_clients?.includes(context.client)) && (!context.provider || (m.provider ?? m.owned_by) === context.provider) && (!context.principalAccount || core.catalogFor || m.account === context.principalAccount));
        const seen: any = new (Set as any)();
        for (const m of filtered as any) {
            if (seen.has(m.id))
                throw new (ProtocolError as any)(`Exact model id '${m.id}' is advertised more than once`, 409);
            seen.add(m.id);
        }
        return filtered;
    }
    async function management(request?: any, path?: any): Promise<any> {
        const open: boolean = ['/api/management/admin/status', '/api/management/admin/bootstrap', '/api/management/admin/bootstrap/confirm'].includes(path);
        if (open) {
            const result: any = await managementOperation(core, request, path, request.body ? await boundedJSON(request, maxBodyBytes) : {});
            if (result === undefined)
                throw new (ProtocolError as any)('Route not found', 404);
            return json(result);
        }
        if ((path.startsWith as any)('/api/management/login') && configuration().login?.enabled === false)
            throw new (ProtocolError as any)('Route not found', 404);
        let adminClaims: any;
        try {
            (adminClaims as any) = await authorize(request, true);
        }
        catch (error: any) {
            error.managementAuthenticationFailure = true;
            throw error;
        }
        core.managementAccess?.success(socketPeer(peers.get(request) ?? options.peer));
        const method: any = request.method, body: any = ['POST', 'PATCH'].includes(method) ? request.body ? await boundedJSON(request, maxBodyBytes) : {} : undefined;
        if (path === '/api/management/logs/errors' && method === 'GET')
            return json({ enabled: Boolean(requestLog?.errorRoot), files: await requestLog?.errorFiles() ?? [] });
        const requestId: any = /^\/api\/management\/logs\/requests\/([^/]+)$/.exec(path);
        if (requestId && method === 'GET') {
            const id: string = decodeURIComponent((requestId as any)[1]), records: any = await requestLog?.lookup(id) ?? [];
            if (!records.length)
                throw new (ProtocolError as any)('request id is not retained', 404);
            return json({ id, records });
        }
        const errorFile: any = /^\/api\/management\/logs\/errors\/([^/]+)$/.exec(path);
        if (errorFile && method === 'GET') {
            if (!requestLog?.errorRoot)
                throw new (ProtocolError as any)('error capture is disabled', 404);
            return new (Response as any)(await (requestLog.readError as any)(decodeURIComponent((errorFile as any)[1])), { headers: { 'content-type': 'application/json', 'content-disposition': 'attachment', 'cache-control': 'no-store' } });
        }
        if (path === '/api/management/logs' && method === 'DELETE') {
            if (!requestLog)
                throw new (ProtocolError as any)('Request log storage is unavailable', 503);
            await requestLog.clear();
            return json({ cleared: true });
        }
        if (path === '/api/management/usage/queue' && method === 'GET') {
            if (!requestLog)
                throw new (ProtocolError as any)('Request tracking is unavailable', 503);
            return json((requestLog.queueSnapshot as any)([...core.accounts?.records?.keys() ?? ['primary']]));
        }
        if (path === '/api/management/logging' && method === 'PATCH') {
            if (typeof body.debug !== 'boolean' || (Object as any).keys(body).some((key?: any): boolean => key !== 'debug'))
                throw new (ProtocolError as any)('debug must be a boolean and unknown logging fields are not accepted');
            if (!core.logging?.set)
                throw new (ProtocolError as any)('runtime logging control is not installed', 503);
            const specified: number = Number((options.env ?? core.env)?.LOG_DEBUG_TTL_SECS), ttl: number = (Number as any).isSafeInteger(specified) && specified >= 1 && specified <= 86400 ? specified : 300;
            await (core.logging.set as any)(body.debug, ttl);
            return json({ debug: body.debug, ttl_secs: body.debug ? ttl : 0 });
        }
        const delegated: any = await managementOperation(core, request, path, body);
        if (delegated !== undefined)
            return json(delegated);
        if (path === '/api/management/tokens' && method === 'GET')
            return json({ data: redact(await core.tokens.list()) });
        if (['/api/management/tokens', '/api/management/tokens/client'].includes(path) && method === 'POST') {
            const client: any = (path.endsWith as any)('/client');
            const input: any = { ...body, ...(body.allowed_models ? { model_policy: { allowed_models: body.allowed_models, allow_substitution: body.allow_model_substitution ?? false, substitution_source: body.model_substitution_source ?? null } } : {}), ...(client ? { scope: '', admin: false, account: 'primary', principal_id: 'primary' } : {}) };
            if (client && !body.client_kind)
                throw new (ProtocolError as any)('client_kind is required');
            if (body.run_lease && !body.ephemeral)
                throw new (ProtocolError as any)('run_lease requires an ephemeral wrapper credential');
            if (body.sliding_expiry)
                input.sliding_window_seconds = (body.ttl_hours ?? 24) * 3600;
            if (body.run_lease)
                input.run_lease_seconds = body.run_lease_seconds ?? 120;
            const result: any = await (core.tokens.issue as any)(input);
            return json({ token: typeof result === 'string' ? result : result.token, ttl_hours: body.ttl_hours ?? 24, label: result.record?.label ?? body.label ?? '', ...(client ? { client_kind: result.record?.client_kind ?? body.client_kind, principal_id: 'primary', model_policy: result.record?.model_policy ?? input.model_policy ?? {} } : { account: body.account ?? null, max_requests: body.max_requests ?? null, max_tokens: body.max_tokens ?? null, rate_limit_per_minute: body.rate_limit_per_minute ?? null, scope: body.scope ?? '' }) });
        }
        if (path === '/api/management/tokens/revoke' && method === 'POST') {
            const id: any = body.id ?? body.token_id;
            await (core.tokens.revoke as any)(id);
            return json({ revoked: id });
        }
        if (['/api/management/tokens/rotate', '/api/management/tokens/rotate-client'].includes(path) && method === 'POST') {
            const own: any = (path.endsWith as any)('/rotate'), id: any = own ? (adminClaims as any).sub ?? (adminClaims as any).id : body.id;
            if (!id)
                throw new (ProtocolError as any)('Rotation requires an admin-scoped token; the flat admin key has no subject to revoke');
            const held: any = await (core.tokens.get as any)(id);
            if (!held)
                throw new (ProtocolError as any)('Token not found', 404);
            if (!own && held.scope === 'admin')
                throw new (ProtocolError as any)('Use /api/management/tokens/rotate to rotate an admin credential');
            const result: any = await (core.tokens.rotate as any)(id, body);
            return json({ token: typeof result === 'string' ? result : result.token, revoked: id, ...(own ? { ttl_hours: body.ttl_hours ?? 24, label: result.record?.label ?? body.label ?? held.label, scope: 'admin' } : {}) });
        }
        if (path === '/api/management/providers' && method === 'GET') {
            const list: any = core.listProviders ? await core.listProviders() : core.providers?.list ? await core.providers.list() : configuration().providers ?? [];
            return json({ data: redact(list) });
        }
        if (path === '/api/management/providers' && method === 'POST') {
            const result: any = core.upsertProvider ? await (core.upsertProvider as any)(body) : core.providers?.upsert ? await (core.providers.upsert as any)(body) : undefined;
            if (result === undefined)
                throw new (ProtocolError as any)('Provider mutation is not supported by this core', 501);
            if (result == null)
                throw new (ProtocolError as any)('Provider not found', 404);
            return json(redact(result));
        }
        const provider: any = /^\/api\/management\/providers\/([^/]+)$/.exec(path);
        if (provider && ['GET', 'DELETE'].includes(method)) {
            const name: string = decodeURIComponent((provider as any)[1]);
            let result: any;
            if (method === 'GET')
                (result as any) = core.showProvider ? await (core.showProvider as any)(name) : await core.providers?.get?.(name);
            else
                (result as any) = core.removeProvider ? await (core.removeProvider as any)(name) : await core.providers?.remove?.(name);
            if (result === undefined)
                throw new (ProtocolError as any)('Provider operation is not supported by this core', 501);
            if (result == null)
                throw new (ProtocolError as any)('Provider not found', 404);
            return json(method === 'DELETE' ? { deleted: name } : redact(result));
        }
        if (path === '/api/management/accounts' && method === 'GET')
            return json({ accounts: redact(core.listAccounts ? await core.listAccounts() : await core.accounts?.list?.() ?? []) });
        const account: any = /^\/api\/management\/accounts\/([^/]+)\/(pause|resume|policy)$/.exec(path);
        if (account) {
            const name: string = decodeURIComponent((account as any)[1]), action: string = (account as any)[2];
            let result: any;
            if (action === 'policy' && method === 'GET') {
                (result as any) = core.accounts?.getPolicy ? await (core.accounts.getPolicy as any)(name) : core.accounts?.records?.has(name) ? { account: name, policy: structuredClone((core.accounts.records.get as any)(name).policy) } : undefined;
            }
            else if (method === 'POST')
                (result as any) = core.accountAction ? await (core.accountAction as any)(name, action, body) : await core.accounts?.[action === 'policy' ? 'setPolicy' : action]?.(name, body);
            if (result === undefined)
                throw new (ProtocolError as any)('Account operation is not supported by this core', 501);
            return json(redact(action === 'policy' ? (result as any).policy ?? result : result));
        }
        if (path === '/api/management/routing' && method === 'PATCH') {
            const result: any = core.updateRouting ? await (core.updateRouting as any)(body) : undefined;
            if (result === undefined)
                throw new (ProtocolError as any)('Routing mutation is not supported by this core', 501);
            return json(redact(result));
        }
        if (path === '/api/management/routing/cooldown/reset' && method === 'POST') {
            if (body.model && !body.account || body.account != null && (typeof body.account !== 'string' || !body.account.trim()) || body.model != null && (typeof body.model !== 'string' || !body.model.trim()))
                throw new (ProtocolError as any)('A model reset requires a nonempty account and model');
            const result: any = body.account ? await core.resetCooldown?.(body.account, body.model) : await core.resetCooldowns?.();
            if (result === undefined)
                throw new (ProtocolError as any)('Cooldown reset is not supported by this core', 501);
            return json(result);
        }
        if (path === '/api/management/usage' && method === 'GET')
            return json({ ...counters });
        throw new (ProtocolError as any)('Route not found', 404);
    }
    async function inference(request?: any, source?: any, body?: any): Promise<any> {
        if (typeof body.model !== 'string' || !body.model.trim())
            throw new (ProtocolError as any)('model must be a nonempty string');
        if (['chat', 'anthropic'].includes(source) && !(Array as any).isArray(body.messages))
            throw new (ProtocolError as any)('messages must be an array');
        if (source === 'gemini' && !(Array as any).isArray(body.contents))
            throw new (ProtocolError as any)('contents must be an array');
        if (source === 'responses' && typeof body.input !== 'string' && !(Array as any).isArray(body.input))
            throw new (ProtocolError as any)('input must be a string or array');
        if (body.stream !== undefined && typeof body.stream !== 'boolean')
            throw new (ProtocolError as any)('stream must be a boolean');
        if (source === 'responses') {
            if (body.background || body.conversation || body.previous_response_id)
                throw new (ProtocolError as any)('Background, conversation and previous-response execution are not implemented by the native lifecycle store', 501);
            if (body.store !== undefined && typeof body.store !== 'boolean')
                throw new (ProtocolError as any)('store must be a boolean');
        }
        for (const key of ['max_tokens', 'max_completion_tokens', 'max_output_tokens'] as any)
            if ((body as any)[key] !== undefined && (!(Number as any).isSafeInteger((body as any)[key]) || (body as any)[key] < 1))
                throw new (ProtocolError as any)(`${key} must be a positive integer`);
        const claims: any = await authorize(request, false, body.model);
        const retain: boolean = source === 'responses' && body.store !== false;
        const namespace: string = new (URL as any)(request.url).pathname.match(/^\/api\/services\/(?:openai|codex|qwen)\/v1/)?.[0] ?? '/v1';
        const owner: any = retain ? responseOwner(claims, bearer(request.headers)) : undefined;
        const responseInput: any = retain ? normalizeResponseInput(body) : undefined;
        let retainedId: any;
        const context: any = { ...routingContext(request, claims), model: body.model, protocol: source, sessionKey: (request.headers.get as any)('x-router-session') ?? undefined, exclude: [] };
        const candidates: any = core.candidates ? await (core.candidates as any)(context) : [await (core.route as any)(context)];
        if (!candidates?.length)
            throw new (ProtocolError as any)('No eligible upstream account for this model', 503);
        const reserve: number = estimateRequestBudget(body).total;
        const tokenId: any = claims.sub ?? claims.id;
        if (tokenId && core.tokens?.admit) {
            const denial: any = await (core.tokens.admit as any)(tokenId, reserve);
            if (typeof denial === 'string' && denial !== 'admitted' || denial === false) {
                const error: any = new (ProtocolError as any)(typeof denial === 'string' ? denial : 'Token budget exceeded', 429);
                error.code = typeof denial === 'string' ? denial : 'token_limit_exceeded';
                throw error;
            }
        }
        let settled: any = false;
        const settle: any = async (usage?: any): Promise<void> => {
            if (settled)
                return;
            if (tokenId && core.tokens?.settle)
                await (core.tokens.settle as any)(tokenId, reserve, usage?.total ?? 0);
            (settled as any) = true;
            if (usage) {
                counters.input_tokens += usage.input;
                counters.output_tokens += usage.output;
            }
        };
        let finalError: any, finalResponse: any;
        try {
            const retryOverride: any = core.accounts?.records?.get((candidates as any)[0].account)?.policy?.request_retry;
            const principalBound: any = context.principalAccount && !['openai-compatible', 'openai', 'litellm', 'lefine', 'z.ai-coding-plan'].includes((candidates as any)[0].kind ?? (candidates as any)[0].provider_kind);
            const attemptLimit: any = context.pinnedAccount || principalBound || retryOverride === 0 || configuration().account_failover === false && !(retryOverride > 0) ? 1 : retryOverride != null ? retryOverride + 1 : (Math as any).max(1, (Math as any).min(100, maxAttempts));
            for (const rawCandidate of (candidates.slice as any)(0, attemptLimit) as any) {
                let candidate: any = rawCandidate;
                try {
                    (candidate as any) = core.prepareCandidate ? await (core.prepareCandidate as any)(rawCandidate) : rawCandidate;
                }
                catch (error: any) {
                    (finalError as any) = new (ProtocolError as any)('Upstream credential is unavailable', error.status ?? 502);
                    await core.reportFailure?.(rawCandidate, { status: finalError.status, scope: 'account' });
                    continue;
                }
                let protocol: any, payload: any;
                try {
                    (protocol as any) = protocolOf(candidate);
                    (payload as any) = translateRequest(body, source, protocol, (candidate as any).model ?? body.model);
                }
                catch (error: any) {
                    if (!(error instanceof ProtocolError))
                        throw error;
                    (finalError as any) = error;
                    continue;
                }
                const controller: any = new (AbortController as any)(), abort: any = (): void => controller.abort(request.signal.reason);
                core.accounts?.recordUse?.(candidate, context);
                requestLog?.select((candidate as any).account);
                (request.signal.addEventListener as any)('abort', abort, { once: true });
                const timer: any = setTimeout((): void => controller.abort(new (Error as any)('Upstream timeout')), timeoutMs);
                timer.unref?.();
                let response: any;
                try {
                    counters.upstream_attempts++;
                    let endpoint: any;
                    if (protocol === 'gemini') {
                        const base: any = (candidate as any).baseUrl ?? (candidate as any).base_url ?? (candidate as any).provider?.base_url;
                        const { model: _model, stream: _stream, ...native }: any = payload;
                        if ((candidate as any).auth_type === 'oauth' || (candidate as any).code_assist) {
                            (endpoint as any) = upstreamURL(base, protocol, `/v1internal:${body.stream ? 'streamGenerateContent' : 'generateContent'}`);
                            if (body.stream)
                                endpoint.search = '?alt=sse';
                            (payload as any) = { model: (((candidate as any).model ?? body.model).replace as any)(/^models\//, ''), request: native, ...((candidate as any).project ? { project: (candidate as any).project } : {}) };
                        }
                        else {
                            (endpoint as any) = new (URL as any)(base);
                            endpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}${endpoint.pathname.endsWith('/v1beta') ? '' : '/v1beta'}/models/${encodeURIComponent((((candidate as any).model ?? body.model).replace as any)(/^models\//, ''))}:${body.stream ? 'streamGenerateContent' : 'generateContent'}`;
                            if (body.stream)
                                endpoint.search = '?alt=sse';
                            (payload as any) = native;
                        }
                    }
                    else
                        (endpoint as any) = upstreamURL((candidate as any).baseUrl ?? (candidate as any).base_url ?? (candidate as any).provider?.base_url, protocol, (candidate as any).endpointPath);
                    (response as any) = await (upstreamFetch as any)(endpoint, { method: 'POST', headers: upstreamHeaders(candidate, protocol, request), body: (JSON as any).stringify(payload), signal: controller.signal, redirect: 'error' });
                }
                catch (error: any) {
                    clearTimeout(timer);
                    (request.signal.removeEventListener as any)('abort', abort);
                    if (request.signal.aborted)
                        throw new (ProtocolError as any)('Client disconnected', 499);
                    await core.reportFailure?.(candidate, { scope: 'account', message: 'Upstream connection failed', reason: 'transport' });
                    (finalError as any) = new (ProtocolError as any)('Upstream connection failed', 502);
                    continue;
                }
                const cleanup: any = (): void => { clearTimeout(timer); (request.signal.removeEventListener as any)('abort', abort); };
                if (!(response as any).ok) {
                    const status: any = (response as any).status, retryAfter: any = ((response as any).headers.get as any)('retry-after');
                    let bytes: any;
                    try {
                        (bytes as any) = await boundedBytes(response, maxResponseBytes);
                    }
                    catch (error: any) {
                        throw new (ProtocolError as any)('Upstream error response exceeds limit or could not be read', 502);
                    }
                    finally {
                        cleanup();
                    }
                    const prefix: any = bytes.subarray(0, 16384), message: string = (Buffer as any).from(prefix).toString('utf8');
                    const disposition: any = await core.reportFailure?.(candidate, { status, retryAfter, scope: retryableStatus(status) ? 'account' : 'request', message, body: prefix, headers: (response as any).headers });
                    (finalError as any) = new (ProtocolError as any)(`Upstream returned HTTP ${status}`, status);
                    finalError.code = 'upstream_error';
                    const errorHeaders: any = relayHeaders(response);
                    if (((response as any).headers.has as any)('content-type'))
                        (errorHeaders as any)['content-type'] = ((response as any).headers.get as any)('content-type');
                    if (source === protocol)
                        (finalResponse as any) = new (Response as any)(bytes, { status, headers: errorHeaders });
                    else {
                        let value: any;
                        try {
                            (value as any) = (JSON as any).parse(message);
                        }
                        catch { }
                        finalError.message = (value as any)?.error?.message ?? (value as any)?.message ?? message ?? finalError.message;
                        (finalResponse as any) = errorResponse(finalError, source);
                        for (const [name, value] of (Object as any).entries(errorHeaders) as any)
                            if (name !== 'content-type')
                                finalResponse.headers.set(name, value);
                    }
                    if (!['relay', 'cooldown'].includes(disposition) && (retryableStatus(status) || disposition === 'retry-next'))
                        continue;
                    await settle();
                    return finalResponse;
                }
                const headers: any = relayHeaders(response);
                if (body.stream) {
                    if (!((response as any).headers.get as any)('content-type')?.includes('text/event-stream') || !(response as any).body) {
                        cleanup();
                        await (response as any).body?.cancel();
                        throw new (ProtocolError as any)('Upstream did not return an SSE stream', 502);
                    }
                    let resourceCancelled: any = false;
                    const usageTracker: any = new (UsageTracker as any)({ maxBytes: maxResponseBytes });
                    const measuredBody: any = ((response as any).body.pipeThrough as any)(new (TransformStream as any)({ transform(chunk?: any, controller?: any): void { usageTracker.feed(chunk); controller.enqueue(chunk); } }));
                    const measuredUsage: any = (usage?: any): any => ({ ...(usage ?? normalizeUsage()), total: (Math as any).max(usage?.total ?? 0, usageTracker.finish().tokens) });
                    const callbacks: any = {
                        clock, model: body.model,
                        onStart: async (response?: any): Promise<void> => { if (retain) {
                            (responseStore.save as any)(namespace, owner, response, responseInput, { abort: (): void => { (resourceCancelled as any) = true; controller.abort(new (Error as any)('Response cancelled')); } });
                            (retainedId as any) = response.id;
                        } },
                        onComplete: async (state?: any): Promise<void> => {
                            cleanup();
                            await settle(measuredUsage(state.usage));
                            if (retain) {
                                if (!state.response || !['completed', 'incomplete'].includes(state.response.status))
                                    throw new (ProtocolError as any)('Upstream stream did not supply a completed response resource', 502);
                                (responseStore.save as any)(namespace, owner, state.response, responseInput, { update: true });
                            }
                            await core.reportSuccess?.(candidate);
                        },
                        onError: async (_error?: any, state?: any): Promise<void> => { cleanup(); if (retain && retainedId)
                            (responseStore.fail as any)(namespace, owner, retainedId); if (!resourceCancelled && !request.signal.aborted)
                            await core.reportFailure?.(candidate, { status: 502 }); await settle(measuredUsage(state?.usage)); },
                        onCancel: async (): Promise<void> => { cleanup(); controller.abort(); if (retain && retainedId)
                            (responseStore.fail as any)(namespace, owner, retainedId); await settle(measuredUsage()); },
                    };
                    const stream: any = source === protocol ? monitorNativeStream(measuredBody, protocol, callbacks) : translateStream(measuredBody, protocol, source, body.model, callbacks);
                    return new (Response as any)(stream, { status: 200, headers: { ...headers, 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'x-accel-buffering': 'no' } });
                }
                let raw: any;
                try {
                    (raw as any) = await boundedJSON(response, maxResponseBytes);
                }
                catch (error: any) {
                    throw new (ProtocolError as any)(error.status === 413 ? 'Upstream response exceeds limit' : 'Upstream returned malformed JSON', 502);
                }
                finally {
                    cleanup();
                }
                const result: any = translateResponse(raw, protocol, source, body.model, clock());
                const usage: any = normalizeUsage(protocol === 'gemini' ? ((raw as any).response ?? raw).usageMetadata : (raw as any).usage, protocol);
                await core.reportSuccess?.(candidate);
                await settle(usage);
                if (retain)
                    (responseStore.save as any)(namespace, owner, result, responseInput);
                return json(result, (response as any).status, headers);
            }
            if (finalResponse) {
                await settle();
                return finalResponse;
            }
            throw finalError ?? new (ProtocolError as any)('All upstream accounts are unavailable', 503);
        }
        catch (error: any) {
            await settle();
            throw error;
        }
    }
    async function handle(request?: any): Promise<any> {
        const incomingMethod: any = (request as any).method;
        const head: boolean = (request as any).method === 'HEAD';
        if (head) {
            const original: any = request;
            (request as any) = new (Request as any)(original, { method: 'GET' });
            if (peers.has(original))
                peers.set(request, peers.get(original));
        }
        const path: string = new (URL as any)((request as any).url).pathname, service: any = serviceOf(path), source: string = service === 'gemini' || service === 'vertex' && !path.includes('/publishers/anthropic/') ? 'gemini' : service === 'anthropic' || service === 'bedrock' || path.includes('/publishers/anthropic/') || path.endsWith('/messages') ? 'anthropic' : path.endsWith('/responses') ? 'responses' : 'chat';
        const adapter: boolean = path.startsWith('/api/v3/') || path === '/api/graphql' || path.startsWith('/git/');
        const started: any = clock();
        counters.requests++;
        let response: any;
        try {
            const managementPath: boolean = path === '/api/management' || path.startsWith('/api/management/');
            if (listenerKind === 'admin' && !managementPath)
                (response as any) = await serveAdminAsset(request, { directory: options.adminAssetDirectory });
            else {
                const privateService: boolean = path.startsWith('/api/services/activitypub/') || path.startsWith('/api/services/github/');
                if (listenerKind === 'admin' && !managementPath || listenerKind === 'inference-only' && (managementPath || privateService || adapter) || listenerKind === 'github-adapter' && !adapter || listenerKind === 'combined' && adapter)
                    throw new (ProtocolError as any)('Route not found', 404);
                if (configuration().enable_openai_api === false && ['openai', 'codex', 'qwen', 'gemini'].includes(service) || configuration().enable_anthropic_api === false && (service === 'anthropic' || service === 'bedrock' || path.includes('/publishers/anthropic/')))
                    throw new (ProtocolError as any)('Route not found', 404);
                if (managementPath) {
                    const peer: any = socketPeer(peers.get(request) ?? options.peer);
                    if (!peer || !isIP(peer))
                        throw new (ProtocolError as any)('management requires socket peer metadata', 403);
                    const config: any = core.managementAccess?.config?.() ?? { allow_remote: configuration().management?.allow_remote };
                    if (listenerKind !== 'admin' && !config.allow_remote && peer !== '::1' && !peer.startsWith('127.'))
                        throw new (ProtocolError as any)('remote management requires MANAGEMENT_ALLOW_REMOTE / --management-allow-remote or the admin listener', 403);
                    const remaining: any = core.managementAccess?.check(peer);
                    if (remaining) {
                        const error: any = new (ProtocolError as any)('management authentication temporarily locked for this client IP', 429);
                        error.retryAfter = remaining;
                        throw error;
                    }
                    if (!matchHTTPRoute((request as any).method, path) && HTTP_ROUTES.some((route?: any): any => matchHTTPRoute(route.method, path)))
                        throw new (ProtocolError as any)('Method not allowed', 405);
                }
                if (['/health', '/api/health'].includes(path) && (request as any).method === 'GET') {
                    (response as any) = new (Response as any)('ok', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
                    const until: any = core.emergency?.activeUntil();
                    if (until)
                        response.headers.set('x-link-assistant-emergency-auth', `active; expires_at=${until}`);
                }
                else if (path === '/api/run-lease' && (request as any).method === 'POST') {
                    const claims: any = await authorize(request, false);
                    if (!core.tokens?.renewRunLease)
                        throw new (ProtocolError as any)('This credential has no renewable live run lease', 409);
                    (response as any) = json({ run_lease_expires_at: await (core.tokens.renewRunLease as any)(claims.sub ?? claims.id) });
                }
                else if (path.startsWith('/api/management/'))
                    (response as any) = await management(request, path);
                else if (path.startsWith('/api/services/activitypub/')) {
                    (response as any) = await activityResponse(request, configuration(), (value?: any): any => boundedJSON(value, maxBodyBytes, false));
                    if (!response)
                        throw new (ProtocolError as any)('Route not found', 404);
                }
                else if (path.startsWith('/api/services/github/') || adapter) {
                    (githubConfig as any) ??= githubConfiguration(configuration(), options.env ?? core.env ?? {});
                    const config: any = await githubConfig;
                    if (!config.token)
                        throw new (ProtocolError as any)('Route not found', 404);
                    const claims: any = await authorize(request, false), relay: any = path.startsWith('/git/') || path.startsWith('/api/services/github/git/') ? relayGit : relayGithub;
                    (response as any) = await relay(request, { config, claims, fetch: upstreamFetch, maxBodyBytes, maxResponseBytes, timeoutMs });
                }
                else if (path.startsWith('/api/services/gemini/v1beta/models') && (request as any).method === 'GET') {
                    const claims: any = await authorize(request, false), entries: any = await models(request, claims);
                    const project: any = (model?: any): any => (Object as any).fromEntries((Object as any).entries({ name: model.id, ...(model.raw ?? model) }).filter(([key]: any): boolean => ['name', 'baseModelId', 'version', 'displayName', 'description', 'inputTokenLimit', 'outputTokenLimit', 'supportedGenerationMethods', 'temperature', 'maxTemperature', 'topP', 'topK'].includes(key)));
                    if (path === '/api/services/gemini/v1beta/models')
                        (response as any) = json({ models: (entries.map as any)(project) });
                    else {
                        const id: string = decodeURIComponent(path.slice('/api/services/gemini/v1beta/models/'.length));
                        const found: any = (entries.find as any)((m?: any): boolean => (m.id.replace as any)(/^models\//, '') === id);
                        if (!found)
                            throw new (ProtocolError as any)('Model not found', 404);
                        (response as any) = json(project(found));
                    }
                }
                else if ((service === 'gemini' || service === 'vertex' && !path.includes('/publishers/anthropic/')) && (request as any).method === 'POST') {
                    const match: any = /\/models\/([^/]+):(generateContent|streamGenerateContent)$/.exec(path);
                    if (!match)
                        throw new (ProtocolError as any)('Route not found', 404);
                    (response as any) = await inference(request, 'gemini', { ...await boundedJSON(request, maxBodyBytes), model: decodeURIComponent((match as any)[1]), stream: (match as any)[2] === 'streamGenerateContent' });
                }
                else if (service === 'bedrock' || service === 'vertex' && path.includes('/publishers/anthropic/')) {
                    if (service === 'vertex' && !/\/publishers\/anthropic\/models\/[^/:]+(?:(?::(?:rawPredict|streamRawPredict))|(?:\/count-tokens:rawPredict))$/.test(path))
                        throw new (ProtocolError as any)('Route not found', 404);
                    (response as any) = await nativeService.fetch(request);
                }
                else if (/^(?:\/v1|\/api\/services\/(?:openai|codex|qwen)\/v1)\/responses\/(?!compact$|input_tokens$)[^/]+(?:\/(?:cancel|input_items))?$/.test(path)) {
                    const match: any = /^(\/v1|\/api\/services\/(?:openai|codex|qwen)\/v1)\/responses\/([^/]+)(?:\/(cancel|input_items))?$/.exec(path);
                    const claims: any = await authorize(request, false), owner: string = responseOwner(claims, bearer((request as any).headers)), id: string = decodeURIComponent((match as any)[2]);
                    let existing: any;
                    try {
                        (existing as any) = (responseStore.get as any)((match as any)[1], owner, id);
                    }
                    catch (error: any) {
                        if (error.status !== 404 || !core.nativeCandidates)
                            throw error;
                        (response as any) = await nativeService.fetch(request);
                    }
                    if (existing) {
                        await authorize(request, false, (existing as any).model);
                        if (!(match as any)[3] && (request as any).method === 'GET')
                            (response as any) = json(existing);
                        else if (!(match as any)[3] && (request as any).method === 'DELETE')
                            (response as any) = json((responseStore.delete as any)((match as any)[1], owner, id));
                        else if ((match as any)[3] === 'cancel' && (request as any).method === 'POST')
                            (response as any) = json((responseStore.cancel as any)((match as any)[1], owner, id));
                        else if ((match as any)[3] === 'input_items' && (request as any).method === 'GET')
                            (response as any) = json((responseStore.inputItems as any)((match as any)[1], owner, id, new (URL as any)((request as any).url).searchParams));
                        else
                            throw new (ProtocolError as any)('Route not found', 404);
                    }
                }
                else if (['/v1/models', '/api/models', ...['openai', 'anthropic', 'codex', 'qwen'].map((service?: any): string => `/api/services/${service}/v1/models`)].includes(path) && (request as any).method === 'GET') {
                    const claims: any = await authorize(request, false);
                    (response as any) = json(projectModels(await models(request, claims), source, new (URL as any)((request as any).url).searchParams));
                }
                else if (/^(?:\/v1|\/api\/services\/(?:openai|anthropic|codex|qwen)\/v1)\/models\/[^/]+$/.test(path) && (request as any).method === 'GET') {
                    const id: string = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1)), claims: any = await authorize(request, false);
                    if (!id || id.length > 512 || /[\/\x00-\x1f\x7f]/.test(id))
                        throw new (ProtocolError as any)('Model not found', 404);
                    const model: any = ((await models(request, claims)).find as any)((m?: any): boolean => m.id === id);
                    if (!model)
                        throw new (ProtocolError as any)('Model not found', 404);
                    const projected: any = (projectModels([model], source).data as any)[0];
                    if (source === 'anthropic')
                        projected.display_name ??= id;
                    (response as any) = json(projected);
                }
                else if (['/v1/chat/completions', '/v1/messages', '/v1/responses', ...['openai', 'codex', 'qwen'].flatMap((service?: any): Array<string> => [`/api/services/${service}/v1/responses`, `/api/services/${service}/v1/chat/completions`]), '/api/services/anthropic/v1/messages'].includes(path) && (request as any).method === 'POST') {
                    const body: any = await boundedJSON((request as any).clone(), maxBodyBytes);
                    (response as any) = core.nativeCandidates && source === 'responses' && /^\/api\/services\/(?:openai|codex)\/v1\/responses$/.test(path) ? await nativeService.fetch(request) : await inference(request, source, body);
                }
                else if (/^\/api\/services\/(?:openai|anthropic|codex|qwen)(?:\/|$)/.test(path))
                    (response as any) = await nativeService.fetch(request);
                else
                    throw new (ProtocolError as any)('Route not found', 404);
            }
        }
        catch (error: any) {
            counters.failures++;
            if ((error as any).managementAuthenticationFailure || path === '/api/management/admin/bootstrap/confirm' && (error as any).status === 401) {
                const peer: any = socketPeer(peers.get(request) ?? options.peer);
                await core.managementAccess?.failure(peer);
                const retryAfter: any = core.managementAccess?.check(peer);
                if (retryAfter) {
                    (error as any) = new (ProtocolError as any)('management authentication temporarily locked for this client IP', 429);
                    (error as any).retryAfter = retryAfter;
                }
            }
            (response as any) = path.startsWith('/api/services/github/') || adapter ? json({ message: (error as any).message }, (error as any).status ?? 500) : errorResponse(error, source);
            if ((error as any).retryAfter)
                response.headers.set('retry-after', String((error as any).retryAfter));
        }
        if (path === '/api/management/admin/bootstrap/confirm' && response.ok)
            core.managementAccess?.success(socketPeer(peers.get(request) ?? options.peer));
        if (listenerKind === 'admin')
            hardenAdmin(response);
        if (head) {
            await response.body?.cancel().catch((): void => { });
            (response as any) = new (Response as any)(null, { status: response.status, headers: response.headers });
        }
        logs.push({ time: started, method: incomingMethod, path, status: response.status, duration_ms: clock() - started });
        if (logs.length > 1000)
            logs.shift();
        return response;
    }
    const router: any = {
        core, responseStore, requestLog, fetch: dispatch, get address(): any { return (server as any)?.address(); },
        async listen({ host = configuration().host ?? '127.0.0.1', port = configuration().port ?? 3000 }: any = {}): Promise<any> {
            if (server)
                throw new (Error as any)('Router is already listening');
            core.emergency?.checkListeners([host]);
            let secureOptions: any;
            if (useTLS) {
                const certPath: any = tlsConfig.tls_cert ?? tlsConfig.tlsCert, keyPath: any = tlsConfig.tls_key ?? tlsConfig.tlsKey;
                let certificate: any = certPath, key: any = keyPath;
                if (tlsConfig.tls_self_signed || tlsConfig.tlsSelfSigned) {
                    if (certPath || keyPath)
                        throw new (ProtocolError as any)('Self-signed TLS and explicit certificate paths cannot both be configured', 500);
                    if (!tlsConfig.data_dir)
                        throw new (ProtocolError as any)('Self-signed TLS requires a data directory', 500);
                    await (await import("./resources.js")).executeResourceOperation({ name: 'tls.generate', options: { dns: tlsConfig.tls_dns_names ?? host }, config: tlsConfig });
                    (certificate as any) = join(tlsConfig.data_dir, 'tls', 'cert.pem');
                    (key as any) = join(tlsConfig.data_dir, 'tls', 'key.pem');
                }
                if (!certificate || !key)
                    throw new (ProtocolError as any)('TLS requires both certificate and key paths', 500);
                const pem: any = async (path?: any): Promise<any> => { const stat: any = await lstat(path); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024)
                    throw new (ProtocolError as any)('TLS PEM must be a regular file of at most 1 MiB', 500); return readFile(path); };
                (secureOptions as any) = { cert: await pem(certificate), key: await pem(key) };
            }
            const serve: any = async (incoming?: any, outgoing?: any): Promise<void> => {
                const controller: any = new (AbortController as any)();
                (incoming.on as any)('aborted', (): void => controller.abort());
                (outgoing.on as any)('close', (): void => { if (!outgoing.writableEnded)
                    controller.abort(); });
                try {
                    const headers: any = new (Headers as any)();
                    for (const [key, value] of (Object as any).entries(incoming.headers) as any)
                        if (value !== undefined)
                            headers.set(key, (Array as any).isArray(value) ? value.join(', ') : value);
                    const request: any = new (Request as any)(`${useTLS ? 'https' : 'http'}://${(host.includes as any)(':') ? `[${host}]` : host}:${(server as any).address().port}${incoming.url}`, { method: incoming.method, headers, signal: controller.signal, ...(['GET', 'HEAD'].includes(incoming.method) ? {} : { body: Readable.toWeb(incoming), duplex: 'half' }) });
                    peers.set(request, incoming.socket.remoteAddress);
                    const result: any = await dispatch(request);
                    (outgoing.writeHead as any)(result.status, (Object as any).fromEntries(result.headers));
                    if (!result.body)
                        outgoing.end();
                    else
                        Readable.fromWeb(result.body).on('error', (): any => outgoing.destroy()).pipe(outgoing);
                }
                catch {
                    if (!outgoing.headersSent)
                        (outgoing.writeHead as any)(500, JSON_HEADERS);
                    (outgoing.end as any)((JSON as any).stringify({ error: { message: 'Router request failed' } }));
                }
            };
            (server as any) = useTLS ? createHTTPSServer(secureOptions, serve) : createServer(serve);
            server.on('upgrade', (incoming?: any, socket?: any, head?: any): void => {
                if (!['combined', 'inference-only'].includes(listenerKind)) {
                    socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
                    return;
                }
                const headers: any = new (Headers as any)();
                for (const [name, value] of (Object as any).entries(incoming.headers) as any)
                    if (value !== undefined)
                        headers.set(name, (Array as any).isArray(value) ? value.join(', ') : value);
                const request: any = new (Request as any)(`${useTLS ? 'https' : 'http'}://${(host.includes as any)(':') ? `[${host}]` : host}:${(server as any).address().port}${incoming.url}`, { headers });
                relayWebSocket(incoming, socket, head, { target: (): any => nativeService.websocketTarget(request), authorize: (model?: any): any => authorize(request, false, model), core, maxMessageBytes: maxBodyBytes, timeoutMs: (Math as any).min(timeoutMs, 15000) }).catch((): any => socket.destroy());
            });
            try {
                await new (Promise as any)((resolve?: any, reject?: any): void => { ((server as any).once as any)('error', reject); ((server as any).listen as any)(port, host, (): void => { ((server as any).off as any)('error', reject); resolve(); }); });
            }
            catch (error: any) {
                (server as any) = undefined;
                throw error;
            }
            return router;
        },
        async close(): Promise<void> { responseStore.close?.(); if (!server)
            return; const current: any = server; (server as any) = undefined; if (!current.listening)
            return; await new (Promise as any)((resolve?: any, reject?: any): void => { (current.close as any)((error?: any): void => error ? reject(error) : resolve()); current.closeIdleConnections?.(); }); },
    };
    async function dispatch(request?: any): Promise<any> { const run: any = (): any => requestLog ? (requestLog.exchange as any)(request, (logged?: any): any => { if (peers.has(request))
        peers.set(logged, peers.get(request)); return handle(logged); }, { core }) : handle(request); return core.withAuthenticationScope ? (core.withAuthenticationScope as any)(run) : run(); }
    return router;
}
export async function startNativeServer(options: any = {}): Promise<any> {
    const core: any = options.core ?? await (await import("./core.js")).createRouterCore(options);
    const router: any = createNativeRouter({ ...options, core });
    return router.listen({ host: options.host, port: options.port });
}
