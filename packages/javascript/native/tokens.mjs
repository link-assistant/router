import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { tokenBudgetPermits } from '../portable/policy.mjs';
import { MemoryTokenStore } from './storage.mjs';

export class RouterError extends Error {
  constructor(code, message, status = 400) { super(message); this.name = 'RouterError'; this.code = code; this.status = status; }
}
export function ensureRealSecret(secret) {
  if (!secret || secret.startsWith('\0') || ['unused-by-remote-command','unused-by-auth','unused-by-this-client-command'].includes(secret)) throw new RouterError('issuer_secret_unset', 'TOKEN_SECRET is required', 401);
  return secret;
}
const encode = object => Buffer.from(JSON.stringify(object)).toString('base64url');
const clients = new Set(['claude','codex','opencode','gemini','qwen','openclaw','kilo','cline','roo','aider']);
const number = (value, name, positive = false) => {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) throw new RouterError('invalid_argument', `${name} must be a ${positive ? 'positive' : 'nonnegative'} safe integer`);
  return value;
};
const defaults = {
  ephemeral: false, run_lease_expires_at: null, sliding_window_seconds: null,
  account: null, max_requests: null, used_requests: 0, max_tokens: null, used_tokens: 0,
  reserved_tokens: 0, rate_limit_per_minute: null, rate_window_started_at: 0,
  rate_window_requests: 0, scope: '', github_repos: [], client_kind: null, principal_id: null, model_policy: {},
};
export function validateModelPolicy(policy = {}) {
  const models = policy.allowed_models ?? [];
  if (!Array.isArray(models) || models.some(model => typeof model !== 'string' || !model.trim()) || new Set(models).size !== models.length) throw new RouterError('invalid_argument', 'allowed model ids must be nonempty and unique');
  if (policy.allow_substitution ? !policy.substitution_source?.trim() : policy.substitution_source != null) throw new RouterError('invalid_argument', 'model substitution must name its configuration source');
  return policy;
}
export class TokenManager {
  constructor({ secret, store = new MemoryTokenStore(), clock = () => Math.floor(Date.now()/1000), leeway = 60 } = {}) {
    this.secret = secret; this.store = store; this.clock = clock; this.leeway = leeway;
  }
  sign(claims) {
    ensureRealSecret(this.secret);
    const body = `${encode({typ:'JWT',alg:'HS256'})}.${encode(claims)}`;
    return `la_sk_${body}.${createHmac('sha256', this.secret).update(body).digest('base64url')}`;
  }
  async issue(options = {}) {
    ensureRealSecret(this.secret);
    const ttl = number(options.ttl_hours ?? 24, 'ttl_hours', true);
    if (ttl > 87600) throw new RouterError('invalid_argument', 'ttl_hours must not exceed 87600');
    for (const field of ['max_requests','max_tokens','rate_limit_per_minute','sliding_window_seconds','run_lease_seconds']) if (options[field] != null) number(options[field], field, true);
    if (!['','admin'].includes(options.scope ?? '')) throw new RouterError('invalid_argument', 'scope must be empty (client) or admin');
    if ((options.client_kind != null) !== (options.principal_id != null)) throw new RouterError('invalid_argument', 'client_kind and principal_id must be paired');
    if (options.client_kind != null && (!clients.has(options.client_kind) || !options.principal_id?.trim() || options.account !== options.principal_id || options.scope === 'admin')) throw new RouterError('invalid_argument', 'invalid client/principal/account binding');
    if (options.github_repos != null && (!Array.isArray(options.github_repos) || options.github_repos.some(repo => typeof repo !== 'string' || !/^[^\s/]+\/[^\s/]+$/.test(repo)))) throw new RouterError('invalid_argument', 'github repository scope must be owner/repo');
    if (typeof (options.label ?? '') !== 'string') throw new RouterError('invalid_argument','label must be a string');
    validateModelPolicy(options.model_policy);
    const now = this.clock(), id = randomUUID();
    const claims = { sub:id, iat:now, exp:now+ttl*3600, label:options.label ?? '' };
    for (const field of ['scope','github_repos','client_kind','principal_id']) if (options[field] && (field !== 'github_repos' || options[field].length)) claims[field] = options[field];
    const record = { ...structuredClone(defaults), id, label:claims.label, issued_at:now, expires_at:claims.exp, revoked:false };
    for (const field of Object.keys(defaults)) if (Object.hasOwn(options, field)) record[field] = structuredClone(options[field]);
    if (options.run_lease_seconds != null) record.run_lease_expires_at = now + options.run_lease_seconds;
    const token = this.sign(claims);
    await this.store.transaction(records => {
      for (const [key, held] of records) if (held.ephemeral && (held.revoked || held.expires_at <= now)) records.delete(key);
      records.set(id, record);
    });
    return { token, id, record:structuredClone(record) };
  }
  async validate(token, { admin = false, model, repository } = {}) {
    ensureRealSecret(this.secret);
    const jwt = typeof token === 'string' ? token.replace(/^(la_sk_|at-)/, '') : '';
    if (!token?.startsWith('la_sk_') && !token?.startsWith('at-')) throw new RouterError('invalid_prefix', 'Invalid Router token prefix', 401);
    const parts = jwt.split('.');
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw new RouterError('invalid_token', 'Invalid token encoding', 401);
    let header, claims;
    try { header = JSON.parse(Buffer.from(parts[0],'base64url')); claims = JSON.parse(Buffer.from(parts[1],'base64url')); }
    catch { throw new RouterError('invalid_token', 'Invalid token JSON', 401); }
    if (header.alg !== 'HS256') throw new RouterError('invalid_token', 'Only HS256 tokens are accepted', 401);
    const expected = createHmac('sha256', this.secret).update(`${parts[0]}.${parts[1]}`).digest();
    const actual = Buffer.from(parts[2], 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new RouterError('signature_invalid', 'Token signature is invalid', 401);
    if (typeof claims.sub !== 'string' || !claims.sub || !Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.iat)) throw new RouterError('invalid_token', 'Missing token claims', 401);
    if (claims.nbf != null && (!Number.isSafeInteger(claims.nbf) || claims.nbf > this.clock()+this.leeway)) throw new RouterError('not_yet_valid', 'Token is not yet valid', 401);
    const stored = await this.store.get(claims.sub);
    const record = stored ? { ...structuredClone(defaults), ...stored } : null;
    if (claims.exp < this.clock()-this.leeway && !(record?.sliding_window_seconds && record.expires_at > this.clock())) throw new RouterError('expired', 'Token expired', 401);
    if (record?.revoked) throw new RouterError('revoked', 'Token revoked', 401);
    if (record && ((record.client_kind ?? null) !== (claims.client_kind ?? null) || (record.principal_id ?? null) !== (claims.principal_id ?? null))) throw new RouterError('binding_mismatch', 'Token binding mismatch', 401);
    if (!record && (claims.client_kind || claims.principal_id)) throw new RouterError('missing_record', 'Bound token record is missing', 401);
    if (admin && claims.scope !== 'admin') throw new RouterError('admin_required', 'Administrative token required', 403);
    const repos = claims.github_repos ?? [];
    if (!Array.isArray(repos) || repos.some(repo => typeof repo !== 'string')) throw new RouterError('invalid_token', 'Invalid repository scope', 401);
    if (repository && repos.length && !repos.some(repo => repo.toLowerCase() === repository.toLowerCase())) throw new RouterError('repository_not_allowed', 'Repository outside token scope', 403);
    if (model && !record) throw new RouterError('model_policy_unavailable', 'Durable model authority is unavailable', 403);
    const allowed = record?.model_policy?.allowed_models ?? [];
    if (model && allowed.length && !allowed.includes(model)) throw new RouterError('model_not_allowed', 'Model outside token scope', 403);
    return { ...claims, account: record?.account ?? null, record, is_admin:claims.scope === 'admin' };
  }
  async list() { return (await this.store.list()).sort((a,b) => a.issued_at-b.issued_at || a.id.localeCompare(b.id)); }
  async get(id) { return this.store.get(id); }
  async authorizeModel(id, model) {
    const record = await this.get(id);
    if (!record) throw new RouterError('model_policy_unavailable','Durable model authority is unavailable',403);
    if (record.model_policy?.allowed_models?.length && !record.model_policy.allowed_models.includes(model)) throw new RouterError('model_not_allowed','Model outside token scope',403);
    return record.model_policy ?? {};
  }
  async revoke(id) { return this.store.transaction(records => { const r = records.get(id); if (!r) throw new RouterError('not_found','Token not found',404); const changed = !r.revoked; r.revoked = true; return changed; }); }
  async expire(id) { return this.store.transaction(records => { const r = records.get(id); if (!r) throw new RouterError('not_found','Token not found',404); r.revoked = true; r.expires_at = this.clock(); return r; }); }
  async rotate(id, overrides = {}) {
    const held = await this.get(id);
    if (!held || held.revoked || held.expires_at <= this.clock()) throw new RouterError('not_found','Active token not found',404);
    // Create replacement then revoke original; both durable mutations are awaited.
    const replacement = await this.issue({ ...held, ttl_hours:Math.max(1,Math.ceil((held.expires_at-this.clock())/3600)), ...overrides });
    await this.revoke(id); return replacement;
  }
  async admit(id, reserve = 0) {
    number(reserve, 'reserve');
    return this.store.transaction(records => {
      const r = records.get(id); if (!r) return 'admitted';
      const now = this.clock();
      if (r.revoked || (r.expires_at < now-this.leeway)) throw new RouterError('revoked','Token unavailable',401);
      if (r.max_requests != null && r.used_requests >= r.max_requests) return 'request_limit_exceeded';
      if (r.max_tokens != null && (r.used_tokens ?? 0)+(r.reserved_tokens ?? 0) >= r.max_tokens || !tokenBudgetPermits(r.used_tokens ?? 0,r.reserved_tokens ?? 0,reserve,r.max_tokens ?? -1)) return 'token_limit_exceeded';
      if (r.rate_limit_per_minute != null) {
        if (now-r.rate_window_started_at >= 60) { r.rate_window_started_at = now; r.rate_window_requests = 0; }
        if (r.rate_window_requests >= r.rate_limit_per_minute) return 'rate_limit_exceeded';
        r.rate_window_requests++;
      }
      r.used_requests++; r.reserved_tokens = (r.reserved_tokens ?? 0)+reserve;
      if (r.sliding_window_seconds) r.expires_at = Math.max(r.expires_at,now+r.sliding_window_seconds);
      return 'admitted';
    });
  }
  async settle(id, reserved, actual) {
    number(reserved,'reserved'); number(actual,'actual');
    return this.store.transaction(records => { const r = records.get(id); if (r) { r.reserved_tokens = Math.max(0,(r.reserved_tokens ?? 0)-reserved); r.used_tokens = Math.min(Number.MAX_SAFE_INTEGER,(r.used_tokens ?? 0)+actual); } });
  }
  async releaseStaleReservations() { return this.store.transaction(records => { let n = 0; for (const r of records.values()) if (r.reserved_tokens) { r.reserved_tokens = 0; n++; } return n; }); }
}
export const codexTokenAlias = token => token.startsWith('la_sk_') ? `at-${token.slice(6)}` : null;
