// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=7a80507a8b696bf8e34548ab87c429401f3fa59c3a574214a3a41d01242e24a0; dynamic any annotations are explicit draft gaps.
import { cooldownActive } from "../portable/policy.js";
import { atomicWrite, readOptional, serialized } from "./storage.js";
import { RouterError } from "./tokens.js";
const strategyAliases: Map<string, string> = new (Map as any)([
    ['rr', 'round-robin'], ['roundrobin', 'round-robin'], ['weighted_round_robin', 'weighted-round-robin'],
    ['prio', 'priority'], ['fill-first', 'priority'], ['leastused', 'least-used'], ['quota-first', 'least-used'], ['lru', 'least-used'],
]);
export const retryableStatus: any = (status?: any): boolean => [401, 429, 529, 500, 502, 503, 504].includes(status);
export function requestErrorAction(policy?: any, status?: any, body?: any): any {
    const prefix: any = (Buffer as any).from(body ?? '').subarray(0, 16384);
    return (policy.request_scoped_errors.find as any)((rule?: any): boolean => rule.status === status && prefix.indexOf((Buffer as any).from(rule.match)) >= 0)?.action;
}
const subscriptionKinds: Set<string> = new (Set as any)(['anthropic', 'claude', 'codex', 'gemini', 'qwen', 'vertex', 'vertex-ai', 'bedrock']);
const storedKinds: Set<string> = new (Set as any)(['openai-compatible', 'openai', 'litellm', 'lefine', 'z.ai-coding-plan']);
export function principalAccountName(account?: any, provider?: any): any { return account.implicit && subscriptionKinds.has(provider?.kind) ? 'primary' : account.name; }
export function principalAccountScope(records?: any, providers?: any, context: any = {}): any {
    const pin: any = context.pinnedAccount ?? context.pinned_account, principal: any = context.principalAccount, byProvider: any = new (Map as any)((providers.map as any)((provider?: any): any => [provider.name, provider]));
    return new (Map as any)([...records].filter(([, account]: any): any => { const provider: any = byProvider.get(account.provider); return provider && (pin ? account.name === pin : !principal || storedKinds.has(provider.kind) || principalAccountName(account, provider) === principal); }));
}
export function wildcardMatch(pattern?: any, value?: any): boolean {
    const regex: any = (((pattern.split as any)('').map as any)((c?: any): any => c === '*' ? '.*' : c === '?' ? '.' : (c.replace as any)(/[\\^$.[\]{}()+|]/g, '\\$&')).join as any)('');
    return new (RegExp as any)(`^${regex}$`).test(value);
}
export function validateAccountPolicy(policy: any = {}): any {
    const p: any = { weight: 1, prefix: null, disable_cooling: false, request_retry: null, request_scoped_errors: [], headers: {}, model_aliases: [], excluded_models: [], ...policy };
    if (!(Number as any).isInteger(p.weight) || p.weight > 1000000 || p.request_retry != null && (!(Number as any).isSafeInteger(p.request_retry) || p.request_retry < 0 || p.request_retry > 100))
        throw new (RouterError as any)('invalid_policy', 'Invalid policy weight or retry');
    if (p.prefix != null && (typeof p.prefix !== 'string' || !p.prefix || (p.prefix.includes as any)('/') || /\s/.test(p.prefix)))
        throw new (RouterError as any)('invalid_policy', 'Account prefix must be one nonempty path component');
    if (!(Array as any).isArray(p.excluded_models) || p.excluded_models.some((m?: any): boolean => typeof m !== 'string'))
        throw new (RouterError as any)('invalid_policy', 'Invalid excluded_models');
    if (!(Array as any).isArray(p.model_aliases) || p.model_aliases.some((a?: any): boolean => typeof a.model !== 'string' || !a.model.trim() || typeof a.alias !== 'string' || !a.alias.trim() || a.alias === a.model))
        throw new (RouterError as any)('invalid_policy', 'Invalid model aliases');
    if (new (Set as any)(p.model_aliases.map((a?: any): any => a.alias)).size !== p.model_aliases.length)
        throw new (RouterError as any)('invalid_policy', 'Aliases must be unique');
    if (!(Array as any).isArray(p.request_scoped_errors) || p.request_scoped_errors.some((e?: any): boolean => !(Number as any).isInteger(e.status) || e.status < 100 || e.status > 599 || typeof e.match !== 'string' || (Buffer as any).byteLength(e.match) > 16384 || !['relay', 'retry-next', 'cooldown'].includes(e.action)))
        throw new (RouterError as any)('invalid_policy', 'Invalid request scoped error rule');
    const protectedHeader: any = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-goog-api-key|anthropic-auth-token|chatgpt-account-id|host|connection|content-length|content-encoding|transfer-encoding|upgrade|te|trailer|proxy-authenticate|keep-alive|x-router-.*|x-link-assistant-.*)$/i;
    const copyHeaders: Set<string> = new (Set as any)(['x-request-id', 'x-correlation-id', 'traceparent', 'tracestate', 'x-claude-code-session-id', 'x-codex-session-id', 'x-session-id', 'session-id']);
    if (!p.headers || typeof p.headers !== 'object')
        throw new (RouterError as any)('invalid_policy', 'Invalid policy headers');
    for (const [name, value] of (Object as any).entries(p.headers) as any) {
        if (protectedHeader.test(name) || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || typeof value !== 'string' || /[\r\n\0]/.test(value))
            throw new (RouterError as any)('invalid_policy', 'Policy headers cannot replace authentication or transport headers');
        if (value.startsWith('$') && !copyHeaders.has(value.slice(1).toLowerCase()))
            throw new (RouterError as any)('invalid_policy', 'Policy header copy source is not allowed');
    }
    return p;
}
export function accountVisibleModels(account?: any, upstream?: any): any {
    const p: any = account.policy;
    const excluded: any = (model?: any): any => (p.excluded_models.some as any)((pattern?: any): boolean => wildcardMatch(pattern, model));
    if (excluded(upstream))
        return [];
    const aliases: any = (p.model_aliases.filter as any)((alias?: any): boolean => alias.model === upstream);
    const models: any = (aliases.map as any)((alias?: any): any => alias.alias);
    if (!aliases.length || (aliases.some as any)((alias?: any): any => alias.fork))
        (models.push as any)(upstream);
    const visible: any = [];
    for (const model of models as any) {
        if (!excluded(model))
            visible.push({ selector: model, model: upstream });
        if (p.prefix && !excluded(`${p.prefix}/${model}`))
            visible.push({ selector: `${p.prefix}/${model}`, model: upstream });
    }
    return visible;
}
export class AccountRouter {
    declare affinities: any;
    declare clock: any;
    declare config: any;
    declare cursor: any;
    declare failoverCursor: any;
    declare limits: any;
    declare records: any;
    declare strategy: any;
    declare used: any;
    declare weights: any;
    constructor({ config, clock = (): number => (Math as any).floor((Date as any).now() / 1000) }: any) {
        this.config = config;
        this.clock = clock;
        this.cursor = 0;
        this.failoverCursor = 0;
        this.affinities = new (Map as any)();
        this.weights = new (Map as any)();
        this.strategy = strategyAliases.get(config.account_strategy) ?? config.account_strategy;
        if (!['round-robin', 'weighted-round-robin', 'priority', 'least-used'].includes(this.strategy))
            throw new (RouterError as any)('invalid_config', 'Unknown account selection strategy');
        this.records = new (Map as any)();
        this.limits = new (Map as any)();
        this.used = new (Map as any)();
        for (const account of config.accounts as any) {
            if (!account.name || this.records.has(account.name))
                throw new (RouterError as any)('invalid_config', 'Account names must be nonempty and unique');
            if (account.request_limit != null && (!(Number as any).isSafeInteger(account.request_limit) || account.request_limit < 0))
                throw new (RouterError as any)('invalid_config', 'Account request_limit must be nonnegative');
            this.records.set(account.name, { ...account, policy: validateAccountPolicy(account.policy) });
        }
        for (const provider of config.providers as any)
            if (![...this.records.values()].some((a?: any): boolean => a.provider === provider.name && (!subscriptionKinds.has(provider.kind) || a.name === 'primary'))) {
                if (this.records.has(provider.name))
                    throw new (RouterError as any)('invalid_config', 'An implicit provider account collides with a named account');
                this.records.set(provider.name, { name: provider.name, provider: provider.name, policy: validateAccountPolicy(), implicit: true });
            }
    }
    async load(): Promise<any> {
        for (const account of this.records.values() as any)
            if (account.home) {
                const policy: string = await readOptional(`${account.home}/routing-policy.json`);
                if (policy)
                    account.policy = validateAccountPolicy((JSON as any).parse(policy));
            }
        if (this.config.storage_policy === 'memory')
            return this;
        const saved: any = (JSON as any).parse(await readOptional(`${this.config.data_dir}/account-limits.json`, 'null'));
        if (saved)
            for (const [name, state] of (Object as any).entries(saved.accounts ?? {}) as any)
                if (this.records.get(name)?.provider === saved.provider)
                    this.limits.set(name, state);
        return this;
    }
    async persist(): Promise<void> {
        if (this.config.storage_policy === 'memory')
            return;
        const providers: any = [...new (Set as any)([...this.records.values()].map((a?: any): any => a.provider))];
        if (providers.length !== 1)
            return;
        const accounts: any = (Object as any).fromEntries(this.limits);
        await atomicWrite(`${this.config.data_dir}/account-limits.json`, (JSON as any).stringify({ provider: (providers as any)[0], accounts }));
    }
    serves(name?: any, model?: any, excluded: any = []): boolean {
        const a: any = this.records.get(name), state: any = this.limits.get(name) ?? {}, now: number = this.clock();
        if (!a || a.enabled === false || excluded.includes(name) || (a.request_limit != null && (this.used.get(name) ?? 0) >= a.request_limit))
            return false;
        if (state.pause && (state.pause.until_unix == null || cooldownActive(state.pause.until_unix, now)))
            return false;
        if (a.policy.disable_cooling)
            return true;
        if (cooldownActive(state.cooldown_until_unix ?? 0, now))
            return false;
        const lower: any = (model ?? '').toLowerCase();
        return !(Object as any).entries(state.model_cooldowns ?? {}).some(([key, until]: any): any => cooldownActive(until, now) && (key === lower || ['haiku', 'sonnet', 'opus'].includes(key) && (lower.includes as any)(key)));
    }
    bound(context?: any): any {
        const session: any = context.sessionKey ?? context.session_key;
        const parent: any = context.parentSessionKey ?? context.parent_session_key;
        for (const key of [session, parent] as any) {
            const binding: any = this.affinities.get(key);
            if (binding?.until > this.clock())
                return binding.name;
            this.affinities.delete(key);
        }
        return null;
    }
    order(candidates?: any, context: any = {}): any {
        const pin: any = context.pinnedAccount ?? context.pinned_account;
        const exclude: any = context.exclude ?? [];
        const eligible: any = (candidates.filter as any)((c?: any): boolean => this.serves(c.account, c.model, exclude));
        if (pin) {
            if (!this.records.has(pin))
                throw new (RouterError as any)('unknown_pinned_account', `Unknown account '${pin}'`, 404);
            const selected: any = (eligible.filter as any)((c?: any): boolean => c.account === pin);
            if (!selected.length)
                throw new (RouterError as any)('pinned_account_unavailable', `Pinned account '${pin}' is unavailable`, 503);
            return selected;
        }
        const bound: any = this.bound(context);
        if (bound) {
            const preferred: any = (eligible.filter as any)((c?: any): boolean => c.account === bound);
            if (preferred.length)
                return [...preferred, ...(eligible.filter as any)((c?: any): boolean => c.account !== bound)];
            const account: any = this.records.get(bound);
            const hasPolicy: any = account && (JSON as any).stringify(account.policy) !== (JSON as any).stringify(validateAccountPolicy());
            if (!this.config.account_failover && !hasPolicy)
                throw new (RouterError as any)('session_account_unavailable', `Session account '${bound}' is unavailable`, 503);
        }
        if (!eligible.length)
            throw new (RouterError as any)('no_healthy_accounts', 'No healthy accounts', 503);
        if (bound || exclude.length) {
            const start: number = this.failoverCursor++ % eligible.length;
            return [...(eligible.slice as any)(start), ...(eligible.slice as any)(0, start)];
        }
        if (this.strategy === 'round-robin') {
            const start: number = this.cursor++ % eligible.length;
            return [...(eligible.slice as any)(start), ...(eligible.slice as any)(0, start)];
        }
        if (this.strategy === 'least-used')
            return (eligible.slice().sort as any)((a?: any, b?: any): number => {
                const left: any = this.records.get(a.account), right: any = this.records.get(b.account), l: any = this.used.get(a.account) ?? 0, r: any = this.used.get(b.account) ?? 0;
                if (left.request_limit != null && right.request_limit != null)
                    return l * right.request_limit - r * left.request_limit || l - r;
                if (left.request_limit != null)
                    return -1;
                if (right.request_limit != null)
                    return 1;
                return l - r;
            });
        if (this.strategy === 'weighted-round-robin') {
            const active: any = (eligible.filter as any)((c?: any): boolean => this.records.get(c.account).policy.weight > 0);
            if (!active.length)
                throw new (RouterError as any)('no_healthy_accounts', 'No positive-weight accounts', 503);
            let total: any = 0, selected: any = (active as any)[0], largest: any = -Infinity;
            const seen: any = new (Set as any)();
            for (const candidate of active as any) {
                if (seen.has(candidate.account))
                    continue;
                seen.add(candidate.account);
                const weight: any = this.records.get(candidate.account).policy.weight;
                (total as any) += weight;
                const current: any = (this.weights.get(candidate.account) ?? 0) + weight;
                this.weights.set(candidate.account, current);
                if (current > largest) {
                    (largest as any) = current;
                    (selected as any) = candidate;
                }
            }
            for (const name of this.weights.keys() as any)
                if (!seen.has(name))
                    this.weights.set(name, 0);
            this.weights.set((selected as any).account, largest - total);
            return [selected, ...(active.filter as any)((c?: any): boolean => c !== selected)];
        }
        return eligible;
    }
    recordUse(candidate?: any, context: any = {}): void {
        if (!this.serves(candidate.account, candidate.model, context.exclude))
            throw new (RouterError as any)('account_unavailable', 'Account became unavailable', 503);
        this.used.set(candidate.account, (this.used.get(candidate.account) ?? 0) + 1);
        const session: any = context.sessionKey ?? context.session_key;
        const old: any = this.bound(context);
        if (session && this.config.session_affinity_ttl_seconds > 0)
            this.affinities.set(session, { name: old ?? candidate.account, until: this.clock() + this.config.session_affinity_ttl_seconds });
    }
    async reportFailure(candidate?: any, { status, retryAfter, scope = 'account', message = '', body }: any = {}): Promise<any> {
        const account: any = this.records.get(candidate.account);
        if (!account)
            return;
        const action: any = requestErrorAction(account.policy, status, body ?? message);
        if (action === 'relay' || action === 'retry-next')
            return action;
        if (status != null && !retryableStatus(status) && action !== 'cooldown')
            return 'relay';
        if (account.policy.disable_cooling)
            return action === 'cooldown' ? 'cooldown' : 'retry-next';
        let seconds: any = typeof retryAfter === 'number' || typeof retryAfter === 'string' && /^\d+$/.test(retryAfter.trim()) ? Number(retryAfter) : NaN;
        if (!(Number as any).isFinite(seconds) && typeof retryAfter === 'string')
            (seconds as any) = (Math as any).ceil(((Date as any).parse(retryAfter) - this.clock() * 1000) / 1000);
        if (!(Number as any).isFinite(seconds) || seconds < 0)
            (seconds as any) = this.config.account_cooldown_seconds;
        const until: number = this.clock() + (Math as any).min(seconds, this.config.account_max_cooldown_seconds);
        return serialized(this, async (): Promise<string> => {
            const state: any = this.limits.get(candidate.account) ?? { model_cooldowns: {} };
            if (scope === 'model') {
                const key: any = candidate.model.toLowerCase();
                state.model_cooldowns ??= {};
                (state.model_cooldowns as any)[key] = (Math as any).max((state.model_cooldowns as any)[key] ?? 0, until);
            }
            else {
                state.cooldown_until_unix = (Math as any).max(state.cooldown_until_unix ?? 0, until);
                state.cooldown_reason = message || `HTTP ${status ?? 'network failure'}`;
            }
            this.limits.set(candidate.account, state);
            await this.persist();
            return action === 'cooldown' ? 'cooldown' : 'retry-next';
        });
    }
    async reportSuccess(candidate?: any): Promise<void> { const state: any = this.limits.get(candidate.account); if (state) {
        state.last_error = null;
    } }
    setStrategy(value?: any): any {
        const strategy: any = strategyAliases.get(value.trim().toLowerCase()) ?? value.trim().toLowerCase();
        if (!['round-robin', 'weighted-round-robin', 'priority', 'least-used'].includes(strategy))
            throw new (RouterError as any)('invalid_argument', 'Unknown routing strategy');
        this.strategy = strategy;
        return { strategy: strategy === 'priority' ? 'fill-first' : strategy };
    }
    async resetCooldowns(account?: any, model?: any): Promise<any> {
        if (model != null && account == null || account != null && !account.trim() || model != null && !model.trim())
            throw new (RouterError as any)('invalid_argument', 'A model reset requires a nonempty account and model');
        if (account != null && !this.records.has(account))
            throw new (RouterError as any)('not_found', 'Account not found', 404);
        return serialized(this, async (): Promise<any> => {
            let cleared: any = 0;
            for (const [name, state] of this.limits as any) {
                if (account != null && account !== name)
                    continue;
                const active: any = (Object as any).entries(state.model_cooldowns ?? {}).filter(([, until]: any): boolean => until > this.clock());
                state.model_cooldowns = (Object as any).fromEntries(active);
                if (state.cooldown_until_unix != null && state.cooldown_until_unix <= this.clock()) {
                    delete state.cooldown_until_unix;
                    delete state.cooldown_reason;
                }
                if (model != null) {
                    const key: any = model.toLowerCase();
                    if ((Object as any).hasOwn(state.model_cooldowns, key)) {
                        cleared++;
                        delete (state.model_cooldowns as any)[key];
                    }
                }
                else {
                    (cleared as any) += (state.cooldown_until_unix != null ? 1 : 0) + active.length;
                    delete state.cooldown_until_unix;
                    delete state.cooldown_reason;
                    state.model_cooldowns = {};
                }
            }
            await this.persist();
            return { cleared };
        });
    }
    async list(): Promise<any> { return [...this.records.values()].map((a?: any): any => ({ name: a.name, provider: a.provider, request_limit: a.request_limit ?? null, used_requests: this.used.get(a.name) ?? 0, healthy: this.serves(a.name), policy: structuredClone(a.policy), limits: structuredClone(this.limits.get(a.name) ?? {}) })); }
    async pause(name?: any, { reason = 'Operator pause', until_unix = null }: any = {}): Promise<any> {
        if (!this.records.has(name))
            throw new (RouterError as any)('not_found', 'Account not found', 404);
        if (until_unix != null && (!(Number as any).isSafeInteger(until_unix) || until_unix <= this.clock()))
            throw new (RouterError as any)('invalid_argument', 'Pause expiry must be a future timestamp');
        return serialized(this, async (): Promise<any> => { const state: any = this.limits.get(name) ?? {}; state.pause = { kind: 'manual', reason, until_unix }; this.limits.set(name, state); await this.persist(); return { name, ...state }; });
    }
    async resume(name?: any): Promise<any> {
        if (!this.records.has(name))
            throw new (RouterError as any)('not_found', 'Account not found', 404);
        return serialized(this, async (): Promise<any> => { const state: any = this.limits.get(name) ?? {}; delete state.pause; this.limits.set(name, state); await this.persist(); return { name, ...state }; });
    }
    async policy(name?: any, policy?: any): Promise<any> {
        const account: any = this.records.get(name);
        if (!account)
            throw new (RouterError as any)('not_found', 'Account not found', 404);
        account.policy = validateAccountPolicy(policy);
        if (account.home)
            await atomicWrite(`${account.home}/routing-policy.json`, (JSON as any).stringify(account.policy));
        return { name, policy: structuredClone(account.policy) };
    }
}
