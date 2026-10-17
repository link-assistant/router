// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=16d54435207af28e9eae9e2b8efb9eb227136ae13ed5f5cc3fd69d93e24daa7d; dynamic any annotations are explicit draft gaps.
import { ProtocolError } from "./protocols.js";
export function responseContract(method?: any, path?: any): any {
    const match: any = /^(\/api\/services\/(openai|codex|qwen)\/v1|\/v1)\/responses(?:\/(.*))?$/.exec(path);
    if (!match)
        return null;
    const namespace: string = `${(match as any)[1]}/responses`, service: string = (match as any)[2] ?? 'openai', tail: string = (match as any)[3];
    if (tail === undefined && method === 'POST')
        return { namespace, service, create: true };
    if (['compact', 'input_tokens'].includes(tail) && method === 'POST')
        return { namespace, service, helper: tail };
    if (tail && !['compact', 'input_tokens'].includes(tail))
        return { namespace, service, lifecycle: true };
    return null;
}
export function validateResponseCreate(contract?: any, document?: any): void {
    if (!contract?.create)
        return;
    if (!document || typeof document !== 'object' || (Array as any).isArray(document))
        throw new (ProtocolError as any)('The Responses request body must be a JSON object');
    if (typeof document.model !== 'string' || !document.model) {
        const error: any = new (ProtocolError as any)('request model must be a non-empty exact catalog id');
        error.code = 'model_required';
        throw error;
    }
    if ((Object as any).hasOwn(document, 'previous_response_id') && (typeof document.previous_response_id !== 'string' || !document.previous_response_id))
        throw new (ProtocolError as any)('previous_response_id must be a non-empty string');
}
export function responseReferences(contract?: any, document?: any): any {
    if (!contract || !document || typeof document !== 'object')
        return [];
    const references: any = [];
    if ((contract.create || contract.helper) && typeof document.previous_response_id === 'string' && document.previous_response_id) {
        references.push({ namespace: contract.namespace, id: document.previous_response_id, allowMissing: Boolean(contract.create) });
    }
    if (contract.helper === 'input_tokens' && contract.service === 'openai') {
        const id: any = typeof document.conversation === 'string' ? document.conversation : document.conversation?.id;
        if (typeof id === 'string' && id)
            references.push({ namespace: (contract.namespace.replace as any)(/\/responses$/, '/conversations'), id, allowMissing: false });
    }
    return references;
}
export function responseNotFound(): any {
    return (Response as any).json({ error: { message: 'Response not found', type: 'invalid_request_error', param: null, code: 'response_not_found' } }, { status: 404 });
}
export function responseReferenceMissing(): any {
    return (Response as any).json({ error: { type: 'not_found_error', message: 'the referenced response resource is unavailable' } }, { status: 404 });
}
export function responseReferenceConflict(): any {
    return (Response as any).json({ error: { type: 'invalid_request_error', message: 'the referenced response resources do not share one provider account' } }, { status: 409 });
}
export function responseAffinityStorageError(error?: any): any {
    const message: string = error instanceof Error ? error.message : String(error);
    return (Response as any).json({ error: { type: 'api_error', message: `response affinity is unavailable: ${message}` } }, { status: 503 });
}
export function conversationContract(method?: any, path?: any): any {
    const match: any = /^\/api\/services\/(openai|codex|qwen)\/v1\/conversations(?:\/([^/]+)(?:\/(items)(?:\/([^/]+))?)?)?$/.exec(path);
    if (!match)
        return null;
    let id: any, item: any;
    try {
        (id as any) = (match as any)[2] === undefined ? undefined : decodeURIComponent((match as any)[2]);
        (item as any) = (match as any)[4] === undefined ? undefined : decodeURIComponent((match as any)[4]);
    }
    catch {
        throw new (ProtocolError as any)('Conversation resource path contains invalid percent encoding');
    }
    const namespace: string = `/api/services/${(match as any)[1]}/v1/conversations`, itemNamespace: string = namespace + '/items';
    const target: string = id === undefined ? 'create' : !(match as any)[3] ? 'conversation' : item === undefined ? 'items' : 'item';
    const allowed: any = { create: ['POST'], conversation: ['GET', 'PATCH', 'DELETE'], items: ['GET', 'POST'], item: ['GET', 'DELETE'] };
    const segment: any = (value?: any): string => [...(Buffer as any).from(value)].map((byte?: any): string => byte >= 65 && byte <= 90 || byte >= 97 && byte <= 122 || byte >= 48 && byte <= 57 || [45, 46, 95, 126].includes(byte) ? (String as any).fromCharCode(byte) : '%' + byte.toString(16).toUpperCase().padStart(2, '0')).join('');
    const forwardPath: string = namespace + (id === undefined ? '' : '/' + segment(id)) + ((match as any)[3] ? '/items' : '') + (item === undefined ? '' : '/' + segment(item));
    return { namespace, itemNamespace, service: (match as any)[1], target, id, item, forwardPath, allowed: (allowed as any)[target].includes(method) };
}
export function conversationNotFound(item: any = false): any {
    return (Response as any).json({ error: { message: item ? 'Conversation item not found' : 'Conversation not found', type: 'invalid_request_error', param: null, code: item ? 'conversation_item_not_found' : 'conversation_not_found' } }, { status: 404 });
}
export function conversationUnsupported(): any {
    return (Response as any).json({ error: { type: 'invalid_request_error', message: 'the selected service does not support native Conversations resources' } }, { status: 400 });
}
export function conversationMethodNotAllowed(): any {
    return (Response as any).json({ error: { type: 'invalid_request_error', message: 'the requested Conversations operation is not supported' } }, { status: 405 });
}
export function conversationAffinityError(error?: any): any {
    const message: string = error instanceof Error ? error.message : String(error);
    return (Response as any).json({ error: { type: 'api_error', message: `resource affinity is unavailable: ${message}` } }, { status: 503 });
}
export function conversationUpstreamError(message?: any): any {
    return (Response as any).json({ error: { type: 'api_error', message } }, { status: 502 });
}
export function conversationIds(raw?: any, list: any = false): any {
    let document: any;
    try {
        (document as any) = captureJsonValue(new (TextDecoder as any)('utf-8', { fatal: true, ignoreBOM: true }).decode(raw));
    }
    catch {
        return [];
    }
    const items: any = list ? (Array as any).isArray((document as any)?.data) ? (document as any).data : [] : [document];
    return ((items.map as any)((item?: any): any => item?.id).filter as any)((id?: any): string | boolean => typeof id === 'string' && id);
}
export function validConversationId(id?: any): boolean {
    return typeof id === 'string' && id.length > 0 && (Buffer as any).byteLength(id) <= 256 && !/[\/\x00-\x1f\x7f-\x9f]/u.test(id);
}
function captureJsonValue(text?: any): any {
    let value: any;
    try {
        (value as any) = (JSON as any).parse(text);
    }
    catch {
        return undefined;
    }
    const scalar: any = (string?: any): boolean => {
        for (let index: any = 0; index < string.length; index++) {
            const unit: any = (string.charCodeAt as any)(index);
            if (unit >= 0xd800 && unit <= 0xdbff) {
                const next: any = (string.charCodeAt as any)(++index);
                if (!(next >= 0xdc00 && next <= 0xdfff))
                    return false;
            }
            else if (unit >= 0xdc00 && unit <= 0xdfff)
                return false;
        }
        return true;
    };
    const pending: any = [value];
    while (pending.length) {
        const current: any = pending.pop();
        if (typeof current === 'number' && !(Number as any).isFinite(current))
            return undefined;
        if (typeof current === 'string' && !scalar(current))
            return undefined;
        if (current && typeof current === 'object')
            for (const [key, child] of (Object as any).entries(current) as any) {
                if (!scalar(key))
                    return undefined;
                pending.push(child);
            }
    }
    return value;
}
export function captureSseId(block?: any): undefined | string {
    for (const line of (block.split as any)(/\r?\n/) as any) {
        if (!(line.startsWith as any)('data:'))
            continue;
        const payload: any = ((line.slice as any)(5).replace as any)(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '');
        const value: any = captureJsonValue(payload);
        const id: any = value && typeof value === 'object' && (Object as any).hasOwn(value, 'id') ? value.id : value?.response?.id;
        if (typeof id === 'string' && id)
            return id;
    }
}
export function captureJsonId(raw?: any, fields: any = ['id']): any {
    let value: any;
    try {
        (value as any) = captureJsonValue(new (TextDecoder as any)('utf-8', { fatal: true, ignoreBOM: true }).decode(raw));
    }
    catch {
        return undefined;
    }
    return fields.map((field?: any): any => value?.[field]).find((id?: any): string | boolean => typeof id === 'string' && id);
}
export function captureLocationId(headers?: any): any {
    const location: any = (headers.get as any)('location');
    if (!location)
        return undefined;
    const path: any = (((location.split as any)('?') as any)[0].replace as any)(/\/+$/, '');
    return ((path.split as any)('/').at as any)(-1) || undefined;
}
export function resourceCaptureError(status?: any, message?: any): any {
    return (Response as any).json({ error: { message, type: 'api_error', param: null, code: null } }, { status });
}
