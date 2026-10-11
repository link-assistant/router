// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=fcb7fbce4ddd5e935e23f09187da8f5f79fa7240bbcfdce3282ecd8f042284b9; dynamic any annotations are explicit draft gaps.
import { ProtocolError } from "./protocols.js";
import { responseOwner } from "./responses.js";
import { matchHTTPRoute } from "./http-route-contract.js";
import { createHash } from 'node:crypto';
import { UsageTracker } from "./usage.js";
const transport: any = new (Set as any)(['authorization', 'x-api-key', 'x-goog-api-key', 'anthropic-auth-token', 'proxy-authorization', 'proxy-authenticate', 'host', 'connection', 'proxy-connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'te', 'trailer', 'content-length', 'accept-encoding', 'cookie', 'chatgpt-account-id', 'sec-websocket-key', 'sec-websocket-version', 'sec-websocket-extensions', 'sec-websocket-accept']);
const ingress: any = new (Set as any)(['forwarded', 'x-real-ip', 'x-client-ip', 'x-cluster-client-ip', 'cf-connecting-ip', 'true-client-ip', 'fastly-client-ip', 'fly-client-ip', 'x-envoy-external-address', 'x-azure-clientip', 'x-appengine-user-ip', 'cloudfront-viewer-address']);
const responseCredentials: any = new (Set as any)(['authorization', 'x-api-key', 'x-goog-api-key', 'anthropic-auth-token', 'set-cookie', 'cookie', 'chatgpt-account-id']);
const connectionNames: any = (headers?: any): any => new (Set as any)(((((headers.get as any)('connection') ?? '').split as any)(',').map as any)((v?: any): any => v.trim().toLowerCase()));
export function nativeRequestHeaders(incoming?: any, candidate?: any): any {
    const headers: any = new (Headers as any)(), nominated: any = connectionNames(incoming);
    for (const [name, value] of incoming as any)
        if (!transport.has(name) && !ingress.has(name) && !nominated.has(name) && !(name.startsWith as any)('x-forwarded-') && !(name.startsWith as any)('x-router-') && !(name.startsWith as any)('x-link-assistant-'))
            headers.append(name, value);
    const credential: any = candidate.apiKey ?? candidate.api_key;
    if (credential)
        headers.set('authorization', `Bearer ${credential}`);
    for (const [name, value] of (Object as any).entries(candidate.oauth_headers ?? {}) as any)
        if (typeof value === 'string' && ['chatgpt-account-id', 'originator', 'anthropic-beta', 'anthropic-version'].includes(name.toLowerCase()))
            headers.set(name, value);
    return headers;
}
export function nativeResponseHeaders(incoming?: any): any {
    const headers: any = new (Headers as any)(), nominated: any = connectionNames(incoming);
    const hop: any = new (Set as any)(['connection', 'proxy-connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'te', 'trailer', 'content-length']);
    for (const [name, value] of incoming as any)
        if (!hop.has(name) && !responseCredentials.has(name) && !nominated.has(name) && !(name.startsWith as any)('x-router-') && !(name.startsWith as any)('x-link-assistant-') && !/^x-codex-(?:plan-type|active-limit|credits-balance)/.test(name))
            headers.append(name, value);
    return headers;
}
export async function boundedBytes(request?: any, limit?: any): Promise<any> {
    if (!request.body)
        return new (Uint8Array as any)();
    const reader: any = request.body.getReader(), parts: any = [];
    let length: any = 0;
    try {
        for (;;) {
            const { done, value }: any = await reader.read();
            if (done)
                break;
            (length as any) += value.byteLength;
            if (length > limit) {
                await reader.cancel();
                throw new (ProtocolError as any)('Request body exceeds limit', 413);
            }
            parts.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    return (Buffer as any).concat(parts, length);
}
async function captureNativeStream(upstream: any, { namespace, owner, selected, affinities, model, cleanup, controller, limit = 1024 * 1024 }: any): Promise<any> {
    const reader: any = upstream.body.getReader(), chunks: any = [], decoder: any = new (TextDecoder as any)();
    let buffer: any = '', bytes: any = 0, id: any;
    try {
        while (!id) {
            const { done, value }: any = await reader.read();
            if (done)
                throw new (ProtocolError as any)('Stored stream ended before a resource id was supplied', 502);
            chunks.push(value);
            (bytes as any) += value.byteLength;
            if (bytes > limit)
                throw new (ProtocolError as any)('Stored stream id prefix exceeds limit', 502);
            (buffer as any) = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');
            let end: any;
            while (((end as any) = buffer.indexOf('\n\n')) >= 0 && !id) {
                const block: string = buffer.slice(0, end);
                (buffer as any) = buffer.slice(end + 2);
                const data: string = block.split('\n').filter((line?: any): boolean => line.startsWith('data:')).map((line?: any): string => line.slice(5).replace(/^ /, '')).join('\n');
                if (!data || data === '[DONE]')
                    continue;
                let event: any;
                try {
                    (event as any) = (JSON as any).parse(data);
                }
                catch {
                    throw new (ProtocolError as any)('Stored stream contains malformed JSON', 502);
                }
                (id as any) = (event as any).response?.id ?? (event as any).id;
                if (id && (typeof id !== 'string' || id.length > 512))
                    throw new (ProtocolError as any)('Stored stream contains an invalid resource id', 502);
            }
        }
        await (affinities.set as any)(namespace, owner, id, { destination: selected, model });
    }
    catch (error: any) {
        (controller.abort as any)(error);
        cleanup();
        await (reader.cancel().catch as any)((): void => { });
        reader.releaseLock();
        throw error;
    }
    let initial: any = true;
    return new (ReadableStream as any)({ async pull(c?: any): Promise<void> { try {
            if (initial) {
                (initial as any) = false;
                for (const chunk of chunks as any)
                    c.enqueue(chunk);
                chunks.length = 0;
                return;
            }
            const { done, value }: any = await reader.read();
            if (done) {
                cleanup();
                reader.releaseLock();
                c.close();
            }
            else
                c.enqueue(value);
        }
        catch (error: any) {
            cleanup();
            c.error(error);
        } }, async cancel(reason?: any): Promise<void> { (controller.abort as any)(reason); cleanup(); await (reader.cancel as any)(reason); reader.releaseLock(); } });
}
export function nativeURL(base?: any, service?: any, pathname?: any, search: any = ''): any {
    let url: any;
    try {
        (url as any) = new (URL as any)(base);
    }
    catch {
        throw new (ProtocolError as any)('Native provider base URL is invalid', 503);
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
        throw new (ProtocolError as any)('Native provider base URL is invalid', 503);
    const prefix: string = service === 'codex-backend' ? '/api/services/codex/backend-api' : `/api/services/${service}`;
    let tail: any = (pathname.startsWith as any)(prefix) ? (pathname.slice as any)(prefix.length) : pathname;
    let root: any = url.pathname.replace(/\/$/, '');
    if (service === 'codex-backend')
        (root as any) = root.replace(/\/codex$/, '');
    else if (root.endsWith('/v1') && ((tail as any).startsWith as any)('/v1/'))
        (tail as any) = ((tail as any).slice as any)(3);
    if (service === 'codex' && pathname === '/api/services/codex/v1/live') {
        (tail as any) = '/v1/realtime/calls';
        (search as any) += `${search ? '&' : '?'}intent=quicksilver&architecture=avas`;
    }
    url.pathname = root + tail;
    url.search = search;
    return url;
}
const destination: any = (c?: any): any => ({ provider: c.destination_kind === 'subscription' ? c.provider_kind : typeof c.provider === 'string' ? c.provider : c.provider?.name, account: c.destination_kind === 'stored_provider' ? typeof c.provider === 'string' ? c.provider : c.provider?.name : c.native_account ?? (typeof c.account === 'string' ? c.account : c.account?.name), protocol: c.protocol === 'chat' ? 'openai' : c.protocol, base_url: c.baseUrl ?? c.base_url ?? c.provider?.base_url, account_id: c.destination_kind === 'stored_provider' ? undefined : c.account_id ?? undefined, provider_kind: c.provider_kind ?? c.kind, destination_kind: c.destination_kind });
const sameDestination: any = (a?: any, b?: any): boolean => ['provider', 'account', 'protocol', 'base_url', 'account_id', 'provider_kind', 'destination_kind'].every((key?: any): boolean => (a as any)[key] === (b as any)[key]);
export class NativeAffinityStore {
    declare maxRecords: any;
    declare records: any;
    constructor({ maxRecords = 10000 }: any = {}) { this.records = new (Map as any)(); this.maxRecords = maxRecords; }
    key(namespace?: any, owner?: any, id?: any, parent_id?: any): string { return (JSON as any).stringify([namespace, typeof owner === 'object' ? [owner.client_kind, owner.principal_id] : owner, id, parent_id ?? null]); }
    get(namespace?: any, owner?: any, id?: any, parent_id?: any): any { return structuredClone(this.records.get(this.key(namespace, owner, id, parent_id)) ?? null); }
    set(namespace?: any, owner?: any, id?: any, record?: any): void {
        const key: string = this.key(namespace, owner, id, record.parent_id), previous: any = this.records.get(key);
        if (previous && !sameDestination(previous.destination, record.destination))
            throw new (ProtocolError as any)('Resource id belongs to another exact account', 409);
        if (!previous && this.records.size >= this.maxRecords)
            throw new (ProtocolError as any)('Resource affinity storage is full', 507);
        this.records.set(key, { ...structuredClone(record), namespace, owner, id });
    }
    delete(namespace?: any, owner?: any, id?: any, parent_id?: any): void { this.records.delete(this.key(namespace, owner, id, parent_id)); }
    list(namespace?: any, owner?: any, parent_id?: any): any { return [...this.records.values()].filter((r?: any): boolean => r.namespace === namespace && this.key(namespace, r.owner, '') === this.key(namespace, owner, '') && (parent_id === undefined || r.parent_id === parent_id)).map((r?: any): any => structuredClone(r)); }
}
function resourceFor(path?: any, method?: any, headers?: any): any {
    const backend: string = '/api/services/codex/backend-api';
    if (path === backend + '/public/plugins/workspace/upload-url' && method === 'POST')
        return { namespace: backend + '/plugin-uploads', create: true, idFields: ['file_id'] };
    if (path === backend + '/public/plugins/workspace')
        return { namespace: backend + '/public/plugins/workspace', create: method === 'POST', list: method === 'GET', itemsField: 'plugins', idFields: ['plugin_id', 'id'] };
    const plugin: any = /^\/api\/services\/codex\/backend-api\/(?:plugins|ps\/plugins)\/([^/]+)\/(enable|install|uninstall)$/.exec(path);
    if (plugin && method === 'POST')
        return { namespace: backend + '/plugin-installs', ...((plugin as any)[2] === 'uninstall' ? { id: decodeURIComponent((plugin as any)[1]), remove: true } : { declaredId: decodeURIComponent((plugin as any)[1]), create: true }) };
    const workspace: any = /^\/api\/services\/codex\/backend-api\/(?:public\/plugins\/workspace\/([^/]+)|ps\/plugins\/([^/]+)\/shares)$/.exec(path);
    if (workspace)
        return { namespace: backend + '/public/plugins/workspace', id: decodeURIComponent((workspace as any)[1] ?? (workspace as any)[2]), remove: method === 'DELETE' };
    const roots: Array<Array<string | boolean>> = [
        ['/api/services/anthropic/v1/files', true], ['/api/services/anthropic/v1/messages/batches', false],
        ['/api/services/anthropic/v1/skills', false], ['/api/services/codex/backend-api/files', false],
        ['/api/services/openai/v1/realtime/calls', false], ['/api/services/codex/v1/realtime/calls', false],
        ['/api/services/codex/v1/live', false],
    ];
    const lifecycle: any = /^(\/api\/services\/(?:openai|codex|qwen)\/v1|\/v1)\/(conversations|chat\/completions|responses)(.*)$/.exec(path);
    if (lifecycle)
        roots.push([`${(lifecycle as any)[1]}/${(lifecycle as any)[2]}`, false]);
    for (const [root, listable] of roots as any) {
        if (path !== root && !(path.startsWith as any)(root + '/'))
            continue;
        const segments: any = ((((path.slice as any)(root.length).split as any)('/').filter as any)(Boolean).map as any)(decodeURIComponent);
        const namespace: string | boolean = root === '/api/services/codex/v1/live' ? '/api/services/codex/v1/realtime/calls' : root;
        if ((root.endsWith as any)('/responses') && (segments as any)[0] === 'compact' && method === 'POST')
            return { namespace: root, create: true };
        if ((root.endsWith as any)('/responses') && (segments as any)[0] === 'input_tokens')
            return null;
        if (!segments.length)
            return { namespace, create: method === 'POST', list: method === 'GET' && (listable || (root.endsWith as any)('batches') || (root.endsWith as any)('skills') || (root.endsWith as any)('chat/completions')) };
        if ((root.endsWith as any)('skills') && (segments as any)[1] === 'versions')
            return { namespace: root + '/versions', parent: (segments as any)[0], id: (segments as any)[2], create: method === 'POST' && segments.length === 2, list: method === 'GET' && segments.length === 2, remove: method === 'DELETE', idFields: ['version', 'id'] };
        if ((root.endsWith as any)('conversations') && (segments as any)[1] === 'items')
            return { namespace: root + '/items', parent: (segments as any)[0], id: (segments as any)[2], create: method === 'POST' && segments.length === 2, list: method === 'GET' && segments.length === 2, remove: method === 'DELETE', captureList: true };
        return { namespace, id: (segments as any)[0], remove: method === 'DELETE' };
    }
    if (path === '/api/services/codex/backend-api/ps/mcp') {
        const id: any = (headers.get as any)('mcp-session-id');
        if (id && (id.length > 256 || (id.includes as any)(',')))
            throw new (ProtocolError as any)('Mcp-Session-Id is invalid');
        return id ? { namespace: path, id, remove: method === 'DELETE' } : method === 'POST' ? { namespace: path, create: true, mcp: true } : null;
    }
    return null;
}
export function createNativeService({ core, authorize, routingContext, fetch: upstreamFetch = globalThis.fetch, maxBodyBytes = 4 * 1024 * 1024, maxResponseBytes = 32 * 1024 * 1024, timeoutMs = 120000, affinities = core.affinities ?? new (NativeAffinityStore as any)() }: any): any {
    async function select(request?: any, claims?: any, service?: any, document?: any, exact?: any): Promise<any> {
        const pathModel: any = /\/publishers\/anthropic\/models\/([^/:]+)(?:\/count-tokens)?:(?:rawPredict|streamRawPredict)$/.exec(new (URL as any)(request.url).pathname)?.[1];
        const context: any = { ...(routingContext as any)(request, claims), service, model: document?.model ?? (pathModel ? decodeURIComponent(pathModel) : undefined), protocol: ['anthropic', 'bedrock', 'vertex'].includes(service) ? 'anthropic' : 'chat' };
        const candidates: any = core.nativeCandidates ? await (core.nativeCandidates as any)(context) : context.model ? await (core.candidates as any)(context) : [];
        const raw: any = (candidates.find as any)((c?: any): boolean => !exact || ['provider', 'account', 'base_url'].every((key?: any): boolean => (exact as any)[key] === (destination(c) as any)[key]));
        if (!raw)
            throw new (ProtocolError as any)(exact ? 'The native resource exact account is unavailable' : 'Native service provider is unavailable', 503);
        const candidate: any = core.prepareCandidate ? await (core.prepareCandidate as any)(raw) : raw;
        core.requestLog?.select(candidate.account);
        if (exact && !sameDestination(exact, destination(candidate)))
            throw new (ProtocolError as any)('Native resource account changed', 503);
        return candidate;
    }
    return {
        affinities,
        async websocketTarget(request?: any): Promise<any> {
            const url: any = new (URL as any)(request.url), path: string = url.pathname, service: any = /^\/api\/services\/(openai|codex|qwen)\//.exec(path)?.[1];
            if (!service || !matchHTTPRoute('GET', path) || !/\/(?:responses|realtime|live)(?:\/[^/]+)?$/.test(path))
                throw new (ProtocolError as any)('Route not found', 404);
            const claims: any = await (authorize as any)(request, false), client: any = claims.client_kind ?? claims.client;
            if (!client || !claims.principal_id)
                throw new (ProtocolError as any)('Native services require a client and principal bound Router token', 403);
            if (service === 'qwen')
                throw new (ProtocolError as any)('Qwen does not support Responses WebSocket transport', 501);
            if (service === 'codex' && client !== 'codex')
                throw new (ProtocolError as any)('Codex service requires a Codex-bound Router token', 403);
            const owner: any = { client_kind: claims.client_kind, principal_id: claims.principal_id };
            let exact: any;
            const calls: Array<string> = url.searchParams.getAll('call_id');
            if (calls.length > 1 || calls.length === 1 && !(calls as any)[0])
                throw new (ProtocolError as any)('Exactly one nonempty Realtime call_id is allowed');
            const liveId: any = /\/live\/([^/]+)$/.exec(path)?.[1], id: string = liveId ? decodeURIComponent(liveId) : (calls as any)[0];
            if (id) {
                const namespace: string = `/api/services/${service}/v1/realtime/calls`, record: any = await (affinities.get as any)(namespace, owner, id);
                if (!record)
                    throw new (ProtocolError as any)('Realtime call not found', 404);
                (exact as any) = record.destination;
            }
            const candidate: any = await select(request, claims, service, { model: url.searchParams.get('model') ?? undefined }, exact), selected: any = destination(candidate);
            if (service === 'openai' && selected.provider_kind !== 'openai-compatible')
                throw new (ProtocolError as any)('Selected provider does not implement native OpenAI resource APIs', 503);
            return { url: nativeURL(selected.base_url, service, path, url.search), headers: nativeRequestHeaders(request.headers, candidate), claims };
        },
        async fetch(request?: any): Promise<any> {
            const url: any = new (URL as any)(request.url), path: string = url.pathname;
            if (!matchHTTPRoute(request.method, path))
                throw new (ProtocolError as any)('Route not found', 404);
            const serviceMatch: any = /^\/api\/services\/(openai|anthropic|codex|qwen|bedrock|vertex)(?:\/|$)/.exec(path);
            const service: string = path.startsWith('/api/services/codex/backend-api/') ? 'codex-backend' : serviceMatch?.[1] ?? 'openai';
            const claims: any = await (authorize as any)(request, false);
            const client: any = claims.client_kind ?? claims.client;
            if (!client || !claims.principal_id)
                throw new (ProtocolError as any)('Native services require a client and principal bound Router token', 403);
            if (service === 'anthropic' && client !== 'claude' || service.startsWith('codex') && client !== 'codex')
                throw new (ProtocolError as any)('Native service requires a credential bound to its official client', 403);
            if (service === 'codex-backend' && !(request.headers.get as any)('authorization')?.startsWith('Bearer at-'))
                throw new (ProtocolError as any)('Codex backend requires the paired Router-issued at- token', 401);
            if (path === '/api/services/openai/v1/realtime/client_secrets')
                throw new (ProtocolError as any)('Router does not expose upstream Realtime client secrets', 501);
            if (service === 'qwen' && path.includes('/conversations'))
                throw new (ProtocolError as any)('Qwen does not support Conversations', 501);
            const owner: any = claims.client_kind && claims.principal_id ? { client_kind: claims.client_kind, principal_id: claims.principal_id } : responseOwner(claims, (request.headers.get as any)('authorization') ?? (request.headers.get as any)('x-api-key'));
            const identityRoute: boolean = path === '/api/services/codex/v1/user-auth-credential/whoami' || path === '/api/services/codex/backend-api/wham/accounts/check';
            const tokenId: any = claims.sub ?? claims.id;
            if (!identityRoute && tokenId && core.tokens?.admit) {
                const admitted: any = await (core.tokens.admit as any)(tokenId, 0);
                if (admitted === false || typeof admitted === 'string' && admitted !== 'admitted')
                    throw new (ProtocolError as any)(typeof admitted === 'string' ? admitted : 'Token budget exceeded', 429);
            }
            const bytes: any = await boundedBytes(request, maxBodyBytes);
            let document: any;
            try {
                (document as any) = bytes.length ? (JSON as any).parse((Buffer as any).from(bytes).toString('utf8')) : undefined;
            }
            catch { }
            if (request.method === 'POST' && /\/(?:responses\/(?:compact|input_tokens)|images\/generations|audio\/speech|alpha\/search)$/.test(path) && (!document || typeof document !== 'object' || (Array as any).isArray(document)))
                throw new (ProtocolError as any)('The native service request body must be a JSON object');
            if ((document as any)?.model)
                await (authorize as any)(request, false, (document as any).model);
            if (['bedrock', 'vertex'].includes(service) && (!document || !(Array as any).isArray((document as any).messages)))
                throw new (ProtocolError as any)('messages must be an array');
            for (const batch of (document as any)?.requests ?? [] as any)
                if (batch.params?.model)
                    await (authorize as any)(request, false, batch.params.model);
            const resource: any = resourceFor(path, request.method, request.headers);
            if ((document as any)?.store === false && resource?.namespace.endsWith('/responses'))
                resource.create = false;
            let exact: any;
            const bind: any = (record?: any): void => { if (!record)
                throw new (ProtocolError as any)('Native resource not found', 404); if (exact && !sameDestination(exact, record.destination))
                throw new (ProtocolError as any)('Resources do not share one provider account', 409); (exact as any) = record.destination; };
            if (resource?.id)
                bind(await (affinities.get as any)(resource.namespace, owner, resource.id, resource.parent));
            if (resource?.parent)
                bind(await (affinities.get as any)((resource.namespace.replace as any)(/\/(?:items|versions)$/, ''), owner, resource.parent));
            if ((document as any)?.previous_response_id)
                bind(await (affinities.get as any)(path.replace(/\/responses(?:\/.*)?$/, '/responses'), owner, (document as any).previous_response_id));
            if ((document as any)?.conversation)
                bind(await (affinities.get as any)(path.replace(/\/responses(?:\/.*)?$/, '/conversations'), owner, typeof (document as any).conversation === 'string' ? (document as any).conversation : (document as any).conversation.id));
            const listed: any = resource?.list ? await (affinities.list as any)(resource.namespace, owner, resource.parent) : [];
            if (!resource?.captureList)
                for (const record of listed as any)
                    bind(record);
            if (service === 'codex-backend' && (document as any)?.file_id && path.startsWith('/api/services/codex/backend-api/public/plugins/workspace'))
                bind(await (affinities.get as any)('/api/services/codex/backend-api/plugin-uploads', owner, (document as any).file_id));
            const candidate: any = await select(request, claims, service, document, exact), selected: any = destination(candidate);
            if (service === 'openai' && selected.provider_kind !== 'openai-compatible')
                throw new (ProtocolError as any)('Selected provider does not implement native OpenAI resource APIs', 503);
            if (path === '/api/services/codex/v1/user-auth-credential/whoami' || path === '/api/services/codex/backend-api/wham/accounts/check') {
                if (!(request.headers.get as any)('authorization')?.startsWith('Bearer at-'))
                    throw new (ProtocolError as any)('Codex identity requires the paired Router-issued at- token', 401);
                const handle: any = (prefix?: any, value?: any): string => `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 24)}`;
                const account: string = handle('acct', `${claims.principal_id}:${selected.account}:${candidate.account_id ?? ''}`), user: string = handle('usr', claims.principal_id);
                let metadata: any;
                try {
                    const key: any = candidate.apiKey ?? candidate.api_key;
                    (metadata as any) = ((JSON as any).parse((Buffer as any).from(((key.split as any)('.') as any)[1], 'base64url').toString('utf8')) as any)['https://api.openai.com/auth'];
                }
                catch { }
                const plan: any = typeof (metadata as any)?.chatgpt_plan_type === 'string' && (metadata as any).chatgpt_plan_type.trim().length <= 128 ? (metadata as any).chatgpt_plan_type.trim() || 'unknown' : 'unknown';
                const body: any = path.endsWith('/whoami') ? { email: null, chatgpt_user_id: user, chatgpt_account_id: account, chatgpt_plan_type: plan, chatgpt_account_is_fedramp: (metadata as any)?.chatgpt_account_is_fedramp === true } : { accounts: [{ id: account, plan_type: plan, workspace_backend_origin: new (URL as any)(selected.base_url).protocol === 'https:' ? new (URL as any)(selected.base_url).origin : 'https://chatgpt.com', account_routing_override: 'NO_CONSTRAINT' }], account_ordering: [account], default_account_id: account };
                return (Response as any).json(body);
            }
            const controller: any = new (AbortController as any)(), abort: any = (): void => controller.abort(request.signal.reason);
            (request.signal.addEventListener as any)('abort', abort, { once: true });
            const timer: any = setTimeout((): void => controller.abort(new (Error as any)('Native upstream timeout')), timeoutMs);
            timer.unref?.();
            const cleanup: any = (): void => { clearTimeout(timer); (request.signal.removeEventListener as any)('abort', abort); };
            let upstream: any;
            try {
                (upstream as any) = await upstreamFetch(nativeURL(selected.base_url, service, path, url.search), { method: request.method, headers: nativeRequestHeaders(request.headers, candidate), ...(['GET', 'HEAD'].includes(request.method) ? {} : { body: bytes }), signal: controller.signal, redirect: 'manual' });
            }
            catch {
                cleanup();
                throw new (ProtocolError as any)('Native upstream request failed', 502);
            }
            const headers: any = nativeResponseHeaders(upstream.headers);
            const tracksUsage: boolean = /\/(?:responses(?:\/compact)?|images\/(?:generations|edits|variations)|audio\/(?:speech|transcriptions|translations)|alpha\/search)$/.test(path);
            if (tracksUsage && tokenId && core.tokens?.settle && upstream.body) {
                const usage: any = new (UsageTracker as any)({ maxBytes: maxResponseBytes }), reader: any = upstream.body.getReader();
                let settled: any = false;
                const settle: any = async (): Promise<void> => { if (settled)
                    return; (settled as any) = true; await (core.tokens.settle as any)(tokenId, 0, usage.finish().tokens); };
                const measured: any = new (ReadableStream as any)({ async pull(c?: any): Promise<void> { try {
                        const { done, value }: any = await reader.read();
                        if (done) {
                            await settle();
                            reader.releaseLock();
                            c.close();
                        }
                        else {
                            usage.feed(value);
                            c.enqueue(value);
                        }
                    }
                    catch (error: any) {
                        await settle();
                        c.error(error);
                    } }, async cancel(reason?: any): Promise<void> { await settle(); await reader.cancel(reason); reader.releaseLock(); } });
                (upstream as any) = new (Response as any)(measured, { status: upstream.status, headers: upstream.headers });
            }
            if (resource?.create && (resource.namespace.endsWith as any)('/responses') && upstream.ok && upstream.headers.get('content-type')?.includes('text/event-stream') && upstream.body) {
                const stream: any = await captureNativeStream(upstream, { namespace: resource.namespace, owner, selected, affinities, model: (document as any)?.model, cleanup, controller });
                return new (Response as any)(stream, { status: upstream.status, headers });
            }
            if (resource && (resource.create || resource.list) && upstream.ok) {
                let raw: any;
                try {
                    (raw as any) = await boundedBytes(upstream, maxResponseBytes);
                }
                finally {
                    cleanup();
                }
                let value: any;
                try {
                    (value as any) = (JSON as any).parse((Buffer as any).from(raw).toString('utf8'));
                }
                catch {
                    if (!resource.mcp && !path.includes('/realtime/') && !path.endsWith('/live'))
                        throw new (ProtocolError as any)('Native upstream resource response is malformed', 502);
                }
                if (resource.captureList) {
                    if (!(Array as any).isArray((value as any)?.data))
                        throw new (ProtocolError as any)('Conversation items response is malformed', 502);
                    for (const item of (value as any).data as any)
                        if (typeof item.id === 'string' && item.id)
                            await (affinities.set as any)(resource.namespace, owner, item.id, { destination: selected, parent_id: resource.parent });
                }
                else if (resource.create) {
                    const fields: Array<string> = resource.idFields ?? (path.endsWith('/realtime/calls') || path.endsWith('/live') ? ['call_id', 'id'] : path === '/api/services/codex/backend-api/files' ? ['file_id', 'id'] : ['id']);
                    const id: any = resource.declaredId ?? (resource.mcp ? headers.get('mcp-session-id') : fields.map((field?: any): any => value?.[field]).find((value?: any): string | boolean => typeof value === 'string' && value) ?? headers.get('location')?.split('/').at(-1));
                    if (resource.mcp && !id)
                        return new (Response as any)(raw, { status: upstream.status, headers });
                    if (!id || typeof id !== 'string' || id.length > 512)
                        throw new (ProtocolError as any)('Native resource response did not contain a valid id', 502);
                    await (affinities.set as any)(resource.namespace, owner, id, { destination: selected, parent_id: resource.parent, model: (document as any)?.model });
                    if (path.includes('/realtime/calls') || path.endsWith('/live'))
                        headers.set('location', `${path.replace(/\/$/, '')}/${encodeURIComponent(id)}`);
                }
                if (resource.list && !resource.captureList) {
                    const field: string = resource.itemsField ?? 'data', ids: Array<string> = resource.idFields ?? ['id'];
                    if (!(Array as any).isArray(value?.[field]))
                        throw new (ProtocolError as any)('Native resource list response is malformed', 502);
                    const allowed: any = new (Set as any)((listed.map as any)((r?: any): any => r.id));
                    (value as any)[field] = (value as any)[field].filter((item?: any): boolean => allowed.has(ids.map((key?: any): any => (item as any)[key]).find((value?: any): string | boolean => typeof value === 'string' && value)));
                    if ((Object as any).hasOwn(value, 'first_id'))
                        (value as any).first_id = ids.map((key?: any): any => ((value as any)[field] as any)[0]?.[key]).find(Boolean) ?? null;
                    if ((Object as any).hasOwn(value, 'last_id'))
                        (value as any).last_id = ids.map((key?: any): any => ((value as any)[field].at as any)(-1)?.[key]).find(Boolean) ?? null;
                    (raw as any) = (Buffer as any).from((JSON as any).stringify(value));
                }
                return new (Response as any)(raw, { status: upstream.status, headers });
            }
            if (resource?.remove && (upstream.ok || [404, 410].includes(upstream.status))) {
                if ((resource.namespace.endsWith as any)('/skills') || (resource.namespace.endsWith as any)('/conversations'))
                    for (const child of await (affinities.list as any)(resource.namespace + ((resource.namespace.endsWith as any)('/skills') ? '/versions' : '/items'), owner, resource.id) as any)
                        await (affinities.delete as any)(child.namespace, owner, child.id, child.parent_id);
                await (affinities.delete as any)(resource.namespace, owner, resource.id, resource.parent);
            }
            if (!upstream.body) {
                cleanup();
                return new (Response as any)(null, { status: upstream.status, headers });
            }
            const reader: any = upstream.body.getReader();
            const stream: any = new (ReadableStream as any)({ async pull(c?: any): Promise<void> { try {
                    const { done, value }: any = await reader.read();
                    if (done) {
                        cleanup();
                        reader.releaseLock();
                        c.close();
                    }
                    else
                        c.enqueue(value);
                }
                catch (error: any) {
                    cleanup();
                    c.error(error);
                } }, async cancel(reason?: any): Promise<void> { controller.abort(reason); cleanup(); await reader.cancel(reason); reader.releaseLock(); } });
            return new (Response as any)(stream, { status: upstream.status, headers });
        },
    };
}
