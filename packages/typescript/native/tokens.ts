// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=a6f5584364d04e2bf51f78690364e2babb221990b48dd1dd9b0e70c8dde63ef9; dynamic any annotations are explicit draft gaps.
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { tokenBudgetPermits } from "../portable/policy.js";
import { MemoryTokenStore } from "./storage.js";
import { isSyntheticTokenId, diagnosticReason, firstAuthenticationOutcome } from "./emergency-auth.js";
export class RouterError extends Error {
    declare code: any;
    declare name: any;
    declare status: any;
    constructor(code: any, message: any, status: any = 400) { super(message); this.name = 'RouterError'; this.code = code; this.status = status; }
}
export function ensureRealSecret(secret?: any): any {
    if (!secret || (secret.startsWith as any)('\0') || ['unused-by-remote-command', 'unused-by-auth', 'unused-by-this-client-command'].includes(secret))
        throw new (RouterError as any)('issuer_secret_unset', 'TOKEN_SECRET is required', 401);
    return secret;
}
const encode: any = (object?: any): string => (Buffer as any).from((JSON as any).stringify(object)).toString('base64url');
const clients: Set<string> = new (Set as any)(['claude', 'codex', 'cursor', 'opencode', 'gemini', 'grok', 'qwen', 'agent']);
const clientAliases: Map<string, string> = new (Map as any)([['claude-code', 'claude'], ['cursor-agent', 'cursor'], ['gemini-cli', 'gemini'], ['grok-cli', 'grok'], ['qwen-code', 'qwen']]);
const number: any = (value?: any, name?: any, positive: any = false): any => {
    if (!(Number as any).isSafeInteger(value) || value < (positive ? 1 : 0))
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
    if (!(Array as any).isArray(models) || models.some((model?: any): boolean => typeof model !== 'string' || !model.trim()) || new (Set as any)(models).size !== models.length)
        throw new (RouterError as any)('invalid_argument', 'allowed model ids must be nonempty and unique');
    if (policy.allow_substitution ? !policy.substitution_source?.trim() : policy.substitution_source != null)
        throw new (RouterError as any)('invalid_argument', 'model substitution must name its configuration source');
    return policy;
}
export class TokenManager {
    declare clock: any;
    declare diagnostics: any;
    declare emergency: any;
    declare leeway: any;
    declare secret: any;
    declare store: any;
    constructor({ secret, store = new (MemoryTokenStore as any)(), clock = (): number => (Math as any).floor((Date as any).now() / 1000), leeway = 60, emergency, diagnostics }: any = {}) {
        this.secret = secret;
        this.store = store;
        this.clock = clock;
        this.leeway = leeway;
        this.emergency = emergency;
        this.diagnostics = diagnostics;
    }
    sign(claims?: any): string {
        ensureRealSecret(this.secret);
        const body: string = `${encode({ typ: 'JWT', alg: 'HS256' })}.${encode(claims)}`;
        return `la_sk_${body}.${createHmac('sha256', this.secret).update(body).digest('base64url')}`;
    }
    async issue(options: any = {}): Promise<any> {
        ensureRealSecret(this.secret);
        (options as any) = { ...options };
        if (options.client_kind != null) {
            const name: string = String(options.client_kind).trim().toLowerCase();
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
        if (options.github_repos != null && (!(Array as any).isArray(options.github_repos) || (options.github_repos.some as any)((repo?: any): boolean => typeof repo !== 'string' || !/^[^\s/]+\/[^\s/]+$/.test(repo))))
            throw new (RouterError as any)('invalid_argument', 'github repository scope must be owner/repo');
        if (typeof (options.label ?? '') !== 'string')
            throw new (RouterError as any)('invalid_argument', 'label must be a string');
        validateModelPolicy(options.model_policy);
        const now: number = this.clock(), id: string = randomUUID();
        const claims: any = { sub: id, iat: now, exp: now + ttl * 3600, label: options.label ?? '' };
        for (const field of ['scope', 'github_repos', 'client_kind', 'principal_id'] as any)
            if ((options as any)[field] && (field !== 'github_repos' || (options as any)[field].length))
                (claims as any)[field] = (options as any)[field];
        const record: any = { ...structuredClone(defaults), id, label: claims.label, issued_at: now, expires_at: claims.exp, revoked: false };
        for (const field of (Object as any).keys(defaults) as any)
            if ((Object as any).hasOwn(options, field))
                (record as any)[field] = structuredClone((options as any)[field]);
        if (options.run_lease_seconds != null)
            record.run_lease_expires_at = now + options.run_lease_seconds;
        const token: string = this.sign(claims);
        await this.store.transaction((records?: any): void => {
            for (const [key, held] of records as any)
                if (held.ephemeral && (held.revoked || held.expires_at <= now))
                    (records.delete as any)(key);
            (records.set as any)(id, record);
        });
        return { token, id, record: structuredClone(record) };
    }
    async validate(token?: any, { admin = false, model, repository }: any = {}): Promise<any> {
        ensureRealSecret(this.secret);
        const jwt: string = typeof token === 'string' ? token.replace(/^(la_sk_|at-)/, '') : '';
        if (!token?.startsWith('la_sk_') && !token?.startsWith('at-'))
            throw new (RouterError as any)('invalid_prefix', 'Invalid Router token prefix', 401);
        const parts: Array<string> = jwt.split('.');
        if (parts.length !== 3 || parts.some((part?: any): boolean => !/^[A-Za-z0-9_-]+$/.test(part)))
            throw new (RouterError as any)('invalid_token', 'Invalid token encoding', 401);
        let header: any, claims: any;
        try {
            (header as any) = (JSON as any).parse((Buffer as any).from((parts as any)[0], 'base64url'));
            (claims as any) = (JSON as any).parse((Buffer as any).from((parts as any)[1], 'base64url'));
        }
        catch {
            throw new (RouterError as any)('invalid_token', 'Invalid token JSON', 401);
        }
        if ((header as any).alg !== 'HS256')
            throw new (RouterError as any)('invalid_token', 'Only HS256 tokens are accepted', 401);
        const expected: any = createHmac('sha256', this.secret).update(`${(parts as any)[0]}.${(parts as any)[1]}`).digest();
        const actual: any = (Buffer as any).from((parts as any)[2], 'base64url');
        if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
            throw new (RouterError as any)('signature_invalid', 'Token signature is invalid', 401);
        if (typeof (claims as any).sub !== 'string' || !(claims as any).sub || !(Number as any).isSafeInteger((claims as any).exp) || !(Number as any).isSafeInteger((claims as any).iat))
            throw new (RouterError as any)('invalid_token', 'Missing token claims', 401);
        if ((claims as any).nbf != null && (!(Number as any).isSafeInteger((claims as any).nbf) || (claims as any).nbf > this.clock() + this.leeway))
            throw new (RouterError as any)('not_yet_valid', 'Token is not yet valid', 401);
        const stored: any = await this.store.get((claims as any).sub);
        const record: any = stored ? { ...structuredClone(defaults), ...stored } : null;
        if ((claims as any).exp < this.clock() - this.leeway && !(record?.sliding_window_seconds && record.expires_at > this.clock()))
            throw new (RouterError as any)('expired', 'Token expired', 401);
        if (record?.revoked)
            throw new (RouterError as any)('revoked', 'Token revoked', 401);
        if (record && ((record.client_kind ?? null) !== ((claims as any).client_kind ?? null) || (record.principal_id ?? null) !== ((claims as any).principal_id ?? null)))
            throw new (RouterError as any)('binding_mismatch', 'Token binding mismatch', 401);
        if (!record && ((claims as any).client_kind || (claims as any).principal_id))
            throw new (RouterError as any)('missing_record', 'Bound token record is missing', 401);
        if (admin && (claims as any).scope !== 'admin')
            throw new (RouterError as any)('admin_required', 'Administrative token required', 403);
        const repos: any = (claims as any).github_repos ?? [];
        if (!(Array as any).isArray(repos) || repos.some((repo?: any): boolean => typeof repo !== 'string'))
            throw new (RouterError as any)('invalid_token', 'Invalid repository scope', 401);
        if (repository && repos.length && !repos.some((repo?: any): boolean => repo.toLowerCase() === repository.toLowerCase()))
            throw new (RouterError as any)('repository_not_allowed', 'Repository outside token scope', 403);
        if (model && !record)
            throw new (RouterError as any)('model_policy_unavailable', 'Durable model authority is unavailable', 403);
        const allowed: any = record?.model_policy?.allowed_models ?? [];
        if (model && allowed.length && !(allowed.includes as any)(model))
            throw new (RouterError as any)('model_not_allowed', 'Model outside token scope', 403);
        return { ...claims, account: record?.account ?? null, record, is_admin: (claims as any).scope === 'admin' };
    }
    async list(): Promise<any> { return (await this.store.list()).sort((a?: any, b?: any): any => a.issued_at - b.issued_at || (a.id.localeCompare as any)(b.id)); }
    async authenticateIncoming(token?: any, options: any = {}): Promise<any> {
        const count: boolean = firstAuthenticationOutcome();
        if (typeof token !== 'string' || !token) {
            const error: any = new (RouterError as any)('missing_credential', 'Router credential is required', 401);
            if (count)
                this.diagnostics?.record('missing_credential');
            throw error;
        }
        let claims: any, error: any;
        try {
            (claims as any) = await this.validate(token, options);
        }
        catch (failure: any) {
            (error as any) = failure;
        }
        if (!options.admin && this.emergency?.isActive())
            return (this.emergency.admit as any)(token, options.headers ?? {}, error ? diagnosticReason(error) : 'none', count);
        if (error) {
            if (count)
                this.diagnostics?.record(diagnosticReason(error), token);
            throw error;
        }
        return claims;
    }
    async get(id?: any): Promise<any> { return this.store.get(id); }
    async authorizeModel(id?: any, model?: any): Promise<any> {
        if (isSyntheticTokenId(id))
            return {};
        const record: any = await this.get(id);
        if (!record)
            throw new (RouterError as any)('model_policy_unavailable', 'Durable model authority is unavailable', 403);
        if (record.model_policy?.allowed_models?.length && !(record.model_policy.allowed_models.includes as any)(model))
            throw new (RouterError as any)('model_not_allowed', 'Model outside token scope', 403);
        return record.model_policy ?? {};
    }
    async revoke(id?: any): Promise<any> { return this.store.transaction((records?: any): boolean => { const r: any = (records.get as any)(id); if (!r)
        throw new (RouterError as any)('not_found', 'Token not found', 404); const changed: boolean = !r.revoked; r.revoked = true; return changed; }); }
    async expire(id?: any): Promise<any> { return this.store.transaction((records?: any): any => { const r: any = (records.get as any)(id); if (!r)
        throw new (RouterError as any)('not_found', 'Token not found', 404); r.revoked = true; r.expires_at = this.clock(); return r; }); }
    async rotate(id?: any, overrides: any = {}): Promise<any> {
        const held: any = await this.get(id);
        if (!held)
            throw new (RouterError as any)('not_found', 'Token not found', 404);
        const options: any = { ttl_hours: (Math as any).max(1, (Math as any).floor((held.expires_at - this.clock()) / 3600)) };
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
        if (isSyntheticTokenId(id))
            return 'admitted';
        number(reserve, 'reserve');
        return this.store.transaction((records?: any): string => {
            const r: any = (records.get as any)(id);
            if (!r)
                return 'admitted';
            const now: number = this.clock();
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
                r.expires_at = (Math as any).max(r.expires_at, now + r.sliding_window_seconds);
            return 'admitted';
        });
    }
    async settle(id?: any, reserved?: any, actual?: any): Promise<any> {
        if (isSyntheticTokenId(id))
            return;
        number(reserved, 'reserved');
        number(actual, 'actual');
        return this.store.transaction((records?: any): void => { const r: any = (records.get as any)(id); if (r) {
            r.reserved_tokens = (Math as any).max(0, (r.reserved_tokens ?? 0) - reserved);
            r.used_tokens = (Math as any).min((Number as any).MAX_SAFE_INTEGER, (r.used_tokens ?? 0) + actual);
        } });
    }
    async releaseStaleReservations(): Promise<any> { return this.store.transaction((records?: any): number => { let n: any = 0; for (const r of records.values() as any)
        if (r.reserved_tokens) {
            r.reserved_tokens = 0;
            n++;
        } return n; }); }
    async enforceRequestBudget(id?: any, reserve: any = 0): Promise<void> {
        const verdict: any = await this.admit(id, reserve);
        if (verdict !== 'admitted') {
            const error: any = new (RouterError as any)(verdict, 'Router token budget is exhausted', 429);
            this.diagnostics?.record(diagnosticReason(error));
            throw error;
        }
    }
    async recordUsage(id?: any, tokens?: any): Promise<any> { return this.settle(id, 0, tokens); }
    async renewRunLease(id?: any): Promise<any> {
        if (isSyntheticTokenId(id))
            return this.clock() + 120;
        return this.store.transaction((records?: any): any => {
            const record: any = (records.get as any)(id), now: number = this.clock();
            if (!record?.ephemeral || record.revoked || record.expires_at <= now || record.run_lease_expires_at == null)
                throw new (RouterError as any)('invalid_token', 'Run lease is absent, revoked, expired as a token, or not ephemeral', 401);
            record.run_lease_expires_at = now + 120;
            return record.run_lease_expires_at;
        });
    }
}
export const codexTokenAlias: any = (token?: any): null | string => (token.startsWith as any)('la_sk_') ? `at-${(token.slice as any)(6)}` : null;
