import { createServer } from 'node:http';
import {createServer as createHTTPSServer} from 'node:https';
import {lstat,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import { Readable } from 'node:stream';
import { timingSafeEqual } from 'node:crypto';
import { ProtocolError, translateRequest, translateResponse, normalizeUsage, projectModels } from './protocols.mjs';
import { translateStream, monitorNativeStream } from './streams.mjs';
import { ResponsesStore, responseOwner, normalizeResponseInput } from './responses.mjs';
import { createNativeService } from './native-service.mjs';
import {managementOperation} from './http-management.mjs';
import {relayWebSocket} from './websocket-relay.mjs';
import {UsageTracker} from './usage.mjs';
import {activityResponse} from './activitypub.mjs';
import {githubConfiguration,relayGithub} from './github-proxy.mjs';
import {relayGit} from './git-proxy.mjs';
import {serveAdminAsset,hardenAdmin} from './admin-assets.mjs';
import {matchHTTPRoute,HTTP_ROUTES} from './http-route-contract.mjs';
import {isIP} from 'node:net';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
const redactedKeys = /(?:api[_-]?key|password|secret|authorization|credential|cookie|(?:access|refresh|id)[_-]?token|^token$)/i;
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, redactedKeys.test(key) ? '[REDACTED]' : redact(v)]));
}
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
function socketPeer(peer) {
  if(typeof peer !== 'string' || !isIP(peer))return undefined;
  if(isIP(peer) === 4)return peer;
  const normalized=new URL(`http://[${peer}]/`).hostname.slice(1,-1),mapped=/^::ffff:([a-f0-9]+):([a-f0-9]+)$/i.exec(normalized);
  if(!mapped)return normalized;
  const high=parseInt(mapped[1],16),low=parseInt(mapped[2],16);return `${high>>>8}.${high&255}.${low>>>8}.${low&255}`;
}
const bearer = headers => { const a = headers.get('authorization'); return a?.match(/^Bearer\s+(.+)$/i)?.[1] ?? headers.get('x-api-key'); };
const protocolOf = candidate => {
  const value = candidate.protocol ?? candidate.provider?.protocol ?? candidate.provider?.type ?? candidate.provider;
  if (['anthropic', 'messages'].includes(value)) return 'anthropic';
  if (['responses', 'openai-responses', 'codex'].includes(value)) return 'responses';
  if (['chat', 'openai', 'openai-compatible', 'openai_compatible'].includes(value)) return 'chat';
  if (['gemini','vertex'].includes(value)) return 'gemini';
  throw new ProtocolError(`Unsupported upstream protocol ${typeof value === 'string' ? value : 'unknown'}`, 501);
};
const paths = { chat: 'chat/completions', anthropic: 'messages', responses: 'responses' };
const serviceOf = path => /^\/api\/services\/(openai|anthropic|codex|qwen|gemini|vertex|bedrock)(?:\/|$)/.exec(path)?.[1];
function upstreamURL(base, protocol, endpointPath) {
  let u; try { u = new URL(base); } catch { throw new ProtocolError('Provider base URL is invalid', 500); }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw new ProtocolError('Provider base URL must be an HTTP(S) URL without credentials, query or fragment', 500);
  if (endpointPath !== undefined) {
    if (typeof endpointPath !== 'string' || !/^\/[a-zA-Z0-9/:_-]+$/.test(endpointPath) || endpointPath.startsWith('//')) throw new ProtocolError('Provider endpoint path is invalid', 500);
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
async function boundedJSON(request, maxBytes,objectOnly=true) {
  if (!request.body) throw new ProtocolError('Request body is required');
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes) throw new ProtocolError('Request body exceeds limit', 413);
  const reader = request.body.getReader(); const parts = []; let total = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; total += value.byteLength; if (total > maxBytes) { await reader.cancel(); throw new ProtocolError('Request body exceeds limit', 413); } parts.push(value); } }
  finally { reader.releaseLock(); }
  let value; try { value = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { throw new ProtocolError('Request body must contain valid JSON'); }
  if (objectOnly && (!value || typeof value !== 'object' || Array.isArray(value))) throw new ProtocolError('Request body must be a JSON object');
  return value;
}
const retryStatuses = new Set([401, 403, 408, 429, 500, 502, 503, 504, 529]);

/** A native Web Request/Response router. All selection and state live in core. */
export function createNativeRouter(options = {}) {
  const { core, authenticate, fetch: upstreamFetch = globalThis.fetch, clock = Date.now, maxBodyBytes = 4 * 1024 * 1024, maxResponseBytes = 32 * 1024 * 1024, timeoutMs = 120_000, maxAttempts = 3 } = options;
  if (!core) throw new TypeError('createNativeRouter requires core; use startNativeServer to create one from configuration');
  const tlsConfig = { ...core.config, ...options };
  const useTLS=Boolean(tlsConfig.tls_self_signed || tlsConfig.tlsSelfSigned || tlsConfig.tls_cert || tlsConfig.tlsCert || tlsConfig.tls_key || tlsConfig.tlsKey || tlsConfig.https || tlsConfig.tls || (Array.isArray(tlsConfig.listeners) ? tlsConfig.listeners : Object.values(tlsConfig.listeners ?? {})).some(listener=>listener?.tls || listener?.https || listener?.protocol === 'https' || typeof listener === 'string' && listener.startsWith('https:')));
  const responseStore = options.responseStore ?? new ResponsesStore({ clock, ...options.responseStoreOptions });
  const logs = []; const counters = { requests: 0, failures: 0, upstream_attempts: 0, input_tokens: 0, output_tokens: 0 };
  const peers=new WeakMap();
  const listenerKind=options.listenerKind ?? (core.config?.inference_only ? 'inference-only':'combined');
  let githubConfig;
  let server;
  const configuration = () => core.config ?? options.config ?? {};
  const errorResponse = (error, protocol) => {
    const status = error.status ?? 500;
    const message = status >= 500 && !(error instanceof ProtocolError) ? 'Router request failed' : error.message;
    return json(protocol === 'gemini' ? {error:{code:status,message,status:({400:'INVALID_ARGUMENT',401:'PERMISSION_DENIED',403:'PERMISSION_DENIED',404:'NOT_FOUND',429:'RESOURCE_EXHAUSTED',503:'UNAVAILABLE'})[status] ?? 'INTERNAL'}} : protocol === 'anthropic' ? { type: 'error', error: { type: status === 401 ? 'authentication_error' : status === 429 ? 'rate_limit_error' : 'api_error', message } } : { error: { message, type: status === 401 ? 'authentication_error' : status === 400 ? 'invalid_request_error' : 'api_error', code: error.code ?? null } }, status);
  };
  async function authorize(request, admin, model) {
    if (authenticate) {
      const claims = await authenticate(request, { admin, model });
      if (!claims) throw new ProtocolError('Invalid or missing Router credential', 401);
      if (admin && claims.admin !== true && claims.is_admin !== true) throw new ProtocolError('Administrator credential required', 403);
      return claims;
    }
    const token = bearer(request.headers), config = configuration();
    if(core.authenticate)return core.authenticate(token,{admin,model,repository:request.headers.get('x-router-repository') ?? undefined});
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
  const nativeService = createNativeService({core,authorize,routingContext,fetch:upstreamFetch,maxBodyBytes,maxResponseBytes,timeoutMs,affinities:options.affinities ?? core.affinities});
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
    const open=['/api/management/admin/status','/api/management/admin/bootstrap','/api/management/admin/bootstrap/confirm'].includes(path);
    if(open) {const result=await managementOperation(core,request,path,request.body ? await boundedJSON(request,maxBodyBytes) : {});if(result === undefined)throw new ProtocolError('Route not found',404);return json(result);}
    if(path.startsWith('/api/management/login') && configuration().login?.enabled === false)throw new ProtocolError('Route not found',404);
    let adminClaims;
    try {adminClaims = await authorize(request, true);}catch(error){error.managementAuthenticationFailure=true;throw error;}
    core.managementAccess?.success(socketPeer(peers.get(request) ?? options.peer));
    const method = request.method, body = ['POST', 'PATCH'].includes(method) ? request.body ? await boundedJSON(request, maxBodyBytes) : {} : undefined;
    const delegated=await managementOperation(core,request,path,body);if(delegated !== undefined)return json(delegated);
    if (path === '/api/management/tokens' && method === 'GET') return json({ data: redact(await core.tokens.list()) });
    if (['/api/management/tokens', '/api/management/tokens/client'].includes(path) && method === 'POST') {
      const client = path.endsWith('/client');
      const input = {...body,...(body.allowed_models ? {model_policy:{allowed_models:body.allowed_models,allow_substitution:body.allow_model_substitution ?? false,substitution_source:body.model_substitution_source ?? null}}:{}),...(client ? {scope:'',admin:false,account:'primary',principal_id:'primary'}:{})};
      if (client && !body.client_kind) throw new ProtocolError('client_kind is required');
      if (body.run_lease && !body.ephemeral) throw new ProtocolError('run_lease requires an ephemeral wrapper credential');
      if(body.sliding_expiry)input.sliding_window_seconds=(body.ttl_hours ?? 24)*3600;
      if(body.run_lease)input.run_lease_seconds=body.run_lease_seconds ?? 120;
      const result = await core.tokens.issue(input);
      return json({token:typeof result === 'string' ? result : result.token,ttl_hours:body.ttl_hours ?? 24,label:result.record?.label ?? body.label ?? '',...(client ? {client_kind:result.record?.client_kind ?? body.client_kind,principal_id:'primary',model_policy:result.record?.model_policy ?? input.model_policy ?? {}} : {account:body.account ?? null,max_requests:body.max_requests ?? null,max_tokens:body.max_tokens ?? null,rate_limit_per_minute:body.rate_limit_per_minute ?? null,scope:body.scope ?? ''})});
    }
    if (path === '/api/management/tokens/revoke' && method === 'POST') {const id=body.id ?? body.token_id;await core.tokens.revoke(id);return json({revoked:id});}
    if (['/api/management/tokens/rotate','/api/management/tokens/rotate-client'].includes(path) && method === 'POST') {
      const own = path.endsWith('/rotate'),id=own ? adminClaims.sub ?? adminClaims.id : body.id;
      if(!id)throw new ProtocolError('Rotation requires an admin-scoped token; the flat admin key has no subject to revoke');
      const held=await core.tokens.get(id);if(!held)throw new ProtocolError('Token not found',404);
      if(!own && held.scope === 'admin')throw new ProtocolError('Use /api/management/tokens/rotate to rotate an admin credential');
      const result=await core.tokens.rotate(id,body);return json({token:typeof result === 'string' ? result : result.token,revoked:id,...(own ? {ttl_hours:body.ttl_hours ?? 24,label:result.record?.label ?? body.label ?? held.label,scope:'admin'}:{})});
    }
    if (path === '/api/management/providers' && method === 'GET') {
      const list = core.listProviders ? await core.listProviders() : core.providers?.list ? await core.providers.list() : configuration().providers ?? [];
      return json({ data: redact(list) });
    }
    if (path === '/api/management/providers' && method === 'POST') {
      const result = core.upsertProvider ? await core.upsertProvider(body) : core.providers?.upsert ? await core.providers.upsert(body) : undefined;
      if (result === undefined) throw new ProtocolError('Provider mutation is not supported by this core', 501);
      if(result == null)throw new ProtocolError('Provider not found',404);
      return json(redact(result));
    }
    const provider = /^\/api\/management\/providers\/([^/]+)$/.exec(path);
    if (provider && ['GET', 'DELETE'].includes(method)) {
      const name = decodeURIComponent(provider[1]); let result;
      if (method === 'GET') result = core.showProvider ? await core.showProvider(name) : await core.providers?.get?.(name);
      else result = core.removeProvider ? await core.removeProvider(name) : await core.providers?.remove?.(name);
      if (result === undefined) throw new ProtocolError('Provider operation is not supported by this core', 501);
      if(result == null)throw new ProtocolError('Provider not found',404);
      return json(method === 'DELETE' ? {deleted:name} : redact(result));
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
      return json(redact(action === 'policy' ? result.policy ?? result : result));
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
    if (['chat','anthropic'].includes(source) && !Array.isArray(body.messages)) throw new ProtocolError('messages must be an array');
    if (source === 'gemini' && !Array.isArray(body.contents)) throw new ProtocolError('contents must be an array');
    if (source === 'responses' && typeof body.input !== 'string' && !Array.isArray(body.input)) throw new ProtocolError('input must be a string or array');
    if (body.stream !== undefined && typeof body.stream !== 'boolean') throw new ProtocolError('stream must be a boolean');
    if (source === 'responses') {
      if (body.background || body.conversation || body.previous_response_id) throw new ProtocolError('Background, conversation and previous-response execution are not implemented by the native lifecycle store', 501);
      if (body.store !== undefined && typeof body.store !== 'boolean') throw new ProtocolError('store must be a boolean');
    }
    for (const key of ['max_tokens', 'max_completion_tokens', 'max_output_tokens']) if (body[key] !== undefined && (!Number.isSafeInteger(body[key]) || body[key] < 1)) throw new ProtocolError(`${key} must be a positive integer`);
    const claims = await authorize(request, false, body.model);
    const retain = source === 'responses' && body.store !== false;
    const namespace = new URL(request.url).pathname.match(/^\/api\/services\/(?:openai|codex|qwen)\/v1/)?.[0] ?? '/v1';
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
          let endpoint;
          if (protocol === 'gemini') {
            const base = candidate.baseUrl ?? candidate.base_url ?? candidate.provider?.base_url;
            const {model:_model,stream:_stream,...native} = payload;
            if (candidate.auth_type === 'oauth' || candidate.code_assist) {
              endpoint = upstreamURL(base,protocol,`/v1internal:${body.stream ? 'streamGenerateContent' : 'generateContent'}`);
              if(body.stream)endpoint.search='?alt=sse';
              payload={model:(candidate.model ?? body.model).replace(/^models\//,''),request:native,...(candidate.project ? {project:candidate.project}:{})};
            } else {
              endpoint=new URL(base);endpoint.pathname=`${endpoint.pathname.replace(/\/$/,'')}${endpoint.pathname.endsWith('/v1beta') ? '' : '/v1beta'}/models/${encodeURIComponent((candidate.model ?? body.model).replace(/^models\//,''))}:${body.stream ? 'streamGenerateContent':'generateContent'}`;
              if(body.stream)endpoint.search='?alt=sse';payload=native;
            }
          } else endpoint = upstreamURL(candidate.baseUrl ?? candidate.base_url ?? candidate.provider?.base_url, protocol, candidate.endpointPath);
          response = await upstreamFetch(endpoint, { method: 'POST', headers: upstreamHeaders(candidate, protocol, request), body: JSON.stringify(payload), signal: controller.signal, redirect: 'error' });
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
          const usageTracker=new UsageTracker({maxBytes:maxResponseBytes});
          const measuredBody=response.body.pipeThrough(new TransformStream({transform(chunk,controller){usageTracker.feed(chunk);controller.enqueue(chunk);}}));
          const measuredUsage = usage => ({...(usage ?? normalizeUsage()),total:Math.max(usage?.total ?? 0,usageTracker.finish().tokens)});
          const callbacks = {
            clock, model: body.model,
            onStart: async response => { if (retain) { responseStore.save(namespace, owner, response, responseInput, { abort: () => { resourceCancelled = true; controller.abort(new Error('Response cancelled')); } }); retainedId = response.id; } },
            onComplete: async state => {
              cleanup(); await settle(measuredUsage(state.usage));
              if (retain) {
                if (!state.response || !['completed', 'incomplete'].includes(state.response.status)) throw new ProtocolError('Upstream stream did not supply a completed response resource', 502);
                responseStore.save(namespace, owner, state.response, responseInput, { update: true });
              }
              await core.reportSuccess?.(candidate);
            },
            onError: async (_error, state) => { cleanup(); if (retain && retainedId) responseStore.fail(namespace, owner, retainedId); if (!resourceCancelled && !request.signal.aborted) await core.reportFailure?.(candidate, { status: 502 }); await settle(measuredUsage(state?.usage)); },
            onCancel: async () => { cleanup(); controller.abort(); if (retain && retainedId) responseStore.fail(namespace, owner, retainedId); await settle(measuredUsage()); },
          };
          const stream = source === protocol ? monitorNativeStream(measuredBody, protocol, callbacks) : translateStream(measuredBody, protocol, source, body.model, callbacks);
          return new Response(stream, { status: 200, headers: { ...headers, 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'x-accel-buffering': 'no' } });
        }
        let raw;
        try { raw = await boundedJSON(response, maxResponseBytes); }
        catch (error) { throw new ProtocolError(error.status === 413 ? 'Upstream response exceeds limit' : 'Upstream returned malformed JSON', 502); }
        finally { cleanup(); }
        const result = translateResponse(raw, protocol, source, body.model, clock());
        const usage = normalizeUsage(protocol === 'gemini' ? (raw.response ?? raw).usageMetadata : raw.usage, protocol);
        await core.reportSuccess?.(candidate); await settle(usage);
        if (retain) responseStore.save(namespace, owner, result, responseInput);
        return json(result, response.status, headers);
      }
      throw finalError ?? new ProtocolError('All upstream accounts are unavailable', 503);
    } catch (error) { await settle(); throw error; }
  }
  async function handle(request) {
    const incomingMethod=request.method;
    const head=request.method === 'HEAD';
    if(head){const original=request;request=new Request(original,{method:'GET'});if(peers.has(original))peers.set(request,peers.get(original));}
    const path = new URL(request.url).pathname, service = serviceOf(path), source = service === 'gemini' || service === 'vertex' && !path.includes('/publishers/anthropic/') ? 'gemini' : service === 'anthropic' || service === 'bedrock' || path.includes('/publishers/anthropic/') || path.endsWith('/messages') ? 'anthropic' : path.endsWith('/responses') ? 'responses' : 'chat';
    const adapter=path.startsWith('/api/v3/') || path==='/api/graphql' || path.startsWith('/git/');
    const started = clock(); counters.requests++;
    let response;
    try {
      const managementPath=path === '/api/management' || path.startsWith('/api/management/');
      if(listenerKind === 'admin' && !managementPath)response=await serveAdminAsset(request,{directory:options.adminAssetDirectory});
      else {
      const privateService=path.startsWith('/api/services/activitypub/') || path.startsWith('/api/services/github/');
      if(listenerKind === 'admin' && !managementPath || listenerKind === 'inference-only' && (managementPath || privateService || adapter) || listenerKind === 'github-adapter' && !adapter || listenerKind === 'combined' && adapter)throw new ProtocolError('Route not found',404);
      if(configuration().enable_openai_api === false && ['openai','codex','qwen','gemini'].includes(service) || configuration().enable_anthropic_api === false && (service === 'anthropic' || service === 'bedrock' || path.includes('/publishers/anthropic/')))throw new ProtocolError('Route not found',404);
      if(managementPath) {
        const peer=socketPeer(peers.get(request) ?? options.peer);
        if(!peer || !isIP(peer))throw new ProtocolError('management requires socket peer metadata',403);
        const config=core.managementAccess?.config?.() ?? {allow_remote:configuration().management?.allow_remote};
        if(listenerKind !== 'admin' && !config.allow_remote && peer !== '::1' && !peer.startsWith('127.'))throw new ProtocolError('remote management requires MANAGEMENT_ALLOW_REMOTE / --management-allow-remote or the admin listener',403);
        const remaining=core.managementAccess?.check(peer);
        if(remaining) {const error=new ProtocolError('management authentication temporarily locked for this client IP',429);error.retryAfter=remaining;throw error;}
        if(!matchHTTPRoute(request.method,path) && HTTP_ROUTES.some(route=>matchHTTPRoute(route.method,path)))throw new ProtocolError('Method not allowed',405);
      }
      if (['/health', '/api/health'].includes(path) && request.method === 'GET') response = new Response('ok', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      else if(path === '/api/run-lease' && request.method === 'POST') {
        const claims=await authorize(request,false);if(!core.tokens?.renewRunLease)throw new ProtocolError('This credential has no renewable live run lease',409);
        response=json({run_lease_expires_at:await core.tokens.renewRunLease(claims.sub ?? claims.id)});
      }
      else if (path.startsWith('/api/management/')) response = await management(request, path);
      else if(path.startsWith('/api/services/activitypub/')) {response=await activityResponse(request,configuration(),value=>boundedJSON(value,maxBodyBytes,false));if(!response)throw new ProtocolError('Route not found',404);}
      else if(path.startsWith('/api/services/github/') || adapter) {
        githubConfig ??= githubConfiguration(configuration(),options.env ?? core.env ?? {});
        const config=await githubConfig;if(!config.token)throw new ProtocolError('Route not found',404);
        const claims=await authorize(request,false),relay=path.startsWith('/git/') || path.startsWith('/api/services/github/git/') ? relayGit:relayGithub;
        response=await relay(request,{config,claims,fetch:upstreamFetch,maxBodyBytes,maxResponseBytes,timeoutMs});
      }
      else if (path.startsWith('/api/services/gemini/v1beta/models') && request.method === 'GET') {
        const claims=await authorize(request,false), entries=await models(request,claims);
        const project = model => Object.fromEntries(Object.entries({name:model.id,...(model.raw ?? model)}).filter(([key])=>['name','baseModelId','version','displayName','description','inputTokenLimit','outputTokenLimit','supportedGenerationMethods','temperature','maxTemperature','topP','topK'].includes(key)));
        if(path === '/api/services/gemini/v1beta/models')response=json({models:entries.map(project)});
        else {const id=decodeURIComponent(path.slice('/api/services/gemini/v1beta/models/'.length));const found=entries.find(m=>m.id.replace(/^models\//,'') === id);if(!found)throw new ProtocolError('Model not found',404);response=json(project(found));}
      }
      else if ((service === 'gemini' || service === 'vertex' && !path.includes('/publishers/anthropic/')) && request.method === 'POST') {
        const match=/\/models\/([^/]+):(generateContent|streamGenerateContent)$/.exec(path);if(!match)throw new ProtocolError('Route not found',404);
        response=await inference(request,'gemini',{...await boundedJSON(request,maxBodyBytes),model:decodeURIComponent(match[1]),stream:match[2] === 'streamGenerateContent'});
      }
      else if (service === 'bedrock' || service === 'vertex' && path.includes('/publishers/anthropic/')) {
        if(service === 'vertex' && !/\/publishers\/anthropic\/models\/[^/:]+(?:(?::(?:rawPredict|streamRawPredict))|(?:\/count-tokens:rawPredict))$/.test(path))throw new ProtocolError('Route not found',404);
        response=await nativeService.fetch(request);
      }
      else if (/^(?:\/v1|\/api\/services\/(?:openai|codex|qwen)\/v1)\/responses\/(?!compact$|input_tokens$)[^/]+(?:\/(?:cancel|input_items))?$/.test(path)) {
        const match = /^(\/v1|\/api\/services\/(?:openai|codex|qwen)\/v1)\/responses\/([^/]+)(?:\/(cancel|input_items))?$/.exec(path);
        const claims = await authorize(request, false), owner = responseOwner(claims, bearer(request.headers)), id = decodeURIComponent(match[2]);
        let existing; try { existing = responseStore.get(match[1], owner, id); }
        catch (error) { if (error.status !== 404 || !core.nativeCandidates) throw error; response = await nativeService.fetch(request); }
        if (existing) {
        await authorize(request, false, existing.model);
        if (!match[3] && request.method === 'GET') response = json(existing);
        else if (!match[3] && request.method === 'DELETE') response = json(responseStore.delete(match[1], owner, id));
        else if (match[3] === 'cancel' && request.method === 'POST') response = json(responseStore.cancel(match[1], owner, id));
        else if (match[3] === 'input_items' && request.method === 'GET') response = json(responseStore.inputItems(match[1], owner, id, new URL(request.url).searchParams));
        else throw new ProtocolError('Route not found', 404);
        }
      }
      else if (['/v1/models', '/api/models', ...['openai','anthropic','codex','qwen'].map(service => `/api/services/${service}/v1/models`)].includes(path) && request.method === 'GET') {
        const claims = await authorize(request, false); response = json(projectModels(await models(request, claims), source, new URL(request.url).searchParams));
      }
      else if (/^(?:\/v1|\/api\/services\/(?:openai|anthropic|codex|qwen)\/v1)\/models\/[^/]+$/.test(path) && request.method === 'GET') {
        const id = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1)), claims = await authorize(request, false);
        if (!id || id.length > 512 || /[\/\x00-\x1f\x7f]/.test(id)) throw new ProtocolError('Model not found', 404);
        const model = (await models(request, claims)).find(m => m.id === id);
        if (!model) throw new ProtocolError('Model not found', 404);
        const projected = projectModels([model], source).data[0]; if (source === 'anthropic') projected.display_name ??= id;
        response = json(projected);
      }
      else if (['/v1/chat/completions', '/v1/messages', '/v1/responses', ...['openai','codex','qwen'].flatMap(service => [`/api/services/${service}/v1/responses`,`/api/services/${service}/v1/chat/completions`]), '/api/services/anthropic/v1/messages'].includes(path) && request.method === 'POST') {
        const body = await boundedJSON(request.clone(),maxBodyBytes);
        response = core.nativeCandidates && source === 'responses' && /^\/api\/services\/(?:openai|codex)\/v1\/responses$/.test(path) ? await nativeService.fetch(request) : await inference(request,source,body);
      }
      else if (/^\/api\/services\/(?:openai|anthropic|codex|qwen)(?:\/|$)/.test(path)) response = await nativeService.fetch(request);
      else throw new ProtocolError('Route not found', 404);
      }
    } catch (error) {
      counters.failures++;
      if(error.managementAuthenticationFailure || path === '/api/management/admin/bootstrap/confirm' && error.status === 401) {
        const peer=socketPeer(peers.get(request) ?? options.peer);
        await core.managementAccess?.failure(peer);
        const retryAfter=core.managementAccess?.check(peer);if(retryAfter){error=new ProtocolError('management authentication temporarily locked for this client IP',429);error.retryAfter=retryAfter;}
      }
      response=path.startsWith('/api/services/github/') || adapter ? json({message:error.message},error.status ?? 500) : errorResponse(error,source);
      if(error.retryAfter)response.headers.set('retry-after',String(error.retryAfter));
    }
    if(path === '/api/management/admin/bootstrap/confirm' && response.ok)core.managementAccess?.success(socketPeer(peers.get(request) ?? options.peer));
    if(listenerKind === 'admin')hardenAdmin(response);
    if(head){await response.body?.cancel();response=new Response(null,{status:response.status,headers:response.headers});}
    logs.push({ time: started, method: incomingMethod, path, status: response.status, duration_ms: clock() - started }); if (logs.length > 1000) logs.shift();
    return response;
  }
  const router = {
    core, responseStore, fetch: handle, get address() { return server?.address(); },
    async listen({ host = configuration().host ?? '127.0.0.1', port = configuration().port ?? 3000 } = {}) {
      if (server) throw new Error('Router is already listening');
      let secureOptions;
      if (useTLS) {
        const certPath=tlsConfig.tls_cert ?? tlsConfig.tlsCert,keyPath=tlsConfig.tls_key ?? tlsConfig.tlsKey;
        let certificate=certPath,key=keyPath;
        if(tlsConfig.tls_self_signed || tlsConfig.tlsSelfSigned) {
          if(certPath || keyPath)throw new ProtocolError('Self-signed TLS and explicit certificate paths cannot both be configured',500);
          if(!tlsConfig.data_dir)throw new ProtocolError('Self-signed TLS requires a data directory',500);
          await (await import('./resources.mjs')).executeResourceOperation({name:'tls.generate',options:{dns:tlsConfig.tls_dns_names ?? host},config:tlsConfig});
          certificate=join(tlsConfig.data_dir,'tls','cert.pem');key=join(tlsConfig.data_dir,'tls','key.pem');
        }
        if(!certificate || !key)throw new ProtocolError('TLS requires both certificate and key paths',500);
        const pem = async path => {const stat=await lstat(path);if(!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024*1024)throw new ProtocolError('TLS PEM must be a regular file of at most 1 MiB',500);return readFile(path);};
        secureOptions={cert:await pem(certificate),key:await pem(key)};
      }
      const serve = async (incoming, outgoing) => {
        const controller = new AbortController(); incoming.on('aborted', () => controller.abort()); outgoing.on('close', () => { if (!outgoing.writableEnded) controller.abort(); });
        try {
          const headers = new Headers(); for (const [key, value] of Object.entries(incoming.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
          const request = new Request(`${useTLS ? 'https':'http'}://${host.includes(':') ? `[${host}]` : host}:${server.address().port}${incoming.url}`, { method: incoming.method, headers, signal: controller.signal, ...(['GET', 'HEAD'].includes(incoming.method) ? {} : { body: Readable.toWeb(incoming), duplex: 'half' }) });
          peers.set(request,incoming.socket.remoteAddress);
          const result = await handle(request); outgoing.writeHead(result.status, Object.fromEntries(result.headers));
          if (!result.body) outgoing.end(); else Readable.fromWeb(result.body).on('error', () => outgoing.destroy()).pipe(outgoing);
        } catch { if (!outgoing.headersSent) outgoing.writeHead(500, JSON_HEADERS); outgoing.end(JSON.stringify({ error: { message: 'Router request failed' } })); }
      };
      server=useTLS ? createHTTPSServer(secureOptions,serve) : createServer(serve);
      server.on('upgrade',(incoming,socket,head)=>{
        if(!['combined','inference-only'].includes(listenerKind)){socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');return;}
        const headers=new Headers();for(const [name,value] of Object.entries(incoming.headers))if(value !== undefined)headers.set(name,Array.isArray(value)?value.join(', '):value);
        const request=new Request(`${useTLS?'https':'http'}://${host.includes(':')?`[${host}]`:host}:${server.address().port}${incoming.url}`,{headers});
        relayWebSocket(incoming,socket,head,{target:()=>nativeService.websocketTarget(request),authorize:model=>authorize(request,false,model),core,maxMessageBytes:maxBodyBytes,timeoutMs:Math.min(timeoutMs,15000)}).catch(()=>socket.destroy());
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
