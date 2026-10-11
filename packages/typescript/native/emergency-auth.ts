// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=559e61b37200252bf15ff6effc521721661bd85710c9b7f1e19e5b012b92f4b4; dynamic any annotations are explicit draft gaps.
import { createHash } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { normalizeManagementPeer } from "./management-access.js";
const requestOutcome: any = new (AsyncLocalStorage as any)();
const truthy: any = (value?: any): boolean => ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
const failure: any = (message?: any): any => (Object as any).assign(new (Error as any)(message), { code: 'invalid_emergency_config', status: 400 });
const clientNames: any = new (Set as any)(['claude', 'codex', 'cursor', 'gemini', 'grok', 'opencode', 'qwen', 'agent']);
const aliases: any = { 'claude-code': 'claude', 'cursor-agent': 'cursor', 'gemini-cli': 'gemini', 'grok-cli': 'grok', 'qwen-code': 'qwen' };
const clientKind: any = (value?: any): any => { const name: string = String(value ?? '').trim().toLowerCase(); return (aliases as any)[name] ?? (clientNames.has(name) ? name : null); };
export const isSyntheticTokenId: any = (id?: any): boolean => typeof id === 'string' && id.startsWith('emergency-bypass-');
export const tokenFingerprint: any = (token?: any): string => createHash('sha256').update(token).digest('hex').slice(0, 12);
export function unverifiedPayload(token?: any): any {
    try {
        const part: any = (((token.replace as any)(/^(la_sk_|at-)/, '').split as any)('.') as any)[1];
        if (!part || part.length > 65536 || !/^[A-Za-z0-9_-]+={0,2}$/.test(part))
            return null;
        const payload: any = (JSON as any).parse((Buffer as any).from(part, 'base64url').toString('utf8'));
        return payload && typeof payload === 'object' && !(Array as any).isArray(payload) ? payload : null;
    }
    catch {
        return null;
    }
}
export const withAuthenticationScope: any = (operation?: any): any => requestOutcome.run({ counted: false }, operation);
export function firstAuthenticationOutcome(): boolean { const scope: any = requestOutcome.getStore(); if (!scope)
    return true; const first: boolean = !scope.counted; scope.counted = true; return first; }
export function diagnosticReason(error?: any): any {
    return (({ invalid_token: 'malformed', not_yet_valid: 'malformed', admin_required: 'insufficient_scope',
        request_limit_exceeded: 'request_budget', token_limit_exceeded: 'token_budget', rate_limit_exceeded: 'rate_limit',
        model_policy_unavailable: 'model_policy', model_not_allowed: 'model_policy' }) as any)[error?.code] ??
        (['invalid_prefix', 'signature_invalid', 'issuer_secret_unset', 'expired', 'revoked', 'missing_record', 'binding_mismatch', 'not_found', 'missing_credential'].includes(error?.code) ? error.code : 'storage');
}
export class AuthenticationDiagnostics {
    declare clock: any;
    declare counts: any;
    declare recent: any;
    constructor({ clock = (): number => (Math as any).floor((Date as any).now() / 1000) }: any = {}) { this.clock = clock; this.counts = new (Map as any)(); this.recent = []; }
    record(reason?: any, token?: any): void {
        this.counts.set(reason, (this.counts.get(reason) ?? 0) + 1);
        const value: any = { at: this.clock(), reason };
        if (typeof token === 'string' && token) {
            value.fingerprint = tokenFingerprint(token);
            const subject: any = unverifiedPayload(token)?.sub;
            if (typeof subject === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(subject))
                value.token_id = subject.toLowerCase();
        }
        this.recent.push(value);
        if (this.recent.length > 64)
            this.recent.shift();
    }
    recordOutcome(reason?: any, token?: any): void { if (firstAuthenticationOutcome())
        this.record(reason, token); }
    snapshot(): any { return { failures_by_reason: (Object as any).fromEntries([...this.counts].sort()), recent_failures: this.recent.slice().reverse().map((value?: any): any => ({ ...value })) }; }
    renderPrometheus(): string {
        const rows: Array<string> = [...this.counts].sort().map(([reason, count]: any): string => `link_assistant_auth_failures_total{reason="${reason}"} ${count}`);
        return '# HELP link_assistant_auth_failures_total Router token authentication failures by reason.\n# TYPE link_assistant_auth_failures_total counter\n' + (rows.length ? rows.join('\n') : 'link_assistant_auth_failures_total 0') + '\n';
    }
}
export function normalizeEmergencyConfig(input: any = {}, env: any = {}): any {
    const duration: number = Number(input.emergency_duration_minutes ?? input.emergency?.duration_minutes ?? env.EMERGENCY_DURATION_MINUTES ?? 60);
    const enabled: boolean = truthy(input.emergency_accept_any_token ?? input.emergency?.enabled ?? env.EMERGENCY_ACCEPT_ANY_TOKEN);
    const config: any = { enabled, allow_non_loopback: truthy(input.emergency_allow_non_loopback ?? input.emergency?.allow_non_loopback ?? env.EMERGENCY_ALLOW_NON_LOOPBACK), duration_minutes: duration };
    if (enabled && (!(Number as any).isSafeInteger(duration) || duration < 1 || duration > 1440))
        throw failure('Emergency duration must be between 1 and 1440 minutes');
    return config;
}
export class EmergencyAuthentication {
    declare bypassed: any;
    declare clock: any;
    declare config: any;
    declare reasons: any;
    declare until: any;
    constructor({ config = {}, clock = (): number => (Math as any).floor((Date as any).now() / 1000) }: any = {}) {
        this.clock = clock;
        this.config = config;
        this.until = 0;
        this.bypassed = 0;
        this.reasons = new (Map as any)();
    }
    checkListeners(listeners?: any): void {
        if (!this.config.enabled)
            return;
        if (!(Number as any).isSafeInteger(this.config.duration_minutes) || this.config.duration_minutes < 1 || this.config.duration_minutes > 1440)
            throw failure('Emergency duration must be between 1 and 1440 minutes');
        const loopback: any = (address?: any): boolean => { const host: any = typeof address === 'string' ? address : address.address ?? address.host; if (host === 'localhost')
            return true; try {
            const peer: string = normalizeManagementPeer(host);
            return peer === '::1' || peer.startsWith('127.');
        }
        catch {
            return false;
        } };
        if (!this.config.allow_non_loopback && (listeners.some as any)((address?: any): boolean => !loopback(address)))
            throw failure('Emergency non-loopback listeners require explicit acknowledgement');
    }
    start(listeners?: any): void { this.checkListeners(listeners); if (this.config.enabled)
        this.until = this.clock() + this.config.duration_minutes * 60; }
    activeUntil(): null | number { return this.until > this.clock() ? this.until : null; }
    isActive(): boolean { return this.activeUntil() != null; }
    disable(): boolean { const active: boolean = this.isActive(); this.until = 0; return active; }
    status(): any { const expiry: any = this.activeUntil(); return { active: expiry != null, ...(expiry != null ? { expires_at: expiry } : {}), bypassed_requests: this.bypassed, bypassed_by_reason: (Object as any).fromEntries([...this.reasons].sort()) }; }
    claims(token?: any, headers: any = {}): any {
        const get: any = (name?: any): any => typeof headers.get === 'function' ? (headers.get as any)(name) : (headers as any)[name] ?? (headers as any)[name.toLowerCase()];
        const payload: any = unverifiedPayload(token), agent: string = String(get('user-agent') ?? '').toLowerCase();
        const inferred: any = clientKind(get('x-link-assistant-client')) ?? (agent.startsWith('claude') ? 'claude' : agent.startsWith('codex') ? 'codex' : agent.startsWith('opencode/') ? 'opencode' : agent.startsWith('grok') ? 'grok' :
            get('x-goog-api-client') || get('x-goog-api-key') ? 'gemini' : get('x-stainless-package-version') ? 'qwen' : (token.startsWith as any)('at-') ? 'codex' : null);
        const client: any = inferred ?? clientKind(payload?.client_kind), fingerprint: string = tokenFingerprint(token), now: number = this.clock();
        return { sub: `emergency-bypass-${fingerprint}`, iat: now, exp: now + 60, label: 'emergency-bypass', scope: '', github_repos: [],
            client_kind: client, principal_id: client ? typeof payload?.principal_id === 'string' && payload.principal_id.trim() ? payload.principal_id : `emergency-${fingerprint}` : null,
            account: null, record: null, is_admin: false };
    }
    admit(token?: any, headers?: any, reason?: any, count: any = firstAuthenticationOutcome()): any {
        if (count) {
            this.bypassed++;
            this.reasons.set(reason, (this.reasons.get(reason) ?? 0) + 1);
        }
        return this.claims(token, headers);
    }
    renderPrometheus(): string {
        const rows: Array<string> = [...this.reasons].sort().map(([reason, count]: any): string => `link_assistant_emergency_auth_bypassed_total{reason="${reason}"} ${count}`);
        return '# HELP link_assistant_emergency_auth_active 1 while the emergency any-token mode is on.\n# TYPE link_assistant_emergency_auth_active gauge\n' +
            `link_assistant_emergency_auth_active ${Number(this.isActive())}\n` +
            '# HELP link_assistant_emergency_auth_bypassed_total Requests admitted by the emergency any-token mode, by the check they bypassed.\n# TYPE link_assistant_emergency_auth_bypassed_total counter\n' +
            (rows.length ? rows.join('\n') : 'link_assistant_emergency_auth_bypassed_total 0') + '\n';
    }
}
