// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=bae59ef0bc7f20e894fbd3aa8d9bb8ed6bda775e2e3d01765ecc65d657b387a6; dynamic any annotations are explicit draft gaps.
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { tokenBudgetPermits } from "../portable/policy.js";
import { MemoryTokenStore } from "./storage.js";
export class RouterError extends Error {
    declare code: any;
    declare name: any;
    declare status: any;
    constructor(code: any, message: any, status: any = 400) { super(message); this.name = 'RouterError'; this.code = code; this.status = status; }
}
export function ensureRealSecret(secret?: any): any {
    if (!secret || secret.startsWith('\0') || ['unused-by-remote-command', 'unused-by-auth', 'unused-by-this-client-command'].includes(secret))
        throw new (RouterError as any)('issuer_secret_unset', 'TOKEN_SECRET is required', 401);
    return secret;
}
const encode: any = (object?: any): any => Buffer.from(JSON.stringify(object)).toString('base64url');
const clients: any = new (Set as any)(['claude', 'codex', 'cursor', 'opencode', 'gemini', 'grok', 'qwen', 'agent']);
const clientAliases: any = new (Map as any)([['claude-code', 'claude'], ['cursor-agent', 'cursor'], ['gemini-cli', 'gemini'], ['grok-cli', 'grok'], ['qwen-code', 'qwen']]);
const number: any = (value?: any, name?: any, positive: any = false): any => {
    if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0))
        throw new (RouterError as any)('invalid_argument', `${name} must be a ${positive ? 'positive' : 'nonnegative'} safe integer`);
    return value;
};
const defaults: any = {
    ephemeral: false, run_lease_expires_at: null, sliding_window_seconds: null,
    account: null, max_requests: null, used_requests: 0, max_tokens: null, used_tokens: 0,
    reserved_tokens: 0, rate_limit_per_minute: null, rate_window_started_at: 0,
    rate_window_requests: 0, scope: '', github_repos: [], client_kind: null, principal_id: null, model_policy: {},
};
export function validateModelPolicy(policy: any = {}): any {
    const models: any = policy.allowed_models ?? [];
    if (!Array.isArray(models) || models.some((model?: any): any => typeof model !== 'string' || !model.trim()) || new (Set as any)(models).size !== models.length)
        throw new (RouterError as any)('invalid_argument', 'allowed model ids must be nonempty and unique');
    if (policy.allow_substitution ? !policy.substitution_source?.trim() : policy.substitution_source != null)
        throw new (RouterError as any)('invalid_argument', 'model substitution must name its configuration source');
    return policy;
}
export class TokenManager {
    declare clock: any;
    declare leeway: any;
    declare secret: any;
    declare store: any;
    constructor({ secret, store = new (MemoryTokenStore as any)(), clock = (): any => Math.floor(Date.now() / 1000), leeway = 60 }: any = {}) {
        this.secret = secret;
        this.store = store;
        this.clock = clock;
        this.leeway = leeway;
    }
    sign(claims?: any): any {
        ensureRealSecret(this.secret);
        const body: any = `${encode({ typ: 'JWT', alg: 'HS256' })}.${encode(claims)}`;
        return `la_sk_${body}.${createHmac('sha256', this.secret).update(body).digest('base64url')}`;
    }
    async issue(options: any = {}): Promise<any> {
        ensureRealSecret(this.secret);
        options = { ...options };
        if (options.client_kind != null) {
            const name: any = String(options.client_kind).trim().toLowerCase();
            options.client_kind = clientAliases.get(name) ?? name;
        }
        const ttl: any = number(options.ttl_hours ?? 24, 'ttl_hours', true);
        if (ttl > 87600)
            throw new (RouterError as any)('invalid_argument', 'ttl_hours must not exceed 87600');
        for (const field of ['max_requests', 'max_tokens', 'rate_limit_per_minute', 'sliding_window_seconds', 'run_lease_seconds'] as any)
            if ((options as any)[field] != null)
                number((options as any)[field], field, true);
        if (!['', 'admin'].includes(options.scope ?? ''))
            throw new (RouterError as any)('invalid_argument', 'scope must be empty (client) or admin');
        if ((options.client_kind != null) !== (options.principal_id != null))
            throw new (RouterError as any)('invalid_argument', 'client_kind and principal_id must be paired');
        if (options.client_kind != null && (!clients.has(options.client_kind) || !options.principal_id?.trim() || options.account !== options.principal_id || options.scope === 'admin'))
            throw new (RouterError as any)('invalid_argument', 'invalid client/principal/account binding');
        if (options.github_repos != null && (!Array.isArray(options.github_repos) || options.github_repos.some((repo?: any): any => typeof repo !== 'string' || !/^[^\s/]+\/[^\s/]+$/.test(repo))))
            throw new (RouterError as any)('invalid_argument', 'github repository scope must be owner/repo');
        if (typeof (options.label ?? '') !== 'string')
            throw new (RouterError as any)('invalid_argument', 'label must be a string');
        validateModelPolicy(options.model_policy);
        const now: any = this.clock(), id: any = randomUUID();
        const claims: any = { sub: id, iat: now, exp: now + ttl * 3600, label: options.label ?? '' };
        for (const field of ['scope', 'github_repos', 'client_kind', 'principal_id'] as any)
            if ((options as any)[field] && (field !== 'github_repos' || (options as any)[field].length))
                (claims as any)[field] = (options as any)[field];
        const record: any = { ...structuredClone(defaults), id, label: claims.label, issued_at: now, expires_at: claims.exp, revoked: false };
        for (const field of Object.keys(defaults) as any)
            if (Object.hasOwn(options, field))
                (record as any)[field] = structuredClone((options as any)[field]);
        if (options.run_lease_seconds != null)
            record.run_lease_expires_at = now + options.run_lease_seconds;
        const token: any = this.sign(claims);
        await this.store.transaction((records?: any): any => {
            for (const [key, held] of records as any)
                if (held.ephemeral && (held.revoked || held.expires_at <= now))
                    records.delete(key);
            records.set(id, record);
        });
        return { token, id, record: structuredClone(record) };
    }
    async validate(token?: any, { admin = false, model, repository }: any = {}): Promise<any> {
        ensureRealSecret(this.secret);
        const jwt: any = typeof token === 'string' ? token.replace(/^(la_sk_|at-)/, '') : '';
        if (!token?.startsWith('la_sk_') && !token?.startsWith('at-'))
            throw new (RouterError as any)('invalid_prefix', 'Invalid Router token prefix', 401);
        const parts: any = jwt.split('.');
        if (parts.length !== 3 || parts.some((part?: any): any => !/^[A-Za-z0-9_-]+$/.test(part)))
            throw new (RouterError as any)('invalid_token', 'Invalid token encoding', 401);
        let header: any, claims: any;
        try {
            header = JSON.parse(Buffer.from((parts as any)[0], 'base64url') as any);
            claims = JSON.parse(Buffer.from((parts as any)[1], 'base64url') as any);
        }
        catch {
            throw new (RouterError as any)('invalid_token', 'Invalid token JSON', 401);
        }
        if (header.alg !== 'HS256')
            throw new (RouterError as any)('invalid_token', 'Only HS256 tokens are accepted', 401);
        const expected: any = createHmac('sha256', this.secret).update(`${(parts as any)[0]}.${(parts as any)[1]}`).digest();
        const actual: any = Buffer.from((parts as any)[2], 'base64url');
        if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
            throw new (RouterError as any)('signature_invalid', 'Token signature is invalid', 401);
        if (typeof claims.sub !== 'string' || !claims.sub || !Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.iat))
            throw new (RouterError as any)('invalid_token', 'Missing token claims', 401);
        if (claims.nbf != null && (!Number.isSafeInteger(claims.nbf) || claims.nbf > this.clock() + this.leeway))
            throw new (RouterError as any)('not_yet_valid', 'Token is not yet valid', 401);
        const stored: any = await this.store.get(claims.sub);
        const record: any = stored ? { ...structuredClone(defaults), ...stored } : null;
        if (claims.exp < this.clock() - this.leeway && !(record?.sliding_window_seconds && record.expires_at > this.clock()))
            throw new (RouterError as any)('expired', 'Token expired', 401);
        if (record?.revoked)
            throw new (RouterError as any)('revoked', 'Token revoked', 401);
        if (record && ((record.client_kind ?? null) !== (claims.client_kind ?? null) || (record.principal_id ?? null) !== (claims.principal_id ?? null)))
            throw new (RouterError as any)('binding_mismatch', 'Token binding mismatch', 401);
        if (!record && (claims.client_kind || claims.principal_id))
            throw new (RouterError as any)('missing_record', 'Bound token record is missing', 401);
        if (admin && claims.scope !== 'admin')
            throw new (RouterError as any)('admin_required', 'Administrative token required', 403);
        const repos: any = claims.github_repos ?? [];
        if (!Array.isArray(repos) || repos.some((repo?: any): any => typeof repo !== 'string'))
            throw new (RouterError as any)('invalid_token', 'Invalid repository scope', 401);
        if (repository && repos.length && !repos.some((repo?: any): any => repo.toLowerCase() === repository.toLowerCase()))
            throw new (RouterError as any)('repository_not_allowed', 'Repository outside token scope', 403);
        if (model && !record)
            throw new (RouterError as any)('model_policy_unavailable', 'Durable model authority is unavailable', 403);
        const allowed: any = record?.model_policy?.allowed_models ?? [];
        if (model && allowed.length && !allowed.includes(model))
            throw new (RouterError as any)('model_not_allowed', 'Model outside token scope', 403);
        return { ...claims, account: record?.account ?? null, record, is_admin: claims.scope === 'admin' };
    }
    async list(): Promise<any> { return (await this.store.list()).sort((a?: any, b?: any): any => a.issued_at - b.issued_at || a.id.localeCompare(b.id)); }
    async get(id?: any): Promise<any> { return this.store.get(id); }
    async authorizeModel(id?: any, model?: any): Promise<any> {
        const record: any = await this.get(id);
        if (!record)
            throw new (RouterError as any)('model_policy_unavailable', 'Durable model authority is unavailable', 403);
        if (record.model_policy?.allowed_models?.length && !record.model_policy.allowed_models.includes(model))
            throw new (RouterError as any)('model_not_allowed', 'Model outside token scope', 403);
        return record.model_policy ?? {};
    }
    async revoke(id?: any): Promise<any> { return this.store.transaction((records?: any): any => { const r: any = records.get(id); if (!r)
        throw new (RouterError as any)('not_found', 'Token not found', 404); const changed: any = !r.revoked; r.revoked = true; return changed; }); }
    async expire(id?: any): Promise<any> { return this.store.transaction((records?: any): any => { const r: any = records.get(id); if (!r)
        throw new (RouterError as any)('not_found', 'Token not found', 404); r.revoked = true; r.expires_at = this.clock(); return r; }); }
    async rotate(id?: any, overrides: any = {}): Promise<any> {
        const held: any = await this.get(id);
        if (!held)
            throw new (RouterError as any)('not_found', 'Token not found', 404);
        const options: any = { ttl_hours: Math.max(1, Math.floor((held.expires_at - this.clock()) / 3600)) };
        for (const field of ['label', 'account', 'max_requests', 'max_tokens', 'rate_limit_per_minute'] as any)
            (options as any)[field] = (overrides as any)[field] ?? (held as any)[field];
        options.ttl_hours = overrides.ttl_hours ?? options.ttl_hours;
        for (const field of ['scope', 'github_repos', 'client_kind', 'principal_id', 'model_policy'] as any)
            (options as any)[field] = (held as any)[field];
        const replacement: any = await this.issue(options);
        await this.revoke(id);
        return replacement;
    }
    async admit(id?: any, reserve: any = 0): Promise<any> {
        number(reserve, 'reserve');
        return this.store.transaction((records?: any): any => {
            const r: any = records.get(id);
            if (!r)
                return 'admitted';
            const now: any = this.clock();
            if (r.revoked || (r.expires_at < now - this.leeway))
                throw new (RouterError as any)('revoked', 'Token unavailable', 401);
            if (r.max_requests != null && r.used_requests >= r.max_requests)
                return 'request_limit_exceeded';
            if (r.max_tokens != null && (r.used_tokens ?? 0) + (r.reserved_tokens ?? 0) >= r.max_tokens || !tokenBudgetPermits(r.used_tokens ?? 0, r.reserved_tokens ?? 0, reserve, r.max_tokens ?? -1))
                return 'token_limit_exceeded';
            if (r.rate_limit_per_minute != null) {
                if (now - r.rate_window_started_at >= 60) {
                    r.rate_window_started_at = now;
                    r.rate_window_requests = 0;
                }
                if (r.rate_window_requests >= r.rate_limit_per_minute)
                    return 'rate_limit_exceeded';
                r.rate_window_requests++;
            }
            r.used_requests++;
            r.reserved_tokens = (r.reserved_tokens ?? 0) + reserve;
            if (r.sliding_window_seconds)
                r.expires_at = Math.max(r.expires_at, now + r.sliding_window_seconds);
            return 'admitted';
        });
    }
    async settle(id?: any, reserved?: any, actual?: any): Promise<any> {
        number(reserved, 'reserved');
        number(actual, 'actual');
        return this.store.transaction((records?: any): any => { const r: any = records.get(id); if (r) {
            r.reserved_tokens = Math.max(0, (r.reserved_tokens ?? 0) - reserved);
            r.used_tokens = Math.min(Number.MAX_SAFE_INTEGER, (r.used_tokens ?? 0) + actual);
        } });
    }
    async releaseStaleReservations(): Promise<any> { return this.store.transaction((records?: any): any => { let n: any = 0; for (const r of records.values() as any)
        if (r.reserved_tokens) {
            r.reserved_tokens = 0;
            n++;
        } return n; }); }
}
export const codexTokenAlias: any = (token?: any): any => token.startsWith('la_sk_') ? `at-${token.slice(6)}` : null;
