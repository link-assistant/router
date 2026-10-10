// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=7983796deca97800dc98faf318bc14188b0a89dc64fdbbec7d4421152031008b; dynamic any annotations are explicit draft gaps.
import { cooldownActive } from "../portable/policy.js";
import { atomicWrite, readOptional, serialized } from "./storage.js";
import { RouterError } from "./tokens.js";
const strategyAliases: any = new (Map as any)([
    ['rr', 'round-robin'], ['roundrobin', 'round-robin'], ['weighted_round_robin', 'weighted-round-robin'],
    ['prio', 'priority'], ['fill-first', 'priority'], ['leastused', 'least-used'], ['quota-first', 'least-used'], ['lru', 'least-used'],
]);
export function wildcardMatch(pattern?: any, value?: any): any {
    const regex: any = pattern.split('').map((c?: any): any => c === '*' ? '.*' : c === '?' ? '.' : c.replace(/[\\^$.[\]{}()+|]/g, '\\$&')).join('');
    return new (RegExp as any)(`^${regex}$`).test(value);
}
export function validateAccountPolicy(policy: any = {}): any {
    const p: any = { weight: 1, prefix: null, disable_cooling: false, request_retry: null, request_scoped_errors: [], headers: {}, model_aliases: [], excluded_models: [], ...policy };
    if (!Number.isInteger(p.weight) || p.weight > 1000000 || p.request_retry != null && (!Number.isSafeInteger(p.request_retry) || p.request_retry < 0 || p.request_retry > 100))
        throw new (RouterError as any)('invalid_policy', 'Invalid policy weight or retry');
    if (p.prefix != null && (typeof p.prefix !== 'string' || !p.prefix || p.prefix.includes('/') || /\s/.test(p.prefix)))
        throw new (RouterError as any)('invalid_policy', 'Account prefix must be one nonempty path component');
    if (!Array.isArray(p.excluded_models) || p.excluded_models.some((m?: any): any => typeof m !== 'string'))
        throw new (RouterError as any)('invalid_policy', 'Invalid excluded_models');
    if (!Array.isArray(p.model_aliases) || p.model_aliases.some((a?: any): any => typeof a.model !== 'string' || !a.model.trim() || typeof a.alias !== 'string' || !a.alias.trim() || a.alias === a.model))
        throw new (RouterError as any)('invalid_policy', 'Invalid model aliases');
    if (new (Set as any)(p.model_aliases.map((a?: any): any => a.alias)).size !== p.model_aliases.length)
        throw new (RouterError as any)('invalid_policy', 'Aliases must be unique');
    if (!Array.isArray(p.request_scoped_errors) || p.request_scoped_errors.some((e?: any): any => !Number.isInteger(e.status) || e.status < 100 || e.status > 599 || typeof e.match !== 'string' || Buffer.byteLength(e.match) > 16384 || !['relay', 'retry-next', 'cooldown'].includes(e.action)))
        throw new (RouterError as any)('invalid_policy', 'Invalid request scoped error rule');
    const protectedHeader: any = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-goog-api-key|anthropic-auth-token|chatgpt-account-id|host|connection|content-length|content-encoding|transfer-encoding|upgrade|te|trailer|proxy-authenticate|keep-alive|x-router-.*|x-link-assistant-.*)$/i;
    const copyHeaders: any = new (Set as any)(['x-request-id', 'x-correlation-id', 'traceparent', 'tracestate', 'x-claude-code-session-id', 'x-codex-session-id', 'x-session-id', 'session-id']);
    if (!p.headers || typeof p.headers !== 'object')
        throw new (RouterError as any)('invalid_policy', 'Invalid policy headers');
    for (const [name, value] of Object.entries(p.headers) as any) {
        if (protectedHeader.test(name) || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || typeof value !== 'string' || /[\r\n\0]/.test(value))
            throw new (RouterError as any)('invalid_policy', 'Policy headers cannot replace authentication or transport headers');
        if (value.startsWith('$') && !copyHeaders.has(value.slice(1).toLowerCase()))
            throw new (RouterError as any)('invalid_policy', 'Policy header copy source is not allowed');
    }
    return p;
}
export function accountVisibleModels(account?: any, upstream?: any): any {
    const p: any = account.policy;
    const excluded: any = (model?: any): any => p.excluded_models.some((pattern?: any): any => wildcardMatch(pattern, model));
    if (excluded(upstream))
        return [];
    const aliases: any = p.model_aliases.filter((alias?: any): any => alias.model === upstream);
    const models: any = aliases.map((alias?: any): any => alias.alias);
    if (!aliases.length || aliases.some((alias?: any): any => alias.fork))
        models.push(upstream);
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
    constructor({ config, clock = (): any => Math.floor(Date.now() / 1000) }: any) {
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
            if (account.request_limit != null && (!Number.isSafeInteger(account.request_limit) || account.request_limit < 0))
                throw new (RouterError as any)('invalid_config', 'Account request_limit must be nonnegative');
            this.records.set(account.name, { ...account, policy: validateAccountPolicy(account.policy) });
        }
        for (const provider of config.providers as any)
            if (![...this.records.values()].some((a?: any): any => a.provider === provider.name))
                this.records.set(provider.name, { name: provider.name, provider: provider.name, policy: validateAccountPolicy(), implicit: true });
    }
    async load(): Promise<any> {
        for (const account of this.records.values() as any)
            if (account.home) {
                const policy: any = await readOptional(`${account.home}/routing-policy.json`);
                if (policy)
                    account.policy = validateAccountPolicy(JSON.parse(policy as any));
            }
        if (this.config.storage_policy === 'memory')
            return this;
        const saved: any = JSON.parse(await readOptional(`${this.config.data_dir}/account-limits.json`, 'null') as any);
        if (saved)
            for (const [name, state] of Object.entries(saved.accounts ?? {}) as any)
                if (this.records.get(name)?.provider === saved.provider)
                    this.limits.set(name, state);
        return this;
    }
    async persist(): Promise<any> {
        if (this.config.storage_policy === 'memory')
            return;
        const providers: any = [...new (Set as any)([...this.records.values()].map((a?: any): any => a.provider))];
        if (providers.length !== 1)
            return;
        const accounts: any = Object.fromEntries(this.limits);
        await atomicWrite(`${this.config.data_dir}/account-limits.json`, JSON.stringify({ provider: (providers as any)[0], accounts }));
    }
    serves(name?: any, model?: any, excluded: any = []): any {
        const a: any = this.records.get(name), state: any = this.limits.get(name) ?? {}, now: any = this.clock();
        if (!a || a.enabled === false || excluded.includes(name) || (a.request_limit != null && (this.used.get(name) ?? 0) >= a.request_limit))
            return false;
        if (state.pause && (state.pause.until_unix == null || cooldownActive(state.pause.until_unix, now)))
            return false;
        if (a.policy.disable_cooling)
            return true;
        if (cooldownActive(state.cooldown_until_unix ?? 0, now))
            return false;
        const lower: any = (model ?? '').toLowerCase();
        return !Object.entries(state.model_cooldowns ?? {}).some(([key, until]: any): any => cooldownActive(until, now) && (key === lower || ['haiku', 'sonnet', 'opus'].includes(key) && lower.includes(key)));
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
        const eligible: any = candidates.filter((c?: any): any => this.serves(c.account, c.model, exclude));
        if (pin) {
            if (!this.records.has(pin))
                throw new (RouterError as any)('unknown_pinned_account', `Unknown account '${pin}'`, 404);
            const selected: any = eligible.filter((c?: any): any => c.account === pin);
            if (!selected.length)
                throw new (RouterError as any)('pinned_account_unavailable', `Pinned account '${pin}' is unavailable`, 503);
            return selected;
        }
        const bound: any = this.bound(context);
        if (bound) {
            const preferred: any = eligible.filter((c?: any): any => c.account === bound);
            if (preferred.length)
                return [...preferred, ...eligible.filter((c?: any): any => c.account !== bound)];
            const account: any = this.records.get(bound);
            const hasPolicy: any = account && JSON.stringify(account.policy) !== JSON.stringify(validateAccountPolicy());
            if (!this.config.account_failover && !hasPolicy)
                throw new (RouterError as any)('session_account_unavailable', `Session account '${bound}' is unavailable`, 503);
        }
        if (!eligible.length)
            throw new (RouterError as any)('no_healthy_accounts', 'No healthy accounts', 503);
        if (bound || exclude.length) {
            const start: any = this.failoverCursor++ % eligible.length;
            return [...eligible.slice(start), ...eligible.slice(0, start)];
        }
        if (this.strategy === 'round-robin') {
            const start: any = this.cursor++ % eligible.length;
            return [...eligible.slice(start), ...eligible.slice(0, start)];
        }
        if (this.strategy === 'least-used')
            return eligible.slice().sort((a?: any, b?: any): any => {
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
            const active: any = eligible.filter((c?: any): any => this.records.get(c.account).policy.weight > 0);
            if (!active.length)
                throw new (RouterError as any)('no_healthy_accounts', 'No positive-weight accounts', 503);
            let total: any = 0, selected: any = (active as any)[0], largest: any = -Infinity;
            const seen: any = new (Set as any)();
            for (const candidate of active as any) {
                if (seen.has(candidate.account))
                    continue;
                seen.add(candidate.account);
                const weight: any = this.records.get(candidate.account).policy.weight;
                total += weight;
                const current: any = (this.weights.get(candidate.account) ?? 0) + weight;
                this.weights.set(candidate.account, current);
                if (current > largest) {
                    largest = current;
                    selected = candidate;
                }
            }
            for (const name of this.weights.keys() as any)
                if (!seen.has(name))
                    this.weights.set(name, 0);
            this.weights.set(selected.account, largest - total);
            return [selected, ...active.filter((c?: any): any => c !== selected)];
        }
        return eligible;
    }
    recordUse(candidate?: any, context: any = {}): any {
        if (!this.serves(candidate.account, candidate.model, context.exclude))
            throw new (RouterError as any)('account_unavailable', 'Account became unavailable', 503);
        this.used.set(candidate.account, (this.used.get(candidate.account) ?? 0) + 1);
        const session: any = context.sessionKey ?? context.session_key;
        const old: any = this.bound(context);
        if (session && this.config.session_affinity_ttl_seconds > 0)
            this.affinities.set(session, { name: old ?? candidate.account, until: this.clock() + this.config.session_affinity_ttl_seconds });
    }
    async reportFailure(candidate?: any, { status, retryAfter, scope = 'account', message = '' }: any = {}): Promise<any> {
        const account: any = this.records.get(candidate.account);
        if (!account)
            return;
        const rule: any = account.policy.request_scoped_errors.find((rule?: any): any => rule.status === status && message.includes(rule.match));
        if (rule?.action === 'relay' || rule?.action === 'retry-next')
            return rule.action;
        if (status != null && ![401, 403, 408, 429, 500, 502, 503, 504].includes(status) && rule?.action !== 'cooldown')
            return 'relay';
        if (account.policy.disable_cooling)
            return 'retry-next';
        let seconds: any = Number(retryAfter);
        if (!Number.isFinite(seconds) && typeof retryAfter === 'string')
            seconds = Math.ceil((Date.parse(retryAfter) - this.clock() * 1000) / 1000);
        if (!Number.isFinite(seconds) || seconds < 0)
            seconds = this.config.account_cooldown_seconds;
        const until: any = this.clock() + Math.min(seconds, this.config.account_max_cooldown_seconds);
        return serialized(this, async (): Promise<any> => {
            const state: any = this.limits.get(candidate.account) ?? { model_cooldowns: {} };
            if (scope === 'model') {
                const key: any = candidate.model.toLowerCase();
                state.model_cooldowns ??= {};
                (state.model_cooldowns as any)[key] = Math.max((state.model_cooldowns as any)[key] ?? 0, until);
            }
            else {
                state.cooldown_until_unix = Math.max(state.cooldown_until_unix ?? 0, until);
                state.cooldown_reason = message || `HTTP ${status ?? 'network failure'}`;
            }
            this.limits.set(candidate.account, state);
            await this.persist();
            return 'cooldown';
        });
    }
    async reportSuccess(candidate?: any): Promise<any> { const state: any = this.limits.get(candidate.account); if (state) {
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
                const active: any = Object.entries(state.model_cooldowns ?? {}).filter(([, until]: any): any => until > this.clock());
                state.model_cooldowns = Object.fromEntries(active);
                if (state.cooldown_until_unix != null && state.cooldown_until_unix <= this.clock()) {
                    delete state.cooldown_until_unix;
                    delete state.cooldown_reason;
                }
                if (model != null) {
                    const key: any = model.toLowerCase();
                    if (Object.hasOwn(state.model_cooldowns, key)) {
                        cleared++;
                        delete (state.model_cooldowns as any)[key];
                    }
                }
                else {
                    cleared += (state.cooldown_until_unix != null ? 1 : 0) + active.length;
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
        if (until_unix != null && (!Number.isSafeInteger(until_unix) || until_unix <= this.clock()))
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
            await atomicWrite(`${account.home}/routing-policy.json`, JSON.stringify(account.policy));
        return { name, policy: structuredClone(account.policy) };
    }
}
