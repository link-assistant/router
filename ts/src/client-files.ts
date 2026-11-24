// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=a29fb84e1762ebeb5cf14d66e42197533338bb6bd6f2e763f3cacf7e87da1d53; dynamic any annotations are explicit draft gaps.
import { stat, unlink } from 'node:fs/promises';
import { join, isAbsolute, resolve, delimiter } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readNativeText, requireNativePath } from "./operation-input.js";
import { atomicWrite } from "./storage.js";
export const clientFailure: any = (message?: any): any => (Object as any).assign(new (Error as any)(message), { code: 'client', exitCode: 1 });
export const clientIntegrations: any = (Object as any).freeze([
    { client: 'codex', legacy: 'codex', dialect: 'OpenAI Responses', token: 'LINK_ASSISTANT_TOKEN', base: null, suffix: '/api/services/codex/v1', owners: ['openai', 'z.ai'], strict: true },
    { client: 'claude', legacy: 'claude-code', dialect: 'Anthropic Messages', token: 'ANTHROPIC_AUTH_TOKEN', base: 'ANTHROPIC_BASE_URL', suffix: '/api/services/anthropic', owners: ['anthropic', 'z.ai'], strict: true },
    { client: 'cursor-agent', legacy: 'cursor', dialect: 'Cursor private', token: null, base: null, suffix: '', owners: [], strict: false, unsupported: 'Cursor uses a private ConnectRPC API and has no supported Router setup' },
    { client: 'gemini', legacy: 'gemini-cli', dialect: 'Gemini native', token: 'GEMINI_API_KEY', base: 'GOOGLE_GEMINI_BASE_URL', suffix: '/api/services/gemini', owners: ['google'], strict: false, unsupported: 'Individual Gemini subscriptions are CodeAssistIneligibleTierError; use an isolated Gemini API-key launch' },
    { client: 'grok', legacy: 'grok-cli', dialect: 'OpenAI Chat', token: 'GROK_API_KEY', base: 'GROK_BASE_URL', suffix: '/api/services/openai/v1', owners: [], strict: false },
    { client: 'opencode', legacy: 'opencode', dialect: 'OpenAI Chat', token: 'LINK_ASSISTANT_TOKEN', base: null, suffix: '/api/services/openai/v1', owners: [], strict: false },
    { client: 'qwen', legacy: 'qwen-code', dialect: 'OpenAI Chat', token: 'LINK_ASSISTANT_TOKEN', base: 'OPENAI_BASE_URL', suffix: '/api/services/qwen/v1', owners: ['qwen'], strict: false },
    { client: 'agent', legacy: 'agent', dialect: 'OpenAI Chat', token: 'LINK_ASSISTANT_TOKEN', base: null, suffix: '/api/services/openai/v1', owners: [], strict: false },
]);
export function clientIntegration(name?: any): any {
    const found: any = clientIntegrations.find((client?: any): boolean => client.client === name || client.legacy === name);
    if (!found)
        throw clientFailure('Unknown client');
    return found;
}
const absolute: any = (path?: any, label?: any): string => { if (typeof path !== 'string' || !path.trim() || !isAbsolute(path))
    throw clientFailure(`${label} requires an absolute nonempty directory`); return resolve(path); };
export function clientPaths(name?: any, { home, env = (process as any).env, cwd = (process as any).cwd() }: any = {}): any {
    const info: any = clientIntegration(name), root: string = home !== undefined ? resolve(cwd, home) : absolute(env.HOME, 'HOME');
    const directory: any = (key?: any, fallback?: any): any => home !== undefined || !(env as any)[key] ? fallback : resolve(cwd, (env as any)[key]);
    const configHome: any = directory('XDG_CONFIG_HOME', join(root, '.config'));
    const roots: any = { codex: directory('CODEX_HOME', join(root, '.codex')), claude: directory('CLAUDE_CONFIG_DIR', join(root, '.claude')),
        'cursor-agent': directory('CURSOR_CONFIG_DIR', join(root, '.cursor')), gemini: join(directory('GEMINI_CLI_HOME', root), '.gemini'), grok: join(root, '.grok'),
        opencode: join(configHome, 'opencode'), qwen: home === undefined && env.QWEN_HOME?.startsWith('~/') ? join(root, env.QWEN_HOME.slice(2)) : directory('QWEN_HOME', join(root, '.qwen')), agent: join(configHome, 'link-assistant-agent') };
    const filenames: any = { codex: 'config.toml', claude: 'settings.json', 'cursor-agent': 'cli-config.json', gemini: 'settings.json', grok: 'user-settings.json', opencode: 'opencode.json', qwen: 'settings.json', agent: 'opencode.json' };
    const owned: string = join(configHome, 'link-assistant-router', 'clients');
    return { info, home: root, configHome, config: join((roots as any)[info.client], (filenames as any)[info.client]), environment: join(owned, `${info.client}.env`), metadata: join(owned, `${info.client}.credential.json`),
        legacyEnvironment: join(owned, `${info.legacy}.env`), legacyMetadata: join(owned, `${info.legacy}.credential.json`),
        marker: ['codex', 'claude', 'opencode', 'qwen', 'agent'].includes(info.client) ? join((roots as any)[info.client], '.link-assistant-router-client.json') : null };
}
export async function optionalClientText(path?: any): Promise<null | string> {
    if (!path)
        return null;
    try {
        return await readNativeText(path, { maxBytes: 8 * 1024 * 1024 });
    }
    catch (error: any) {
        if (error.code === 'ENOENT')
            return null;
        throw clientFailure(`Could not read client configuration (${error.code ?? 'invalid file'})`);
    }
}
export async function preferredClientPath(canonical?: any, legacy?: any): Promise<any> { return await optionalClientText(canonical) !== null || await optionalClientText(legacy) === null ? canonical : legacy; }
export function clientObject(source?: any, label: any = 'Client configuration'): any {
    if (source === null || !source.trim())
        return {};
    let value: any;
    try {
        (value as any) = (JSON as any).parse(source);
    }
    catch {
        throw clientFailure(`${label} contains invalid JSON`);
    }
    if (!value || typeof value !== 'object' || (Array as any).isArray(value))
        throw clientFailure(`${label} must contain a JSON object`);
    return value;
}
export function objectProperty(document?: any, key?: any): any {
    if (!(Object as any).hasOwn(document, key))
        (document as any)[key] = {};
    const value: any = (document as any)[key];
    if (!value || typeof value !== 'object' || (Array as any).isArray(value))
        throw clientFailure(`${key} must be a JSON object`);
    return value;
}
export const renderClientJSON: any = (value?: any): string => (JSON as any).stringify(value, null, 2) + '\n';
export async function writeClientFile(path?: any, source?: any, contents?: any): Promise<any> {
    if (source === contents)
        return { path, backup: null, changed: false };
    await requireNativePath(path);
    let backup: any = null;
    if (source !== null) {
        (backup as any) = `${path}.link-assistant-router.${(Date as any).now() * 1000000}.${randomUUID().replaceAll('-', '')}.bak`;
        await atomicWrite(backup, source);
    }
    await atomicWrite(path, contents);
    return { path, backup, changed: true };
}
export async function writeClientMarker(path?: any, document?: any): Promise<void> { await requireNativePath(path); await atomicWrite(path, renderClientJSON(document)); }
export async function removeClientFile(path?: any): Promise<void> { await requireNativePath(path); try {
    await unlink(path);
}
catch (error: any) {
    if (error.code !== 'ENOENT')
        throw error;
} }
export function readClientEnvironment(source?: any, key?: any): any {
    const prefix: string = `export ${key}=`;
    const line: any = source?.split(/\r?\n/).find((line?: any): any => (line.startsWith as any)(prefix));
    if (line === undefined)
        return null;
    const raw: any = (line.slice as any)(prefix.length).trim();
    return (raw.startsWith as any)("'") && (raw.endsWith as any)("'") ? ((raw.slice as any)(1, -1).replaceAll as any)("'\\''", "'") : raw;
}
export const shellQuote: any = (value?: any): string => "'" + String(value).replaceAll("'", "'\\''") + "'";
export async function writeClientEnvironment(paths?: any, origin?: any, token?: any): Promise<any> {
    if (!paths.info.token)
        throw clientFailure('Client has no Router token environment');
    const { info }: any = paths, lines: any = [];
    if (info.base)
        lines.push(`export ${info.base}=${shellQuote(origin + info.suffix)}`);
    lines.push(`export ${info.token}=${shellQuote(token)}`);
    if (info.client === 'codex') {
        if (!(token.startsWith as any)('la_sk_'))
            throw clientFailure('Codex requires a Router-issued la_sk_ token');
        const alias: string = 'at-' + (token.slice as any)(6);
        lines.push(`export CODEX_ACCESS_TOKEN=${shellQuote(alias)}`, `export CODEX_CONNECTORS_TOKEN=${shellQuote(alias)}`, `export CODEX_AUTHAPI_BASE_URL=${shellQuote(origin + '/api/services/codex')}`);
    }
    if (info.client === 'claude')
        lines.push('export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1');
    const path: any = await preferredClientPath(paths.environment, paths.legacyEnvironment);
    await requireNativePath(path);
    await atomicWrite(path, lines.join('\n') + '\n');
    return path;
}
export async function clientCommandExists(command?: any, env: any = (process as any).env): Promise<boolean> {
    for (const directory of String(env.PATH ?? '').split(delimiter).filter(Boolean) as any) {
        try {
            if ((await stat(join(directory, command))).isFile())
                return true;
        }
        catch { }
    }
    return false;
}
export const sameClientValue: any = isDeepStrictEqual;
