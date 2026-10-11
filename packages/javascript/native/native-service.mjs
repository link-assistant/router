import { ProtocolError } from './protocols.mjs';
import { responseOwner } from './responses.mjs';
import { matchHTTPRoute } from './http-route-contract.mjs';

const transport = new Set(['authorization','x-api-key','x-goog-api-key','anthropic-auth-token','proxy-authorization','proxy-authenticate','host','connection','proxy-connection','keep-alive','transfer-encoding','upgrade','te','trailer','content-length','accept-encoding','cookie','chatgpt-account-id','sec-websocket-key','sec-websocket-version','sec-websocket-extensions','sec-websocket-accept']);
const ingress = new Set(['forwarded','x-real-ip','x-client-ip','x-cluster-client-ip','cf-connecting-ip','true-client-ip','fastly-client-ip','fly-client-ip','x-envoy-external-address','x-azure-clientip','x-appengine-user-ip','cloudfront-viewer-address']);
const responseCredentials = new Set(['authorization','x-api-key','x-goog-api-key','anthropic-auth-token','set-cookie','cookie','chatgpt-account-id']);
const connectionNames = headers => new Set((headers.get('connection') ?? '').split(',').map(v => v.trim().toLowerCase()));
export function nativeRequestHeaders(incoming, candidate) {
  const headers = new Headers(), nominated = connectionNames(incoming);
  for (const [name,value] of incoming) if (!transport.has(name) && !ingress.has(name) && !nominated.has(name) && !name.startsWith('x-forwarded-') && !name.startsWith('x-router-') && !name.startsWith('x-link-assistant-')) headers.append(name,value);
  const credential = candidate.apiKey ?? candidate.api_key;
  if (credential) headers.set('authorization', `Bearer ${credential}`);
  for (const [name,value] of Object.entries(candidate.oauth_headers ?? {})) if (typeof value === 'string' && ['chatgpt-account-id','originator','anthropic-beta','anthropic-version'].includes(name.toLowerCase())) headers.set(name,value);
  return headers;
}
export function nativeResponseHeaders(incoming) {
  const headers = new Headers(), nominated = connectionNames(incoming);
  const hop = new Set(['connection','proxy-connection','keep-alive','transfer-encoding','upgrade','te','trailer','content-length']);
  for (const [name,value] of incoming) if (!hop.has(name) && !responseCredentials.has(name) && !nominated.has(name) && !name.startsWith('x-router-') && !name.startsWith('x-link-assistant-') && !/^x-codex-(?:plan-type|active-limit|credits-balance)/.test(name)) headers.append(name,value);
  return headers;
}
export async function boundedBytes(request, limit) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(), parts = []; let length = 0;
  try {
    for (;;) { const {done,value} = await reader.read(); if (done) break; length += value.byteLength; if (length > limit) { await reader.cancel(); throw new ProtocolError('Request body exceeds limit',413); } parts.push(value); }
  } finally { reader.releaseLock(); }
  return Buffer.concat(parts,length);
}
export function nativeURL(base, service, pathname, search = '') {
  let url; try { url = new URL(base); } catch { throw new ProtocolError('Native provider base URL is invalid',503); }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new ProtocolError('Native provider base URL is invalid',503);
  const prefix = service === 'codex-backend' ? '/api/services/codex/backend-api' : `/api/services/${service}`;
  let tail = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname;
  let root = url.pathname.replace(/\/$/,'');
  if (service === 'codex-backend') root = root.replace(/\/codex$/,'');
  else if (root.endsWith('/v1') && tail.startsWith('/v1/')) tail = tail.slice(3);
  if (service === 'codex' && pathname === '/api/services/codex/v1/live') { tail = '/v1/realtime/calls'; search += `${search ? '&' : '?'}intent=quicksilver&architecture=avas`; }
  url.pathname = root + tail; url.search = search; return url;
}
const destination = c => ({provider:typeof c.provider === 'string' ? c.provider : c.provider?.name,account:typeof c.account === 'string' ? c.account : c.account?.name,protocol:c.protocol,base_url:c.baseUrl ?? c.base_url ?? c.provider?.base_url});
const sameDestination = (a,b) => ['provider','account','protocol','base_url'].every(key => a[key] === b[key]);
export class NativeAffinityStore {
  constructor({maxRecords=10000} = {}) { this.records = new Map(); this.maxRecords = maxRecords; }
  key(namespace,owner,id) { return JSON.stringify([namespace,owner,id]); }
  get(namespace,owner,id) { return structuredClone(this.records.get(this.key(namespace,owner,id)) ?? null); }
  set(namespace,owner,id,record) {
    const key = this.key(namespace,owner,id), previous = this.records.get(key);
    if (previous && !sameDestination(previous.destination,record.destination)) throw new ProtocolError('Resource id belongs to another exact account',409);
    if (!previous && this.records.size >= this.maxRecords) throw new ProtocolError('Resource affinity storage is full',507);
    this.records.set(key,{...structuredClone(record),namespace,owner,id});
  }
  delete(namespace,owner,id) { this.records.delete(this.key(namespace,owner,id)); }
  list(namespace,owner,parent_id) { return [...this.records.values()].filter(r => r.namespace === namespace && r.owner === owner && (parent_id === undefined || r.parent_id === parent_id)).map(r => structuredClone(r)); }
}
function resourceFor(path, method, headers) {
  const roots = [
    ['/api/services/anthropic/v1/files',true], ['/api/services/anthropic/v1/messages/batches',false],
    ['/api/services/anthropic/v1/skills',false], ['/api/services/codex/backend-api/files',false],
    ['/api/services/openai/v1/realtime/calls',false], ['/api/services/codex/v1/realtime/calls',false],
    ['/api/services/codex/v1/live',false],
  ];
  const lifecycle = /^(\/api\/services\/(?:openai|codex|qwen)\/v1|\/v1)\/(conversations|chat\/completions|responses)(.*)$/.exec(path);
  if (lifecycle) roots.push([`${lifecycle[1]}/${lifecycle[2]}`,false]);
  for (const [root,listable] of roots) {
    if (path !== root && !path.startsWith(root+'/')) continue;
    const segments = path.slice(root.length).split('/').filter(Boolean).map(decodeURIComponent);
    if (!segments.length) return {namespace:root,create:method === 'POST',list:method === 'GET' && (listable || root.endsWith('batches') || root.endsWith('skills') || root.endsWith('chat/completions'))};
    if (root.endsWith('skills') && segments[1] === 'versions') return {namespace:root+'/versions',parent:segments[0],id:segments[2],create:method === 'POST' && segments.length === 2,list:method === 'GET' && segments.length === 2};
    if (root.endsWith('conversations') && segments[1] === 'items') return {namespace:root+'/items',parent:segments[0],id:segments[2],create:method === 'POST' && segments.length === 2,list:method === 'GET' && segments.length === 2};
    return {namespace:root,id:segments[0],remove:method === 'DELETE'};
  }
  if (path === '/api/services/codex/backend-api/ps/mcp') {
    const id = headers.get('mcp-session-id'); if (id && (id.length > 256 || id.includes(','))) throw new ProtocolError('Mcp-Session-Id is invalid');
    return id ? {namespace:path,id,remove:method === 'DELETE'} : method === 'POST' ? {namespace:path,create:true,mcp:true} : null;
  }
  return null;
}

/** Opaque vendor operations: preserve bytes and bind owner resources to an exact account. */
export function createNativeService({core,authorize,routingContext,fetch:upstreamFetch=globalThis.fetch,maxBodyBytes=4*1024*1024,maxResponseBytes=32*1024*1024,timeoutMs=120000,affinities=core.affinities ?? new NativeAffinityStore()}) {
  async function select(request, claims, service, document, exact) {
    const context = {...routingContext(request,claims),service,model:document?.model,protocol:service === 'anthropic' ? 'anthropic' : 'chat'};
    const candidates = core.nativeCandidates ? await core.nativeCandidates(context) : context.model ? await core.candidates(context) : [];
    const raw = candidates.find(c => !exact || sameDestination(exact,destination(c)));
    if (!raw) throw new ProtocolError(exact ? 'The native resource exact account is unavailable' : 'Native service provider is unavailable',503);
    const candidate = core.prepareCandidate ? await core.prepareCandidate(raw) : raw;
    if (exact && !sameDestination(exact,destination(candidate))) throw new ProtocolError('Native resource account changed',503);
    return candidate;
  }
  return {
    affinities,
    async fetch(request) {
      const url = new URL(request.url), path = url.pathname;
      if (!matchHTTPRoute(request.method,path)) throw new ProtocolError('Route not found',404);
      const serviceMatch = /^\/api\/services\/(openai|anthropic|codex|qwen)(?:\/|$)/.exec(path);
      const service = path.startsWith('/api/services/codex/backend-api/') ? 'codex-backend' : serviceMatch?.[1] ?? 'openai';
      const claims = await authorize(request,false);
      const client = claims.client_kind ?? claims.client;
      if (service === 'anthropic' && client !== 'claude-code' || service.startsWith('codex') && client !== 'codex') throw new ProtocolError('Native service requires a credential bound to its official client',403);
      if (service === 'codex-backend' && !request.headers.get('authorization')?.startsWith('Bearer at-')) throw new ProtocolError('Codex backend requires the paired Router-issued at- token',401);
      if (path === '/api/services/openai/v1/realtime/client_secrets') throw new ProtocolError('Router does not expose upstream Realtime client secrets',501);
      if (service === 'qwen' && path.includes('/conversations')) throw new ProtocolError('Qwen does not support Conversations',501);
      const owner = responseOwner(claims,request.headers.get('authorization') ?? request.headers.get('x-api-key'));
      const bytes = await boundedBytes(request,maxBodyBytes);
      let document; try { document = bytes.length ? JSON.parse(Buffer.from(bytes).toString('utf8')) : undefined; } catch { /* opaque multipart/binary bodies are forwarded */ }
      if (request.method === 'POST' && /\/(?:responses\/(?:compact|input_tokens)|images\/generations|audio\/speech|alpha\/search)$/.test(path) && (!document || typeof document !== 'object' || Array.isArray(document))) throw new ProtocolError('The native service request body must be a JSON object');
      if (document?.model) await authorize(request,false,document.model);
      for (const batch of document?.requests ?? []) if (batch.params?.model) await authorize(request,false,batch.params.model);
      const resource = resourceFor(path,request.method,request.headers);
      let exact;
      const bind = record => { if (!record) throw new ProtocolError('Native resource not found',404); if (exact && !sameDestination(exact,record.destination)) throw new ProtocolError('Resources do not share one provider account',409); exact = record.destination; };
      if (resource?.id) bind(await affinities.get(resource.namespace,owner,resource.id));
      if (resource?.parent) bind(await affinities.get(resource.namespace.replace(/\/(?:items|versions)$/,''),owner,resource.parent));
      if (document?.previous_response_id) bind(await affinities.get(path.replace(/\/responses(?:\/.*)?$/,'/responses'),owner,document.previous_response_id));
      if (document?.conversation) bind(await affinities.get(path.replace(/\/responses(?:\/.*)?$/,'/conversations'),owner,typeof document.conversation === 'string' ? document.conversation : document.conversation.id));
      const listed = resource?.list ? await affinities.list(resource.namespace,owner,resource.parent) : [];
      for (const record of listed) bind(record);
      const candidate = await select(request,claims,service,document,exact), selected = destination(candidate);
      const controller = new AbortController(), abort = () => controller.abort(request.signal.reason);
      request.signal.addEventListener('abort',abort,{once:true});
      const timer = setTimeout(() => controller.abort(new Error('Native upstream timeout')),timeoutMs); timer.unref?.();
      const cleanup = () => {clearTimeout(timer);request.signal.removeEventListener('abort',abort);};
      let upstream;
      try { upstream = await upstreamFetch(nativeURL(selected.base_url,service,path,url.search),{method:request.method,headers:nativeRequestHeaders(request.headers,candidate),...(['GET','HEAD'].includes(request.method) ? {} : {body:bytes}),signal:controller.signal,redirect:'manual'}); }
      catch { cleanup(); throw new ProtocolError('Native upstream request failed',502); }
      const headers = nativeResponseHeaders(upstream.headers);
      if (resource && (resource.create || resource.list) && upstream.ok) {
        let raw; try { raw = await boundedBytes(upstream,maxResponseBytes); } finally { cleanup(); }
        let value; try { value = JSON.parse(Buffer.from(raw).toString('utf8')); } catch { if (!resource.mcp && !path.includes('/realtime/') && !path.endsWith('/live')) throw new ProtocolError('Native upstream resource response is malformed',502); }
        if (resource.create) {
          const id = resource.mcp ? headers.get('mcp-session-id') : value?.id ?? headers.get('location')?.split('/').at(-1);
          if (!id || typeof id !== 'string' || id.length > 512) throw new ProtocolError('Native resource response did not contain a valid id',502);
          await affinities.set(resource.namespace,owner,id,{destination:selected,parent_id:resource.parent,model:document?.model});
          if (path.includes('/realtime/calls') || path.endsWith('/live')) headers.set('location',`${path.replace(/\/$/,'')}/${encodeURIComponent(id)}`);
        }
        if (resource.list) {
          if (!Array.isArray(value?.data)) throw new ProtocolError('Native resource list response is malformed',502);
          const allowed = new Set(listed.map(r => r.id)); value.data = value.data.filter(item => allowed.has(item.id));
          value.first_id = value.data[0]?.id ?? null; value.last_id = value.data.at(-1)?.id ?? null;
          raw = Buffer.from(JSON.stringify(value));
        }
        return new Response(raw,{status:upstream.status,headers});
      }
      if (resource?.remove && (upstream.ok || [404,410].includes(upstream.status))) await affinities.delete(resource.namespace,owner,resource.id);
      if (!upstream.body) {cleanup();return new Response(null,{status:upstream.status,headers});}
      const reader = upstream.body.getReader();
      const stream = new ReadableStream({async pull(c) { try { const {done,value} = await reader.read(); if (done) {cleanup();reader.releaseLock();c.close();} else c.enqueue(value); } catch(error) {cleanup();c.error(error);} },async cancel(reason) {controller.abort(reason);cleanup();await reader.cancel(reason);reader.releaseLock();}});
      return new Response(stream,{status:upstream.status,headers});
    },
  };
}
