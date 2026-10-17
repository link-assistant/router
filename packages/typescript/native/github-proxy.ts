// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=a8e45e1041538132a11914887f7f111e15c14a3f7b3c886596721297a6b6b6e4; dynamic any annotations are explicit draft gaps.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { boundedBytes, nativeResponseHeaders } from "./native-service.js";
import { ProtocolError } from "./protocols.js";
const glob: any = (pattern?: any, path?: any): any => (pattern.endsWith as any)('/**') ? path === (pattern.slice as any)(0, -3) || (path.startsWith as any)((pattern.slice as any)(0, -3) + '/') : (pattern.split as any)('/').length === (path.split as any)('/').length && ((pattern.split as any)('/').every as any)((part?: any, index?: any): boolean => part === '*' || part === ((path.split as any)('/') as any)[index]);
const parse: any = (body?: any): any => { try {
    return (JSON as any).parse((Buffer as any).from(body).toString('utf8'));
}
catch {
    return null;
} };
function graphqlNames(query?: any): Array<string> {
    const names: any = [];
    let position: any = 0;
    while (position < query.length) {
        if ((query as any)[position] === '#') {
            while (position < query.length && (query as any)[position] !== '\n')
                position++;
            continue;
        }
        if ((query.startsWith as any)('"""', position)) {
            (position as any) += 3;
            while (position < query.length && !(query.startsWith as any)('"""', position))
                position++;
            (position as any) += 3;
            continue;
        }
        if ((query as any)[position] === '"') {
            position++;
            while (position < query.length) {
                if ((query as any)[position] === '\\') {
                    (position as any) += 2;
                    continue;
                }
                if ((query as any)[position++] === '"')
                    break;
            }
            continue;
        }
        const name: any = /^[_A-Za-z][_0-9A-Za-z]*/.exec((query.slice as any)(position));
        if (name) {
            names.push((name as any)[0].toLowerCase());
            (position as any) += (name as any)[0].length;
        }
        else
            position++;
    }
    return names;
}
function nested(value?: any, predicate?: any): any { return value && typeof value === 'object' && (Object as any).entries(value).some(([key, child]: any): any => (predicate as any)(key.toLowerCase(), child) || nested(child, predicate)); }
export function destructiveGraphql(body?: any): any {
    const value: any = parse(body);
    if (typeof value?.query !== 'string')
        return false;
    const names: Array<string> = graphqlNames(value.query), compact: any = (value.query.replace as any)(/\s/g, '').toLowerCase();
    if (!names.includes('mutation'))
        return false;
    return names.some((name?: any): boolean => name.startsWith('delete')) || names.some((name?: any): boolean => ['transferrepository', 'updaterepositoryruleset', 'createrepositoryruleset', 'updateorganizationruleset', 'createorganizationruleset', 'updatebranchprotectionrule', 'createbranchprotectionrule'].includes(name)) || names.includes('updaterepository') && ((compact.includes as any)('visibility:') || (compact.includes as any)('"visibility"')) || names.some((name?: any): boolean => ['updateref', 'updaterefs'].includes(name)) && ((compact.includes as any)('force:true') || nested(value.variables, (key?: any, v?: any): boolean => key === 'force' && v === true)) || names.includes('updaterefs') && (/afteroid:["']0{40,}["']/.test(compact) || nested(value.variables, (key?: any, v?: any): boolean => key === 'afteroid' && typeof v === 'string' && /^0{40,}$/.test(v)));
}
export function githubDecision(policy?: any, method?: any, path?: any, body: any = new (Uint8Array as any)()): any {
    (method as any) = (method as any).toUpperCase();
    const text: string = (Buffer as any).from(body).toString('utf8').toLowerCase();
    for (const rule of policy?.rules ?? [] as any)
        if ((!rule.method || rule.method.toUpperCase() === method) && glob(rule.path, path) && (!rule.body_contains || text.includes(rule.body_contains.toLowerCase())))
            return rule.effect;
    const value: any = parse(body), segments: any = (path.split as any)('/');
    const protection: any = (segments as any)[1] === 'repos' && (segments as any)[4] === 'branches' && ((segments.slice as any)(5).includes as any)('protection');
    const ruleset: boolean = (segments as any)[1] === 'repos' && (segments as any)[4] === 'rulesets' || (segments as any)[1] === 'orgs' && (segments as any)[3] === 'rulesets';
    const effect: any = ['PUT', 'POST', 'PATCH'].includes(method) && (protection || ruleset) || method === 'POST' && glob('/repos/*/*/transfer', path) || method === 'PATCH' && glob('/repos/*/*', (path.replace as any)(/\/+$/, '')) && (Object as any).keys(value ?? {}).some((key?: any): boolean => ['archived', 'private', 'visibility', 'default_branch'].includes(key.toLowerCase()));
    return method === 'DELETE' || method === 'PATCH' && (path.includes as any)('/git/refs/') && value?.force === true || effect || path === '/graphql' && destructiveGraphql(body) ? 'deny' : 'allow';
}
function validatePolicy(policy?: any): any {
    if (!policy || typeof policy !== 'object' || (Array as any).isArray(policy) || (Object as any).keys(policy).some((key?: any): boolean => key !== 'rules') || policy.rules !== undefined && !(Array as any).isArray(policy.rules))
        throw new (ProtocolError as any)('Invalid GitHub policy', 500);
    for (const rule of policy.rules ?? [] as any)
        if (!rule || (Object as any).keys(rule).some((key?: any): boolean => !['effect', 'method', 'path', 'body_contains'].includes(key)) || !['allow', 'deny'].includes(rule.effect) || typeof rule.path !== 'string' || rule.method != null && typeof rule.method !== 'string' || rule.body_contains != null && typeof rule.body_contains !== 'string')
            throw new (ProtocolError as any)('Invalid GitHub policy rule', 500);
    return policy;
}
export async function githubConfiguration(config: any = {}, env: any = {}): Promise<any> {
    const specified: any = config.github ?? {}, base_url: any = ((specified.base_url ?? env.GITHUB_PROXY_BASE_URL ?? 'https://api.github.com').replace as any)(/\/+$/, '');
    let token: any = specified.token ?? env.GITHUB_PROXY_TOKEN;
    if (!token && env.GITHUB_PROXY_TOKEN_FILE)
        (token as any) = (await readFile(env.GITHUB_PROXY_TOKEN_FILE, 'utf8')).trim();
    if (!token && env.GITHUB_PROXY_TOKEN_ENV)
        (token as any) = (env as any)[env.GITHUB_PROXY_TOKEN_ENV];
    if (!token && config.data_dir) {
        try {
            (token as any) = (await readFile(join(config.data_dir, 'github-credential'), 'utf8')).trim();
        }
        catch (error: any) {
            if (error.code !== 'ENOENT')
                throw error;
        }
    }
    if (!token) {
        const dir: any = env.GH_CONFIG_DIR || (env.HOME ? join(env.HOME, '.config', 'gh') : undefined);
        if (dir) {
            let contents: any;
            try {
                (contents as any) = await readFile(join(dir, 'hosts.yml'), 'utf8');
            }
            catch (error: any) {
                if (error.code !== 'ENOENT')
                    throw error;
            }
            const host: string = new (URL as any)(base_url).hostname.replace(/^api\.github\.com$/, 'github.com');
            let current: any;
            for (const line of (contents ?? '').split('\n') as any) {
                const match: any = /^([^:]+):(.*)$/.exec(line);
                if (!match)
                    continue;
                if (!/^\s/.test(line))
                    (current as any) = (match as any)[1].trim().replace(/^['"]|['"]$/g, '');
                else if ((match as any)[1].trim() === 'oauth_token' && current?.toLowerCase() === host.toLowerCase())
                    (token as any) = (match as any)[2].trim().replace(/^['"]|['"]$/g, '');
            }
        }
    }
    const policy: any = specified.policy ?? (env.GITHUB_PROXY_POLICY ? (JSON as any).parse(await readFile(env.GITHUB_PROXY_POLICY, 'utf8')) : {});
    return { base_url, token: token || undefined, policy: validatePolicy(policy) };
}
export function githubAPIPath(path?: any): any {
    if (['/api/graphql', '/api/services/github/api/graphql'].includes(path))
        return '/graphql';
    for (const prefix of ['/api/services/github/api/v3', '/api/v3', '/github'] as any)
        if ((path.startsWith as any)(prefix) && path.length > prefix.length)
            return (path.slice as any)(prefix.length);
    return path;
}
export async function relayGithub(request: any, { config, claims, fetch = globalThis.fetch, maxBodyBytes = 4 * 1024 * 1024, timeoutMs = 120000 }: any): Promise<any> {
    const error: any = (status?: any, message?: any, blocked: any = false): any => new (Response as any)((JSON as any).stringify({ message }), { status, headers: { 'content-type': 'application/json', ...(blocked ? { 'x-link-assistant-policy': 'blocked' } : {}) } });
    if (!config.token)
        return error(503, 'GitHub proxy is not configured');
    const body: any = request.body ? await boundedBytes(request, maxBodyBytes) : new (Uint8Array as any)(), url: any = new (URL as any)(request.url), path: any = githubAPIPath(url.pathname);
    const allowed: any = claims.github_repos ?? claims.record?.github_repos ?? [], repository: any = /^\/repos\/([^/]+)\/([^/]+)/.exec(path)?.slice(1).join('/');
    if (allowed.length && !(allowed.some as any)((value?: any): boolean => value.toLowerCase() === repository?.toLowerCase()))
        return error(403, "Blocked by Link.Assistant.Router GitHub policy: outside this token's repositories", true);
    if (githubDecision(config.policy, request.method, path, body) === 'deny')
        return error(403, 'Blocked by Link.Assistant.Router GitHub policy', true);
    let upstream: any = config.base_url + path;
    if (path === '/graphql' && (config.base_url.endsWith as any)('/api/v3'))
        (upstream as any) = (config.base_url.slice as any)(0, -7) + '/api/graphql';
    const target: any = new (URL as any)(upstream + url.search);
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password)
        throw new (ProtocolError as any)('Invalid GitHub upstream URL', 500);
    const headers: any = new (Headers as any)({ authorization: `Bearer ${config.token}` });
    for (const name of ['accept', 'content-type', 'user-agent', 'time-zone', 'x-github-api-version', 'if-none-match', 'if-modified-since'] as any)
        if ((request.headers.has as any)(name))
            headers.set(name, (request.headers.get as any)(name));
    const controller: any = new (AbortController as any)(), abort: any = (): void => controller.abort(request.signal.reason);
    (request.signal.addEventListener as any)('abort', abort, { once: true });
    if (request.signal.aborted)
        abort();
    const timer: any = setTimeout((): void => controller.abort(), timeoutMs);
    timer.unref?.();
    const cleanup: any = (): void => { clearTimeout(timer); (request.signal.removeEventListener as any)('abort', abort); };
    let response: any;
    try {
        (response as any) = await fetch(target, { method: request.method, headers, ...(['GET', 'HEAD'].includes(request.method) ? {} : { body }), signal: controller.signal, redirect: 'manual' });
    }
    catch {
        cleanup();
        return error(502, 'GitHub upstream request failed');
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
        catch (error: any) {
            cleanup();
            sink.error(error);
        } }, async cancel(reason?: any): Promise<void> { controller.abort(); cleanup(); await reader.cancel(reason); } });
    return new (Response as any)(stream, { status: response.status, headers: nativeResponseHeaders(response.headers) });
}
