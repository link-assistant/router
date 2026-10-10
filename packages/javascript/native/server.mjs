import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { timingSafeEqual } from 'node:crypto';
import { ProtocolError, translateRequest, translateResponse } from './protocols.mjs';
import { translateStream, monitorNativeStream } from './streams.mjs';

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
function upstreamURL(base, protocol) {
  let u; try { u = new URL(base); } catch { throw new ProtocolError('Provider base URL is invalid', 500); }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw new ProtocolError('Provider base URL must be an HTTP(S) URL without credentials, query or fragment', 500);
  u.pathname = `${u.pathname.replace(/\/$/, '')}${/\/v1$/.test(u.pathname.replace(/\/$/, '')) ? '/' : '/v1/'}${paths[protocol]}`;
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
  if (key) headers.set(protocol === 'anthropic' ? 'x-api-key' : 'authorization', protocol === 'anthropic' ? key : `Bearer ${key}`);
  if (protocol === 'anthropic') headers.set('anthropic-version', '2023-06-01');
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
  async function models() {
    const value = core.models ? await core.models() : configuration().models ?? [];
    const list = Array.isArray(value) ? value : value?.data ?? Object.keys(value ?? {});
    return list.map(m => typeof m === 'string' ? { id: m, object: 'model', created: 0, owned_by: 'router' } : { object: 'model', created: 0, owned_by: m.provider ?? 'router', ...m, id: m.id ?? m.name });
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
      if (action === 'policy' && method === 'GET') result = await core.accounts?.getPolicy?.(name);
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
      const result = core.resetCooldown ? await core.resetCooldown(body) : core.resetCooldowns ? await core.resetCooldowns(body) : undefined;
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
    for (const key of ['max_tokens', 'max_completion_tokens', 'max_output_tokens']) if (body[key] !== undefined && (!Number.isSafeInteger(body[key]) || body[key] < 1)) throw new ProtocolError(`${key} must be a positive integer`);
    const claims = await authorize(request, false, body.model);
    const client = typeof claims.client === 'string' ? claims.client : typeof claims.client_kind === 'string' ? claims.client_kind : undefined;
    const context = { model: body.model, client, sessionKey: request.headers.get('x-router-session') ?? undefined, pinnedAccount: claims.account, exclude: [] };
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
      if (settled) return; settled = true;
      if (usage) { counters.input_tokens += usage.input; counters.output_tokens += usage.output; }
      if (tokenId && core.tokens?.settle) await core.tokens.settle(tokenId, reserve, usage?.total ?? 0);
    };
    let finalError;
    try {
      const attemptLimit = configuration().account_failover === false ? 1 : Math.max(1, Math.min(10, maxAttempts));
      for (const candidate of candidates.slice(0, attemptLimit)) {
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
          response = await upstreamFetch(upstreamURL(candidate.baseUrl ?? candidate.base_url ?? candidate.provider?.base_url, protocol), { method: 'POST', headers: upstreamHeaders(candidate, protocol, request), body: JSON.stringify(payload), signal: controller.signal, redirect: 'error' });
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
          const callbacks = { clock, onComplete: async state => { cleanup(); await core.reportSuccess?.(candidate); await settle(state.usage); }, onError: async () => { cleanup(); await core.reportFailure?.(candidate, { status: 502 }); await settle(); }, onCancel: async () => { cleanup(); controller.abort(); await settle(); } };
          const stream = source === protocol ? monitorNativeStream(response.body, protocol, callbacks) : translateStream(response.body, protocol, source, body.model, callbacks);
          return new Response(stream, { status: 200, headers: { ...headers, 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'x-accel-buffering': 'no' } });
        }
        let raw;
        try { raw = await boundedJSON(response, maxResponseBytes); }
        catch (error) { throw new ProtocolError(error.status === 413 ? 'Upstream response exceeds limit' : 'Upstream returned malformed JSON', 502); }
        finally { cleanup(); }
        const result = translateResponse(raw, protocol, source, body.model, clock());
        const usage = responseToCanonicalUsage(raw, protocol);
        await core.reportSuccess?.(candidate); await settle(usage);
        return json(result, response.status, headers);
      }
      throw finalError ?? new ProtocolError('All upstream accounts are unavailable', 503);
    } catch (error) { await settle(); throw error; }
  }
  async function handle(request) {
    const path = new URL(request.url).pathname, source = path.endsWith('/messages') ? 'anthropic' : path.endsWith('/responses') ? 'responses' : 'chat';
    const started = clock(); counters.requests++;
    let response;
    try {
      if (['/health', '/api/health'].includes(path) && request.method === 'GET') response = new Response('ok', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      else if (path.startsWith('/api/management/')) response = await management(request, path);
      else if (['/v1/models', '/api/models'].includes(path) && request.method === 'GET') { await authorize(request, false); response = json({ object: 'list', data: await models() }); }
      else if (/^\/v1\/models\/[^/]+$/.test(path) && request.method === 'GET') { await authorize(request, false); const id = decodeURIComponent(path.slice('/v1/models/'.length)), model = (await models()).find(m => m.id === id); if (!model) throw new ProtocolError('Model not found', 404); response = json(model); }
      else if (['/v1/chat/completions', '/v1/messages', '/v1/responses'].includes(path) && request.method === 'POST') response = await inference(request, source, await boundedJSON(request, maxBodyBytes));
      else throw new ProtocolError('Route not found', 404);
    } catch (error) { counters.failures++; response = errorResponse(error, source); }
    logs.push({ time: started, method: request.method, path, status: response.status, duration_ms: clock() - started }); if (logs.length > 1000) logs.shift();
    return response;
  }
  const router = {
    core, fetch: handle, get address() { return server?.address(); },
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
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => { server.off('error', reject); resolve(); }); });
      return router;
    },
    async close() { if (!server) return; const current = server; server = undefined; await new Promise((resolve, reject) => { current.close(error => error ? reject(error) : resolve()); current.closeIdleConnections?.(); }); },
  };
  return router;
}
function responseToCanonicalUsage(raw, protocol) {
  // Usage parsing does not inspect content, preserving native reasoning blocks.
  const u = raw.usage ?? {}, input = u.input_tokens ?? u.prompt_tokens ?? 0, output = u.output_tokens ?? u.completion_tokens ?? 0;
  return { input, output, cached: u.cache_read_input_tokens ?? u.input_tokens_details?.cached_tokens ?? u.prompt_tokens_details?.cached_tokens ?? 0, total: u.total_tokens ?? input + output + (protocol === 'anthropic' ? (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) : 0) };
}
export async function startNativeServer(options = {}) {
  const core = options.core ?? await (await import('./core.mjs')).createRouterCore(options);
  const router = createNativeRouter({ ...options, core });
  return router.listen({ host: options.host, port: options.port });
}
