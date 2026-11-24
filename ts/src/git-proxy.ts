// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=045503691d0fa69670cb54c59a85afd1b4a920130fdcff46226276b4fdf15a38; dynamic any annotations are explicit draft gaps.
import { boundedBytes, nativeResponseHeaders } from "./native-service.js";
const ZERO: string = '0'.repeat(40);
const glob: any = (pattern?: any, path?: any): any => (pattern.endsWith as any)('/**') ? path === (pattern.slice as any)(0, -3) || (path.startsWith as any)((pattern.slice as any)(0, -3) + '/') : (pattern.split as any)('/').length === (path.split as any)('/').length && ((pattern.split as any)('/').every as any)((part?: any, index?: any): boolean => part === '*' || part === ((path.split as any)('/') as any)[index]);
const allowedRef: any = (policy?: any, repository?: any, name?: any): any => ((policy.rules ?? []).some as any)((rule?: any): any => rule.effect === 'allow' && (!rule.method || rule.method.toUpperCase() === 'GIT') && glob(rule.path, `/git/${repository}/${name}`));
export function parseRefUpdates(body?: any): any {
    const updates: any = [];
    let cursor: any = 0;
    const decoder: any = new (TextDecoder as any)('utf-8', { fatal: true });
    while (cursor + 4 <= body.length) {
        const prefix: string = (Buffer as any).from((body.subarray as any)(cursor, cursor + 4)).toString('ascii');
        if (!/^[0-9a-fA-F]{4}$/.test(prefix))
            break;
        const length: number = parseInt(prefix, 16);
        if (!length || length < 4 || cursor + length > body.length)
            break;
        let payload: any = (body.subarray as any)(cursor + 4, cursor + length);
        (cursor as any) += length;
        const nul: any = ((payload as any).indexOf as any)(0);
        if (nul >= 0)
            (payload as any) = ((payload as any).subarray as any)(0, nul);
        let fields: any;
        try {
            (fields as any) = decoder.decode(payload).trim().split(' ');
        }
        catch {
            continue;
        }
        if (fields.length >= 3 && (fields as any)[0].length === 40 && (fields as any)[1].length === 40)
            updates.push({ old: (fields as any)[0], new: (fields as any)[1], name: (fields as any)[2] });
    }
    return updates;
}
const refusal: any = (name?: any, operation?: any, reason?: any): string => `Blocked by Link.Assistant.Router git policy: ${operation === 'delete' ? `deleting ${name} is refused` : operation === 'force' ? `force-updating ${name} is refused` : `could not confirm ${name} is a fast-forward (${reason})`}; allow it in GITHUB_PROXY_POLICY to permit this ref`;
export async function relayGit(request: any, { config, claims, fetch = globalThis.fetch, maxBodyBytes = 4 * 1024 * 1024, maxResponseBytes = 32 * 1024 * 1024, timeoutMs = 120000 }: any): Promise<any> {
    const error: any = (status?: any, message?: any, blocked: any = false): any => new (Response as any)(message + '\n', { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...(blocked ? { 'x-link-assistant-policy': 'blocked' } : {}) } });
    const source: any = new (URL as any)(request.url), path: string = source.pathname.replace(/^\/api\/services\/github/, '');
    const repository: any = /^\/git\/([^/]+)\/([^/]+)/.exec(path)?.slice(1).join('/').replace(/(?:\.git)+$/, '');
    if (!repository)
        return error(404, 'not a git repository path');
    if (!config.token)
        return error(503, 'GitHub proxy is not configured');
    const scope: any = claims.github_repos ?? claims.record?.github_repos ?? [];
    if (scope.length && !(scope.some as any)((value?: any): boolean => value.toLowerCase() === repository.toLowerCase()))
        return error(403, "outside this token's repositories", true);
    let body: any;
    try {
        (body as any) = await boundedBytes(request, maxBodyBytes);
    }
    catch (errorValue: any) {
        return error(413, errorValue.message);
    }
    const controller: any = new (AbortController as any)(), abort: any = (): void => controller.abort(request.signal.reason);
    (request.signal.addEventListener as any)('abort', abort, { once: true });
    if (request.signal.aborted)
        abort();
    const timer: any = setTimeout((): void => controller.abort(), timeoutMs);
    timer.unref?.();
    const cleanup: any = (): void => { clearTimeout(timer); (request.signal.removeEventListener as any)('abort', abort); };
    const authorization: string = 'Basic ' + (Buffer as any).from(`x-access-token:${config.token}`).toString('base64');
    if (path.endsWith('/git-receive-pack')) {
        const updates: any = parseRefUpdates(body), window: any = (Buffer as any).from(body.subarray(0, 4096)), start: number = window.indexOf(0), capabilities: string = start >= 0 ? window.subarray(start).toString('utf8') : '';
        const force: boolean = capabilities.includes('force-ref-updates') || capabilities.includes('push-force');
        for (const update of updates as any) {
            if (allowedRef(config.policy, repository, update.name))
                continue;
            if (update.new === ZERO) {
                cleanup();
                return error(403, refusal(update.name, 'delete'), true);
            }
            if (force && update.old !== ZERO) {
                cleanup();
                return error(403, refusal(update.name, 'force'), true);
            }
        }
        for (const update of updates as any) {
            if (update.old === ZERO || update.new === ZERO || allowedRef(config.policy, repository, update.name))
                continue;
            let response: any, payload: any;
            try {
                (response as any) = await fetch(`${config.base_url}/repos/${repository}/compare/${update.old}...${update.new}`, { headers: { authorization, accept: 'application/vnd.github+json', 'user-agent': 'link-assistant-router' }, signal: controller.signal, redirect: 'manual' });
                if (response.ok)
                    (payload as any) = (JSON as any).parse((Buffer as any).from(await boundedBytes(response, maxResponseBytes)).toString('utf8'));
                else
                    await response.body?.cancel();
            }
            catch {
                cleanup();
                return error(403, refusal(update.name, 'unknown', 'upstream request failed'), true);
            }
            if (!response.ok) {
                cleanup();
                return error(403, refusal(update.name, 'unknown', `upstream answered ${response.status}`), true);
            }
            if (['behind', 'diverged'].includes((payload as any)?.status)) {
                cleanup();
                return error(403, refusal(update.name, 'force'), true);
            }
            if (!['ahead', 'identical'].includes((payload as any)?.status)) {
                cleanup();
                return error(403, refusal(update.name, 'unknown', 'upstream gave no comparable status'), true);
            }
        }
    }
    const base: any = (config.base_url.replace as any)(/^https:\/\/api\.github\.com(?=\/|$)/, 'https://github.com');
    const target: any = new (URL as any)(base + '/' + path.slice('/git/'.length) + source.search);
    const headers: any = new (Headers as any)({ authorization });
    for (const name of ['content-type', 'accept', 'user-agent', 'git-protocol'] as any)
        if ((request.headers.has as any)(name))
            headers.set(name, (request.headers.get as any)(name));
    let response: any;
    try {
        (response as any) = await fetch(target, { method: request.method, headers, ...(['GET', 'HEAD'].includes(request.method) ? {} : { body }), signal: controller.signal, redirect: 'manual' });
    }
    catch {
        cleanup();
        return error(502, 'git upstream request failed');
    }
    const reader: any = response.body?.getReader();
    if (!reader) {
        cleanup();
        return new (Response as any)(null, { status: response.status, headers: nativeResponseHeaders(response.headers) });
    }
    const stream: any = new (ReadableStream as any)({ async pull(sink?: any): Promise<void> { try {
            const value: any = await reader.read();
            if (value.done) {
                cleanup();
                sink.close();
            }
            else
                sink.enqueue(value.value);
        }
        catch (reason: any) {
            cleanup();
            sink.error(reason);
        } }, async cancel(reason?: any): Promise<void> { controller.abort(); cleanup(); await reader.cancel(reason); } });
    return new (Response as any)(stream, { status: response.status, headers: nativeResponseHeaders(response.headers) });
}
