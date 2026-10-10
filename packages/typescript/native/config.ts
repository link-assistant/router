// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=05fe574415d468e3e303d7d95e5a9ca1d22a4fd0721571b23306b639161273a4; dynamic any annotations are explicit draft gaps.
import { readFile } from 'node:fs/promises';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { atomicWrite, readOptional, serialized, withNativeFileLock } from "./storage.js";
import { RouterError, ensureRealSecret } from "./tokens.js";
export function parseLenv(text?: any): any {
    const values: any = Object.create(null);
    for (const raw of text.split(/\r?\n/) as any) {
        const line: any = raw.trim();
        if (!line || line.startsWith('#'))
            continue;
        const match: any = /^([A-Za-z_][\w]*)(?:\s*:\s*|\s*=\s*)(.*)$/.exec(line);
        if (!match)
            throw new (RouterError as any)('invalid_config', `Invalid configuration line: ${(line.split(/[=:]/) as any)[0]}`);
        let value: any = (match as any)[2];
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
            value = value.slice(1, -1);
        (values as any)[(match as any)[1]] = value;
    }
    return values;
}
const bool: any = (value?: any): any => value === true || value === 'true' || value === '1';
export function normalizeProvider(record?: any, env: any = process.env): any {
    const name: any = record.name ?? record.provider_name ?? record.provider;
    if (typeof name !== 'string' || !/^[A-Za-z0-9._-]+$/.test(name))
        throw new (RouterError as any)('invalid_provider', 'Provider name must contain ASCII letters, digits, dash, underscore or dot');
    const base: any = record.base_url ?? record.baseUrl;
    let url: any;
    try {
        url = new (URL as any)(base);
    }
    catch {
        throw new (RouterError as any)('invalid_provider', 'Provider base_url must be an absolute HTTP URL');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        throw new (RouterError as any)('invalid_provider', 'Provider base_url must be an HTTP URL without embedded credentials');
    const models: any = record.models ?? (record.default_model ? [record.default_model] : []);
    if (!Array.isArray(models) || models.some((m?: any): any => typeof m !== 'string' || !m.trim()))
        throw new (RouterError as any)('invalid_provider', 'models must contain exact nonempty model ids');
    const kind: any = record.kind ?? 'openai-compatible';
    if (!['openai-compatible', 'openai', 'litellm', 'anthropic', 'codex', 'gemini', 'qwen', 'gonka'].includes(kind))
        throw new (RouterError as any)('native_unsupported', `Native provider '${kind}' is not implemented`, 501);
    return { ...record, name, kind, base_url: base.replace(/\/+$/, ''), models: [...new (Set as any)(models)], supported_clients: record.supported_clients ?? [], enabled: record.enabled !== false,
        protocol: record.protocol ?? (kind === 'anthropic' ? 'anthropic' : kind === 'codex' ? 'responses' : 'openai'),
        api_key: record.api_key ?? record.apiKey ?? (record.api_key_env ? (env as any)[record.api_key_env] : null) ?? null };
}
export function normalizeConfig(input: any = {}, env: any = process.env): any {
    const config: any = { ...input };
    config.token_secret = input.token_secret ?? input.tokenSecret ?? env.TOKEN_SECRET;
    config.data_dir = resolve(input.data_dir ?? input.dataDir ?? env.DATA_DIR ?? '.router');
    config.storage_policy = input.storage_policy ?? input.storagePolicy ?? env.STORAGE_POLICY ?? 'memory';
    config.host = input.host ?? env.HOST ?? '127.0.0.1';
    config.port = Number(input.port ?? env.PORT ?? 8080);
    if (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535)
        throw new (RouterError as any)('invalid_config', 'port must be between 0 and 65535');
    config.account_strategy = input.account_strategy ?? env.ACCOUNT_STRATEGY ?? 'round-robin';
    config.account_failover = bool(input.account_failover ?? env.ACCOUNT_FAILOVER ?? false);
    config.account_cooldown_seconds = Number(input.account_cooldown_seconds ?? env.ACCOUNT_COOLDOWN_SECONDS ?? 60);
    config.account_max_cooldown_seconds = Number(input.account_max_cooldown_seconds ?? 604800);
    config.session_affinity_ttl_seconds = Number(input.session_affinity_ttl_seconds ?? env.SESSION_AFFINITY_TTL_SECONDS ?? 3600);
    for (const name of ['account_cooldown_seconds', 'account_max_cooldown_seconds', 'session_affinity_ttl_seconds'] as any)
        if (!Number.isSafeInteger((config as any)[name]) || (config as any)[name] < 0)
            throw new (RouterError as any)('invalid_config', `${name} must be nonnegative seconds`);
    let providers: any = input.providers ?? [];
    if (!Array.isArray(providers))
        providers = Object.entries(providers).map(([name, value]: any): any => ({ name, ...value }));
    if (!providers.length && (env.OPENAI_COMPATIBLE_BASE_URL || input.openai_compatible)) {
        providers = [{ name: env.OPENAI_COMPATIBLE_PROVIDER_NAME ?? 'litellm', base_url: env.OPENAI_COMPATIBLE_BASE_URL ?? 'http://localhost:4000/v1', api_key: env.OPENAI_COMPATIBLE_API_KEY,
                default_model: env.OPENAI_COMPATIBLE_MODEL, models: (env.OPENAI_COMPATIBLE_MODELS ?? env.OPENAI_COMPATIBLE_MODEL ?? '').split(',').filter(Boolean), ...input.openai_compatible }];
    }
    config.providers = providers.map((p?: any): any => normalizeProvider(p, env));
    if (new (Set as any)(config.providers.map((p?: any): any => p.name)).size !== config.providers.length)
        throw new (RouterError as any)('invalid_config', 'Provider names must be unique');
    config.accounts = input.accounts ?? [];
    return config;
}
export async function loadConfig({ config = {}, configPath, env = process.env }: any = {}): Promise<any> {
    let fromFile: any = {};
    if (configPath) {
        const text: any = await readFile(configPath, 'utf8');
        if (configPath.endsWith('.json') || text.trim().startsWith('{'))
            fromFile = JSON.parse(text as any);
        else
            env = { ...parseLenv(text), ...env };
    }
    if (!config.token_secret && !env.TOKEN_SECRET && env.TOKEN_SECRET_FILE) {
        let secret: any = await readFile(env.TOKEN_SECRET_FILE, 'utf8');
        secret = secret.replace(/\r?\n$/, '');
        if (!secret)
            throw new (RouterError as any)('invalid_config', 'TOKEN_SECRET_FILE is empty');
        config = { ...config, token_secret: secret };
    }
    return normalizeConfig({ ...fromFile, ...config }, env);
}
export function encryptProviderSecret(secret?: any, tokenSecret?: any): any {
    const key: any = createHash('sha256').update(ensureRealSecret(tokenSecret)).digest(), nonce: any = randomBytes(12);
    const cipher: any = createCipheriv('aes-256-gcm', key, nonce);
    const encrypted: any = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    return `aes256gcm:${Buffer.concat([nonce, encrypted]).toString('base64')}`;
}
export function decryptProviderSecret(secret?: any, tokenSecret?: any): any {
    if (!secret.startsWith('aes256gcm:'))
        throw new (RouterError as any)('invalid_provider', 'Unsupported provider secret format');
    const packed: any = Buffer.from(secret.slice(10), 'base64');
    if (packed.length < 28)
        throw new (RouterError as any)('invalid_provider', 'Encrypted provider secret is too short');
    const key: any = createHash('sha256').update(ensureRealSecret(tokenSecret)).digest();
    const decipher: any = createDecipheriv('aes-256-gcm', key, packed.subarray(0, 12));
    decipher.setAuthTag(packed.subarray(-16));
    try {
        return Buffer.concat([decipher.update(packed.subarray(12, -16)), decipher.final()]).toString('utf8');
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
    constructor({ dataDir, secret, env = process.env, records = [], persistent = true }: any) { this.path = `${dataDir}/providers.lenv`; this.secret = secret; this.env = env; this.records = new (Map as any)(records.map((r?: any): any => [r.name, r])); this.persistent = persistent; }
    async load(): Promise<any> {
        const text: any = this.persistent ? await readOptional(this.path, null) : null;
        const map: any = text == null ? new (Map as any)(this.records) : new (Map as any)();
        for (const line of (text ?? '').split(/\r?\n/) as any)
            if (line.trim().startsWith('PROVIDER: ')) {
                const record: any = JSON.parse(line.trim().slice(10) as any);
                map.set(record.name, record);
            }
        return map;
    }
    async resolve(): Promise<any> {
        return [...(await this.load()).values()].filter((r?: any): any => r.enabled !== false).map((r?: any): any => normalizeProvider({ ...r, api_key: r.api_key ?? (r.api_key_env ? (this.env as any)[r.api_key_env] : null) ?? (r.encrypted_api_key ? decryptProviderSecret(r.encrypted_api_key, this.secret) : null) }, this.env));
    }
    async list(): Promise<any> { return [...(await this.load()).values()].map(redact).sort((a?: any, b?: any): any => a.name.localeCompare(b.name)); }
    async get(name?: any): Promise<any> { return (await this.list()).find((r?: any): any => r.name === name) ?? null; }
    async mutate(operation?: any): Promise<any> {
        const operationWithState: any = async (): Promise<any> => {
            const records: any = await this.load();
            const result: any = await operation(records);
            if (this.persistent) {
                for (const [name, held] of records as any) {
                    const { api_key, ...safe }: any = held;
                    if (api_key)
                        safe.encrypted_api_key = encryptProviderSecret(api_key, this.secret);
                    records.set(name, safe);
                }
                const sorted: any = [...records.values()].sort((a?: any, b?: any): any => a.name.localeCompare(b.name));
                await atomicWrite(this.path, '# Link.Assistant.Router provider store\n# Each PROVIDER value is JSON; inline API keys are encrypted.\n' + sorted.map((r?: any): any => `PROVIDER: ${JSON.stringify(r)}`).join('\n') + '\n');
            }
            this.records = records;
            return result;
        };
        return serialized(this.path, (): any => this.persistent ? withNativeFileLock(this.path, operationWithState) : operationWithState());
    }
    async upsert(input?: any): Promise<any> {
        const normalized: any = normalizeProvider(input, this.env);
        if (!['openai-compatible', 'openai', 'litellm'].includes(normalized.kind))
            throw new (RouterError as any)('native_unsupported', 'Persisted native provider management supports openai-compatible providers', 501);
        const { api_key, protocol, ...record }: any = normalized;
        record.kind = 'openai-compatible';
        if (api_key)
            record.encrypted_api_key = encryptProviderSecret(api_key, this.secret);
        return this.mutate((records?: any): any => { if (input.if_absent && records.has(record.name))
            throw new (RouterError as any)('conflict', 'Provider already exists', 409); records.set(record.name, record); return redact(record); });
    }
    async remove(name?: any): Promise<any> { return this.mutate((records?: any): any => records.delete(name)); }
}
