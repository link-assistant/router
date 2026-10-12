import { ProtocolError } from './protocols.mjs';
import { responseOwner } from './responses.mjs';
import { matchHTTPRoute } from './http-route-contract.mjs';
import {createHash} from 'node:crypto';
import {UsageTracker} from './usage.mjs';
import { responseContract, validateResponseCreate, responseReferences, responseNotFound, responseReferenceMissing, responseReferenceConflict, responseAffinityStorageError } from './response-contracts.mjs';
import { conversationContract, conversationNotFound, conversationUnsupported, conversationMethodNotAllowed, conversationAffinityError, conversationUpstreamError, conversationIds, validConversationId } from './response-contracts.mjs';
import { captureSseId, captureJsonId, captureLocationId, resourceCaptureError } from './response-contracts.mjs';

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
const captureFailure = (status,message) => Object.assign(new ProtocolError(message,status),{resourceCapture:true});
async function recordCapturedResource(affinities,namespace,owner,id,selected,model) {
  try {
    if (!validConversationId(id)) throw new Error('invalid response id');
    await affinities.set(namespace,owner,id,{destination:selected,model});
  } catch (error) { throw captureFailure(503,`could not persist resource ownership: ${error.message ?? String(error)}`); }
}
async function captureNativeStream(upstream,{namespace,owner,selected,affinities,model,cleanup,controller,limit=1024*1024}) {
  if (!upstream.body) {cleanup();throw captureFailure(502,'stored stream ended before exposing a resource id');}
  const reader=upstream.body.getReader(),chunks=[];let framed=Buffer.alloc(0),bytes=0,id;
  try {
    while(!id) {
      const {done,value}=await reader.read();if(done)throw captureFailure(502,'stored stream ended before exposing a resource id');
      chunks.push(value);bytes+=value.byteLength;framed=Buffer.concat([framed,value]);
      for (;;) {
        const crlf=framed.indexOf('\r\n\r\n'),lf=framed.indexOf('\n\n');
        const end=crlf>=0 && (lf<0 || crlf<=lf) ? crlf : lf;
        if (end<0) break;
        const separator=end===crlf ? 4 : 2;
        const block=framed.subarray(0,end).toString('utf8');framed=framed.subarray(end+separator);
        id=captureSseId(block);if(id)break;
      }
      // Original ordering: search every complete block in the current chunk
      // before checking the still-unidentified prefix's accumulated size.
      if(!id && bytes>limit)throw captureFailure(502,'stored stream did not expose a bounded resource id');
    }
    await recordCapturedResource(affinities,namespace,owner,id,selected,model);
  }catch(error){controller.abort(error);cleanup();await reader.cancel().catch(()=>{});reader.releaseLock();throw error.resourceCapture ? error : captureFailure(502,`upstream stream failed: ${error.message ?? String(error)}`);}
  const prefix=Buffer.concat(chunks,bytes);chunks.length=0;framed=Buffer.alloc(0);
  let initial=true;
  return new ReadableStream({async pull(c){try{if(initial){initial=false;c.enqueue(prefix);return;}const {done,value}=await reader.read();if(done){cleanup();reader.releaseLock();c.close();}else c.enqueue(value);}catch(error){cleanup();reader.releaseLock();c.error(error);}},async cancel(reason){controller.abort(reason);cleanup();try{await reader.cancel(reason);}finally{reader.releaseLock();}}});
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
const destination = c => ({provider:c.destination_kind === 'subscription' ? c.provider_kind : typeof c.provider === 'string' ? c.provider : c.provider?.name,account:c.destination_kind === 'stored_provider' ? typeof c.provider === 'string' ? c.provider:c.provider?.name : c.native_account ?? (typeof c.account === 'string' ? c.account : c.account?.name),protocol:c.protocol === 'chat' ? 'openai' : c.protocol,base_url:c.baseUrl ?? c.base_url ?? c.provider?.base_url,account_id:c.destination_kind === 'stored_provider' ? undefined:c.account_id ?? undefined,provider_kind:c.provider_kind ?? c.kind,destination_kind:c.destination_kind});
const sameDestination = (a,b) => ['provider','account','protocol','base_url','account_id','provider_kind','destination_kind'].every(key => a[key] === b[key]);
export class NativeAffinityStore {
  constructor({maxRecords=10000} = {}) { this.records = new Map(); this.maxRecords = maxRecords; }
  key(namespace,owner,id,parent_id) { return JSON.stringify([namespace,typeof owner === 'object' ? [owner.client_kind,owner.principal_id] : owner,id,parent_id ?? null]); }
  get(namespace,owner,id,parent_id) {
    if (parent_id !== undefined) return structuredClone(this.records.get(this.key(namespace,owner,id,parent_id)) ?? null);
    const matching = this.list(namespace,owner).filter(record => record.id === id);
    return matching.length === 1 ? matching[0] : null;
  }
  set(namespace,owner,id,record) {
    const key = this.key(namespace,owner,id,record.parent_id), previous = this.records.get(key);
    if (previous && !sameDestination(previous.destination,record.destination)) throw new ProtocolError('Resource id belongs to another exact account',409);
    if (!previous && this.records.size >= this.maxRecords) throw new ProtocolError('Resource affinity storage is full',507);
    this.records.set(key,{...structuredClone(record),namespace,owner,id});
  }
  delete(namespace,owner,id,parent_id,expected) {
    const key = this.key(namespace,owner,id,parent_id), record = this.records.get(key);
    if (!record || expected && !sameDestination(record.destination,expected.destination ?? expected)) return false;
    return this.records.delete(key);
  }
  list(namespace,owner,parent_id) { return [...this.records.values()].filter(r => r.namespace === namespace && this.key(namespace,r.owner,'') === this.key(namespace,owner,'') && (parent_id === undefined || r.parent_id === parent_id)).map(r => structuredClone(r)); }
  deleteChildren(namespace,owner,parent_id,selected) {
    let count = 0;
    for (const record of this.list(namespace,owner,parent_id)) if (sameDestination(record.destination,selected)) { this.records.delete(this.key(namespace,owner,record.id,parent_id)); count++; }
    return count;
  }
}
function resourceFor(path, method, headers) {
  const backend='/api/services/codex/backend-api';
  if(path === backend+'/public/plugins/workspace/upload-url' && method === 'POST')return {namespace:backend+'/plugin-uploads',create:true,idFields:['file_id']};
  if(path === backend+'/public/plugins/workspace')return {namespace:backend+'/public/plugins/workspace',create:method === 'POST',list:method === 'GET',itemsField:'plugins',idFields:['plugin_id','id']};
  const plugin=/^\/api\/services\/codex\/backend-api\/(?:plugins|ps\/plugins)\/([^/]+)\/(enable|install|uninstall)$/.exec(path);
  if(plugin && method === 'POST')return {namespace:backend+'/plugin-installs',...(plugin[2] === 'uninstall' ? {id:decodeURIComponent(plugin[1]),remove:true}:{declaredId:decodeURIComponent(plugin[1]),create:true})};
  const workspace=/^\/api\/services\/codex\/backend-api\/(?:public\/plugins\/workspace\/([^/]+)|ps\/plugins\/([^/]+)\/shares)$/.exec(path);
  if(workspace)return {namespace:backend+'/public/plugins/workspace',id:decodeURIComponent(workspace[1] ?? workspace[2]),remove:method === 'DELETE'};
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
    const namespace = root === '/api/services/codex/v1/live' ? '/api/services/codex/v1/realtime/calls' : root;
    if(root.endsWith('/responses') && segments[0] === 'compact' && method === 'POST')return {namespace:root,create:true};
    if(root.endsWith('/responses') && segments[0] === 'input_tokens')return null;
    if (!segments.length) return {namespace,create:method === 'POST',list:method === 'GET' && (listable || root.endsWith('batches') || root.endsWith('skills') || root.endsWith('chat/completions'))};
    if (root.endsWith('skills') && segments[1] === 'versions') return {namespace:root+'/versions',parent:segments[0],id:segments[2],create:method === 'POST' && segments.length === 2,list:method === 'GET' && segments.length === 2,remove:method === 'DELETE',idFields:['version','id']};
    if (root.endsWith('conversations') && segments[1] === 'items') return {namespace:root+'/items',parent:segments[0],id:segments[2],create:method === 'POST' && segments.length === 2,list:method === 'GET' && segments.length === 2,remove:method === 'DELETE',captureList:true};
    return {namespace,id:segments[0],remove:method === 'DELETE'};
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
    const pathModel = /\/publishers\/anthropic\/models\/([^/:]+)(?:\/count-tokens)?:(?:rawPredict|streamRawPredict)$/.exec(new URL(request.url).pathname)?.[1];
    const context = {...routingContext(request,claims),service,model:document?.model ?? (pathModel ? decodeURIComponent(pathModel) : undefined),protocol:['anthropic','bedrock','vertex'].includes(service) ? 'anthropic' : 'chat'};
    if (exact && (responseContract(request.method,new URL(request.url).pathname) || conversationContract(request.method,new URL(request.url).pathname))) {
      context.provider = exact.provider;
      context.resourceDestination = exact;
      // Recorded subscription bindings use logical names (implicit providers
      // expose "primary"). Core maps those through principalAccountScope;
      // pinnedAccount instead means a physical account record key.
      if (exact.destination_kind === 'subscription') context.principalAccount = exact.account;
    }
    const candidates = core.nativeCandidates ? await core.nativeCandidates(context) : context.model ? await core.candidates(context) : [];
    const raw = candidates.find(c => !exact || ['provider','account','base_url'].every(key => exact[key] === destination(c)[key]));
    if (!raw) throw new ProtocolError(exact ? 'The native resource exact account is unavailable' : 'Native service provider is unavailable',503);
    const candidate = core.prepareCandidate ? await core.prepareCandidate(raw) : raw;
    core.requestLog?.select(candidate.account);
    if (exact && !sameDestination(exact,destination(candidate))) throw new ProtocolError('Native resource account changed',503);
    return candidate;
  }
  return {
    affinities,
    async websocketTarget(request) {
      const url=new URL(request.url),path=url.pathname,service=/^\/api\/services\/(openai|codex|qwen)\//.exec(path)?.[1];
      if(!service || !matchHTTPRoute('GET',path) || !/\/(?:responses|realtime|live)(?:\/[^/]+)?$/.test(path))throw new ProtocolError('Route not found',404);
      const claims=await authorize(request,false),client=claims.client_kind ?? claims.client;
      if(!client || !claims.principal_id)throw new ProtocolError('Native services require a client and principal bound Router token',403);
      if(service === 'qwen')throw new ProtocolError('Qwen does not support Responses WebSocket transport',501);
      if(service === 'codex' && client !== 'codex')throw new ProtocolError('Codex service requires a Codex-bound Router token',403);
      const owner={client_kind:claims.client_kind,principal_id:claims.principal_id};
      let exact;
      const calls=url.searchParams.getAll('call_id');if(calls.length > 1 || calls.length === 1 && !calls[0])throw new ProtocolError('Exactly one nonempty Realtime call_id is allowed');
      const liveId=/\/live\/([^/]+)$/.exec(path)?.[1],id=liveId ? decodeURIComponent(liveId):calls[0];
      if(id){const namespace=`/api/services/${service}/v1/realtime/calls`,record=await affinities.get(namespace,owner,id);if(!record)throw new ProtocolError('Realtime call not found',404);exact=record.destination;}
      const candidate=await select(request,claims,service,{model:url.searchParams.get('model') ?? undefined},exact),selected=destination(candidate);
      if(service === 'openai' && selected.provider_kind !== 'openai-compatible')throw new ProtocolError('Selected provider does not implement native OpenAI resource APIs',503);
      return {url:nativeURL(selected.base_url,service,path,url.search),headers:nativeRequestHeaders(request.headers,candidate),claims};
    },
    async fetch(request) {
      const url = new URL(request.url), path = url.pathname;
      if (!matchHTTPRoute(request.method,path)) throw new ProtocolError('Route not found',404);
      const serviceMatch = /^\/api\/services\/(openai|anthropic|codex|qwen|bedrock|vertex)(?:\/|$)/.exec(path);
      const service = path.startsWith('/api/services/codex/backend-api/') ? 'codex-backend' : serviceMatch?.[1] ?? 'openai';
      const claims = await authorize(request,false);
      const client = claims.client_kind ?? claims.client;
      if (!client || !claims.principal_id) throw new ProtocolError('Native services require a client and principal bound Router token',403);
      if (service === 'anthropic' && client !== 'claude' || service.startsWith('codex') && client !== 'codex') throw new ProtocolError('Native service requires a credential bound to its official client',403);
      if (service === 'codex-backend' && !request.headers.get('authorization')?.startsWith('Bearer at-')) throw new ProtocolError('Codex backend requires the paired Router-issued at- token',401);
      if (path === '/api/services/openai/v1/realtime/client_secrets') throw new ProtocolError('Router does not expose upstream Realtime client secrets',501);
      const conversation = conversationContract(request.method,path);
      if (conversation?.service === 'qwen') return conversationUnsupported();
      const owner = claims.client_kind && claims.principal_id ? {client_kind:claims.client_kind,principal_id:claims.principal_id} : responseOwner(claims,request.headers.get('authorization') ?? request.headers.get('x-api-key'));
      let conversationRecord, conversationItem;
      if (conversation && conversation.target !== 'create') {
        try {
          conversationRecord = await affinities.get(conversation.namespace,owner,conversation.id);
          if (!conversationRecord) return conversationNotFound();
          if (conversation.target === 'item') {
            conversationItem = await affinities.get(conversation.itemNamespace,owner,conversation.item);
            if (!conversationItem || conversationItem.parent_id !== conversation.id || !sameDestination(conversationItem.destination,conversationRecord.destination)) return conversationNotFound(true);
          }
        } catch (error) { return conversationAffinityError(error); }
      }
      if (conversation && !conversation.allowed) return conversationMethodNotAllowed();
      const conversationDestination = conversationItem?.destination ?? conversationRecord?.destination;
      if (conversationDestination?.destination_kind === 'subscription' && (claims.account ?? 'primary') !== conversationDestination.account) return responseNotFound();
      const identityRoute=path === '/api/services/codex/v1/user-auth-credential/whoami' || path === '/api/services/codex/backend-api/wham/accounts/check';
      const tokenId=claims.sub ?? claims.id;
      if(!identityRoute && tokenId && core.tokens?.admit){const admitted=await core.tokens.admit(tokenId,0);if(admitted === false || typeof admitted === 'string' && admitted !== 'admitted')throw new ProtocolError(typeof admitted === 'string'?admitted:'Token budget exceeded',429);}
      const bytes = await boundedBytes(request,maxBodyBytes);
      let document; try { document = bytes.length ? JSON.parse(Buffer.from(bytes).toString('utf8')) : undefined; } catch { /* opaque multipart/binary bodies are forwarded */ }
      const responses = responseContract(request.method,path);
      try { validateResponseCreate(responses,document); }
      catch (error) {
        if (!(error instanceof ProtocolError)) throw error;
        return Response.json({error:{type:error.code === 'model_required' ? 'model_required' : 'invalid_request_error',message:error.message}},{status:error.status ?? 400});
      }
      if (request.method === 'POST' && /\/(?:responses\/(?:compact|input_tokens)|images\/generations|audio\/speech|alpha\/search)$/.test(path) && (!document || typeof document !== 'object' || Array.isArray(document))) throw new ProtocolError('The native service request body must be a JSON object');
      if (!conversation && document?.model) await authorize(request,false,document.model);
      if (['bedrock','vertex'].includes(service) && (!document || !Array.isArray(document.messages))) throw new ProtocolError('messages must be an array');
      if (!conversation) for (const batch of document?.requests ?? []) if (batch.params?.model) await authorize(request,false,batch.params.model);
      const resource = conversation ? null : resourceFor(path,request.method,request.headers);
      if(document?.store === false && resource?.namespace.endsWith('/responses'))resource.create=false;
      let exact = conversationDestination, resourceRecord;
      const bind = record => { if (!record) throw new ProtocolError('Native resource not found',404); if (exact && !sameDestination(exact,record.destination)) throw new ProtocolError('Resources do not share one provider account',409); exact = record.destination; };
      if (resource?.id) {
        resourceRecord = await affinities.get(resource.namespace,owner,resource.id,resource.parent);
        if (!resourceRecord && responses?.lifecycle) return responseNotFound();
        bind(resourceRecord);
        if (responses?.lifecycle && resourceRecord.destination.destination_kind === 'subscription' && (claims.account ?? 'primary') !== resourceRecord.destination.account) return responseNotFound();
      }
      if (resource?.parent) bind(await affinities.get(resource.namespace.replace(/\/(?:items|versions)$/,''),owner,resource.parent));
      for (const reference of responseReferences(responses,document)) {
        const record = await affinities.get(reference.namespace,owner,reference.id);
        if (!record && reference.allowMissing) continue;
        if (!record) return responseReferenceMissing();
        if (responses?.create && record.destination.destination_kind === 'subscription' && (claims.account ?? 'primary') !== record.destination.account) return responseNotFound();
        if (exact && !sameDestination(exact,record.destination)) return responseReferenceConflict();
        bind(record);
      }
      const listed = resource?.list ? await affinities.list(resource.namespace,owner,resource.parent) : [];
      if(!resource?.captureList)for (const record of listed) bind(record);
      if(service === 'codex-backend' && document?.file_id && path.startsWith('/api/services/codex/backend-api/public/plugins/workspace'))bind(await affinities.get('/api/services/codex/backend-api/plugin-uploads',owner,document.file_id));
      const candidate = await select(request,claims,service,conversation ? undefined : document,exact), selected = destination(candidate);
      if (conversation && !(conversation.service === 'openai' && selected.provider_kind === 'openai-compatible' && selected.destination_kind !== 'subscription' || conversation.service === 'codex' && selected.provider_kind === 'codex' && selected.destination_kind === 'subscription')) return conversationUnsupported();
      if (service === 'openai' && selected.provider_kind !== 'openai-compatible') throw new ProtocolError('Selected provider does not implement native OpenAI resource APIs',503);
      if(path === '/api/services/codex/v1/user-auth-credential/whoami' || path === '/api/services/codex/backend-api/wham/accounts/check') {
        if(!request.headers.get('authorization')?.startsWith('Bearer at-'))throw new ProtocolError('Codex identity requires the paired Router-issued at- token',401);
        const handle=(prefix,value)=>`${prefix}_${createHash('sha256').update(value).digest('hex').slice(0,24)}`;
        const account=handle('acct',`${claims.principal_id}:${selected.account}:${candidate.account_id ?? ''}`),user=handle('usr',claims.principal_id);
        let metadata;try{const key=candidate.apiKey ?? candidate.api_key;metadata=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString('utf8'))['https://api.openai.com/auth'];}catch{/* Credential metadata may be absent; never expose the raw token. */}
        const plan=typeof metadata?.chatgpt_plan_type === 'string' && metadata.chatgpt_plan_type.trim().length <= 128 ? metadata.chatgpt_plan_type.trim() || 'unknown':'unknown';
        const body=path.endsWith('/whoami') ? {email:null,chatgpt_user_id:user,chatgpt_account_id:account,chatgpt_plan_type:plan,chatgpt_account_is_fedramp:metadata?.chatgpt_account_is_fedramp === true}:{accounts:[{id:account,plan_type:plan,workspace_backend_origin:new URL(selected.base_url).protocol === 'https:' ? new URL(selected.base_url).origin:'https://chatgpt.com',account_routing_override:'NO_CONSTRAINT'}],account_ordering:[account],default_account_id:account};
        return Response.json(body);
      }
      const controller = new AbortController(), abort = () => controller.abort(request.signal.reason);
      request.signal.addEventListener('abort',abort,{once:true});
      const timer = setTimeout(() => controller.abort(new Error('Native upstream timeout')),timeoutMs); timer.unref?.();
      const cleanup = () => {clearTimeout(timer);request.signal.removeEventListener('abort',abort);};
      let upstream;
      try { upstream = await upstreamFetch(nativeURL(selected.base_url,service,conversation?.forwardPath ?? path,url.search),{method:request.method,headers:nativeRequestHeaders(request.headers,candidate),...(['GET','HEAD'].includes(request.method) ? {} : {body:bytes}),signal:controller.signal,redirect:'manual'}); }
      catch { cleanup(); throw new ProtocolError('Native upstream request failed',502); }
      const headers = nativeResponseHeaders(upstream.headers);
      if (conversation) {
        let raw;
        try { raw = await boundedBytes(upstream,maxBodyBytes); }
        catch (error) { return conversationUpstreamError(error.status === 413 ? 'upstream response exceeds the proxy limit' : `upstream body read failed: ${error.message ?? String(error)}`); }
        finally { cleanup(); }
        const remove = async () => {
          if (conversation.target === 'item') return affinities.delete(conversation.itemNamespace,owner,conversation.item,conversation.id,conversationItem);
          await affinities.deleteChildren(conversation.itemNamespace,owner,conversation.id,conversationRecord.destination);
          return affinities.delete(conversation.namespace,owner,conversation.id,undefined,conversationRecord);
        };
        if (conversation.target !== 'create' && [404,410].includes(upstream.status)) {
          try { await remove(); } catch {}
          return conversationNotFound(conversation.target === 'item');
        }
        if (upstream.ok) {
          try {
            if (conversation.target === 'create') {
              const id = conversationIds(raw)[0];
              if (!id) return conversationUpstreamError('conversation create response did not contain an id');
              if (!validConversationId(id)) throw new Error('invalid response id');
              await affinities.set(conversation.namespace,owner,id,{destination:selected});
            } else if (conversation.target === 'items') {
              for (const id of conversationIds(raw,true)) {
                if (!validConversationId(id)) throw new Error('invalid response id');
                await affinities.set(conversation.itemNamespace,owner,id,{destination:conversationRecord.destination,parent_id:conversation.id});
              }
            } else if (request.method === 'DELETE') await remove();
          } catch (error) { return conversationAffinityError(error); }
        }
        return new Response([204,205,304].includes(upstream.status) ? null : raw,{status:upstream.status,headers});
      }
      if (responses?.lifecycle && resourceRecord) {
        // Rust's lifecycle relay reads the body before any retirement. This
        // also keeps a failed successful-DELETE body read from losing affinity.
        let raw;
        try { raw = await boundedBytes(upstream,maxResponseBytes); }
        catch { throw new ProtocolError('Upstream lifecycle body could not be read within the response limit',502); }
        finally { cleanup(); }
        if ([404,410].includes(upstream.status)) {
          // Rust treats this cleanup as best-effort: a store error cannot turn
          // an upstream missing response into an availability error.
          try { await affinities.delete(resource.namespace,owner,resource.id,resource.parent,resourceRecord); } catch {}
          return responseNotFound();
        }
        if (resource.remove && upstream.ok) {
          try { await affinities.delete(resource.namespace,owner,resource.id,resource.parent,resourceRecord); }
          catch (error) { return responseAffinityStorageError(error); }
        }
        return new Response([204,205,304].includes(upstream.status) ? null : raw,{status:upstream.status,headers});
      }
      const tracksUsage=/\/(?:responses(?:\/compact)?|images\/(?:generations|edits|variations)|audio\/(?:speech|transcriptions|translations)|alpha\/search)$/.test(path);
      if(tracksUsage && tokenId && core.tokens?.settle && upstream.body) {
        const usage=new UsageTracker({maxBytes:maxResponseBytes}),reader=upstream.body.getReader();let settled=false;
        const settle=async()=>{if(settled)return;settled=true;await core.tokens.settle(tokenId,0,usage.finish().tokens);};
        const measured=new ReadableStream({async pull(c){try{const {done,value}=await reader.read();if(done){await settle();reader.releaseLock();c.close();}else{usage.feed(value);c.enqueue(value);}}catch(error){await settle();c.error(error);}},async cancel(reason){await settle();await reader.cancel(reason);reader.releaseLock();}});
        upstream=new Response(measured,{status:upstream.status,headers:upstream.headers});
      }
      if(resource?.create && resource.namespace.endsWith('/responses') && upstream.ok) {
        try {
          if(upstream.headers.get('content-type')?.toLowerCase().includes('text/event-stream')) {
            const stream=await captureNativeStream(upstream,{namespace:resource.namespace,owner,selected,affinities,model:document?.model,cleanup,controller});
            return new Response(stream,{status:upstream.status,headers});
          }
          let raw;
          try { raw=await boundedBytes(upstream,Math.min(maxResponseBytes,32*1024*1024)); }
          catch (error) { throw captureFailure(502,`stored response is too large: ${error.message ?? String(error)}`); }
          finally { cleanup(); }
          const id=captureJsonId(raw) ?? captureLocationId(headers);
          if(!id)throw captureFailure(502,'stored response did not include a resource id');
          await recordCapturedResource(affinities,resource.namespace,owner,id,selected,document?.model);
          return new Response([204,205,304].includes(upstream.status) ? null : raw,{status:upstream.status,headers});
        } catch (error) {
          if(!error.resourceCapture)throw error;
          return resourceCaptureError(error.status,error.message);
        }
      }
      if (resource && (resource.create || resource.list) && upstream.ok) {
        let raw; try { raw = await boundedBytes(upstream,maxResponseBytes); } finally { cleanup(); }
        let value; try { value = JSON.parse(Buffer.from(raw).toString('utf8')); } catch { if (!resource.mcp && !path.includes('/realtime/') && !path.endsWith('/live')) throw new ProtocolError('Native upstream resource response is malformed',502); }
        if(resource.captureList) {
          if(!Array.isArray(value?.data))throw new ProtocolError('Conversation items response is malformed',502);
          for(const item of value.data)if(typeof item.id === 'string' && item.id)await affinities.set(resource.namespace,owner,item.id,{destination:selected,parent_id:resource.parent});
        }
        else if (resource.create) {
          const fields=resource.idFields ?? (path.endsWith('/realtime/calls') || path.endsWith('/live') ? ['call_id','id'] : path === '/api/services/codex/backend-api/files' ? ['file_id','id'] : ['id']);
          const id = resource.declaredId ?? (resource.mcp ? headers.get('mcp-session-id') : fields.map(field=>value?.[field]).find(value=>typeof value === 'string' && value) ?? headers.get('location')?.split('/').at(-1));
          if(resource.mcp && !id)return new Response(raw,{status:upstream.status,headers});
          if (!id || typeof id !== 'string' || id.length > 512) throw new ProtocolError('Native resource response did not contain a valid id',502);
          await affinities.set(resource.namespace,owner,id,{destination:selected,parent_id:resource.parent,model:document?.model});
          if (path.includes('/realtime/calls') || path.endsWith('/live')) headers.set('location',`${path.replace(/\/$/,'')}/${encodeURIComponent(id)}`);
        }
        if (resource.list && !resource.captureList) {
          const field=resource.itemsField ?? 'data',ids=resource.idFields ?? ['id'];
          if (!Array.isArray(value?.[field])) throw new ProtocolError('Native resource list response is malformed',502);
          const allowed = new Set(listed.map(r => r.id)); value[field] = value[field].filter(item => allowed.has(ids.map(key=>item[key]).find(value=>typeof value === 'string' && value)));
          if(Object.hasOwn(value,'first_id'))value.first_id = ids.map(key=>value[field][0]?.[key]).find(Boolean) ?? null;
          if(Object.hasOwn(value,'last_id'))value.last_id = ids.map(key=>value[field].at(-1)?.[key]).find(Boolean) ?? null;
          raw = Buffer.from(JSON.stringify(value));
        }
        return new Response(raw,{status:upstream.status,headers});
      }
      if (resource?.remove && (upstream.ok || [404,410].includes(upstream.status))) {
        if(resource.namespace.endsWith('/skills') || resource.namespace.endsWith('/conversations'))for(const child of await affinities.list(resource.namespace+(resource.namespace.endsWith('/skills')?'/versions':'/items'),owner,resource.id))await affinities.delete(child.namespace,owner,child.id,child.parent_id);
        await affinities.delete(resource.namespace,owner,resource.id,resource.parent);
      }
      if (!upstream.body) {cleanup();return new Response(null,{status:upstream.status,headers});}
      const reader = upstream.body.getReader();
      const stream = new ReadableStream({async pull(c) { try { const {done,value} = await reader.read(); if (done) {cleanup();reader.releaseLock();c.close();} else c.enqueue(value); } catch(error) {cleanup();c.error(error);} },async cancel(reason) {controller.abort(reason);cleanup();await reader.cancel(reason);reader.releaseLock();}});
      return new Response(stream,{status:upstream.status,headers});
    },
  };
}
