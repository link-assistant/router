// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=547c1691a4855aefc1bbcd583f46d8491e6054b1addd6a553c2976455c676645; dynamic any annotations are explicit draft gaps.
import { readFile } from 'node:fs/promises';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { transactionalWrite, recoverTransactionalWrite, readOptional, serialized } from "./storage.js";
import { rustLockPath, withAdvisoryFileLock } from "./file-lock.js";
import { RouterError, ensureRealSecret } from "./tokens.js";
import { normalizeEmergencyConfig } from "./emergency-auth.js";
export function parseLenv(text?: any): any {
    const values: any = (Object as any).create(null);
    for (const raw of (text.split as any)(/\r?\n/) as any) {
        const line: any = raw.trim();
        if (!line || (line.startsWith as any)('#'))
            continue;
        const match: any = /^([A-Za-z_][\w]*)(?:\s*:\s*|\s*=\s*)(.*)$/.exec(line);
        if (!match)
            throw new (RouterError as any)('invalid_config', `Invalid configuration line: ${((line.split as any)(/[=:]/) as any)[0]}`);
        let value: any = (match as any)[2];
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
            (value as any) = value.slice(1, -1);
        (values as any)[(match as any)[1]] = value;
    }
    return values;
}
const bool: any = (value?: any): boolean => {
    if (typeof value === 'boolean')
        return value;
    const normalized: string = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized))
        return true;
    if (['false', '0', 'no', 'off'].includes(normalized))
        return false;
    throw new (RouterError as any)('invalid_config', 'Boolean configuration must be true or false');
};
export const nativeConfigOptions: Set<string> = new (Set as any)(['token_secret', 'data_dir', 'storage_policy', 'host', 'port', 'account_strategy',
    'account_failover', 'account_cooldown_seconds', 'account_max_cooldown_seconds', 'session_affinity_ttl_seconds',
    'token_admin_key', 'admin_key', 'allow_anonymous_admin', 'disable_login_api', 'login_max_sessions', 'login_session_ttl_secs',
    'claude_code_home', 'claude_home', 'codex_home', 'gemini_home', 'qwen_home', 'home', 'openai_compatible_provider_name',
    'management_allow_remote', 'management_lockout_failures', 'management_lockout_secs', 'management_lockout_exempt_loopback',
    'emergency_accept_any_token', 'emergency_allow_non_loopback', 'emergency_duration_minutes']);
export const nativeConfigEnvironment: any = { TOKEN_SECRET: 'token_secret', DATA_DIR: 'data_dir', STORAGE_POLICY: 'storage_policy', HOST: 'host', PORT: 'port',
    ACCOUNT_STRATEGY: 'account_strategy', ACCOUNT_FAILOVER: 'account_failover', ACCOUNT_COOLDOWN_SECONDS: 'account_cooldown_seconds',
    SESSION_AFFINITY_TTL_SECONDS: 'session_affinity_ttl_seconds', TOKEN_ADMIN_KEY: 'token_admin_key', CLAUDE_CODE_HOME: 'claude_code_home', CODEX_HOME: 'codex_home', GEMINI_HOME: 'gemini_home', QWEN_HOME: 'qwen_home',
    MANAGEMENT_ALLOW_REMOTE: 'management_allow_remote', MANAGEMENT_LOCKOUT_FAILURES: 'management_lockout_failures', MANAGEMENT_LOCKOUT_SECS: 'management_lockout_secs', MANAGEMENT_LOCKOUT_EXEMPT_LOOPBACK: 'management_lockout_exempt_loopback',
    EMERGENCY_ACCEPT_ANY_TOKEN: 'emergency_accept_any_token', EMERGENCY_ALLOW_NON_LOOPBACK: 'emergency_allow_non_loopback', EMERGENCY_DURATION_MINUTES: 'emergency_duration_minutes' };
export function normalizeProvider(record?: any, env: any = (process as any).env): any {
    const name: any = record.name ?? record.provider_name ?? record.provider;
    if (typeof name !== 'string' || !/^[A-Za-z0-9._-]+$/.test(name))
        throw new (RouterError as any)('invalid_provider', 'Provider name must contain ASCII letters, digits, dash, underscore or dot');
    const base: any = record.base_url ?? record.baseUrl;
    let url: any;
    try {
        (url as any) = new (URL as any)(base);
    }
    catch {
        throw new (RouterError as any)('invalid_provider', 'Provider base_url must be an absolute HTTP URL');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        throw new (RouterError as any)('invalid_provider', 'Provider base_url must be an HTTP URL without embedded credentials');
    const models: any = record.models ?? (record.default_model ? [record.default_model] : []);
    if (!(Array as any).isArray(models) || models.some((m?: any): boolean => typeof m !== 'string' || !m.trim()))
        throw new (RouterError as any)('invalid_provider', 'models must contain exact nonempty model ids');
    const aliases: any = { openai: 'openai-compatible', litellm: 'openai-compatible', 'open-a-i-compatible': 'openai-compatible', openai_like: 'openai-compatible', claude: 'anthropic', 'zai-coding-plan': 'z.ai-coding-plan', 'vertex-ai': 'vertex' };
    const rawKind: any = (record.kind ?? 'openai-compatible').toLowerCase();
    const kind: any = (aliases as any)[rawKind] ?? rawKind;
    if (!['openai-compatible', 'lefine', 'z.ai-coding-plan', 'anthropic', 'codex', 'gemini', 'qwen', 'gonka', 'vertex', 'bedrock'].includes(kind))
        throw new (RouterError as any)('invalid_provider', `Unknown provider kind '${kind}'`);
    const defaultClients: any = { anthropic: ['claude'], codex: ['codex'], gemini: ['gemini'], qwen: ['qwen'], lefine: ['grok', 'opencode', 'qwen'], 'z.ai-coding-plan': ['claude', 'codex', 'opencode'] };
    const clients: any = ['lefine', 'z.ai-coding-plan'].includes(kind) ? [...(defaultClients as any)[kind], ...(kind === 'z.ai-coding-plan' ? record.unsupported_clients ?? record.acknowledge_unsupported_clients ?? [] : [])] : record.supported_clients ?? (defaultClients as any)[kind] ?? [];
    if (!(Array as any).isArray(clients) || clients.some((client?: any): boolean => typeof client !== 'string' || !client.trim()))
        throw new (RouterError as any)('invalid_provider', 'supported_clients must contain exact client names');
    return { ...record, name, kind, base_url: (base.replace as any)(/\/+$/, ''), models: [...new (Set as any)(models)], supported_clients: [...new (Set as any)(clients)].sort(), enabled: record.enabled !== false,
        protocol: record.protocol ?? (({ anthropic: 'anthropic', codex: 'responses', gemini: 'gemini', vertex: 'vertex', bedrock: 'bedrock', 'z.ai-coding-plan': 'anthropic' } as any)[kind] ?? 'openai'),
        api_key: record.api_key ?? record.apiKey ?? (record.api_key_env ? (env as any)[record.api_key_env] : null) ?? null };
}
export function normalizeConfig(input: any = {}, env: any = (process as any).env): any {
    const config: any = { ...input };
    config.token_secret = input.token_secret ?? input.tokenSecret ?? env.TOKEN_SECRET;
    config.data_dir = resolve(input.data_dir ?? input.dataDir ?? env.DATA_DIR ?? '.router');
    const rawStorage: any = input.storage_policy ?? input.storagePolicy ?? env.STORAGE_POLICY ?? 'both';
    config.storage_policy = (({ mem: 'memory', none: 'memory', txt: 'text', lino: 'text', bin: 'binary', 'link-cli': 'binary', linkcli: 'binary', clink: 'binary', dual: 'both' } as any)[rawStorage] ?? rawStorage);
    if (!['memory', 'text', 'binary', 'both'].includes(config.storage_policy))
        throw new (RouterError as any)('invalid_config', 'Unknown storage_policy');
    config.host = input.host ?? env.HOST ?? '127.0.0.1';
    config.port = Number(input.port ?? env.PORT ?? 8080);
    if (!(Number as any).isInteger(config.port) || config.port < 0 || config.port > 65535)
        throw new (RouterError as any)('invalid_config', 'port must be between 0 and 65535');
    config.account_strategy = input.account_strategy ?? env.ACCOUNT_STRATEGY ?? 'round-robin';
    config.account_failover = bool(input.account_failover ?? env.ACCOUNT_FAILOVER ?? false);
    config.account_cooldown_seconds = Number(input.account_cooldown_seconds ?? env.ACCOUNT_COOLDOWN_SECONDS ?? 60);
    config.account_max_cooldown_seconds = Number(input.account_max_cooldown_seconds ?? 604800);
    config.session_affinity_ttl_seconds = Number(input.session_affinity_ttl_seconds ?? env.SESSION_AFFINITY_TTL_SECONDS ?? 3600);
    for (const name of ['account_cooldown_seconds', 'account_max_cooldown_seconds', 'session_affinity_ttl_seconds'] as any)
        if (!(Number as any).isSafeInteger((config as any)[name]) || (config as any)[name] < 0)
            throw new (RouterError as any)('invalid_config', `${name} must be nonnegative seconds`);
    let providers: any = input.providers ?? [];
    if (!(Array as any).isArray(providers))
        (providers as any) = (Object as any).entries(providers).map(([name, value]: any): any => ({ name, ...value }));
    if (!(providers as any).length && (env.OPENAI_COMPATIBLE_BASE_URL || input.openai_compatible)) {
        (providers as any) = [{ name: env.OPENAI_COMPATIBLE_PROVIDER_NAME ?? 'litellm', base_url: env.OPENAI_COMPATIBLE_BASE_URL ?? 'http://localhost:4000/v1', api_key: env.OPENAI_COMPATIBLE_API_KEY,
                default_model: env.OPENAI_COMPATIBLE_MODEL, models: (env.OPENAI_COMPATIBLE_MODELS ?? env.OPENAI_COMPATIBLE_MODEL ?? '').split(',').filter(Boolean), ...input.openai_compatible }];
    }
    config.providers = ((providers as any).map as any)((p?: any): any => normalizeProvider(p, env));
    if (new (Set as any)((config.providers.map as any)((p?: any): any => p.name)).size !== config.providers.length)
        throw new (RouterError as any)('invalid_config', 'Provider names must be unique');
    config.accounts = input.accounts ?? [];
    config.token_admin_key = input.token_admin_key ?? input.admin_key ?? env.TOKEN_ADMIN_KEY ?? null;
    config.allow_anonymous_admin = bool(input.allow_anonymous_admin ?? false);
    config.disable_login_api = bool(input.disable_login_api ?? false);
    config.emergency = normalizeEmergencyConfig(input, env);
    config.management = {
        allow_remote: bool(input.management_allow_remote ?? input.management?.allow_remote ?? env.MANAGEMENT_ALLOW_REMOTE ?? false),
        exempt_loopback: bool(input.management_lockout_exempt_loopback ?? input.management?.exempt_loopback ?? env.MANAGEMENT_LOCKOUT_EXEMPT_LOOPBACK ?? true),
        lockout_failures: Number(input.management_lockout_failures ?? input.management?.lockout_failures ?? env.MANAGEMENT_LOCKOUT_FAILURES ?? 5),
        lockout_secs: Number(input.management_lockout_secs ?? input.management?.lockout_secs ?? env.MANAGEMENT_LOCKOUT_SECS ?? 1800),
    };
    for (const field of ['lockout_failures', 'lockout_secs'] as any)
        if (!(Number as any).isSafeInteger((config.management as any)[field]) || (config.management as any)[field] < 0)
            throw new (RouterError as any)('invalid_config', `management ${field} must be nonnegative`);
    for (const [environment, field] of (Object as any).entries(nativeConfigEnvironment) as any)
        if ((config as any)[field] == null && (env as any)[environment] != null)
            (config as any)[field] = (env as any)[environment];
    for (const field of ['login_max_sessions', 'login_session_ttl_secs'] as any)
        if ((config as any)[field] != null) {
            (config as any)[field] = Number((config as any)[field]);
            if (!(Number as any).isSafeInteger((config as any)[field]) || (config as any)[field] <= 0)
                throw new (RouterError as any)('invalid_config', `${field} must be positive`);
        }
    return config;
}
export async function loadConfig({ config = {}, configPath, env = (process as any).env }: any = {}): Promise<any> {
    let fromFile: any = {};
    if (configPath) {
        const text: string = await readFile(configPath, 'utf8');
        if ((configPath.endsWith as any)('.json') || text.trim().startsWith('{'))
            (fromFile as any) = (JSON as any).parse(text);
        else
            (env as any) = { ...parseLenv(text), ...env };
    }
    if (!config.token_secret && !env.TOKEN_SECRET && env.TOKEN_SECRET_FILE) {
        let secret: any = await readFile(env.TOKEN_SECRET_FILE, 'utf8');
        (secret as any) = secret.replace(/\r?\n$/, '');
        if (!secret)
            throw new (RouterError as any)('invalid_config', 'TOKEN_SECRET_FILE is empty');
        (config as any) = { ...config, token_secret: secret };
    }
    return normalizeConfig({ ...fromFile, ...config }, env);
}
export function encryptProviderSecret(secret?: any, tokenSecret?: any): string {
    const key: any = createHash('sha256').update(ensureRealSecret(tokenSecret)).digest(), nonce: any = randomBytes(12);
    const cipher: any = createCipheriv('aes-256-gcm', key, nonce);
    const encrypted: any = (Buffer as any).concat([cipher.update(secret, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    return `aes256gcm:${(Buffer as any).concat([nonce, encrypted]).toString('base64')}`;
}
export function decryptProviderSecret(secret?: any, tokenSecret?: any): string {
    if (!(secret.startsWith as any)('aes256gcm:'))
        throw new (RouterError as any)('invalid_provider', 'Unsupported provider secret format');
    const packed: any = (Buffer as any).from((secret.slice as any)(10), 'base64');
    if (packed.length < 28)
        throw new (RouterError as any)('invalid_provider', 'Encrypted provider secret is too short');
    const key: any = createHash('sha256').update(ensureRealSecret(tokenSecret)).digest();
    const decipher: any = createDecipheriv('aes-256-gcm', key, packed.subarray(0, 12));
    decipher.setAuthTag(packed.subarray(-16));
    try {
        return (Buffer as any).concat([decipher.update(packed.subarray(12, -16)), decipher.final()]).toString('utf8');
    }
    catch {
        throw new (RouterError as any)('provider_secret_invalid', 'Provider secret cannot be decrypted', 500);
    }
}
const redact: any = (r?: any): any => { const { api_key, encrypted_api_key, ...safe }: any = r; return { ...safe, has_encrypted_api_key: !!encrypted_api_key }; };
export class ProviderStore {
    declare env: any;
    declare path: any;
    declare persistent: any;
    declare records: any;
    declare secret: any;
    constructor({ dataDir, secret, env = (process as any).env, records = [], persistent = true }: any) { this.path = `${dataDir}/providers.lenv`; this.secret = secret; this.env = env; this.records = new (Map as any)(records.map((r?: any): any => [r.name, r])); this.persistent = persistent; }
    async loadUnlocked(): Promise<any> {
        if (this.persistent)
            await recoverTransactionalWrite(this.path);
        const text: any = this.persistent ? await readOptional(this.path, null) : null;
        const map: any = text == null ? new (Map as any)(this.records) : new (Map as any)();
        for (const line of (text ?? '').split(/\r?\n/) as any)
            if (line.trim().startsWith('PROVIDER: ')) {
                const record: any = (JSON as any).parse(line.trim().slice(10));
                map.set(record.name, record);
            }
        return map;
    }
    async load(): Promise<any> { return this.persistent ? withAdvisoryFileLock(rustLockPath(this.path), (): any => this.loadUnlocked()) : this.loadUnlocked(); }
    async resolve(): Promise<any> {
        return [...(await this.load()).values()].filter((r?: any): boolean => r.enabled !== false).map((r?: any): any => normalizeProvider({ ...r, api_key: r.api_key ?? (r.api_key_env ? (this.env as any)[r.api_key_env] : null) ?? (r.encrypted_api_key ? decryptProviderSecret(r.encrypted_api_key, this.secret) : null) }, this.env));
    }
    async list(): Promise<any> { return [...(await this.load()).values()].map(redact).sort((a?: any, b?: any): any => (a.name.localeCompare as any)(b.name)); }
    async get(name?: any): Promise<any> { return (await this.list()).find((r?: any): boolean => r.name === name) ?? null; }
    async mutate(operation?: any, { skipWriteWhen = (): boolean => false }: any = {}): Promise<any> {
        const operationWithState: any = async (): Promise<any> => {
            const records: any = await this.loadUnlocked();
            const result: any = await (operation as any)(records);
            if (this.persistent && !(skipWriteWhen as any)(result)) {
                for (const [name, held] of records as any) {
                    const { api_key, ...safe }: any = held;
                    if (api_key)
                        safe.encrypted_api_key = encryptProviderSecret(api_key, this.secret);
                    records.set(name, safe);
                }
                const sorted: any = [...records.values()].sort((a?: any, b?: any): any => (a.name.localeCompare as any)(b.name));
                await transactionalWrite(this.path, '# Link.Assistant.Router provider store\n# Each PROVIDER value is JSON; inline API keys are encrypted.\n' + sorted.map((r?: any): string => `PROVIDER: ${(JSON as any).stringify(r)}`).join('\n') + '\n');
            }
            this.records = records;
            return result;
        };
        return serialized(this.path, (): any => this.persistent ? withAdvisoryFileLock(rustLockPath(this.path), operationWithState) : operationWithState());
    }
    stage(input?: any): any {
        const normalized: any = normalizeProvider({ ...input, name: typeof input.name === 'string' ? input.name.trim() : input.name }, {});
        if (!['openai-compatible', 'lefine', 'z.ai-coding-plan'].includes(normalized.kind))
            throw new (RouterError as any)('invalid_provider', 'Subscription services are configured separately from persisted providers');
        const { api_key, apiKey, protocol, if_absent, acknowledge_intermediary_risk, acknowledge_unsupported_clients, ...record }: any = normalized;
        record.intermediary_risk_acknowledged = input.acknowledge_intermediary_risk ?? input.intermediary_risk_acknowledged ?? false;
        record.unsupported_clients = input.acknowledge_unsupported_clients ?? input.unsupported_clients ?? [];
        if (record.kind === 'z.ai-coding-plan' && (typeof record.subscriber_id !== 'string' || !record.subscriber_id.trim()))
            throw new (RouterError as any)('invalid_provider', 'z.ai Coding Plan requires one subscriber_id');
        if (record.kind === 'openai-compatible') {
            const canonical: Set<string> = new (Set as any)(['codex', 'claude', 'gemini', 'qwen', 'grok', 'opencode', 'agent', 'cursor-agent']);
            if ((record.supported_clients.some as any)((client?: any): boolean => !canonical.has(client)))
                throw new (RouterError as any)('invalid_provider', 'supported_clients must use canonical client names');
            if (record.name === 'z.ai')
                throw new (RouterError as any)('invalid_provider', "Provider name z.ai is reserved for the Coding Plan namespace");
            if (record.subscriber_id || record.intermediary_risk_acknowledged || record.unsupported_clients.length)
                throw new (RouterError as any)('invalid_provider', 'Subscriber/risk settings require a Coding Plan provider');
        }
        if (api_key)
            record.encrypted_api_key = encryptProviderSecret(api_key, this.secret);
        return record;
    }
    async install(input?: any): Promise<any> {
        const record: any = this.stage(input);
        return this.mutate((records?: any): any => {
            const prior: any = (records.get as any)(record.name);
            if (input.if_absent && prior)
                return { outcome: 'already_present', record: redact(prior) };
            if (record.kind === 'z.ai-coding-plan' && record.enabled && [...records.values()].some((existing?: any): any => existing.enabled && existing.kind === record.kind && existing.name !== record.name))
                throw new (RouterError as any)('invalid_provider', 'Only one personal z.ai Coding Plan subscriber may be enabled');
            (records.set as any)(record.name, record);
            return { outcome: prior ? 'replaced' : 'created', record: redact(record) };
        }, { skipWriteWhen: (result?: any): boolean => result.outcome === 'already_present' });
    }
    async upsert(input?: any): Promise<any> {
        const record: any = this.stage(input);
        return this.mutate((records?: any): any => {
            if (input.if_absent && (records.has as any)(record.name))
                throw new (RouterError as any)('conflict', 'Provider already exists', 409);
            if (record.kind === 'z.ai-coding-plan' && record.enabled && [...records.values()].some((existing?: any): any => existing.enabled && existing.kind === record.kind && existing.name !== record.name))
                throw new (RouterError as any)('invalid_provider', 'Only one personal z.ai Coding Plan subscriber may be enabled');
            (records.set as any)(record.name, record);
            return redact(record);
        });
    }
    async remove(name?: any): Promise<any> { return this.mutate((records?: any): any => (records.delete as any)(name)); }
}
