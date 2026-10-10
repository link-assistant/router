// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=7860dfc6729bbfea06fad10b858113e28a443d0089a4fcbfa239f87a7bb27494; dynamic any annotations are explicit draft gaps.
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { timingSafeEqual } from 'node:crypto';
import { ProtocolError, translateRequest, translateResponse, normalizeUsage, projectModels } from "./protocols.js";
import { translateStream, monitorNativeStream } from "./streams.js";
import { ResponsesStore, responseOwner, normalizeResponseInput } from "./responses.js";
const JSON_HEADERS: any = { 'content-type': 'application/json; charset=utf-8' };
const json: any = (body?: any, status: any = 200, headers: any = {}): any => new (Response as any)(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
const redactedKeys: any = /(?:api[_-]?key|token|password|secret|authorization|credential|cookie)/i;
export function redact(value?: any): any {
    if (Array.isArray(value))
        return value.map(redact);
    if (!value || typeof value !== 'object')
        return value;
    return Object.fromEntries(Object.entries(value).map(([key, v]: any): any => [key, redactedKeys.test(key) ? '[REDACTED]' : redact(v)]));
}
const equal: any = (a?: any, b?: any): any => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const bearer: any = (headers?: any): any => { const a: any = headers.get('authorization'); return a?.match(/^Bearer\s+(.+)$/i)?.[1] ?? headers.get('x-api-key'); };
const protocolOf: any = (candidate?: any): any => {
    const value: any = candidate.protocol ?? candidate.provider?.protocol ?? candidate.provider?.type ?? candidate.provider;
    if (['anthropic', 'messages'].includes(value))
        return 'anthropic';
    if (['responses', 'openai-responses', 'codex'].includes(value))
        return 'responses';
    if (['chat', 'openai', 'openai-compatible', 'openai_compatible'].includes(value))
        return 'chat';
    throw new (ProtocolError as any)(`Unsupported upstream protocol ${typeof value === 'string' ? value : 'unknown'}`, 501);
};
const paths: any = { chat: 'chat/completions', anthropic: 'messages', responses: 'responses' };
const serviceOf: any = (path?: any): any => /^\/api\/services\/(openai|anthropic)\/v1(?:\/|$)/.exec(path)?.[1];
function upstreamURL(base?: any, protocol?: any, endpointPath?: any): any {
    let u: any;
    try {
        u = new (URL as any)(base);
    }
    catch {
        throw new (ProtocolError as any)('Provider base URL is invalid', 500);
    }
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash)
        throw new (ProtocolError as any)('Provider base URL must be an HTTP(S) URL without credentials, query or fragment', 500);
    if (endpointPath !== undefined) {
        if (typeof endpointPath !== 'string' || !/^\/[a-zA-Z0-9/_-]+$/.test(endpointPath) || endpointPath.startsWith('//'))
            throw new (ProtocolError as any)('Provider endpoint path is invalid', 500);
        u.pathname = `${u.pathname.replace(/\/$/, '')}${endpointPath}`;
    }
    else
        u.pathname = `${u.pathname.replace(/\/$/, '')}${/\/v1$/.test(u.pathname.replace(/\/$/, '')) ? '/' : '/v1/'}${(paths as any)[protocol]}`;
    return u;
}
function upstreamHeaders(candidate?: any, protocol?: any, request?: any): any {
    const headers: any = new (Headers as any)({ 'content-type': 'application/json', accept: 'application/json, text/event-stream' });
    const forbidden: any = /^(?:authorization|x-api-key|cookie|set-cookie|host|connection|content-length|transfer-encoding|proxy-.*|forwarded|x-forwarded-.*)$/i;
    for (const [key, value] of Object.entries(candidate.headers ?? candidate.account?.headers ?? {}) as any) {
        if (forbidden.test(key))
            continue;
        if (typeof value !== 'string' || value.startsWith('$'))
            continue;
        headers.set(key, value);
    }
    const key: any = candidate.apiKey ?? candidate.api_key ?? candidate.account?.api_key;
    if (key)
        headers.set(protocol === 'anthropic' && candidate.auth_type !== 'oauth' ? 'x-api-key' : 'authorization', protocol === 'anthropic' && candidate.auth_type !== 'oauth' ? key : `Bearer ${key}`);
    if (protocol === 'anthropic')
        headers.set('anthropic-version', '2023-06-01');
    if (candidate.auth_type === 'oauth') {
        for (const [key, value] of Object.entries(candidate.oauth_headers ?? {}) as any)
            if (['anthropic-beta', 'anthropic-version', 'chatgpt-account-id', 'originator'].includes(key.toLowerCase()) && typeof value === 'string')
                headers.set(key, value);
    }
    const requestId: any = request.headers.get('x-request-id');
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
async function boundedJSON(request?: any, maxBytes?: any): Promise<any> {
    if (!request.body)
        throw new (ProtocolError as any)('Request body is required');
    const length: any = Number(request.headers.get('content-length'));
    if (Number.isFinite(length) && length > maxBytes)
        throw new (ProtocolError as any)('Request body exceeds limit', 413);
    const reader: any = request.body.getReader();
    const parts: any = [];
    let total: any = 0;
    try {
        while (true) {
            const { value, done }: any = await reader.read();
            if (done)
                break;
            total += value.byteLength;
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
        value = JSON.parse(Buffer.concat(parts).toString('utf8') as any);
    }
    catch {
        throw new (ProtocolError as any)('Request body must contain valid JSON');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new (ProtocolError as any)('Request body must be a JSON object');
    return value;
}
const retryStatuses: any = new (Set as any)([401, 403, 408, 429, 500, 502, 503, 504, 529]);
export function createNativeRouter(options: any = {}): any {
    const { core, authenticate, fetch: upstreamFetch = globalThis.fetch, clock = Date.now, maxBodyBytes = 4 * 1024 * 1024, maxResponseBytes = 32 * 1024 * 1024, timeoutMs = 120000, maxAttempts = 3 }: any = options;
    if (!core)
        throw new (TypeError as any)('createNativeRouter requires core; use startNativeServer to create one from configuration');
    const tlsConfig: any = { ...core.config, ...options };
    if (tlsConfig.tls_self_signed || tlsConfig.tls_cert || tlsConfig.tls_key || tlsConfig.tlsSelfSigned || tlsConfig.tlsCert || tlsConfig.tlsKey || tlsConfig.https || tlsConfig.tls || (Array.isArray(tlsConfig.listeners) ? tlsConfig.listeners : Object.values(tlsConfig.listeners ?? {})).some((listener?: any): any => listener?.tls || listener?.https || listener?.protocol === 'https' || typeof listener === 'string' && listener.startsWith('https:')))
        throw new (ProtocolError as any)('Native HTTPS listeners are not implemented; configure an HTTP listener behind TLS termination', 501);
    const responseStore: any = options.responseStore ?? new (ResponsesStore as any)({ clock, ...options.responseStoreOptions });
    const logs: any = [];
    const counters: any = { requests: 0, failures: 0, upstream_attempts: 0, input_tokens: 0, output_tokens: 0 };
    let server: any;
    const configuration: any = (): any => core.config ?? options.config ?? {};
    const errorResponse: any = (error?: any, protocol?: any): any => {
        const status: any = error.status ?? 500;
        const message: any = status >= 500 && !(error instanceof ProtocolError) ? 'Router request failed' : error.message;
        return json(protocol === 'anthropic' ? { type: 'error', error: { type: status === 401 ? 'authentication_error' : status === 429 ? 'rate_limit_error' : 'api_error', message } } : { error: { message, type: status === 401 ? 'authentication_error' : status === 400 ? 'invalid_request_error' : 'api_error', code: error.code ?? null } }, status);
    };
    async function authorize(request?: any, admin?: any, model?: any): Promise<any> {
        if (authenticate) {
            const claims: any = await authenticate(request, { admin, model });
            if (!claims)
                throw new (ProtocolError as any)('Invalid or missing Router credential', 401);
            if (admin && claims.admin !== true && claims.is_admin !== true)
                throw new (ProtocolError as any)('Administrator credential required', 403);
            return claims;
        }
        const token: any = bearer(request.headers), config: any = configuration();
        const adminKey: any = config.admin_token ?? config.adminToken ?? config.api?.admin_token;
        if (adminKey && equal(token, adminKey))
            return { admin: true };
        const clientKey: any = config.api_key ?? config.apiKey ?? config.client_token;
        if (!admin && clientKey && equal(token, clientKey))
            return { admin: false };
        const claims: any = token && core.tokens?.validate ? await core.tokens.validate(token, { admin, model, repository: request.headers.get('x-router-repository') ?? undefined }) : null;
        if (claims)
            return claims;
        throw new (ProtocolError as any)(admin ? 'Administrator credential required' : 'Invalid or missing Router credential', 401);
    }
    function routingContext(request?: any, claims?: any): any {
        const path: any = new (URL as any)(request.url).pathname, service: any = serviceOf(path);
        const client: any = typeof claims.client === 'string' ? claims.client : typeof claims.client_kind === 'string' ? claims.client_kind : undefined;
        const pin: any = service ? configuration().services?.[service]?.provider : undefined;
        if (pin !== undefined && (typeof pin !== 'string' || !pin))
            throw new (ProtocolError as any)('Configured service provider pin is invalid', 500);
        return { client, pinnedAccount: claims.account ?? undefined, provider: pin, service, path };
    }
    async function models(request?: any, claims?: any): Promise<any> {
        if ((claims.sub ?? claims.id) && !claims.record)
            throw new (ProtocolError as any)('Durable model authority is unavailable', 403);
        const context: any = routingContext(request, claims);
        const value: any = core.catalogFor ? await core.catalogFor(context) : core.models ? await core.models() : configuration().models ?? [];
        const list: any = Array.isArray(value) ? value : value?.data ?? Object.keys(value ?? {});
        const allowed: any = claims.record?.model_policy?.allowed_models ?? [];
        const filtered: any = list.map((m?: any): any => typeof m === 'string' ? { id: m, object: 'model', created: 0, owned_by: 'router' } : { object: 'model', created: 0, owned_by: m.provider ?? 'router', ...m, id: m.id ?? m.name }).filter((m?: any): any => (!allowed.length || allowed.includes(m.id)) && (!context.client || m.supported_clients?.includes(context.client)) && (!context.provider || (m.provider ?? m.owned_by) === context.provider) && (!context.pinnedAccount || core.catalogFor || m.account === context.pinnedAccount));
        const seen: any = new (Set as any)();
        for (const m of filtered as any) {
            if (seen.has(m.id))
                throw new (ProtocolError as any)(`Exact model id '${m.id}' is advertised more than once`, 409);
            seen.add(m.id);
        }
        return filtered;
    }
    async function management(request?: any, path?: any): Promise<any> {
        await authorize(request, true);
        const method: any = request.method, body: any = ['POST', 'PATCH'].includes(method) ? await boundedJSON(request, maxBodyBytes) : undefined;
        if (path === '/api/management/tokens' && method === 'GET')
            return json({ tokens: redact(await core.tokens.list()) });
        if (['/api/management/tokens', '/api/management/tokens/client'].includes(path) && method === 'POST')
            return json(await core.tokens.issue(path.endsWith('/client') ? { ...body, scope: '', admin: false } : body), 201);
        if (path === '/api/management/tokens/revoke' && method === 'POST')
            return json({ revoked: await core.tokens.revoke(body.id ?? body.token_id) });
        if (path === '/api/management/providers' && method === 'GET') {
            const list: any = core.listProviders ? await core.listProviders() : core.providers?.list ? await core.providers.list() : configuration().providers ?? [];
            return json({ providers: redact(list) });
        }
        if (path === '/api/management/providers' && method === 'POST') {
            const result: any = core.upsertProvider ? await core.upsertProvider(body) : core.providers?.upsert ? await core.providers.upsert(body) : undefined;
            if (result === undefined)
                throw new (ProtocolError as any)('Provider mutation is not supported by this core', 501);
            return json(redact(result));
        }
        const provider: any = /^\/api\/management\/providers\/([^/]+)$/.exec(path);
        if (provider && ['GET', 'DELETE'].includes(method)) {
            const name: any = decodeURIComponent((provider as any)[1]);
            let result: any;
            if (method === 'GET')
                result = core.showProvider ? await core.showProvider(name) : await core.providers?.get?.(name);
            else
                result = core.removeProvider ? await core.removeProvider(name) : await core.providers?.remove?.(name);
            if (result === undefined)
                throw new (ProtocolError as any)('Provider operation is not supported by this core', 501);
            return json(redact(result));
        }
        if (path === '/api/management/accounts' && method === 'GET')
            return json({ accounts: redact(core.listAccounts ? await core.listAccounts() : await core.accounts?.list?.() ?? []) });
        const account: any = /^\/api\/management\/accounts\/([^/]+)\/(pause|resume|policy)$/.exec(path);
        if (account) {
            const name: any = decodeURIComponent((account as any)[1]), action: any = (account as any)[2];
            let result: any;
            if (action === 'policy' && method === 'GET') {
                result = core.accounts?.getPolicy ? await core.accounts.getPolicy(name) : core.accounts?.records?.has(name) ? { account: name, policy: structuredClone(core.accounts.records.get(name).policy) } : undefined;
            }
            else if (method === 'POST')
                result = core.accountAction ? await core.accountAction(name, action, body) : await core.accounts?.[action === 'policy' ? 'setPolicy' : action]?.(name, body);
            if (result === undefined)
                throw new (ProtocolError as any)('Account operation is not supported by this core', 501);
            return json(redact(result));
        }
        if (path === '/api/management/routing' && method === 'PATCH') {
            const result: any = core.updateRouting ? await core.updateRouting(body) : undefined;
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
        if (path === '/api/management/logs/errors' && method === 'GET')
            return json({ errors: logs.filter((l?: any): any => l.status >= 400) });
        throw new (ProtocolError as any)('Route not found', 404);
    }
    async function inference(request?: any, source?: any, body?: any): Promise<any> {
        if (typeof body.model !== 'string' || !body.model.trim())
            throw new (ProtocolError as any)('model must be a nonempty string');
        if (source !== 'responses' && !Array.isArray(body.messages))
            throw new (ProtocolError as any)('messages must be an array');
        if (source === 'responses' && typeof body.input !== 'string' && !Array.isArray(body.input))
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
            if ((body as any)[key] !== undefined && (!Number.isSafeInteger((body as any)[key]) || (body as any)[key] < 1))
                throw new (ProtocolError as any)(`${key} must be a positive integer`);
        const claims: any = await authorize(request, false, body.model);
        const retain: any = source === 'responses' && body.store !== false;
        const namespace: any = new (URL as any)(request.url).pathname.startsWith('/api/services/') ? '/api/services/openai/v1' : '/v1';
        const owner: any = retain ? responseOwner(claims, bearer(request.headers)) : undefined;
        const responseInput: any = retain ? normalizeResponseInput(body) : undefined;
        let retainedId: any;
        const context: any = { ...routingContext(request, claims), model: body.model, protocol: source, sessionKey: request.headers.get('x-router-session') ?? undefined, exclude: [] };
        const candidates: any = core.candidates ? await core.candidates(context) : [await core.route(context)];
        if (!candidates?.length)
            throw new (ProtocolError as any)('No eligible upstream account for this model', 503);
        const reserve: any = body.max_completion_tokens ?? body.max_tokens ?? body.max_output_tokens ?? 0;
        const tokenId: any = claims.sub ?? claims.id;
        if (tokenId && core.tokens?.admit) {
            const denial: any = await core.tokens.admit(tokenId, reserve);
            if (typeof denial === 'string' && denial !== 'admitted' || denial === false) {
                const error: any = new (ProtocolError as any)(typeof denial === 'string' ? denial : 'Token budget exceeded', 429);
                error.code = typeof denial === 'string' ? denial : 'token_limit_exceeded';
                throw error;
            }
        }
        let settled: any = false;
        const settle: any = async (usage?: any): Promise<any> => {
            if (settled)
                return;
            if (tokenId && core.tokens?.settle)
                await core.tokens.settle(tokenId, reserve, usage?.total ?? 0);
            settled = true;
            if (usage) {
                counters.input_tokens += usage.input;
                counters.output_tokens += usage.output;
            }
        };
        let finalError: any;
        try {
            const attemptLimit: any = configuration().account_failover === false ? 1 : Math.max(1, Math.min(10, maxAttempts));
            for (const rawCandidate of candidates.slice(0, attemptLimit) as any) {
                let candidate: any = rawCandidate;
                try {
                    candidate = core.prepareCandidate ? await core.prepareCandidate(rawCandidate) : rawCandidate;
                }
                catch (error: any) {
                    finalError = new (ProtocolError as any)('Upstream credential is unavailable', error.status ?? 502);
                    await core.reportFailure?.(rawCandidate, { status: finalError.status, scope: 'account' });
                    continue;
                }
                let protocol: any, payload: any;
                try {
                    protocol = protocolOf(candidate);
                    payload = translateRequest(body, source, protocol, candidate.model ?? body.model);
                }
                catch (error: any) {
                    if (!(error instanceof ProtocolError))
                        throw error;
                    finalError = error;
                    continue;
                }
                const controller: any = new (AbortController as any)(), abort: any = (): any => controller.abort(request.signal.reason);
                core.accounts?.recordUse?.(candidate, context);
                request.signal.addEventListener('abort', abort, { once: true });
                const timer: any = setTimeout((): any => controller.abort(new (Error as any)('Upstream timeout')), timeoutMs);
                timer.unref?.();
                let response: any;
                try {
                    counters.upstream_attempts++;
                    response = await upstreamFetch(upstreamURL(candidate.baseUrl ?? candidate.base_url ?? candidate.provider?.base_url, protocol, candidate.endpointPath), { method: 'POST', headers: upstreamHeaders(candidate, protocol, request), body: JSON.stringify(payload), signal: controller.signal, redirect: 'error' });
                }
                catch (error: any) {
                    clearTimeout(timer);
                    request.signal.removeEventListener('abort', abort);
                    if (request.signal.aborted)
                        throw new (ProtocolError as any)('Client disconnected', 499);
                    await core.reportFailure?.(candidate, { status: 502, scope: 'account' });
                    finalError = new (ProtocolError as any)('Upstream connection failed', 502);
                    continue;
                }
                const cleanup: any = (): any => { clearTimeout(timer); request.signal.removeEventListener('abort', abort); };
                if (!response.ok) {
                    cleanup();
                    const status: any = response.status;
                    const retryAfter: any = response.headers.get('retry-after');
                    await response.body?.cancel();
                    const disposition: any = await core.reportFailure?.(candidate, { status, retryAfter, scope: retryStatuses.has(status) ? 'account' : 'request', message: `HTTP ${status}` });
                    finalError = new (ProtocolError as any)(`Upstream returned HTTP ${status}`, status);
                    finalError.code = 'upstream_error';
                    if (disposition !== 'relay' && (retryStatuses.has(status) || disposition === 'retry-next' || disposition === 'cooldown'))
                        continue;
                    throw finalError;
                }
                const headers: any = relayHeaders(response);
                if (body.stream) {
                    if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
                        cleanup();
                        await response.body?.cancel();
                        throw new (ProtocolError as any)('Upstream did not return an SSE stream', 502);
                    }
                    let resourceCancelled: any = false;
                    const callbacks: any = {
                        clock, model: body.model,
                        onStart: async (response?: any): Promise<any> => { if (retain) {
                            responseStore.save(namespace, owner, response, responseInput, { abort: (): any => { resourceCancelled = true; controller.abort(new (Error as any)('Response cancelled')); } });
                            retainedId = response.id;
                        } },
                        onComplete: async (state?: any): Promise<any> => {
                            cleanup();
                            await settle(state.usage);
                            if (retain) {
                                if (!state.response || !['completed', 'incomplete'].includes(state.response.status))
                                    throw new (ProtocolError as any)('Upstream stream did not supply a completed response resource', 502);
                                responseStore.save(namespace, owner, state.response, responseInput, { update: true });
                            }
                            await core.reportSuccess?.(candidate);
                        },
                        onError: async (_error?: any, state?: any): Promise<any> => { cleanup(); if (retain && retainedId)
                            responseStore.fail(namespace, owner, retainedId); if (!resourceCancelled && !request.signal.aborted)
                            await core.reportFailure?.(candidate, { status: 502 }); await settle(state?.usage); },
                        onCancel: async (): Promise<any> => { cleanup(); controller.abort(); if (retain && retainedId)
                            responseStore.fail(namespace, owner, retainedId); await settle(); },
                    };
                    const stream: any = source === protocol ? monitorNativeStream(response.body, protocol, callbacks) : translateStream(response.body, protocol, source, body.model, callbacks);
                    return new (Response as any)(stream, { status: 200, headers: { ...headers, 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'x-accel-buffering': 'no' } });
                }
                let raw: any;
                try {
                    raw = await boundedJSON(response, maxResponseBytes);
                }
                catch (error: any) {
                    throw new (ProtocolError as any)(error.status === 413 ? 'Upstream response exceeds limit' : 'Upstream returned malformed JSON', 502);
                }
                finally {
                    cleanup();
                }
                const result: any = translateResponse(raw, protocol, source, body.model, clock());
                const usage: any = normalizeUsage(raw.usage, protocol);
                await core.reportSuccess?.(candidate);
                await settle(usage);
                if (retain)
                    responseStore.save(namespace, owner, result, responseInput);
                return json(result, response.status, headers);
            }
            throw finalError ?? new (ProtocolError as any)('All upstream accounts are unavailable', 503);
        }
        catch (error: any) {
            await settle();
            throw error;
        }
    }
    async function handle(request?: any): Promise<any> {
        const path: any = new (URL as any)(request.url).pathname, source: any = serviceOf(path) === 'anthropic' || path.endsWith('/messages') ? 'anthropic' : path.endsWith('/responses') ? 'responses' : 'chat';
        const started: any = clock();
        counters.requests++;
        let response: any;
        try {
            if (['/health', '/api/health'].includes(path) && request.method === 'GET')
                response = new (Response as any)('ok', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
            else if (path.startsWith('/api/management/'))
                response = await management(request, path);
            else if (/^(?:\/v1|\/api\/services\/openai\/v1)\/responses\/[^/]+(?:\/(?:cancel|input_items))?$/.test(path)) {
                const match: any = /^(\/v1|\/api\/services\/openai\/v1)\/responses\/([^/]+)(?:\/(cancel|input_items))?$/.exec(path);
                const claims: any = await authorize(request, false), owner: any = responseOwner(claims, bearer(request.headers)), id: any = decodeURIComponent((match as any)[2]);
                const existing: any = responseStore.get((match as any)[1], owner, id);
                await authorize(request, false, existing.model);
                if (!(match as any)[3] && request.method === 'GET')
                    response = json(existing);
                else if (!(match as any)[3] && request.method === 'DELETE')
                    response = json(responseStore.delete((match as any)[1], owner, id));
                else if ((match as any)[3] === 'cancel' && request.method === 'POST')
                    response = json(responseStore.cancel((match as any)[1], owner, id));
                else if ((match as any)[3] === 'input_items' && request.method === 'GET')
                    response = json(responseStore.inputItems((match as any)[1], owner, id, new (URL as any)(request.url).searchParams));
                else
                    throw new (ProtocolError as any)('Route not found', 404);
            }
            else if (['/v1/models', '/api/models', '/api/services/openai/v1/models', '/api/services/anthropic/v1/models'].includes(path) && request.method === 'GET') {
                const claims: any = await authorize(request, false);
                response = json(projectModels(await models(request, claims), source, new (URL as any)(request.url).searchParams));
            }
            else if (/^(?:\/v1|\/api\/services\/(?:openai|anthropic)\/v1)\/models\/[^/]+$/.test(path) && request.method === 'GET') {
                const id: any = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1)), claims: any = await authorize(request, false);
                if (!id || id.length > 512 || /[\/\x00-\x1f\x7f]/.test(id))
                    throw new (ProtocolError as any)('Model not found', 404);
                const model: any = (await models(request, claims)).find((m?: any): any => m.id === id);
                if (!model)
                    throw new (ProtocolError as any)('Model not found', 404);
                const projected: any = (projectModels([model], source).data as any)[0];
                if (source === 'anthropic')
                    projected.display_name ??= id;
                response = json(projected);
            }
            else if (['/v1/chat/completions', '/v1/messages', '/v1/responses', '/api/services/openai/v1/responses', '/api/services/openai/v1/chat/completions', '/api/services/anthropic/v1/messages'].includes(path) && request.method === 'POST')
                response = await inference(request, source, await boundedJSON(request, maxBodyBytes));
            else
                throw new (ProtocolError as any)('Route not found', 404);
        }
        catch (error: any) {
            counters.failures++;
            response = errorResponse(error, source);
        }
        logs.push({ time: started, method: request.method, path, status: response.status, duration_ms: clock() - started });
        if (logs.length > 1000)
            logs.shift();
        return response;
    }
    const router: any = {
        core, responseStore, fetch: handle, get address(): any { return server?.address(); },
        async listen({ host = configuration().host ?? '127.0.0.1', port = configuration().port ?? 3000 }: any = {}): Promise<any> {
            if (server)
                throw new (Error as any)('Router is already listening');
            server = createServer(async (incoming?: any, outgoing?: any): Promise<any> => {
                const controller: any = new (AbortController as any)();
                incoming.on('aborted', (): any => controller.abort());
                outgoing.on('close', (): any => { if (!outgoing.writableEnded)
                    controller.abort(); });
                try {
                    const headers: any = new (Headers as any)();
                    for (const [key, value] of Object.entries(incoming.headers) as any)
                        if (value !== undefined)
                            headers.set(key, Array.isArray(value) ? value.join(', ') : value);
                    const request: any = new (Request as any)(`http://${host.includes(':') ? `[${host}]` : host}:${server.address().port}${incoming.url}`, { method: incoming.method, headers, signal: controller.signal, ...(['GET', 'HEAD'].includes(incoming.method) ? {} : { body: Readable.toWeb(incoming), duplex: 'half' }) });
                    const result: any = await handle(request);
                    outgoing.writeHead(result.status, Object.fromEntries(result.headers));
                    if (!result.body)
                        outgoing.end();
                    else
                        Readable.fromWeb(result.body).on('error', (): any => outgoing.destroy()).pipe(outgoing);
                }
                catch {
                    if (!outgoing.headersSent)
                        outgoing.writeHead(500, JSON_HEADERS);
                    outgoing.end(JSON.stringify({ error: { message: 'Router request failed' } }));
                }
            });
            try {
                await new (Promise as any)((resolve?: any, reject?: any): any => { server.once('error', reject); server.listen(port, host, (): any => { server.off('error', reject); resolve(); }); });
            }
            catch (error: any) {
                server = undefined;
                throw error;
            }
            return router;
        },
        async close(): Promise<any> { responseStore.close?.(); if (!server)
            return; const current: any = server; server = undefined; if (!current.listening)
            return; await new (Promise as any)((resolve?: any, reject?: any): any => { current.close((error?: any): any => error ? reject(error) : resolve()); current.closeIdleConnections?.(); }); },
    };
    return router;
}
export async function startNativeServer(options: any = {}): Promise<any> {
    const core: any = options.core ?? await (await import("./core.js")).createRouterCore(options);
    const router: any = createNativeRouter({ ...options, core });
    return router.listen({ host: options.host, port: options.port });
}
