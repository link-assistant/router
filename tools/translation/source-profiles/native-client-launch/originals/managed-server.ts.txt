// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=51649e6397d5607b34cf7f72943042c79a070ff6100760b56685b6c875e35e11; dynamic any annotations are explicit draft gaps.
import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { randomBytes, randomUUID, createHmac, createHash, timingSafeEqual, X509Certificate } from 'node:crypto';
import { lstat, mkdir, chmod, open, readdir, rm } from 'node:fs/promises';
import { resolve, join, dirname, parse, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite, serialized, withNativeFileLock } from "./storage.js";
const ENGINE: string = 'link-assistant-router/native-managed/v1', SELF: string = fileURLToPath(import.meta.url);
const MAX_STATE: number = 1024 * 1024, children: any = new (Map as any)(), OWNER_BOOT: string = randomUUID();
const fail: any = (message?: any): any => (Object as any).assign(new (Error as any)(message), { code: 'managed_server' });
const unsupported: any = (message?: any): any => (Object as any).assign(new (Error as any)(message), { code: 'unsupported' });
const sleep: any = (ms?: any): any => new (Promise as any)((done?: any): any => setTimeout(done, ms));
const out: any = (...lines: any[]): any => ({ output: lines });
const nonce: any = (): string => randomBytes(32).toString('hex');
const digest: any = (key?: any, text?: any): string => createHmac('sha256', key).update(text).digest('hex');
const fingerprint: any = (value?: any): string => createHash('sha256').update(value).digest('hex');
function equal(a?: any, b?: any): boolean { return typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual((Buffer as any).from(a), (Buffer as any).from(b)); }
export const supportedManagedOperations: any = (Object as any).freeze((Object as any).fromEntries(['start', 'stop', 'status', 'use', 'claim', 'reap', 'remove'].map((op?: any): any => [`server.${op}`, {
        status: 'partial', limitations: ['Native Node daemon and namespaced JSON registry, not Rust Docker container/volume; loopback HTTP only; no systemd, TLS trust import, local discovery, OAuth adoption, or Docker leases; native references use explicit acquisition and dead-owner reaping.'],
    }])));
async function info(path?: any): Promise<any> { try {
    return await lstat(path);
}
catch (error: any) {
    if (error.code === 'ENOENT')
        return null;
    throw error;
} }
async function noLinks(path?: any): Promise<void> {
    for (let current: any = resolve(path);;) {
        if ((await info(current))?.isSymbolicLink())
            throw fail('Native managed state contains a symlink');
        if (current === parse(current).root)
            return;
        (current as any) = dirname(current);
    }
}
async function readJSON(path?: any): Promise<any> {
    await noLinks(path);
    let file: any;
    try {
        (file as any) = await open(path, 'r');
        const stat: any = await file.stat();
        if (!stat.isFile() || stat.size > MAX_STATE)
            throw fail('Native managed state requires a regular file within 1 MiB');
        const bytes: any = (Buffer as any).alloc(MAX_STATE + 1);
        const { bytesRead }: any = await file.read(bytes, 0, bytes.length, 0);
        if (bytesRead > MAX_STATE)
            throw fail('Native managed state exceeds 1 MiB');
        return (JSON as any).parse(new (TextDecoder as any)('utf-8', { fatal: true }).decode(bytes.subarray(0, bytesRead)));
    }
    catch (error: any) {
        if (error.code === 'ENOENT')
            return null;
        throw fail('Invalid or unreadable native managed state');
    }
    finally {
        await file?.close();
    }
}
function paths(dataDir?: any): any {
    if (typeof dataDir !== 'string' || !dataDir)
        throw fail('Managed operation requires a resolved data directory');
    const root: string = join(resolve(dataDir), 'native-managed');
    return { root, state: join(root, 'state.json'), selection: join(root, 'server.json'), volume: join(root, 'data') };
}
function selectionPath(p?: any, env?: any): any {
    const nonempty: any = (value?: any): undefined | string => typeof value === 'string' && value.trim() ? value : undefined;
    const root: any = nonempty(env.XDG_CONFIG_HOME) ?? (nonempty(env.HOME) ? join(env.HOME, '.config') : nonempty(env.APPDATA));
    if (!root)
        return p.selection;
    if (!isAbsolute(root))
        throw fail('Managed server state directory must be absolute');
    return join(root, 'link-assistant-router', 'server.json');
}
function certificatePath(selection?: any, name?: any): string {
    if (typeof name !== 'string' || !/^ca-[a-f0-9]{64}\.pem$/.test(name))
        throw fail('Persisted Router CA name is invalid');
    return join(dirname(selection), 'server-trust', name);
}
async function importCertificate(source?: any, selection?: any, cwd?: any): Promise<string> {
    const path: string = resolve(cwd, source);
    await noLinks(path);
    const file: any = await open(path, 'r');
    let bytes: any;
    try {
        const stat: any = await file.stat();
        if (!stat.isFile() || stat.size > MAX_STATE)
            throw fail('CA certificate requires a regular PEM file within 1 MiB');
        const buffer: any = (Buffer as any).alloc(MAX_STATE + 1), { bytesRead }: any = await file.read(buffer, 0, buffer.length, 0);
        if (bytesRead > MAX_STATE)
            throw fail('CA certificate exceeds 1 MiB');
        (bytes as any) = buffer.subarray(0, bytesRead);
    }
    finally {
        await file.close();
    }
    const pem: string = new (TextDecoder as any)('utf-8', { fatal: true }).decode(bytes), blocks: any = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
    if (!blocks?.length)
        throw fail('CA bundle contains no certificates');
    for (const block of blocks as any)
        new (X509Certificate as any)(block);
    const name: string = `ca-${createHash('sha256').update(bytes).digest('hex')}.pem`, destination: string = certificatePath(selection, name);
    await noLinks(destination);
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    await chmod(dirname(destination), 0o700);
    await atomicWrite(destination, bytes);
    await chmod(destination, 0o600);
    return name;
}
async function writeJSON(path?: any, value?: any): Promise<void> {
    const text: string = (JSON as any).stringify(value);
    if ((Buffer as any).byteLength(text) > MAX_STATE)
        throw fail('Native managed state exceeds 1 MiB');
    await noLinks(path);
    await atomicWrite(path, text + '\n');
    await chmod(path, 0o600);
}
async function locked(p?: any, operation?: any): Promise<any> {
    await noLinks(p.root);
    await mkdir(p.root, { recursive: true, mode: 0o700 });
    await chmod(p.root, 0o700);
    return serialized(p.state, (): any => withNativeFileLock(p.state, operation, 12000));
}
function validateState(state?: any): any {
    if (!state)
        return null;
    if (state.schema !== ENGINE || state.engine !== 'node' || !/^[a-f0-9]{64}$/.test(state.control_key) || !/^[a-f0-9]{64}$/.test(state.token_secret) ||
        typeof state.boot_id !== 'string' || !(Number as any).isInteger(state.port) || state.port < 0 || state.port > 65535 ||
        !(Number as any).isInteger(state.control_port) || state.control_port < 0 || state.control_port > 65535 ||
        (state.pid !== null && (!(Number as any).isSafeInteger(state.pid) || state.pid <= 0)) || !(Array as any).isArray(state.references) ||
        state.references.length > 10000 || (state.references.some as any)((ref?: any): boolean => !(Number as any).isSafeInteger(ref.pid) || ref.pid <= 0 || typeof ref.owner_boot !== 'string') ||
        typeof state.claimed !== 'boolean' || typeof state.keep_running !== 'boolean' || !(Number as any).isSafeInteger(state.created_at))
        throw fail('Native managed registry is invalid or belongs to another engine');
    return state;
}
const loadState: any = async (p?: any): Promise<any> => validateState(await readJSON(p.state));
function alive(pid?: any): boolean {
    if (!(Number as any).isSafeInteger(pid) || pid <= 0)
        return false;
    try {
        (process as any).kill(pid, 0);
        return true;
    }
    catch (error: any) {
        if (error.code === 'ESRCH')
            return false;
        if (error.code === 'EPERM')
            return true;
        throw error;
    }
}
export function normalizeManagedOrigin(value?: any): string {
    let url: any;
    try {
        (url as any) = new (URL as any)(String(value).trim());
    }
    catch {
        throw fail('Server URL must be an absolute http:// or https:// origin without credentials, path, query, or fragment');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
        throw fail('Server URL must be an absolute http:// or https:// origin without credentials, path, query, or fragment');
    return url.origin;
}
function request(url?: any, { method = 'GET', headers = {}, body, limit = 65536, timeout = 1200, phase = 'control' }: any = {}): any {
    return new (Promise as any)((done?: any, reject?: any): void => {
        const started: number = (performance as any).now();
        const call: any = httpRequest(url, { method, headers, agent: false }, (response?: any): void => {
            const chunks: any = [];
            let size: any = 0;
            response.on('data', (bytes?: any): void => { (size as any) += bytes.length; if (size > limit)
                call.destroy(fail('Managed control response exceeds its budget'));
            else
                chunks.push(bytes); });
            response.on('error', reject);
            response.on('end', (): void => done({ status: response.statusCode, text: (Buffer as any).concat(chunks).toString('utf8') }));
        });
        call.setTimeout(timeout, (): any => call.destroy(fail(`Managed ${phase} request timed out (budget=${timeout}ms, elapsed=${(Math as any).round((performance as any).now() - started)}ms)`)));
        call.on('error', reject);
        call.end(body);
    });
}
async function proof(state?: any, action: any = 'health', verifyBootstrap: any = false): Promise<any> {
    const challenge: string = nonce(), body: string = (JSON as any).stringify({ challenge, boot_id: state.boot_id, verify_bootstrap: verifyBootstrap });
    const result: any = await request(`http://127.0.0.1:${state.control_port}/${action}`, { method: 'POST', headers: { authorization: `Bearer ${state.control_key}`, 'content-type': 'application/json' }, body, phase: verifyBootstrap ? 'bootstrap verification' : `${action} proof` });
    if (result.status !== 200)
        throw fail('Managed daemon ownership verification failed');
    let report: any;
    try {
        (report as any) = (JSON as any).parse(result.text);
    }
    catch {
        throw fail('Managed daemon ownership verification failed');
    }
    const { mac, ...payload }: any = report;
    if (!equal(mac, digest(state.control_key, (JSON as any).stringify(payload))) || payload.challenge !== challenge || payload.boot_id !== state.boot_id || payload.pid !== state.pid || payload.role !== ENGINE || payload.healthy !== true)
        throw fail('Managed daemon process identity does not match the owned registry');
    return payload;
}
async function verified(state?: any, verifyBootstrap: any = false): Promise<any> {
    if (!state.pid || !alive(state.pid))
        throw fail('Managed daemon is stopped or its recorded process has exited');
    const result: any = await proof(state, 'health', verifyBootstrap);
    const health: any = await request(`http://127.0.0.1:${state.port}/health`, { phase: 'public health' });
    if (health.status !== 200 || health.text.trim() !== 'ok')
        throw fail('Managed daemon public listener is not healthy');
    return result;
}
function daemonConfig(config?: any, state?: any, p?: any): any {
    return { providers: config.providers ?? [], accounts: config.accounts ?? [], token_secret: state.token_secret, data_dir: p.volume,
        storage_policy: 'text', host: '127.0.0.1', port: 0, account_strategy: config.account_strategy, account_failover: config.account_failover,
        account_cooldown_seconds: config.account_cooldown_seconds, session_affinity_ttl_seconds: config.session_affinity_ttl_seconds };
}
async function start(p?: any, state?: any, config?: any, keepRunning?: any): Promise<any> {
    if ((state as any)?.pid) {
        if (alive((state as any).pid)) {
            await verified(state);
            if (keepRunning) {
                (state as any).keep_running = true;
                await writeJSON(p.state, state);
            }
            return state;
        }
        (state as any).pid = null;
        (state as any).control_port = 0;
    }
    (state as any) ??= { schema: ENGINE, engine: 'node', token_secret: nonce(), control_key: nonce(), boot_id: randomUUID(), created_at: (Math as any).floor((Date as any).now() / 1000), pid: null, port: 0, control_port: 0, references: [], keep_running: false, claimed: false, bootstrap_token: null };
    (state as any).boot_id = randomUUID();
    (state as any).control_key = nonce();
    (state as any).keep_running ||= keepRunning;
    await noLinks(p.volume);
    await validateTree(p.volume);
    const executable: string = (process as any).versions.bun ? 'node' : (process as any).execPath;
    const child: any = spawn(executable, [SELF, '--daemon'], { detached: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'], env: { PATH: (process as any).env.PATH ?? '', SystemRoot: (process as any).env.SystemRoot ?? '' } });
    let committed: any = false;
    try {
        const ready: any = await new (Promise as any)((done?: any, reject?: any): void => {
            const timer: any = setTimeout((): void => finish(reject)(fail('Managed daemon did not become ready within 10 seconds')), 10000);
            const finish: any = (fn?: any): any => (value?: any): void => { clearTimeout(timer); child.off('error', onError); child.off('exit', onExit); child.off('message', onMessage); (fn as any)(value); };
            const onError: any = finish(reject), onExit: any = finish((): void => reject(fail('Managed daemon exited before readiness')));
            const onMessage: any = finish((message?: any): void => message?.ready ? done(message) : reject(fail('Managed daemon failed to start')));
            child.once('error', onError);
            child.once('exit', onExit);
            child.once('message', onMessage);
            child.send({ state, config: daemonConfig(config, state, p) });
        });
        if (ready.pid !== child.pid || ready.boot_id !== (state as any).boot_id || !(Number as any).isInteger(ready.port) || !(Number as any).isInteger(ready.control_port))
            throw fail('Managed readiness identity mismatch');
        (Object as any).assign(state, { pid: ready.pid, port: ready.port, control_port: ready.control_port, bootstrap_token: ready.bootstrap_token });
        await verified(state);
        await writeJSON(p.state, state);
        await new (Promise as any)((done?: any, reject?: any): void => {
            const timer: any = setTimeout((): void => finish(reject)(fail('Managed daemon did not acknowledge commit within 10 seconds')), 10000);
            const finish: any = (fn?: any): any => (value?: any): void => { clearTimeout(timer); child.off('error', onError); child.off('exit', onExit); child.off('message', onMessage); (fn as any)(value); };
            const onError: any = finish(reject), onExit: any = finish((): void => reject(fail('Managed daemon exited before commit')));
            const onMessage: any = finish((message?: any): void => message?.committed && message.pid === child.pid && message.boot_id === (state as any).boot_id ? done() : reject(fail('Managed commit identity mismatch')));
            child.once('error', onError);
            child.once('exit', onExit);
            child.once('message', onMessage);
            child.send({ commit: true, boot_id: (state as any).boot_id }, (error?: any): void => { if (error)
                onError(error); });
        });
        (committed as any) = true;
        children.set(child.pid, child);
        child.once('exit', (): boolean => children.delete(child.pid));
        child.disconnect();
        child.unref();
        return state;
    }
    finally {
        if (!committed) {
            let timer: any;
            const exited: any = child.exitCode !== null || child.signalCode !== null ? (Promise as any).resolve() : new (Promise as any)((done?: any): any => child.once('exit', done));
            if (child.connected) {
                child.send({ abort: true }, (): void => { });
                child.disconnect();
            }
            child.unref();
            try {
                await (Promise as any).race([exited, new (Promise as any)((_?: any, reject?: any): void => { (timer as any) = setTimeout((): void => reject(fail('Aborted managed daemon did not exit within 4 seconds')), 4000); })]);
            }
            finally {
                clearTimeout(timer);
            }
        }
    }
}
async function stop(p?: any, state?: any): Promise<any> {
    if (!state)
        throw fail('Managed router is absent; run server.start first');
    if (state.pid && alive(state.pid)) {
        await verified(state);
        await proof(state, 'shutdown');
        const deadline: number = (Date as any).now() + 6000;
        while (alive(state.pid)) {
            if ((Date as any).now() >= deadline)
                throw fail('Owned managed daemon has not exited; registry was retained');
            await sleep(25);
        }
    }
    state.pid = null;
    state.control_port = 0;
    state.keep_running = false;
    state.references = [];
    await writeJSON(p.state, state);
    return state;
}
async function validateTree(path?: any): Promise<void> {
    let files: any = 0;
    const visit: any = async (path?: any, depth?: any): Promise<void> => {
        if (++files > 10000 || depth > 32)
            throw unsupported('Native managed volume exceeds its 10000-entry / 32-level safety budget');
        await noLinks(path);
        const stat: any = await info(path);
        if (!stat)
            return;
        if (stat.isDirectory())
            for (const name of await readdir(path) as any)
                await visit(join(path, name), depth + 1);
        else if (!stat.isFile())
            throw fail('Managed volume contains a special file');
    };
    await visit(path, 0);
}
async function selection(p?: any, env?: any, state?: any): Promise<any> {
    const configured: any = env.LINK_ASSISTANT_ROUTER_URL ?? env.ROUTER_URL;
    if (configured !== undefined)
        return { source: 'environment', url: normalizeManagedOrigin(configured), token_configured: !!(env.LINK_ASSISTANT_ROUTER_TOKEN ?? env.LINK_ASSISTANT_TOKEN) };
    const saved: any = await readJSON(selectionPath(p, env));
    if (saved)
        return { source: 'persisted', url: normalizeManagedOrigin(saved.server), token_configured: typeof saved.token === 'string' };
    return { source: 'managed', url: state?.port ? `http://127.0.0.1:${state.port}` : null, token_configured: false };
}
export async function selectedManagedServer({ core, config = {}, env = {} }: any = {}): Promise<null | string> {
    (config as any) = core?.config ?? config;
    const configured: any = env.LINK_ASSISTANT_ROUTER_URL ?? env.ROUTER_URL;
    if (configured !== undefined)
        return normalizeManagedOrigin(configured);
    const p: any = paths(config.data_dir ?? config.dataDir), saved: any = await readJSON(selectionPath(p, env));
    return saved ? normalizeManagedOrigin(saved.server) : null;
}
export async function selectedManagedTarget({ name, options = {}, config = {}, env = {}, cwd = (process as any).cwd() }: any = {}): Promise<any> {
    if (options.local === true)
        return null;
    if (options.managed === true) {
        const error: any = fail(`--managed starts a disposable router for with/configure; ${name} cannot use one. Pass --local or --server instead.`);
        error.exitCode = 2;
        throw error;
    }
    const p: any = paths(resolve(cwd, options.data_dir ?? config.data_dir ?? config.dataDir ?? env.DATA_DIR ?? '.router'));
    let saved: any;
    try {
        (saved as any) = await readJSON(selectionPath(p, env));
        if (saved) {
            if (typeof saved !== 'object' || (Array as any).isArray(saved))
                throw fail('Invalid persisted server selection');
            normalizeManagedOrigin((saved as any).server);
            if ((saved as any).management_server !== undefined)
                normalizeManagedOrigin((saved as any).management_server);
        }
    }
    catch (error: any) {
        if (options.server === undefined)
            throw error;
        (saved as any) = undefined;
    }
    const environmentServer: any = env.LINK_ASSISTANT_ROUTER_URL ?? env.ROUTER_URL;
    const supplied: any = options.server ?? environmentServer ?? (saved as any)?.server;
    if (supplied === undefined) {
        if (options.management_server !== undefined)
            throw fail('A management server requires an inference server selection');
        return null;
    }
    const server: string = normalizeManagedOrigin(supplied);
    const source: string = options.server !== undefined ? 'flag' : environmentServer !== undefined ? 'environment' : 'persisted configuration';
    const management: any = options.management_server ?? (options.server !== undefined ? server
        : environmentServer !== undefined ? env.LINK_ASSISTANT_ROUTER_MANAGEMENT_URL ?? env.ROUTER_MANAGEMENT_URL ?? server
            : (saved as any).management_server ?? server);
    const managementServer: string = normalizeManagedOrigin(management);
    const same: any = saved && normalizeManagedOrigin((saved as any).server) === server;
    const token: any = env.LINK_ASSISTANT_ROUTER_TOKEN ?? env.LINK_ASSISTANT_TOKEN ?? (same ? (saved as any).token : undefined);
    if (token !== undefined && (typeof token !== 'string' || !token.trim() || /[\r\n]/.test(token)))
        throw fail('Selected router credential is invalid');
    const savedManagement: any = saved ? normalizeManagedOrigin((saved as any).management_server ?? (saved as any).server) : null;
    return { server, managementServer, source, ...(token ? { token } : {}),
        ...(same && (saved as any).ca_cert ? { caCert: certificatePath(selectionPath(p, env), (saved as any).ca_cert) } : {}),
        ...(savedManagement === managementServer && ((saved as any).management_ca_cert || same && (saved as any).ca_cert)
            ? { managementCaCert: certificatePath(selectionPath(p, env), (saved as any).management_ca_cert ?? (saved as any).ca_cert) } : {}) };
}
async function status(p?: any, state?: any, env?: any): Promise<any> {
    let lifecycle: any = state ? 'stopped' : 'absent', detail: any = null;
    if (state?.pid && alive(state.pid)) {
        try {
            await verified(state);
            (lifecycle as any) = 'running';
        }
        catch {
            (lifecycle as any) = 'unverified';
            (detail as any) = 'Recorded process failed identity or health verification; no process action is authorized';
        }
    }
    const selected: any = await selection(p, env, state);
    return { selection: selected, managed: { present: !!state, state: lifecycle, detail, container: 'native-node-daemon', volume: p.volume, url: state?.port ? `http://127.0.0.1:${state.port}` : null,
            administrator_claimed: state?.claimed ?? false, users: state?.references.filter((ref?: any): boolean => alive(ref.pid)).length ?? 0, keep_running: state?.keep_running ?? false },
        output: [`effective server: ${selected.source}${selected.url ? `: ${selected.url}` : ''}`, `managed server: ${lifecycle}; engine=node`] };
}
function validateOptions(name?: any, options?: any, config?: any): void {
    const allowed: Set<string> = new (Set as any)(['data_dir', ...(name === 'server.use' ? ['server', 'management_server', 'token', 'token_stdin', 'clear', 'run_max_requests', 'ca_cert', 'management_ca_cert'] : name === 'server.reap' ? ['pid'] : name === 'server.remove' ? ['yes'] : [])]);
    for (const [key, value] of (Object as any).entries(options) as any)
        if (value !== undefined && value !== false && !allowed.has(key))
            throw unsupported(`Native ${name} does not support ${key}`);
    if ((Object as any).entries(config).some(([key, value]: any): any => value && /^(tls|https|listeners|systemd)/i.test(key)))
        throw unsupported('Native managed daemons support one loopback HTTP listener only');
    if (name === 'server.remove' && options.yes !== true)
        throw fail('Removing the native managed volume destroys its saved credentials and requires --yes');
    if (name === 'server.reap' && (!(Number as any).isSafeInteger(Number(options.pid)) || Number(options.pid) <= 0))
        throw fail('server.reap requires a positive PID');
}
export async function executeManagedOperation({ name, options = {}, invocation = {}, core, config = {}, env = {} }: any): Promise<any> {
    if (!(supportedManagedOperations as any)[name])
        throw unsupported(`Native ${name} is not implemented`);
    (config as any) = core?.config ?? config;
    validateOptions(name, options, config);
    const p: any = paths(options.data_dir ?? config.data_dir ?? config.dataDir);
    if (name === 'server.use') {
        p.selection = selectionPath(p, env);
        if (options.clear && (Object as any).entries(options).some(([key, value]: any): boolean => !['clear', 'data_dir'].includes(key) && value !== undefined && value !== false))
            throw fail('--clear cannot be combined with a server, token, or run budget');
        let selected: any;
        if (!options.clear) {
            if (!options.server)
                throw fail('Provide a server URL or use --clear');
            let token: any = options.token;
            if (options.token_stdin) {
                if (token !== undefined)
                    throw fail('token and token_stdin conflict');
                (token as any) = (String(invocation.stdin ?? '').split(/\r?\n/) as any)[0].trim();
                if (!token)
                    throw fail('Standard input did not contain a token');
            }
            if (token !== undefined && (typeof token !== 'string' || !token))
                throw fail('Server token must be a nonempty string');
            if (options.run_max_requests !== undefined && (!(Number as any).isSafeInteger(Number(options.run_max_requests)) || Number(options.run_max_requests) <= 0))
                throw fail('Run budget must be a positive integer');
            const server: string = normalizeManagedOrigin(options.server), management: any = options.management_server === undefined ? undefined : normalizeManagedOrigin(options.management_server);
            (selected as any) = { server, ...(management && management !== server ? { management_server: management } : {}), ...(token ? { token } : {}), ...(options.run_max_requests !== undefined ? { run_max_requests: Number(options.run_max_requests) } : {}) };
        }
        return locked(p, async (): Promise<any> => {
            if (!options.clear) {
                const previous: any = await readJSON(p.selection).catch((): null => null), same: any = previous?.server && normalizeManagedOrigin(previous.server) === (selected as any).server;
                const sameManagement: any = previous?.server && normalizeManagedOrigin(previous.management_server ?? previous.server) === ((selected as any).management_server ?? (selected as any).server);
                (selected as any).ca_cert = options.ca_cert ? await importCertificate(options.ca_cert, p.selection, invocation.cwd ?? (process as any).cwd()) : same ? previous.ca_cert : undefined;
                (selected as any).management_ca_cert = options.management_ca_cert ? await importCertificate(options.management_ca_cert, p.selection, invocation.cwd ?? (process as any).cwd()) : sameManagement ? previous.management_ca_cert : undefined;
                if (!(selected as any).management_server && !(selected as any).management_ca_cert)
                    (selected as any).management_ca_cert = (selected as any).ca_cert;
            }
            if (options.clear) {
                await noLinks(p.selection);
                await rm(p.selection, { force: true });
                return out(`cleared persisted server selection at ${p.selection}`);
            }
            await writeJSON(p.selection, selected);
            return out(`saved server selection in ${p.selection} (token ${(selected as any).token ? 'set' : 'unset'})`);
        });
    }
    return locked(p, async (): Promise<any> => {
        let state: any = await loadState(p);
        if (name === 'server.status')
            return status(p, state, env);
        if (name === 'server.start') {
            (state as any) = await start(p, state, config, true);
            return out(`managed native router started at http://127.0.0.1:${(state as any).port}`);
        }
        if (name === 'server.stop') {
            await stop(p, state);
            return out('managed native router stopped; native credential volume was preserved');
        }
        if (name === 'server.claim') {
            if (!state)
                throw fail('Managed router is absent; run server.start first');
            if ((state as any).claimed)
                throw fail('Managed router administrator is already claimed; its credential is not printed twice');
            const identity: any = await verified(state, true);
            if (!identity.bootstrap_valid || typeof (state as any).bootstrap_token !== 'string' || identity.bootstrap_fingerprint !== fingerprint((state as any).bootstrap_token))
                throw fail('Managed bootstrap administrator is unavailable, mismatched, or expired');
            (state as any).claimed = true;
            await writeJSON(p.state, state);
            return out((state as any).bootstrap_token);
        }
        if (name === 'server.reap') {
            const pid: number = Number(options.pid);
            if (!state)
                return out();
            if (alive(pid))
                throw fail('Refusing to reap a live or reused owner PID');
            (state as any).references = ((state as any).references.filter as any)((ref?: any): boolean => ref.pid !== pid);
            if (!(state as any).references.length && !(state as any).keep_running)
                await stop(p, state);
            else
                await writeJSON(p.state, state);
            return out();
        }
        if (!state)
            throw fail('Managed router is absent; no owned state was removed');
        await stop(p, state);
        await validateTree(p.volume);
        await rm(p.volume, { recursive: true, force: true });
        await noLinks(p.state);
        await rm(p.state, { force: true });
        return out('removed the native managed daemon and its credential volume');
    });
}
export async function acquireManagedReference({ core, config = {} }: any): Promise<any> {
    (config as any) = core?.config ?? config;
    validateOptions('server.start', {}, config);
    const p: any = paths(config.data_dir ?? config.dataDir);
    return locked(p, async (): Promise<any> => { const state: any = await start(p, await loadState(p), config, false); if (!(state.references.some as any)((ref?: any): boolean => ref.pid === (process as any).pid && ref.owner_boot === OWNER_BOOT))
        (state.references.push as any)({ pid: (process as any).pid, owner_boot: OWNER_BOOT }); await writeJSON(p.state, state); return { pid: (process as any).pid, url: `http://127.0.0.1:${state.port}` }; });
}
async function daemon(): Promise<void> {
    let runtime: any, control: any, committed: any = false, started: any = false, ready: any = false, bootId: any;
    const exit: any = async (): Promise<any> => { const timer: any = setTimeout((): any => (process as any).exit(0), 3000); timer.unref(); await (runtime as any)?.close().catch((): void => { }); (control as any)?.close(); (process as any).exit(0); };
    const deadline: any = setTimeout((): any => exit(), 10000);
    (process as any).on('disconnect', (): void => { if (!committed)
        exit(); });
    (process as any).on('SIGTERM', exit);
    (process as any).on('SIGINT', exit);
    (process as any).on('message', async (message?: any): Promise<void> => {
        if (message?.commit) {
            if (!ready || message.boot_id !== bootId) {
                await exit();
                return;
            }
            (committed as any) = true;
            clearTimeout(deadline);
            (process as any).send?.({ committed: true, pid: (process as any).pid, boot_id: bootId });
            return;
        }
        if (message?.abort) {
            await exit();
            return;
        }
        if (started || !message?.config || !message?.state)
            return;
        (started as any) = true;
        try {
            const state: any = validateState(message.state), core: any = await (await import("./core.js")).createRouterCore({ config: message.config, env: {} });
            (bootId as any) = state.boot_id;
            let token: any = state.bootstrap_token;
            if (!token)
                (token as any) = (await core.tokens.issue({ scope: 'admin', ttl_hours: 87600, label: 'native-managed-bootstrap' })).token;
            (runtime as any) = (await import("./server.js")).createNativeRouter({ core });
            await runtime.listen({ host: '127.0.0.1', port: 0 });
            (control as any) = createServer(async (req?: any, res?: any): Promise<void> => {
                try {
                    if (req.method !== 'POST' || !['/health', '/shutdown'].includes(req.url) || !equal(req.headers.authorization, `Bearer ${state.control_key}`)) {
                        res.writeHead(403);
                        res.end();
                        return;
                    }
                    const chunks: any = [];
                    let length: any = 0;
                    for await (const bytes of req as any) {
                        (length as any) += bytes.length;
                        if (length > 4096)
                            throw fail('Control body too large');
                        chunks.push(bytes);
                    }
                    const body: any = (JSON as any).parse((Buffer as any).concat(chunks).toString('utf8'));
                    if (!/^[a-f0-9]{64}$/.test(body.challenge) || body.boot_id !== state.boot_id)
                        throw fail('Invalid control challenge');
                    let bootstrapValid: any = false;
                    if (body.verify_bootstrap === true)
                        try {
                            await core.tokens.validate(token, { admin: true });
                            (bootstrapValid as any) = true;
                        }
                        catch { }
                    const payload: any = { challenge: body.challenge, boot_id: state.boot_id, pid: (process as any).pid, role: ENGINE, healthy: !!(runtime as any).address, bootstrap_valid: bootstrapValid, bootstrap_fingerprint: fingerprint(token) };
                    res.writeHead(200, { 'content-type': 'application/json' });
                    res.end((JSON as any).stringify({ ...payload, mac: digest(state.control_key, (JSON as any).stringify(payload)) }));
                    if (req.url === '/shutdown')
                        setImmediate(exit);
                }
                catch {
                    if (!res.headersSent)
                        res.writeHead(400);
                    res.end();
                }
            });
            control.requestTimeout = 2000;
            control.headersTimeout = 2000;
            await new (Promise as any)((done?: any, reject?: any): void => { ((control as any).once as any)('error', reject); ((control as any).listen as any)(0, '127.0.0.1', done); });
            (ready as any) = true;
            deadline.refresh();
            (process as any).send?.({ ready: true, pid: (process as any).pid, boot_id: state.boot_id, port: runtime.address.port, control_port: control.address().port, bootstrap_token: token });
        }
        catch {
            (process as any).send?.({ ready: false });
            await exit();
        }
    });
}
if (((process as any).argv as any)[1] === SELF && ((process as any).argv as any)[2] === '--daemon')
    daemon();

// Private lifecycle helpers below use the existing authenticated daemon proof.
export async function withNativeManagedConfigureTarget(context:any,operation:(target:any)=>Promise<any>):Promise<any>{
 const {config={},options={},env={},cwd=process.cwd(),create=false}=context,p=paths(resolve(cwd,options.data_dir??config.data_dir??config.dataDir??env.DATA_DIR??'.router'));
 const initial=await loadState(p);if(!initial&&!create)return null;
 const lease=nonce();let selected:any;
 await locked(p,async()=>{
  let state=await loadState(p);if(!state&&!create)return;
  const wasRunning=!!state?.pid&&alive(state.pid),keepRunning=state?.keep_running===true;
  if(options.local&&!wasRunning)throw fail('--local requires an already-running owned Router');
  if(!wasRunning){validateOptions('server.start',{},config);state=await start(p,state,config,false);}
  try{
   const identity=await verified(state,!state.claimed);let token=env.LINK_ASSISTANT_ROUTER_TOKEN??env.LINK_ASSISTANT_TOKEN;
   if(token===undefined&&!state.claimed){if(!identity.bootstrap_valid||typeof state.bootstrap_token!=='string'||identity.bootstrap_fingerprint!==fingerprint(state.bootstrap_token))throw fail('Managed bootstrap administrator is unavailable or expired');token=state.bootstrap_token;}
   if(token!==undefined&&(typeof token!=='string'||!token.trim()||/[\r\n]/u.test(token)))throw fail('Selected Router credential is invalid');
   if(state.references.length>=10000)throw fail('Managed reference budget exhausted');state.references.push({pid:process.pid,owner_boot:OWNER_BOOT,lease_id:lease});validateState(state);await writeJSON(p.state,state);selected={boot:state.boot_id,started:!wasRunning,keepRunning,server:'http://127.0.0.1:'+state.port,token};
  }catch(error){state.references=state.references.filter((reference:any)=>reference.lease_id!==lease);if(!wasRunning&&!keepRunning&&!state.references.length)await stop(p,state);throw error;}
 });
 if(!selected)return null;let succeeded=false,retained=false;
 try{const value=await operation({server:selected.server,managementServer:selected.server,source:'managed native Node server',retainManagedServer:()=>{retained=true;},...(selected.token?{token:selected.token}:{})});succeeded=true;return value;}
 finally{await locked(p,async()=>{
  const state=await loadState(p);if(!state||state.boot_id!==selected.boot)throw fail('Managed Router changed while configure held its reference; replacement state was preserved');
  if(!state.references.some((reference:any)=>reference.pid===process.pid&&reference.owner_boot===OWNER_BOOT&&reference.lease_id===lease))throw fail('Managed configure reference changed; state was preserved');
  state.references=state.references.filter((reference:any)=>!(reference.pid===process.pid&&reference.owner_boot===OWNER_BOOT&&reference.lease_id===lease));
  if(succeeded||retained){await verified(state);state.keep_running=true;await writeJSON(p.state,state);}
  else if(selected.started&&!selected.keepRunning&&!state.keep_running&&!state.references.length)await stop(p,state);else await writeJSON(p.state,state);
 });}
}
