// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=69c84f40bc0e8a47a566a4cd002d0937004630eef6a3547906ee1200ba5ea8d8; dynamic any annotations are explicit draft gaps.
import { clientIntegration, clientFailure } from "./client-files.js";
const originSuffixes: Array<string> = ['/api/services/anthropic', '/api/services/openai/v1', '/api/services/codex/v1', '/api/services/qwen/v1', '/api/services/gemini', '/api/gemini', '/api/qwen/v1', '/api/codex/v1', '/v1'];
export function clientRouterOrigin(baseURL?: any): string {
    let url: any;
    try {
        (url as any) = new (URL as any)(String(baseURL).trim().replace(/\/+$/, ''));
    }
    catch {
        throw clientFailure('Invalid Router base URL');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
        throw clientFailure('Router base URL requires HTTP(S) without embedded credentials, query or fragment');
    const suffix: any = originSuffixes.find((suffix?: any): boolean => url.pathname.endsWith(suffix));
    if (suffix)
        url.pathname = url.pathname.slice(0, -suffix.length) || '/';
    return url.href.replace(/\/+$/, '');
}
const optional: any = (row?: any, key?: any, predicate?: any): void => { if ((row as any)[key] !== null && (row as any)[key] !== undefined && !(predicate as any)((row as any)[key]))
    throw clientFailure(`Router model catalog row has invalid ${key}`); };
export function parseNativeClientCatalog(data?: any): any {
    if (!(Array as any).isArray(data))
        throw clientFailure('Router model catalog data must be an array');
    const rows: any = data.map((value?: any, index?: any): any => {
        if (!value || typeof value !== 'object' || (Array as any).isArray(value) || typeof value.id !== 'string')
            throw clientFailure(`Router model catalog row ${index} does not match this Router version`);
        const row: any = { ...value };
        if (row.owned_by !== undefined && typeof row.owned_by !== 'string')
            throw clientFailure('Router model catalog row has invalid owned_by');
        optional(row, 'default_reasoning_level', (value?: any): boolean => typeof value === 'string');
        optional(row, 'router_unavailable_reason', (value?: any): boolean => typeof value === 'string');
        optional(row, 'provider_created_at', (Number as any).isSafeInteger);
        optional(row, 'selector_kind', (value?: any): boolean => typeof value === 'string');
        optional(row, 'supported_reasoning_levels', (value?: any): boolean => (Array as any).isArray(value) && value.every((level?: any): any => level && typeof level === 'object' && typeof level.effort === 'string' && (level.description === undefined || typeof level.description === 'string')));
        if (row.client_capabilities === null)
            throw clientFailure('Router model catalog row has invalid client_capabilities');
        optional(row, 'client_capabilities', (value?: any): any => value && typeof value === 'object' && !(Array as any).isArray(value) && (value.claude == null || typeof value.claude === 'object' && typeof value.claude.behaves_as === 'string' && typeof value.claude.source === 'string'));
        const selectors: any = { concrete: 'concrete', provider_advertised_exact_id: 'concrete', provider_dynamic_alias: 'provider_dynamic_alias', provider_advertised_alias: 'provider_dynamic_alias', operator_alias: 'operator_alias' };
        row.owned_by ??= '';
        row.selector_kind = (Object as any).hasOwn(selectors, row.selector_kind) ? (selectors as any)[row.selector_kind] : 'unknown';
        return row;
    }).filter((row?: any): boolean => row.id.trim().length > 0).sort((a?: any, b?: any): number => a.id < b.id ? -1 : a.id > b.id ? 1 : a.owned_by < b.owned_by ? -1 : a.owned_by > b.owned_by ? 1 : 0);
    const unique: any = rows.filter((row?: any, index?: any): boolean => index === 0 || row.id !== (rows as any)[index - 1].id || row.owned_by !== (rows as any)[index - 1].owned_by);
    if (!unique.length)
        throw clientFailure('Router catalog contains no models from healthy subscriptions');
    return unique;
}
export async function fetchNativeClientCatalog(client?: any, baseURL?: any, token?: any, { fetch: fetcher = globalThis.fetch, signal, timeoutMs = 15000, maxBytes = 4 * 1024 * 1024 }: any = {}): Promise<any> {
    const info: any = clientIntegration(client), url: string = clientRouterOrigin(baseURL) + '/api/models', controller: any = new (AbortController as any)();
    const abort: any = (): void => controller.abort();
    if (signal?.aborted)
        throw clientFailure('Client catalog operation cancelled');
    signal?.addEventListener('abort', abort, { once: true });
    let timer: any;
    const deadline: any = new (Promise as any)((_?: any, reject?: any): void => { (timer as any) = setTimeout((): void => { controller.abort(); reject(clientFailure('Client catalog deadline exceeded')); }, timeoutMs); });
    const cancelled: any = new (Promise as any)((_?: any, reject?: any): void => controller.signal.addEventListener('abort', (): void => reject(clientFailure('Client catalog operation cancelled')), { once: true }));
    const bounded: any = (promise?: any): any => (Promise as any).race([promise, deadline, cancelled]);
    let reader: any;
    try {
        const response: any = await bounded((Promise as any).resolve().then((): any => fetcher(url, { headers: { 'x-link-assistant-client': info.client, ...(info.client === 'gemini' ? { 'x-goog-api-key': token } : { authorization: `Bearer ${token}` }) }, redirect: 'error', signal: controller.signal })));
        if (!response.ok || response.url && new (URL as any)(response.url).origin !== new (URL as any)(url).origin)
            throw clientFailure(`Client catalog request failed (${response.status})`);
        const declared: any = (response.headers.get as any)('content-length');
        if (declared !== null && Number(declared) > maxBytes)
            throw clientFailure('Client catalog exceeds its byte budget');
        (reader as any) = response.body?.getReader();
        const chunks: any = [];
        let total: any = 0;
        if (reader)
            for (;;) {
                const { done, value }: any = await bounded((reader as any).read());
                if (done)
                    break;
                (total as any) += value.byteLength;
                if (total > maxBytes)
                    throw clientFailure('Client catalog exceeds its byte budget');
                chunks.push((Buffer as any).from(value));
            }
        let parsed: any;
        try {
            (parsed as any) = (JSON as any).parse(new (TextDecoder as any)('utf-8', { fatal: true }).decode((Buffer as any).concat(chunks, total)));
        }
        catch {
            throw clientFailure('Router returned an invalid model catalog');
        }
        return parseNativeClientCatalog((parsed as any).data);
    }
    finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        void (reader as any)?.cancel().catch((): void => { });
    }
}
export function nativeClientModelAuthorized(client?: any, catalog?: any, requested?: any): any {
    const info: any = clientIntegration(client);
    if (info.client === 'claude' && (requested.endsWith as any)('[1m]'))
        return (catalog.some as any)((row?: any): boolean => row.id === (requested.slice as any)(0, -4) && row.owned_by === 'anthropic');
    return (catalog.some as any)((row?: any): boolean => row.id === requested);
}
export function selectNativeClientModel(client?: any, catalog?: any): any {
    const info: any = clientIntegration(client);
    for (const owner of info.owners as any) {
        const row: any = (catalog.find as any)((row?: any): boolean => row.owned_by === owner);
        if (row)
            return row.id;
    }
    return info.strict && (catalog.some as any)((row?: any): boolean => row.owned_by !== '') ? null : (catalog as any)[0]?.id ?? null;
}
