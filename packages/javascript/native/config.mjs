import { readFile } from 'node:fs/promises';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { transactionalWrite, recoverTransactionalWrite, readOptional, serialized } from './storage.mjs';
import { rustLockPath, withAdvisoryFileLock } from './file-lock.mjs';
import { RouterError, ensureRealSecret } from './tokens.mjs';
import { normalizeEmergencyConfig } from './emergency-auth.mjs';

export function parseLenv(text) {
  const values = Object.create(null);
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const match = /^([A-Za-z_][\w]*)(?:\s*:\s*|\s*=\s*)(.*)$/.exec(line);
    if (!match) throw new RouterError('invalid_config',`Invalid configuration line: ${line.split(/[=:]/)[0]}`);
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1,-1);
    values[match[1]] = value;
  }
  return values;
}
const bool = value => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true','1','yes','on'].includes(normalized)) return true;
  if (['false','0','no','off'].includes(normalized)) return false;
  throw new RouterError('invalid_config','Boolean configuration must be true or false');
};
export const nativeConfigOptions = new Set(['token_secret','data_dir','storage_policy','host','port','account_strategy',
  'account_failover','account_cooldown_seconds','account_max_cooldown_seconds','session_affinity_ttl_seconds',
  'token_admin_key','admin_key','allow_anonymous_admin','disable_login_api','login_max_sessions','login_session_ttl_secs',
  'claude_code_home','claude_home','codex_home','gemini_home','qwen_home','home','openai_compatible_provider_name',
  'management_allow_remote','management_lockout_failures','management_lockout_secs','management_lockout_exempt_loopback',
  'emergency_accept_any_token','emergency_allow_non_loopback','emergency_duration_minutes']);
export const nativeConfigEnvironment = {TOKEN_SECRET:'token_secret',DATA_DIR:'data_dir',STORAGE_POLICY:'storage_policy',HOST:'host',PORT:'port',
  ACCOUNT_STRATEGY:'account_strategy',ACCOUNT_FAILOVER:'account_failover',ACCOUNT_COOLDOWN_SECONDS:'account_cooldown_seconds',
  SESSION_AFFINITY_TTL_SECONDS:'session_affinity_ttl_seconds',TOKEN_ADMIN_KEY:'token_admin_key',CLAUDE_CODE_HOME:'claude_code_home',CODEX_HOME:'codex_home',GEMINI_HOME:'gemini_home',QWEN_HOME:'qwen_home',
  MANAGEMENT_ALLOW_REMOTE:'management_allow_remote',MANAGEMENT_LOCKOUT_FAILURES:'management_lockout_failures',MANAGEMENT_LOCKOUT_SECS:'management_lockout_secs',MANAGEMENT_LOCKOUT_EXEMPT_LOOPBACK:'management_lockout_exempt_loopback',
  EMERGENCY_ACCEPT_ANY_TOKEN:'emergency_accept_any_token',EMERGENCY_ALLOW_NON_LOOPBACK:'emergency_allow_non_loopback',EMERGENCY_DURATION_MINUTES:'emergency_duration_minutes'};
export function normalizeProvider(record, env = process.env) {
  const name = record.name ?? record.provider_name ?? record.provider;
  if (typeof name !== 'string' || !/^[A-Za-z0-9._-]+$/.test(name)) throw new RouterError('invalid_provider','Provider name must contain ASCII letters, digits, dash, underscore or dot');
  const base = record.base_url ?? record.baseUrl;
  let url;
  try { url = new URL(base); } catch { throw new RouterError('invalid_provider','Provider base_url must be an absolute HTTP URL'); }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new RouterError('invalid_provider','Provider base_url must be an HTTP URL without embedded credentials');
  const models = record.models ?? (record.default_model ? [record.default_model] : []);
  if (!Array.isArray(models) || models.some(m => typeof m !== 'string' || !m.trim())) throw new RouterError('invalid_provider','models must contain exact nonempty model ids');
  const aliases = {openai:'openai-compatible',litellm:'openai-compatible','open-a-i-compatible':'openai-compatible',openai_like:'openai-compatible',claude:'anthropic','zai-coding-plan':'z.ai-coding-plan','vertex-ai':'vertex'};
  const rawKind = (record.kind ?? 'openai-compatible').toLowerCase();
  const kind = aliases[rawKind] ?? rawKind;
  if (!['openai-compatible','lefine','z.ai-coding-plan','anthropic','codex','gemini','qwen','gonka','vertex','bedrock'].includes(kind)) throw new RouterError('invalid_provider',`Unknown provider kind '${kind}'`);
  const defaultClients = {anthropic:['claude'],codex:['codex'],gemini:['gemini'],qwen:['qwen'],lefine:['grok','opencode','qwen'],'z.ai-coding-plan':['claude','codex','opencode']};
  const clients = ['lefine','z.ai-coding-plan'].includes(kind) ? [...defaultClients[kind],...(kind === 'z.ai-coding-plan' ? record.unsupported_clients ?? record.acknowledge_unsupported_clients ?? [] : [])] : record.supported_clients ?? defaultClients[kind] ?? [];
  if (!Array.isArray(clients) || clients.some(client => typeof client !== 'string' || !client.trim())) throw new RouterError('invalid_provider','supported_clients must contain exact client names');
  return { ...record, name, kind, base_url:base.replace(/\/+$/,''), models:[...new Set(models)], supported_clients:[...new Set(clients)].sort(), enabled:record.enabled !== false,
    protocol:record.protocol ?? ({anthropic:'anthropic',codex:'responses',gemini:'gemini',vertex:'vertex',bedrock:'bedrock','z.ai-coding-plan':'anthropic'}[kind] ?? 'openai'),
    api_key:record.api_key ?? record.apiKey ?? (record.api_key_env ? env[record.api_key_env] : null) ?? null };
}
export function normalizeConfig(input = {}, env = process.env) {
  const config = { ...input };
  config.token_secret = input.token_secret ?? input.tokenSecret ?? env.TOKEN_SECRET;
  config.data_dir = resolve(input.data_dir ?? input.dataDir ?? env.DATA_DIR ?? '.router');
  const rawStorage = input.storage_policy ?? input.storagePolicy ?? env.STORAGE_POLICY ?? 'both';
  config.storage_policy = ({mem:'memory',none:'memory',txt:'text',lino:'text',bin:'binary','link-cli':'binary',linkcli:'binary',clink:'binary',dual:'both'}[rawStorage] ?? rawStorage);
  if (!['memory','text','binary','both'].includes(config.storage_policy)) throw new RouterError('invalid_config','Unknown storage_policy');
  config.host = input.host ?? env.HOST ?? '127.0.0.1'; config.port = Number(input.port ?? env.PORT ?? 8080);
  if (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535) throw new RouterError('invalid_config','port must be between 0 and 65535');
  config.account_strategy = input.account_strategy ?? env.ACCOUNT_STRATEGY ?? 'round-robin';
  config.account_failover = bool(input.account_failover ?? env.ACCOUNT_FAILOVER ?? false);
  config.account_cooldown_seconds = Number(input.account_cooldown_seconds ?? env.ACCOUNT_COOLDOWN_SECONDS ?? 60);
  config.account_max_cooldown_seconds = Number(input.account_max_cooldown_seconds ?? 604800);
  config.session_affinity_ttl_seconds = Number(input.session_affinity_ttl_seconds ?? env.SESSION_AFFINITY_TTL_SECONDS ?? 3600);
  for (const name of ['account_cooldown_seconds','account_max_cooldown_seconds','session_affinity_ttl_seconds']) if (!Number.isSafeInteger(config[name]) || config[name] < 0) throw new RouterError('invalid_config',`${name} must be nonnegative seconds`);
  let providers = input.providers ?? [];
  if (!Array.isArray(providers)) providers = Object.entries(providers).map(([name,value]) => ({ name,...value }));
  if (!providers.length && (env.OPENAI_COMPATIBLE_BASE_URL || input.openai_compatible)) {
    providers = [{ name:env.OPENAI_COMPATIBLE_PROVIDER_NAME ?? 'litellm',base_url:env.OPENAI_COMPATIBLE_BASE_URL ?? 'http://localhost:4000/v1',api_key:env.OPENAI_COMPATIBLE_API_KEY,
      default_model:env.OPENAI_COMPATIBLE_MODEL,models:(env.OPENAI_COMPATIBLE_MODELS ?? env.OPENAI_COMPATIBLE_MODEL ?? '').split(',').filter(Boolean),...input.openai_compatible }];
  }
  config.providers = providers.map(p => normalizeProvider(p,env));
  if (new Set(config.providers.map(p => p.name)).size !== config.providers.length) throw new RouterError('invalid_config','Provider names must be unique');
  config.accounts = input.accounts ?? [];
  config.token_admin_key = input.token_admin_key ?? input.admin_key ?? env.TOKEN_ADMIN_KEY ?? null;
  config.allow_anonymous_admin = bool(input.allow_anonymous_admin ?? false);
  config.disable_login_api = bool(input.disable_login_api ?? false);
  config.emergency = normalizeEmergencyConfig(input,env);
  config.management = {
    allow_remote:bool(input.management_allow_remote ?? input.management?.allow_remote ?? env.MANAGEMENT_ALLOW_REMOTE ?? false),
    exempt_loopback:bool(input.management_lockout_exempt_loopback ?? input.management?.exempt_loopback ?? env.MANAGEMENT_LOCKOUT_EXEMPT_LOOPBACK ?? true),
    lockout_failures:Number(input.management_lockout_failures ?? input.management?.lockout_failures ?? env.MANAGEMENT_LOCKOUT_FAILURES ?? 5),
    lockout_secs:Number(input.management_lockout_secs ?? input.management?.lockout_secs ?? env.MANAGEMENT_LOCKOUT_SECS ?? 1800),
  };
  for (const field of ['lockout_failures','lockout_secs']) if (!Number.isSafeInteger(config.management[field]) || config.management[field] < 0) throw new RouterError('invalid_config',`management ${field} must be nonnegative`);
  for (const [environment,field] of Object.entries(nativeConfigEnvironment)) if (config[field] == null && env[environment] != null) config[field] = env[environment];
  for (const field of ['login_max_sessions','login_session_ttl_secs']) if (config[field] != null) {
    config[field] = Number(config[field]); if (!Number.isSafeInteger(config[field]) || config[field] <= 0) throw new RouterError('invalid_config',`${field} must be positive`);
  }
  return config;
}
export async function loadConfig({ config = {}, configPath, env = process.env } = {}) {
  let fromFile = {};
  if (configPath) {
    const text = await readFile(configPath,'utf8');
    if (configPath.endsWith('.json') || text.trim().startsWith('{')) fromFile = JSON.parse(text);
    else env = { ...parseLenv(text), ...env };
  }
  if (!config.token_secret && !env.TOKEN_SECRET && env.TOKEN_SECRET_FILE) {
    let secret = await readFile(env.TOKEN_SECRET_FILE,'utf8');
    secret = secret.replace(/\r?\n$/,''); if (!secret) throw new RouterError('invalid_config','TOKEN_SECRET_FILE is empty');
    config = { ...config, token_secret:secret };
  }
  return normalizeConfig({ ...fromFile, ...config },env);
}
export function encryptProviderSecret(secret, tokenSecret) {
  const key = createHash('sha256').update(ensureRealSecret(tokenSecret)).digest(), nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm',key,nonce);
  const encrypted = Buffer.concat([cipher.update(secret,'utf8'),cipher.final(),cipher.getAuthTag()]);
  return `aes256gcm:${Buffer.concat([nonce,encrypted]).toString('base64')}`;
}
export function decryptProviderSecret(secret, tokenSecret) {
  if (!secret.startsWith('aes256gcm:')) throw new RouterError('invalid_provider','Unsupported provider secret format');
  const packed = Buffer.from(secret.slice(10),'base64');
  if (packed.length < 28) throw new RouterError('invalid_provider','Encrypted provider secret is too short');
  const key = createHash('sha256').update(ensureRealSecret(tokenSecret)).digest();
  const decipher = createDecipheriv('aes-256-gcm',key,packed.subarray(0,12));
  decipher.setAuthTag(packed.subarray(-16));
  try { return Buffer.concat([decipher.update(packed.subarray(12,-16)),decipher.final()]).toString('utf8'); }
  catch { throw new RouterError('provider_secret_invalid','Provider secret cannot be decrypted',500); }
}
const redact = r => { const { api_key, encrypted_api_key, ...safe } = r; return { ...safe, has_encrypted_api_key:!!encrypted_api_key }; };
export class ProviderStore {
  constructor({ dataDir, secret, env = process.env, records = [], persistent = true }) { this.path = `${dataDir}/providers.lenv`; this.secret = secret; this.env = env; this.records = new Map(records.map(r => [r.name,r])); this.persistent = persistent; }
  async loadUnlocked() {
    if (this.persistent) await recoverTransactionalWrite(this.path);
    const text = this.persistent ? await readOptional(this.path,null) : null;
    const map = text == null ? new Map(this.records) : new Map();
    for (const line of (text ?? '').split(/\r?\n/)) if (line.trim().startsWith('PROVIDER: ')) { const record = JSON.parse(line.trim().slice(10)); map.set(record.name,record); }
    return map;
  }
  async load() { return this.persistent ? withAdvisoryFileLock(rustLockPath(this.path),() => this.loadUnlocked()) : this.loadUnlocked(); }
  async resolve() {
    return [...(await this.load()).values()].filter(r => r.enabled !== false).map(r => normalizeProvider({ ...r,api_key:r.api_key ?? (r.api_key_env ? this.env[r.api_key_env] : null) ?? (r.encrypted_api_key ? decryptProviderSecret(r.encrypted_api_key,this.secret) : null) },this.env));
  }
  async list() { return [...(await this.load()).values()].map(redact).sort((a,b) => a.name.localeCompare(b.name)); }
  async get(name) { return (await this.list()).find(r => r.name === name) ?? null; }
  async mutate(operation) {
    const operationWithState = async () => {
      const records = await this.loadUnlocked(); const result = await operation(records);
      if (this.persistent) {
        for (const [name,held] of records) {
          const {api_key,...safe} = held;
          if (api_key) safe.encrypted_api_key = encryptProviderSecret(api_key,this.secret);
          records.set(name,safe);
        }
        const sorted = [...records.values()].sort((a,b) => a.name.localeCompare(b.name));
        await transactionalWrite(this.path,'# Link.Assistant.Router provider store\n# Each PROVIDER value is JSON; inline API keys are encrypted.\n'+sorted.map(r => `PROVIDER: ${JSON.stringify(r)}`).join('\n')+'\n');
      }
      this.records = records; return result;
    };
    return serialized(this.path,() => this.persistent ? withAdvisoryFileLock(rustLockPath(this.path),operationWithState) : operationWithState());
  }
  async upsert(input) {
    const normalized = normalizeProvider(input,this.env);
    if (!['openai-compatible','lefine','z.ai-coding-plan'].includes(normalized.kind)) throw new RouterError('invalid_provider','Subscription services are configured separately from persisted providers');
    const { api_key, protocol, ...record } = normalized;
    record.intermediary_risk_acknowledged = input.acknowledge_intermediary_risk ?? input.intermediary_risk_acknowledged ?? false;
    record.unsupported_clients = input.acknowledge_unsupported_clients ?? input.unsupported_clients ?? [];
    if (record.kind === 'z.ai-coding-plan' && (typeof record.subscriber_id !== 'string' || !record.subscriber_id.trim())) throw new RouterError('invalid_provider','z.ai Coding Plan requires one subscriber_id');
    if (api_key) record.encrypted_api_key = encryptProviderSecret(api_key,this.secret);
    return this.mutate(records => {
      if (input.if_absent && records.has(record.name)) throw new RouterError('conflict','Provider already exists',409);
      if (record.kind === 'z.ai-coding-plan' && record.enabled && [...records.values()].some(existing => existing.enabled && existing.kind === record.kind && existing.name !== record.name)) throw new RouterError('invalid_provider','Only one personal z.ai Coding Plan subscriber may be enabled');
      records.set(record.name,record); return redact(record);
    });
  }
  async remove(name) { return this.mutate(records => records.delete(name)); }
}
