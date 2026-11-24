// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=5685710a6dfa4c51a7d66443e2de01ee3cd69dc9f3e68fd1b75a3c0a4d4837c1; dynamic any annotations are explicit draft gaps.
import { unlink, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadConfig, ProviderStore, nativeConfigOptions } from "./config.js";
import { CredentialFileStore, OAuthManager, subscriptionHome, subscriptionProvider } from "./oauth.js";
import { nativeCredentialStatus } from "./auth-service.js";
import { readNativeText } from "./operation-input.js";
import { atomicWrite } from "./storage.js";
const exec: any = promisify(execFile), subscriptions: Array<string> = ['claude', 'codex', 'gemini', 'qwen'];
const candidates: any = { claude: ['.credentials.json', 'credentials.json', 'auth.json', 'oauth.json', 'config.json'], codex: ['auth.json'], gemini: ['oauth_creds.json'], qwen: ['oauth_creds.json'] };
const fail: any = (code?: any, message?: any, exitCode: any = 1): any => (Object as any).assign(new (Error as any)(message), { code, exitCode });
const output: any = (lines?: any): any => ({ output: lines });
export function credentialWithdrawal(name?: any, options?: any): any { return name === 'auth.clear' || name === 'auth.status' && options.clear_all || ['auth.claude', 'auth.codex', 'auth.gh'].includes(name) && options.clear; }
async function context({ routerOptions = {}, options = {}, invocation = {}, env = {} }: any): Promise<any> {
    const overrides: any = (Object as any).fromEntries((Object as any).entries(options).filter(([key]: any): boolean => nativeConfigOptions.has(key)));
    const input: any = { ...(routerOptions.config ?? routerOptions.core?.config ?? {}), ...overrides };
    if (invocation.cwd) {
        for (const key of ['data_dir', 'home', 'claude_home', 'claude_code_home', 'codex_home', 'gemini_home', 'qwen_home'] as any)
            if ((input as any)[key])
                (input as any)[key] = resolve(invocation.cwd, (input as any)[key]);
        if (!input.data_dir)
            input.data_dir = resolve(invocation.cwd, env.DATA_DIR ?? '.router');
    }
    const configEnv: any = { ...env };
    delete configEnv.TOKEN_SECRET_FILE;
    const config: any = await loadConfig({ ...routerOptions, config: input, env: configEnv });
    const clock: any = routerOptions.clock ?? routerOptions.core?.clock ?? ((): number => (Math as any).floor((Date as any).now() / 1000));
    const inherited: any = routerOptions.core;
    const providers: any = inherited?.config?.data_dir === config.data_dir ? inherited.providers : new (ProviderStore as any)({ dataDir: config.data_dir, secret: config.token_secret, env, records: [], persistent: config.storage_policy !== 'memory' });
    const oauth: any = inherited?.oauth ?? new (OAuthManager as any)({ fetch: routerOptions.fetch ?? globalThis.fetch, clock, env, ...routerOptions.oauth });
    return { config, clock, providers, oauth };
}
async function remove(path?: any): Promise<boolean> { try {
    await unlink(path);
    return true;
}
catch (error: any) {
    if (error.code === 'ENOENT')
        return false;
    throw fail('credential_clear', 'Credential path cannot be removed');
} }
async function hasFile(path?: any): Promise<boolean> { try {
    return (await stat(path)).isFile();
}
catch (error: any) {
    if (error.code === 'ENOENT')
        return false;
    throw fail('credential_read', 'Credential location cannot be inspected');
} }
function keychainService(env?: any): string { const dir: any = env.CLAUDE_CONFIG_DIR; return 'Claude Code-credentials' + (dir ? '-' + createHash('sha256').update(dir).digest('hex').slice(0, 8) : ''); }
async function keychainPresent(service?: any, settings?: any): Promise<any> {
    if (settings.keychainHasEntry)
        return (settings.keychainHasEntry as any)(service);
    if ((settings.platform ?? (process as any).platform) !== 'darwin')
        return false;
    try {
        await exec('/usr/bin/security', ['find-generic-password', '-s', service], { timeout: 3000, maxBuffer: 128 * 1024 });
        return true;
    }
    catch {
        return false;
    }
}
function ghDirectory(env?: any): any { return env.GH_CONFIG_DIR || (env.HOME ? join(env.HOME, '.config', 'gh') : null); }
async function ghToken(config?: any, env?: any, directory?: any, cwd?: any): Promise<null | string> {
    const expected: string = new (URL as any)(config.github?.base_url ?? env.GITHUB_PROXY_BASE_URL ?? 'https://api.github.com').hostname.replace(/^api\.github\.com$/, 'github.com');
    const text: string = await readNativeText(join(directory, 'hosts.yml'), { cwd, maxBytes: 1024 * 1024 });
    let host: any;
    for (const line of text.split('\n') as any) {
        const match: any = /^([^:]+):(.*)$/.exec(line);
        if (!match)
            continue;
        if (!/^\s/.test(line))
            (host as any) = (match as any)[1].trim().replace(/^['"]|['"]$/g, '');
        else if (host?.toLowerCase() === expected.toLowerCase() && (match as any)[1].trim() === 'oauth_token') {
            const token: string = (match as any)[2].trim().replace(/^['"]|['"]$/g, '');
            if (token)
                return token;
        }
    }
    return null;
}
async function configuredGithub(config?: any, env?: any): Promise<boolean> {
    const variable: any = config.github?.token ?? env.GITHUB_PROXY_TOKEN ?? (env.GITHUB_PROXY_TOKEN_ENV ? (env as any)[env.GITHUB_PROXY_TOKEN_ENV] : null);
    if (variable)
        return true;
    try {
        if (env.GITHUB_PROXY_TOKEN_FILE)
            return Boolean((await readNativeText(env.GITHUB_PROXY_TOKEN_FILE, { maxBytes: 1024 * 1024 })).trim());
        const dir: any = ghDirectory(env);
        return dir ? Boolean(await ghToken(config, env, dir)) : false;
    }
    catch {
        return false;
    }
}
async function withdraw(core?: any, name?: any, options?: any, { env = {}, oauth = {} }: any = {}): Promise<any> {
    let selected: any = [], github: any = false, api: any = [];
    if (name === 'auth.clear') {
        if (options.all && options.provider)
            throw fail('options', 'provider and all cannot be combined', 2);
        if (options.all) {
            (selected as any) = subscriptions;
            (github as any) = true;
            (api as any) = ((await core.providers.list()).filter as any)((row?: any): any => row.has_encrypted_api_key || row.api_key_env);
        }
        else if (options.provider) {
            const requested: any = options.provider.toLowerCase();
            if (['gh', 'github'].includes(requested))
                (github as any) = true;
            else {
                try {
                    (selected as any) = [subscriptionProvider(requested)];
                }
                catch {
                    const row: any = await (core.providers.get as any)(options.provider);
                    if (!row)
                        throw fail('credential_clear', 'No credential with that provider name');
                    (api as any) = [row];
                }
            }
        }
        else
            throw fail('options', 'Nothing to clear; name a provider or pass all', 2);
    }
    else if (name === 'auth.status') {
        (selected as any) = subscriptions;
        (github as any) = true;
        (api as any) = ((await core.providers.list()).filter as any)((row?: any): any => row.has_encrypted_api_key || row.api_key_env);
    }
    else if (name === 'auth.gh')
        (github as any) = true;
    else
        (selected as any) = [(name.slice as any)(5)];
    if (selected.length + Number(github) + (api as any).length > 1 && !options.yes)
        throw fail('credential_confirmation', 'Multiple credential withdrawals require yes');
    const lines: any = [], errors: any = [];
    for (const provider of selected as any) {
        const home: string = subscriptionHome(provider, { config: core.config, env });
        const store: any = new (CredentialFileStore as any)({ provider, home, dataDir: core.config.data_dir, clock: core.clock });
        try {
            const removed: any = await store.transaction(async (): Promise<Array<string>> => { const rows: any = []; for (const file of (candidates as any)[provider] as any) {
                const path: string = join(home, file);
                if (await remove(path))
                    rows.push(path);
            } return rows; });
            lines.push(...(removed.length ? (removed.map as any)((path?: any): string => `${(provider.padEnd as any)(8)} removed ${path}`) : [`${(provider.padEnd as any)(8)} absent`]));
            if (provider === 'claude') {
                const service: string = keychainService(env);
                if (await keychainPresent(service, oauth))
                    lines.push(`claude   note: ${(JSON as any).stringify(service)} still holds a vendor-owned Keychain entry; remove it with the vendor client`);
            }
        }
        catch (error: any) {
            errors.push(error);
            lines.push(`${(provider.padEnd as any)(8)} withdrawal failed (${error.code ?? 'credential_clear'})`);
        }
    }
    if (github) {
        try {
            const path: string = join(core.config.data_dir, 'github-credential');
            lines.push(await remove(path) ? `github   removed ${path}` : 'github   absent');
            if (await configuredGithub(core.config, env))
                lines.push('github   note: an environment or mounted gh credential remains configured');
            lines.push('github   note: restart to withdraw routes mounted at startup');
        }
        catch (error: any) {
            errors.push(error);
            lines.push('github   withdrawal failed');
        }
    }
    for (const row of api as any) {
        try {
            const deleted: any = await (core.providers.remove as any)(row.name);
            lines.push(`${(row.name.padEnd as any)(8)} ${deleted ? 'removed the stored API key and provider entry' : 'absent'}`);
            if (row.api_key_env && (env as any)[row.api_key_env])
                lines.push(`${(row.name.padEnd as any)(8)} note: ${row.api_key_env} still holds a key in this environment`);
        }
        catch (error: any) {
            errors.push(error);
            lines.push(`${(row.name.padEnd as any)(8)} withdrawal failed`);
        }
    }
    lines.push('note: this removes local credentials only; minted tokens remain valid upstream and should be revoked there');
    if (errors.length) {
        const error: any = fail('credential_clear', 'One or more local credential withdrawals failed');
        error.data = output(lines);
        throw error;
    }
    return output(lines);
}
async function ghOperation(core?: any, options?: any, invocation?: any, env?: any): Promise<any> {
    const path: string = join(core.config.data_dir, 'github-credential');
    if (options.status)
        return output([`github credential: ${await hasFile(path) ? `stored at ${path}` : await configuredGithub(core.config, env) ? 'configured from the environment' : 'absent'}`]);
    if (options.token_stdin && options.from_gh_config)
        throw fail('options', 'token-stdin and from-gh-config cannot be combined', 2);
    let token: any;
    if (options.token_stdin) {
        (token as any) = String(invocation.stdin ?? '').trim();
        if (!token)
            throw fail('credential_input', 'Token stdin must not be empty');
    }
    else {
        const dir: any = options.from_gh_config ?? ghDirectory(env);
        if (!dir)
            throw fail('credential_input', 'No gh configuration directory; pass from-gh-config');
        (token as any) = await ghToken(core.config, env, dir, invocation.cwd);
        if (!token)
            throw fail('credential_input', 'No GitHub credential found in the selected gh configuration');
    }
    if (/[\r\n\0]/.test(token))
        throw fail('credential_input', 'GitHub credential contains invalid control characters');
    await atomicWrite(path, token);
    return output([`stored the GitHub credential in ${path}`]);
}
export async function executeCredentialOperation({ name, options, invocation = {}, routerOptions = {}, env = {} }: any): Promise<any> {
    if (invocation.deadlineMs !== undefined || invocation.maxOutputBytes !== undefined)
        throw fail('unsupported', 'Credential operations do not yet implement per-invocation deadline/output accounting');
    const core: any = await context({ routerOptions, options, invocation, env });
    if (credentialWithdrawal(name, options))
        return withdraw(core, name, options, { env, oauth: routerOptions.oauth });
    if (name === 'auth.gh')
        return ghOperation(core, options, invocation, env);
    const report: any = await nativeCredentialStatus(core, { env, fetch: routerOptions.fetch, ...routerOptions.core?.oauthOptions, ...routerOptions.oauth });
    report.api_key_providers = (report.api_key_providers.filter as any)((row?: any): any => row.has_encrypted_api_key || row.api_key_env);
    if (report.credentials.some((row?: any): boolean => row.state === 'refresh-failed')) {
        const error: any = fail('credential_refresh', 'A subscription credential refresh failed');
        error.data = report;
        throw error;
    }
    return report;
}
