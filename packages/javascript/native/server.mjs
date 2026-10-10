import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { timingSafeEqual } from 'node:crypto';
import { ProtocolError, translateRequest, translateResponse, normalizeUsage, projectModels } from './protocols.mjs';
import { translateStream, monitorNativeStream } from './streams.mjs';
import { ResponsesStore, responseOwner, normalizeResponseInput } from './responses.mjs';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
const redactedKeys = /(?:api[_-]?key|token|password|secret|authorization|credential|cookie)/i;
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, redactedKeys.test(key) ? '[REDACTED]' : redact(v)]));
}
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const bearer = headers => { const a = headers.get('authorization'); return a?.match(/^Bearer\s+(.+)$/i)?.[1] ?? headers.get('x-api-key'); };
const protocolOf = candidate => {
  const value = candidate.protocol ?? candidate.provider?.protocol ?? candidate.provider?.type ?? candidate.provider;
  if (['anthropic', 'messages'].includes(value)) return 'anthropic';
  if (['responses', 'openai-responses', 'codex'].includes(value)) return 'responses';
  if (['chat', 'openai', 'openai-compatible', 'openai_compatible'].includes(value)) return 'chat';
  throw new ProtocolError(`Unsupported upstream protocol ${typeof value === 'string' ? value : 'unknown'}`, 501);
};
const paths = { chat: 'chat/completions', anthropic: 'messages', responses: 'responses' };
const serviceOf = path => /^\/api\/services\/(openai|anthropic)\/v1(?:\/|$)/.exec(path)?.[1];
function upstreamURL(base, protocol, endpointPath) {
  let u; try { u = new URL(base); } catch { throw new ProtocolError('Provider base URL is invalid', 500); }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw new ProtocolError('Provider base URL must be an HTTP(S) URL without credentials, query or fragment', 500);
  if (endpointPath !== undefined) {
    if (typeof endpointPath !== 'string' || !/^\/[a-zA-Z0-9/_-]+$/.test(endpointPath) || endpointPath.startsWith('//')) throw new ProtocolError('Provider endpoint path is invalid', 500);
    u.pathname = `${u.pathname.replace(/\/$/, '')}${endpointPath}`;
  } else u.pathname = `${u.pathname.replace(/\/$/, '')}${/\/v1$/.test(u.pathname.replace(/\/$/, '')) ? '/' : '/v1/'}${paths[protocol]}`;
  return u;
}
function upstreamHeaders(candidate, protocol, request) {
  const headers = new Headers({ 'content-type': 'application/json', accept: 'application/json, text/event-stream' });
  // Only operator-defined static headers are forwarded. Client credentials,
  // cookies, proxy headers and browser origin never become upstream headers.
  const forbidden = /^(?:authorization|x-api-key|cookie|set-cookie|host|connection|content-length|transfer-encoding|proxy-.*|forwarded|x-forwarded-.*)$/i;
  for (const [key, value] of Object.entries(candidate.headers ?? candidate.account?.headers ?? {})) {
    if (forbidden.test(key)) continue;
    if (typeof value !== 'string' || value.startsWith('$')) continue;
    headers.set(key, value);
  }
  const key = candidate.apiKey ?? candidate.api_key ?? candidate.account?.api_key;
  if (key) headers.set(protocol === 'anthropic' && candidate.auth_type !== 'oauth' ? 'x-api-key' : 'authorization', protocol === 'anthropic' && candidate.auth_type !== 'oauth' ? key : `Bearer ${key}`);
  if (protocol === 'anthropic') headers.set('anthropic-version', '2023-06-01');
  if (candidate.auth_type === 'oauth') {
    for (const [key, value] of Object.entries(candidate.oauth_headers ?? {})) if (['anthropic-beta', 'anthropic-version', 'chatgpt-account-id', 'originator'].includes(key.toLowerCase()) && typeof value === 'string') headers.set(key, value);
  }
  const requestId = request.headers.get('x-request-id');
  if (requestId && /^[a-zA-Z0-9._:-]{1,128}$/.test(requestId)) headers.set('x-request-id', requestId);
  return headers;
}
function relayHeaders(upstream) {
  const result = {};
  for (const [key, value] of upstream.headers) if (/^(?:x-request-id|request-id|retry-after|x-ratelimit-[a-z_-]+|anthropic-ratelimit-[a-z_-]+)$/.test(key)) result[key] = value;
  return result;
}
async function boundedJSON(request, maxBytes) {
  if (!request.body) throw new ProtocolError('Request body is required');
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes) throw new ProtocolError('Request body exceeds limit', 413);
  const reader = request.body.getReader(); const parts = []; let total = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; total += value.byteLength; if (total > maxBytes) { await reader.cancel(); throw new ProtocolError('Request body exceeds limit', 413); } parts.push(value); } }
  finally { reader.releaseLock(); }
  let value; try { value = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { throw new ProtocolError('Request body must contain valid JSON'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProtocolError('Request body must be a JSON object');
  return value;
}
const retryStatuses = new Set([401, 403, 408, 429, 500, 502, 503, 504, 529]);

/** A native Web Request/Response router. All selection and state live in core. */
export function createNativeRouter(options = {}) {
  const { core, authenticate, fetch: upstreamFetch = globalThis.fetch, clock = Date.now, maxBodyBytes = 4 * 1024 * 1024, maxResponseBytes = 32 * 1024 * 1024, timeoutMs = 120_000, maxAttempts = 3 } = options;
  if (!core) throw new TypeError('createNativeRouter requires core; use startNativeServer to create one from configuration');
  const tlsConfig = { ...core.config, ...options };
  if (tlsConfig.tls_self_signed || tlsConfig.tls_cert || tlsConfig.tls_key || tlsConfig.tlsSelfSigned || tlsConfig.tlsCert || tlsConfig.tlsKey || tlsConfig.https || tlsConfig.tls || (Array.isArray(tlsConfig.listeners) ? tlsConfig.listeners : Object.values(tlsConfig.listeners ?? {})).some(listener => listener?.tls || listener?.https || listener?.protocol === 'https' || typeof listener === 'string' && listener.startsWith('https:'))) throw new ProtocolError('Native HTTPS listeners are not implemented; configure an HTTP listener behind TLS termination', 501);
  const responseStore = options.responseStore ?? new ResponsesStore({ clock, ...options.responseStoreOptions });
  const logs = []; const counters = { requests: 0, failures: 0, upstream_attempts: 0, input_tokens: 0, output_tokens: 0 };
  let server;
  const configuration = () => core.config ?? options.config ?? {};
  const errorResponse = (error, protocol) => {
    const status = error.status ?? 500;
    const message = status >= 500 && !(error instanceof ProtocolError) ? 'Router request failed' : error.message;
    return json(protocol === 'anthropic' ? { type: 'error', error: { type: status === 401 ? 'authentication_error' : status === 429 ? 'rate_limit_error' : 'api_error', message } } : { error: { message, type: status === 401 ? 'authentication_error' : status === 400 ? 'invalid_request_error' : 'api_error', code: error.code ?? null } }, status);
  };
  async function authorize(request, admin, model) {
    if (authenticate) {
      const claims = await authenticate(request, { admin, model });
      if (!claims) throw new ProtocolError('Invalid or missing Router credential', 401);
      if (admin && claims.admin !== true && claims.is_admin !== true) throw new ProtocolError('Administrator credential required', 403);
      return claims;
    }
    const token = bearer(request.headers), config = configuration();
    const adminKey = config.admin_token ?? config.adminToken ?? config.api?.admin_token;
    if (adminKey && equal(token, adminKey)) return { admin: true };
    const clientKey = config.api_key ?? config.apiKey ?? config.client_token;
    if (!admin && clientKey && equal(token, clientKey)) return { admin: false };
    const claims = token && core.tokens?.validate ? await core.tokens.validate(token, { admin, model, repository: request.headers.get('x-router-repository') ?? undefined }) : null;
    if (claims) return claims;
    throw new ProtocolError(admin ? 'Administrator credential required' : 'Invalid or missing Router credential', 401);
  }
  function routingContext(request, claims) {
    const path = new URL(request.url).pathname, service = serviceOf(path);
    const client = typeof claims.client === 'string' ? claims.client : typeof claims.client_kind === 'string' ? claims.client_kind : undefined;
    const pin = service ? configuration().services?.[service]?.provider : undefined;
    if (pin !== undefined && (typeof pin !== 'string' || !pin)) throw new ProtocolError('Configured service provider pin is invalid', 500);
    return { client, pinnedAccount: claims.account ?? undefined, provider: pin, service, path };
  }
  async function models(request, claims) {
    if ((claims.sub ?? claims.id) && !claims.record) throw new ProtocolError('Durable model authority is unavailable', 403);
    const context = routingContext(request, claims);
    const value = core.catalogFor ? await core.catalogFor(context) : core.models ? await core.models() : configuration().models ?? [];
    const list = Array.isArray(value) ? value : value?.data ?? Object.keys(value ?? {});
    const allowed = claims.record?.model_policy?.allowed_models ?? [];
    const filtered = list.map(m => typeof m === 'string' ? { id: m, object: 'model', created: 0, owned_by: 'router' } : { object: 'model', created: 0, owned_by: m.provider ?? 'router', ...m, id: m.id ?? m.name }).filter(m => (!allowed.length || allowed.includes(m.id)) && (!context.client || m.supported_clients?.includes(context.client)) && (!context.provider || (m.provider ?? m.owned_by) === context.provider) && (!context.pinnedAccount || core.catalogFor || m.account === context.pinnedAccount));
    const seen = new Set();
    for (const m of filtered) { if (seen.has(m.id)) throw new ProtocolError(`Exact model id '${m.id}' is advertised more than once`, 409); seen.add(m.id); }
    return filtered;
  }
  async function management(request, path) {
    await authorize(request, true);
    const method = request.method, body = ['POST', 'PATCH'].includes(method) ? await boundedJSON(request, maxBodyBytes) : undefined;
    if (path === '/api/management/tokens' && method === 'GET') return json({ tokens: redact(await core.tokens.list()) });
    if (['/api/management/tokens', '/api/management/tokens/client'].includes(path) && method === 'POST') return json(await core.tokens.issue(path.endsWith('/client') ? { ...body, scope: '', admin: false } : body), 201);
    if (path === '/api/management/tokens/revoke' && method === 'POST') return json({ revoked: await core.tokens.revoke(body.id ?? body.token_id) });
    if (path === '/api/management/providers' && method === 'GET') {
      const list = core.listProviders ? await core.listProviders() : core.providers?.list ? await core.providers.list() : configuration().providers ?? [];
      return json({ providers: redact(list) });
    }
    if (path === '/api/management/providers' && method === 'POST') {
      const result = core.upsertProvider ? await core.upsertProvider(body) : core.providers?.upsert ? await core.providers.upsert(body) : undefined;
      if (result === undefined) throw new ProtocolError('Provider mutation is not supported by this core', 501);
      return json(redact(result));
    }
    const provider = /^\/api\/management\/providers\/([^/]+)$/.exec(path);
    if (provider && ['GET', 'DELETE'].includes(method)) {
      const name = decodeURIComponent(provider[1]); let result;
      if (method === 'GET') result = core.showProvider ? await core.showProvider(name) : await core.providers?.get?.(name);
      else result = core.removeProvider ? await core.removeProvider(name) : await core.providers?.remove?.(name);
      if (result === undefined) throw new ProtocolError('Provider operation is not supported by this core', 501);
      return json(redact(result));
    }
    if (path === '/api/management/accounts' && method === 'GET') return json({ accounts: redact(core.listAccounts ? await core.listAccounts() : await core.accounts?.list?.() ?? []) });
    const account = /^\/api\/management\/accounts\/([^/]+)\/(pause|resume|policy)$/.exec(path);
    if (account) {
      const name = decodeURIComponent(account[1]), action = account[2]; let result;
      if (action === 'policy' && method === 'GET') {
        result = core.accounts?.getPolicy ? await core.accounts.getPolicy(name) : core.accounts?.records?.has(name) ? { account: name, policy: structuredClone(core.accounts.records.get(name).policy) } : undefined;
      }
      else if (method === 'POST') result = core.accountAction ? await core.accountAction(name, action, body) : await core.accounts?.[action === 'policy' ? 'setPolicy' : action]?.(name, body);
      if (result === undefined) throw new ProtocolError('Account operation is not supported by this core', 501);
      return json(redact(result));
    }
    if (path === '/api/management/routing' && method === 'PATCH') {
      const result = core.updateRouting ? await core.updateRouting(body) : undefined;
      if (result === undefined) throw new ProtocolError('Routing mutation is not supported by this core', 501);
      return json(redact(result));
    }
    if (path === '/api/management/routing/cooldown/reset' && method === 'POST') {
      if (body.model && !body.account || body.account != null && (typeof body.account !== 'string' || !body.account.trim()) || body.model != null && (typeof body.model !== 'string' || !body.model.trim())) throw new ProtocolError('A model reset requires a nonempty account and model');
      const result = body.account ? await core.resetCooldown?.(body.account, body.model) : await core.resetCooldowns?.();
      if (result === undefined) throw new ProtocolError('Cooldown reset is not supported by this core', 501);
      return json(result);
    }
    if (path === '/api/management/usage' && method === 'GET') return json({ ...counters });
    if (path === '/api/management/logs/errors' && method === 'GET') return json({ errors: logs.filter(l => l.status >= 400) });
    throw new ProtocolError('Route not found', 404);
  }
  async function inference(request, source, body) {
    if (typeof body.model !== 'string' || !body.model.trim()) throw new ProtocolError('model must be a nonempty string');
    if (source !== 'responses' && !Array.isArray(body.messages)) throw new ProtocolError('messages must be an array');
    if (source === 'responses' && typeof body.input !== 'string' && !Array.isArray(body.input)) throw new ProtocolError('input must be a string or array');
    if (body.stream !== undefined && typeof body.stream !== 'boolean') throw new ProtocolError('stream must be a boolean');
    if (source === 'responses') {
      if (body.background || body.conversation || body.previous_response_id) throw new ProtocolError('Background, conversation and previous-response execution are not implemented by the native lifecycle store', 501);
      if (body.store !== undefined && typeof body.store !== 'boolean') throw new ProtocolError('store must be a boolean');
    }
    for (const key of ['max_tokens', 'max_completion_tokens', 'max_output_tokens']) if (body[key] !== undefined && (!Number.isSafeInteger(body[key]) || body[key] < 1)) throw new ProtocolError(`${key} must be a positive integer`);
    const claims = await authorize(request, false, body.model);
    const retain = source === 'responses' && body.store !== false;
    const namespace = new URL(request.url).pathname.startsWith('/api/services/') ? '/api/services/openai/v1' : '/v1';
    const owner = retain ? responseOwner(claims, bearer(request.headers)) : undefined;
    const responseInput = retain ? normalizeResponseInput(body) : undefined;
    let retainedId;
    const context = { ...routingContext(request, claims), model: body.model, protocol: source, sessionKey: request.headers.get('x-router-session') ?? undefined, exclude: [] };
    const candidates = core.candidates ? await core.candidates(context) : [await core.route(context)];
    if (!candidates?.length) throw new ProtocolError('No eligible upstream account for this model', 503);
    const reserve = body.max_completion_tokens ?? body.max_tokens ?? body.max_output_tokens ?? 0;
    const tokenId = claims.sub ?? claims.id;
    if (tokenId && core.tokens?.admit) {
      const denial = await core.tokens.admit(tokenId, reserve);
      if (typeof denial === 'string' && denial !== 'admitted' || denial === false) { const error = new ProtocolError(typeof denial === 'string' ? denial : 'Token budget exceeded', 429); error.code = typeof denial === 'string' ? denial : 'token_limit_exceeded'; throw error; }
    }
    let settled = false;
    const settle = async usage => {
      if (settled) return;
      if (tokenId && core.tokens?.settle) await core.tokens.settle(tokenId, reserve, usage?.total ?? 0);
      settled = true;
      if (usage) { counters.input_tokens += usage.input; counters.output_tokens += usage.output; }
    };
    let finalError;
    try {
      const attemptLimit = configuration().account_failover === false ? 1 : Math.max(1, Math.min(10, maxAttempts));
      for (const rawCandidate of candidates.slice(0, attemptLimit)) {
        let candidate = rawCandidate;
        try { candidate = core.prepareCandidate ? await core.prepareCandidate(rawCandidate) : rawCandidate; }
        catch (error) { finalError = new ProtocolError('Upstream credential is unavailable', error.status ?? 502); await core.reportFailure?.(rawCandidate, { status: finalError.status, scope: 'account' }); continue; }
        let protocol, payload;
        try { protocol = protocolOf(candidate); payload = translateRequest(body, source, protocol, candidate.model ?? body.model); }
        catch (error) { if (!(error instanceof ProtocolError)) throw error; finalError = error; continue; }
        const controller = new AbortController(), abort = () => controller.abort(request.signal.reason);
        core.accounts?.recordUse?.(candidate, context);
        request.signal.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(() => controller.abort(new Error('Upstream timeout')), timeoutMs); timer.unref?.();
        let response;
        try {
          counters.upstream_attempts++;
          response = await upstreamFetch(upstreamURL(candidate.baseUrl ?? candidate.base_url ?? candidate.provider?.base_url, protocol, candidate.endpointPath), { method: 'POST', headers: upstreamHeaders(candidate, protocol, request), body: JSON.stringify(payload), signal: controller.signal, redirect: 'error' });
        } catch (error) {
          clearTimeout(timer); request.signal.removeEventListener('abort', abort);
          if (request.signal.aborted) throw new ProtocolError('Client disconnected', 499);
          await core.reportFailure?.(candidate, { status: 502, scope: 'account' });
          finalError = new ProtocolError('Upstream connection failed', 502); continue;
        }
        const cleanup = () => { clearTimeout(timer); request.signal.removeEventListener('abort', abort); };
        if (!response.ok) {
          cleanup(); const status = response.status; const retryAfter = response.headers.get('retry-after'); await response.body?.cancel();
          const disposition = await core.reportFailure?.(candidate, { status, retryAfter, scope: retryStatuses.has(status) ? 'account' : 'request', message: `HTTP ${status}` });
          finalError = new ProtocolError(`Upstream returned HTTP ${status}`, status); finalError.code = 'upstream_error';
          if (disposition !== 'relay' && (retryStatuses.has(status) || disposition === 'retry-next' || disposition === 'cooldown')) continue;
          throw finalError;
        }
        const headers = relayHeaders(response);
        if (body.stream) {
          if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) { cleanup(); await response.body?.cancel(); throw new ProtocolError('Upstream did not return an SSE stream', 502); }
          let resourceCancelled = false;
          const callbacks = {
            clock, model: body.model,
            onStart: async response => { if (retain) { responseStore.save(namespace, owner, response, responseInput, { abort: () => { resourceCancelled = true; controller.abort(new Error('Response cancelled')); } }); retainedId = response.id; } },
            onComplete: async state => {
              cleanup(); await settle(state.usage);
              if (retain) {
                if (!state.response || !['completed', 'incomplete'].includes(state.response.status)) throw new ProtocolError('Upstream stream did not supply a completed response resource', 502);
                responseStore.save(namespace, owner, state.response, responseInput, { update: true });
              }
              await core.reportSuccess?.(candidate);
            },
            onError: async (_error, state) => { cleanup(); if (retain && retainedId) responseStore.fail(namespace, owner, retainedId); if (!resourceCancelled && !request.signal.aborted) await core.reportFailure?.(candidate, { status: 502 }); await settle(state?.usage); },
            onCancel: async () => { cleanup(); controller.abort(); if (retain && retainedId) responseStore.fail(namespace, owner, retainedId); await settle(); },
          };
          const stream = source === protocol ? monitorNativeStream(response.body, protocol, callbacks) : translateStream(response.body, protocol, source, body.model, callbacks);
          return new Response(stream, { status: 200, headers: { ...headers, 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'x-accel-buffering': 'no' } });
        }
        let raw;
        try { raw = await boundedJSON(response, maxResponseBytes); }
        catch (error) { throw new ProtocolError(error.status === 413 ? 'Upstream response exceeds limit' : 'Upstream returned malformed JSON', 502); }
        finally { cleanup(); }
        const result = translateResponse(raw, protocol, source, body.model, clock());
        const usage = normalizeUsage(raw.usage, protocol);
        await core.reportSuccess?.(candidate); await settle(usage);
        if (retain) responseStore.save(namespace, owner, result, responseInput);
        return json(result, response.status, headers);
      }
      throw finalError ?? new ProtocolError('All upstream accounts are unavailable', 503);
    } catch (error) { await settle(); throw error; }
  }
  async function handle(request) {
    const path = new URL(request.url).pathname, source = serviceOf(path) === 'anthropic' || path.endsWith('/messages') ? 'anthropic' : path.endsWith('/responses') ? 'responses' : 'chat';
    const started = clock(); counters.requests++;
    let response;
    try {
      if (['/health', '/api/health'].includes(path) && request.method === 'GET') response = new Response('ok', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      else if (path.startsWith('/api/management/')) response = await management(request, path);
      else if (/^(?:\/v1|\/api\/services\/openai\/v1)\/responses\/[^/]+(?:\/(?:cancel|input_items))?$/.test(path)) {
        const match = /^(\/v1|\/api\/services\/openai\/v1)\/responses\/([^/]+)(?:\/(cancel|input_items))?$/.exec(path);
        const claims = await authorize(request, false), owner = responseOwner(claims, bearer(request.headers)), id = decodeURIComponent(match[2]);
        const existing = responseStore.get(match[1], owner, id);
        await authorize(request, false, existing.model);
        if (!match[3] && request.method === 'GET') response = json(existing);
        else if (!match[3] && request.method === 'DELETE') response = json(responseStore.delete(match[1], owner, id));
        else if (match[3] === 'cancel' && request.method === 'POST') response = json(responseStore.cancel(match[1], owner, id));
        else if (match[3] === 'input_items' && request.method === 'GET') response = json(responseStore.inputItems(match[1], owner, id, new URL(request.url).searchParams));
        else throw new ProtocolError('Route not found', 404);
      }
      else if (['/v1/models', '/api/models', '/api/services/openai/v1/models', '/api/services/anthropic/v1/models'].includes(path) && request.method === 'GET') {
        const claims = await authorize(request, false); response = json(projectModels(await models(request, claims), source, new URL(request.url).searchParams));
      }
      else if (/^(?:\/v1|\/api\/services\/(?:openai|anthropic)\/v1)\/models\/[^/]+$/.test(path) && request.method === 'GET') {
        const id = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1)), claims = await authorize(request, false);
        if (!id || id.length > 512 || /[\/\x00-\x1f\x7f]/.test(id)) throw new ProtocolError('Model not found', 404);
        const model = (await models(request, claims)).find(m => m.id === id);
        if (!model) throw new ProtocolError('Model not found', 404);
        const projected = projectModels([model], source).data[0]; if (source === 'anthropic') projected.display_name ??= id;
        response = json(projected);
      }
      else if (['/v1/chat/completions', '/v1/messages', '/v1/responses', '/api/services/openai/v1/responses', '/api/services/openai/v1/chat/completions', '/api/services/anthropic/v1/messages'].includes(path) && request.method === 'POST') response = await inference(request, source, await boundedJSON(request, maxBodyBytes));
      else throw new ProtocolError('Route not found', 404);
    } catch (error) { counters.failures++; response = errorResponse(error, source); }
    logs.push({ time: started, method: request.method, path, status: response.status, duration_ms: clock() - started }); if (logs.length > 1000) logs.shift();
    return response;
  }
  const router = {
    core, responseStore, fetch: handle, get address() { return server?.address(); },
    async listen({ host = configuration().host ?? '127.0.0.1', port = configuration().port ?? 3000 } = {}) {
      if (server) throw new Error('Router is already listening');
      server = createServer(async (incoming, outgoing) => {
        const controller = new AbortController(); incoming.on('aborted', () => controller.abort()); outgoing.on('close', () => { if (!outgoing.writableEnded) controller.abort(); });
        try {
          const headers = new Headers(); for (const [key, value] of Object.entries(incoming.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
          const request = new Request(`http://${host.includes(':') ? `[${host}]` : host}:${server.address().port}${incoming.url}`, { method: incoming.method, headers, signal: controller.signal, ...(['GET', 'HEAD'].includes(incoming.method) ? {} : { body: Readable.toWeb(incoming), duplex: 'half' }) });
          const result = await handle(request); outgoing.writeHead(result.status, Object.fromEntries(result.headers));
          if (!result.body) outgoing.end(); else Readable.fromWeb(result.body).on('error', () => outgoing.destroy()).pipe(outgoing);
        } catch { if (!outgoing.headersSent) outgoing.writeHead(500, JSON_HEADERS); outgoing.end(JSON.stringify({ error: { message: 'Router request failed' } })); }
      });
      try { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => { server.off('error', reject); resolve(); }); }); }
      catch (error) { server = undefined; throw error; }
      return router;
    },
    async close() { responseStore.close?.(); if (!server) return; const current = server; server = undefined; if (!current.listening) return; await new Promise((resolve, reject) => { current.close(error => error ? reject(error) : resolve()); current.closeIdleConnections?.(); }); },
  };
  return router;
}
export async function startNativeServer(options = {}) {
  const core = options.core ?? await (await import('./core.mjs')).createRouterCore(options);
  const router = createNativeRouter({ ...options, core });
  return router.listen({ host: options.host, port: options.port });
}
