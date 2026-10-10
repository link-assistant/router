import { cooldownActive } from '../portable/policy.mjs';
import { atomicWrite, readOptional, serialized } from './storage.mjs';
import { RouterError } from './tokens.mjs';

const strategyAliases = new Map([
  ['rr','round-robin'],['roundrobin','round-robin'],['weighted_round_robin','weighted-round-robin'],
  ['prio','priority'],['fill-first','priority'],['leastused','least-used'],['quota-first','least-used'],['lru','least-used'],
]);
export function wildcardMatch(pattern, value) {
  const regex = pattern.split('').map(c => c === '*' ? '.*' : c === '?' ? '.' : c.replace(/[\\^$.[\]{}()+|]/g,'\\$&')).join('');
  return new RegExp(`^${regex}$`).test(value);
}
export function validateAccountPolicy(policy = {}) {
  const p = { weight:1, prefix:null, disable_cooling:false, request_retry:null, request_scoped_errors:[], headers:{}, model_aliases:[], excluded_models:[], ...policy };
  if (!Number.isInteger(p.weight) || p.weight > 1000000 || p.request_retry != null && (!Number.isSafeInteger(p.request_retry) || p.request_retry < 0 || p.request_retry > 100)) throw new RouterError('invalid_policy','Invalid policy weight or retry');
  if (p.prefix != null && (typeof p.prefix !== 'string' || !p.prefix || p.prefix.includes('/') || /\s/.test(p.prefix))) throw new RouterError('invalid_policy','Account prefix must be one nonempty path component');
  if (!Array.isArray(p.excluded_models) || p.excluded_models.some(m => typeof m !== 'string')) throw new RouterError('invalid_policy','Invalid excluded_models');
  if (!Array.isArray(p.model_aliases) || p.model_aliases.some(a => typeof a.model !== 'string' || !a.model.trim() || typeof a.alias !== 'string' || !a.alias.trim() || a.alias === a.model)) throw new RouterError('invalid_policy','Invalid model aliases');
  if (new Set(p.model_aliases.map(a => a.alias)).size !== p.model_aliases.length) throw new RouterError('invalid_policy','Aliases must be unique');
  if (!Array.isArray(p.request_scoped_errors) || p.request_scoped_errors.some(e => !Number.isInteger(e.status) || e.status < 100 || e.status > 599 || typeof e.match !== 'string' || Buffer.byteLength(e.match) > 16384 || !['relay','retry-next','cooldown'].includes(e.action))) throw new RouterError('invalid_policy','Invalid request scoped error rule');
  // Authentication and transport headers cannot be overwritten by operator tags.
  const protectedHeader = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-goog-api-key|anthropic-auth-token|chatgpt-account-id|host|connection|content-length|content-encoding|transfer-encoding|upgrade|te|trailer|proxy-authenticate|keep-alive|x-router-.*|x-link-assistant-.*)$/i;
  const copyHeaders = new Set(['x-request-id','x-correlation-id','traceparent','tracestate','x-claude-code-session-id','x-codex-session-id','x-session-id','session-id']);
  if (!p.headers || typeof p.headers !== 'object') throw new RouterError('invalid_policy','Invalid policy headers');
  for (const [name,value] of Object.entries(p.headers)) {
    if (protectedHeader.test(name) || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || typeof value !== 'string' || /[\r\n\0]/.test(value)) throw new RouterError('invalid_policy','Policy headers cannot replace authentication or transport headers');
    if (value.startsWith('$') && !copyHeaders.has(value.slice(1).toLowerCase())) throw new RouterError('invalid_policy','Policy header copy source is not allowed');
  }
  return p;
}
export function accountVisibleModels(account, upstream) {
  const p = account.policy;
  const excluded = model => p.excluded_models.some(pattern => wildcardMatch(pattern,model));
  if (excluded(upstream)) return [];
  const aliases = p.model_aliases.filter(alias => alias.model === upstream);
  const models = aliases.map(alias => alias.alias);
  if (!aliases.length || aliases.some(alias => alias.fork)) models.push(upstream);
  const visible = [];
  for (const model of models) {
    if (!excluded(model)) visible.push({ selector:model, model:upstream });
    if (p.prefix && !excluded(`${p.prefix}/${model}`)) visible.push({ selector:`${p.prefix}/${model}`,model:upstream });
  }
  return visible;
}
export class AccountRouter {
  constructor({ config, clock = () => Math.floor(Date.now()/1000) }) {
    this.config = config; this.clock = clock; this.cursor = 0; this.failoverCursor = 0; this.affinities = new Map(); this.weights = new Map();
    this.strategy = strategyAliases.get(config.account_strategy) ?? config.account_strategy;
    if (!['round-robin','weighted-round-robin','priority','least-used'].includes(this.strategy)) throw new RouterError('invalid_config','Unknown account selection strategy');
    this.records = new Map(); this.limits = new Map(); this.used = new Map();
    for (const account of config.accounts) {
      if (!account.name || this.records.has(account.name)) throw new RouterError('invalid_config','Account names must be nonempty and unique');
      if (account.request_limit != null && (!Number.isSafeInteger(account.request_limit) || account.request_limit < 0)) throw new RouterError('invalid_config','Account request_limit must be nonnegative');
      this.records.set(account.name,{ ...account,policy:validateAccountPolicy(account.policy) });
    }
    // A provider without an explicit account still needs independent cooldowns.
    for (const provider of config.providers) if (![...this.records.values()].some(a => a.provider === provider.name)) this.records.set(provider.name,{name:provider.name,provider:provider.name,policy:validateAccountPolicy(),implicit:true});
  }
  async load() {
    for (const account of this.records.values()) if (account.home) {
      const policy = await readOptional(`${account.home}/routing-policy.json`);
      if (policy) account.policy = validateAccountPolicy(JSON.parse(policy));
    }
    if (this.config.storage_policy === 'memory') return this;
    const saved = JSON.parse(await readOptional(`${this.config.data_dir}/account-limits.json`,'null'));
    if (saved) for (const [name,state] of Object.entries(saved.accounts ?? {})) if (this.records.get(name)?.provider === saved.provider) this.limits.set(name,state);
    return this;
  }
  async persist() {
    if (this.config.storage_policy === 'memory') return;
    const providers = [...new Set([...this.records.values()].map(a => a.provider))];
    // Rust account-limits.json is a single-provider projection. Do not write a
    // novel multiplexed format or clobber another provider's persisted state.
    if (providers.length !== 1) return;
    const accounts = Object.fromEntries(this.limits);
    await atomicWrite(`${this.config.data_dir}/account-limits.json`,JSON.stringify({provider:providers[0],accounts}));
  }
  serves(name, model, excluded = []) {
    const a = this.records.get(name), state = this.limits.get(name) ?? {}, now = this.clock();
    if (!a || a.enabled === false || excluded.includes(name) || (a.request_limit != null && (this.used.get(name) ?? 0) >= a.request_limit)) return false;
    if (state.pause && (state.pause.until_unix == null || cooldownActive(state.pause.until_unix,now))) return false;
    if (a.policy.disable_cooling) return true;
    if (cooldownActive(state.cooldown_until_unix ?? 0,now)) return false;
    const lower = (model ?? '').toLowerCase();
    return !Object.entries(state.model_cooldowns ?? {}).some(([key,until]) => cooldownActive(until,now) && (key === lower || ['haiku','sonnet','opus'].includes(key) && lower.includes(key)));
  }
  bound(context) {
    const session = context.sessionKey ?? context.session_key;
    const parent = context.parentSessionKey ?? context.parent_session_key;
    for (const key of [session,parent]) {
      const binding = this.affinities.get(key);
      if (binding?.until > this.clock()) return binding.name;
      this.affinities.delete(key);
    }
    return null;
  }
  order(candidates, context = {}) {
    const pin = context.pinnedAccount ?? context.pinned_account;
    const exclude = context.exclude ?? [];
    const eligible = candidates.filter(c => this.serves(c.account,c.model,exclude));
    if (pin) {
      if (!this.records.has(pin)) throw new RouterError('unknown_pinned_account',`Unknown account '${pin}'`,404);
      const selected = eligible.filter(c => c.account === pin);
      if (!selected.length) throw new RouterError('pinned_account_unavailable',`Pinned account '${pin}' is unavailable`,503);
      return selected;
    }
    const bound = this.bound(context);
    if (bound) {
      const preferred = eligible.filter(c => c.account === bound);
      if (preferred.length) return [...preferred,...eligible.filter(c => c.account !== bound)];
      const account = this.records.get(bound);
      const hasPolicy = account && JSON.stringify(account.policy) !== JSON.stringify(validateAccountPolicy());
      if (!this.config.account_failover && !hasPolicy) throw new RouterError('session_account_unavailable',`Session account '${bound}' is unavailable`,503);
    }
    if (!eligible.length) throw new RouterError('no_healthy_accounts','No healthy accounts',503);
    if (bound || exclude.length) {
      const start = this.failoverCursor++ % eligible.length;
      return [...eligible.slice(start),...eligible.slice(0,start)];
    }
    if (this.strategy === 'round-robin') {
      const start = this.cursor++ % eligible.length; return [...eligible.slice(start),...eligible.slice(0,start)];
    }
    if (this.strategy === 'least-used') return eligible.slice().sort((a,b) => {
      const left = this.records.get(a.account), right = this.records.get(b.account), l = this.used.get(a.account) ?? 0, r = this.used.get(b.account) ?? 0;
      if (left.request_limit != null && right.request_limit != null) return l*right.request_limit-r*left.request_limit || l-r;
      if (left.request_limit != null) return -1;
      if (right.request_limit != null) return 1;
      return l-r;
    });
    if (this.strategy === 'weighted-round-robin') {
      const active = eligible.filter(c => this.records.get(c.account).policy.weight > 0);
      if (!active.length) throw new RouterError('no_healthy_accounts','No positive-weight accounts',503);
      let total = 0, selected = active[0], largest = -Infinity;
      const seen = new Set();
      for (const candidate of active) {
        if (seen.has(candidate.account)) continue; seen.add(candidate.account);
        const weight = this.records.get(candidate.account).policy.weight;
        total += weight; const current = (this.weights.get(candidate.account) ?? 0)+weight;
        this.weights.set(candidate.account,current);
        if (current > largest) { largest = current; selected = candidate; }
      }
      for (const name of this.weights.keys()) if (!seen.has(name)) this.weights.set(name,0);
      this.weights.set(selected.account,largest-total);
      return [selected,...active.filter(c => c !== selected)];
    }
    return eligible;
  }
  recordUse(candidate, context = {}) {
    if (!this.serves(candidate.account,candidate.model,context.exclude)) throw new RouterError('account_unavailable','Account became unavailable',503);
    this.used.set(candidate.account,(this.used.get(candidate.account) ?? 0)+1);
    const session = context.sessionKey ?? context.session_key;
    const old = this.bound(context);
    if (session && this.config.session_affinity_ttl_seconds > 0) this.affinities.set(session,{name:old ?? candidate.account,until:this.clock()+this.config.session_affinity_ttl_seconds});
  }
  async reportFailure(candidate, { status, retryAfter, scope = 'account', message = '' } = {}) {
    const account = this.records.get(candidate.account); if (!account) return;
    const rule = account.policy.request_scoped_errors.find(rule => rule.status === status && message.includes(rule.match));
    if (rule?.action === 'relay' || rule?.action === 'retry-next') return rule.action;
    if (status != null && ![401,403,408,429,500,502,503,504].includes(status) && rule?.action !== 'cooldown') return 'relay';
    if (account.policy.disable_cooling) return 'retry-next';
    let seconds = Number(retryAfter);
    if (!Number.isFinite(seconds) && typeof retryAfter === 'string') seconds = Math.ceil((Date.parse(retryAfter)-this.clock()*1000)/1000);
    if (!Number.isFinite(seconds) || seconds < 0) seconds = this.config.account_cooldown_seconds;
    const until = this.clock()+Math.min(seconds,this.config.account_max_cooldown_seconds);
    return serialized(this,async () => {
      const state = this.limits.get(candidate.account) ?? {model_cooldowns:{}};
      if (scope === 'model') { const key = candidate.model.toLowerCase(); state.model_cooldowns ??= {}; state.model_cooldowns[key] = Math.max(state.model_cooldowns[key] ?? 0,until); }
      else { state.cooldown_until_unix = Math.max(state.cooldown_until_unix ?? 0,until); state.cooldown_reason = message || `HTTP ${status ?? 'network failure'}`; }
      this.limits.set(candidate.account,state); await this.persist(); return 'cooldown';
    });
  }
  async reportSuccess(candidate) { const state = this.limits.get(candidate.account); if (state) { state.last_error = null; } }
  setStrategy(value) {
    const strategy = strategyAliases.get(value.trim().toLowerCase()) ?? value.trim().toLowerCase();
    if (!['round-robin','weighted-round-robin','priority','least-used'].includes(strategy)) throw new RouterError('invalid_argument','Unknown routing strategy');
    this.strategy = strategy;
    return {strategy:strategy === 'priority' ? 'fill-first' : strategy};
  }
  async resetCooldowns(account, model) {
    if (model != null && account == null || account != null && !account.trim() || model != null && !model.trim()) throw new RouterError('invalid_argument','A model reset requires a nonempty account and model');
    if (account != null && !this.records.has(account)) throw new RouterError('not_found','Account not found',404);
    return serialized(this,async () => {
      let cleared = 0;
      for (const [name,state] of this.limits) {
        if (account != null && account !== name) continue;
        const active = Object.entries(state.model_cooldowns ?? {}).filter(([,until]) => until > this.clock());
        state.model_cooldowns = Object.fromEntries(active);
        if (state.cooldown_until_unix != null && state.cooldown_until_unix <= this.clock()) { delete state.cooldown_until_unix; delete state.cooldown_reason; }
        if (model != null) {
          const key = model.toLowerCase();
          if (Object.hasOwn(state.model_cooldowns,key)) { cleared++; delete state.model_cooldowns[key]; }
        } else {
          cleared += (state.cooldown_until_unix != null ? 1 : 0)+active.length;
          delete state.cooldown_until_unix; delete state.cooldown_reason; state.model_cooldowns = {};
        }
      }
      await this.persist(); return {cleared};
    });
  }
  async list() { return [...this.records.values()].map(a => ({ name:a.name,provider:a.provider,request_limit:a.request_limit ?? null,used_requests:this.used.get(a.name) ?? 0,healthy:this.serves(a.name),policy:structuredClone(a.policy),limits:structuredClone(this.limits.get(a.name) ?? {}) })); }
  async pause(name, { reason = 'Operator pause', until_unix = null } = {}) {
    if (!this.records.has(name)) throw new RouterError('not_found','Account not found',404);
    if (until_unix != null && (!Number.isSafeInteger(until_unix) || until_unix <= this.clock())) throw new RouterError('invalid_argument','Pause expiry must be a future timestamp');
    return serialized(this,async () => { const state = this.limits.get(name) ?? {}; state.pause = {kind:'manual',reason,until_unix}; this.limits.set(name,state); await this.persist(); return {name,...state}; });
  }
  async resume(name) {
    if (!this.records.has(name)) throw new RouterError('not_found','Account not found',404);
    return serialized(this,async () => { const state = this.limits.get(name) ?? {}; delete state.pause; this.limits.set(name,state); await this.persist(); return {name,...state}; });
  }
  async policy(name, policy) {
    const account = this.records.get(name); if (!account) throw new RouterError('not_found','Account not found',404);
    account.policy = validateAccountPolicy(policy);
    // Rust keeps each policy next to its account home.
    if (account.home) await atomicWrite(`${account.home}/routing-policy.json`,JSON.stringify(account.policy));
    return {name,policy:structuredClone(account.policy)};
  }
}
