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
