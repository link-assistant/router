import { ProtocolError } from './protocols.mjs';

// Sources: proxy_openai_resource.rs::state_for_previous_response,
// native_service_resources.rs::response_references, responses_lifecycle.rs.
// Provider-owned background jobs are relayed; this module creates no worker.
export function responseContract(method, path) {
  const match = /^(\/api\/services\/(openai|codex|qwen)\/v1|\/v1)\/responses(?:\/(.*))?$/.exec(path);
  if (!match) return null;
  const namespace = `${match[1]}/responses`, service = match[2] ?? 'openai', tail = match[3];
  if (tail === undefined && method === 'POST') return { namespace, service, create: true };
  if (['compact', 'input_tokens'].includes(tail) && method === 'POST') return { namespace, service, helper: tail };
  if (tail && !['compact', 'input_tokens'].includes(tail)) return { namespace, service, lifecycle: true };
  return null;
}

export function validateResponseCreate(contract, document) {
  if (!contract?.create) return;
  if (!document || typeof document !== 'object' || Array.isArray(document)) throw new ProtocolError('The Responses request body must be a JSON object');
  if (typeof document.model !== 'string' || !document.model) {
    const error = new ProtocolError('request model must be a non-empty exact catalog id'); error.code = 'model_required'; throw error;
  }
  if (Object.hasOwn(document, 'previous_response_id') && (typeof document.previous_response_id !== 'string' || !document.previous_response_id)) throw new ProtocolError('previous_response_id must be a non-empty string');
}

export function responseReferences(contract, document) {
  if (!contract || !document || typeof document !== 'object') return [];
  const references = [];
  if ((contract.create || contract.helper) && typeof document.previous_response_id === 'string' && document.previous_response_id) {
    // Rust deliberately preserves older provider-created continuation IDs on
    // create. Helpers require a known owner affinity; they cannot route a legacy
    // identifier to an arbitrary provider.
    references.push({ namespace: contract.namespace, id: document.previous_response_id, allowMissing: Boolean(contract.create) });
  }
  if (contract.helper === 'input_tokens' && contract.service === 'openai') {
    const id = typeof document.conversation === 'string' ? document.conversation : document.conversation?.id;
    if (typeof id === 'string' && id) references.push({ namespace: contract.namespace.replace(/\/responses$/, '/conversations'), id, allowMissing: false });
  }
  return references;
}

export function responseNotFound() {
  return Response.json({ error: { message: 'Response not found', type: 'invalid_request_error', param: null, code: 'response_not_found' } }, { status: 404 });
}

export function responseReferenceMissing() {
  return Response.json({ error: { type: 'not_found_error', message: 'the referenced response resource is unavailable' } }, { status: 404 });
}

export function responseReferenceConflict() {
  return Response.json({ error: { type: 'invalid_request_error', message: 'the referenced response resources do not share one provider account' } }, { status: 409 });
}

export function responseAffinityStorageError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return Response.json({ error: { type: 'api_error', message: `response affinity is unavailable: ${message}` } }, { status: 503 });
}

// Conversations are provider-owned resources, including child identities. The
// source handlers consume opaque bodies; item-list parse failures mean no IDs
// were captured, rather than replacing the provider's successful body.
export function conversationContract(method, path) {
  const match = /^\/api\/services\/(openai|codex|qwen)\/v1\/conversations(?:\/([^/]+)(?:\/(items)(?:\/([^/]+))?)?)?$/.exec(path);
  if (!match) return null;
  let id, item;
  try { id = match[2] === undefined ? undefined : decodeURIComponent(match[2]); item = match[4] === undefined ? undefined : decodeURIComponent(match[4]); }
  catch { throw new ProtocolError('Conversation resource path contains invalid percent encoding'); }
  const namespace = `/api/services/${match[1]}/v1/conversations`, itemNamespace = namespace + '/items';
  const target = id === undefined ? 'create' : !match[3] ? 'conversation' : item === undefined ? 'items' : 'item';
  const allowed = { create: ['POST'], conversation: ['GET', 'PATCH', 'DELETE'], items: ['GET', 'POST'], item: ['GET', 'DELETE'] };
  const segment = value => [...Buffer.from(value)].map(byte => byte >= 65 && byte <= 90 || byte >= 97 && byte <= 122 || byte >= 48 && byte <= 57 || [45,46,95,126].includes(byte) ? String.fromCharCode(byte) : '%' + byte.toString(16).toUpperCase().padStart(2,'0')).join('');
  const forwardPath = namespace + (id === undefined ? '' : '/' + segment(id)) + (match[3] ? '/items' : '') + (item === undefined ? '' : '/' + segment(item));
  return { namespace, itemNamespace, service: match[1], target, id, item, forwardPath, allowed: allowed[target].includes(method) };
}

export function conversationNotFound(item = false) {
  return Response.json({ error: { message: item ? 'Conversation item not found' : 'Conversation not found', type: 'invalid_request_error', param: null, code: item ? 'conversation_item_not_found' : 'conversation_not_found' } }, { status: 404 });
}
export function conversationUnsupported() {
  return Response.json({ error: { type: 'invalid_request_error', message: 'the selected service does not support native Conversations resources' } }, { status: 400 });
}
export function conversationMethodNotAllowed() {
  return Response.json({ error: { type: 'invalid_request_error', message: 'the requested Conversations operation is not supported' } }, { status: 405 });
}
export function conversationAffinityError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return Response.json({ error: { type: 'api_error', message: `resource affinity is unavailable: ${message}` } }, { status: 503 });
}
export function conversationUpstreamError(message) {
  return Response.json({ error: { type: 'api_error', message } }, { status: 502 });
}
export function conversationIds(raw, list = false) {
  let document; try { document = JSON.parse(Buffer.from(raw).toString('utf8')); } catch { return []; }
  const items = list ? Array.isArray(document?.data) ? document.data : [] : [document];
  return items.map(item => item?.id).filter(id => typeof id === 'string' && id);
}
export function validConversationId(id) {
  return typeof id === 'string' && id.length > 0 && Buffer.byteLength(id) <= 256 && !/[\/\x00-\x1f\x7f-\x9f]/u.test(id);
}

// resource_capture.rs reads each SSE data line independently. Presence of a
// root id takes precedence even when its value is unusable; malformed lines
// are ignored while the bounded prefix waits for another resource identity.
function captureJsonValue(text) {
  let value; try { value = JSON.parse(text); } catch { return undefined; }
  // serde_json constructs Rust UTF-8 Strings, so isolated UTF-16 surrogate
  // escapes are not usable JSON even in otherwise unused metadata or keys.
  const scalar = string => {
    for (let index=0;index<string.length;index++) {
      const unit=string.charCodeAt(index);
      if(unit>=0xd800 && unit<=0xdbff) { const next=string.charCodeAt(++index);if(!(next>=0xdc00 && next<=0xdfff))return false; }
      else if(unit>=0xdc00 && unit<=0xdfff)return false;
    }
    return true;
  };
  const pending=[value];
  while(pending.length) {
    const current=pending.pop();
    if(typeof current==='number' && !Number.isFinite(current))return undefined;
    if(typeof current==='string' && !scalar(current))return undefined;
    if(current && typeof current==='object') for(const [key,child] of Object.entries(current)) {
      if(!scalar(key))return undefined;pending.push(child);
    }
  }
  return value;
}
export function captureSseId(block) {
  for (const line of block.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu,'');
    const value = captureJsonValue(payload);
    const id = value && typeof value === 'object' && Object.hasOwn(value,'id') ? value.id : value?.response?.id;
    if (typeof id === 'string' && id) return id;
  }
}
export function captureJsonId(raw, fields = ['id']) {
  let value; try { value = captureJsonValue(new TextDecoder('utf-8',{fatal:true}).decode(raw)); } catch { return undefined; }
  return fields.map(field => value?.[field]).find(id => typeof id === 'string' && id);
}
export function captureLocationId(headers) {
  const location = headers.get('location');
  if (!location) return undefined;
  const path = location.split('?')[0].replace(/\/+$/,'');
  return path.split('/').at(-1) || undefined;
}
export function resourceCaptureError(status, message) {
  return Response.json({ error: { message, type: 'api_error', param: null, code: null } }, { status });
}
