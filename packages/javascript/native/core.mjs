import { loadConfig, ProviderStore } from './config.mjs';
import { createTokenStore } from './storage.mjs';
import { TokenManager } from './tokens.mjs';
import { AccountRouter } from './accounts.mjs';
import { modelCandidates, catalogModels } from './routing.mjs';

export class RouterCore {
  constructor({ config, storage, clock = () => Math.floor(Date.now()/1000), env = process.env }) {
    this.config = config; this.clock = clock;
    this.tokens = new TokenManager({secret:config.token_secret,store:createTokenStore({...config,storage}),clock});
    this.providers = new ProviderStore({dataDir:config.data_dir,secret:config.token_secret,env,records:config.providers,persistent:config.storage_policy !== 'memory'});
    this.accounts = new AccountRouter({config,clock});
  }
  async listProviders() { return this.providers.list(); }
  async showProvider(name) { return this.providers.get(name); }
  async upsertProvider(input) {
    const result = await this.providers.upsert(input);
    if (![...this.accounts.records.values()].some(a => a.provider === input.name)) {
      const fresh = new AccountRouter({config:{...this.config,accounts:[],providers:[input]},clock:this.clock});
      for (const [name,account] of fresh.records) this.accounts.records.set(name,account);
    }
    return result;
  }
  async removeProvider(name) { return this.providers.remove(name); }
  async listAccounts() { return this.accounts.list(); }
  async accountAction(name,action,body = {}) {
    if (action === 'pause') return this.accounts.pause(name,body);
    if (action === 'resume') return this.accounts.resume(name);
    if (action === 'policy') return this.accounts.policy(name,body.policy ?? body);
    throw new TypeError(`Unknown account action: ${action}`);
  }
  async updateRouting({strategy} = {}) { if (typeof strategy !== 'string') throw new TypeError('strategy is required'); return this.accounts.setStrategy(strategy); }
  async resetCooldowns() { return this.accounts.resetCooldowns(); }
  async resetCooldown(name,model) { return this.accounts.resetCooldowns(name,model); }
  async models() { return catalogModels(await this.providers.resolve(),this.accounts.records); }
  async candidates(context = {}) { return this.accounts.order(modelCandidates(await this.providers.resolve(),this.accounts.records,context),context); }
  async resolveCandidates(model, context = {}) { return this.candidates({ ...context,model }); }
  async route(context = {}) { const candidate = (await this.candidates(context))[0]; this.accounts.recordUse(candidate,context); return candidate; }
  async reportFailure(candidate, details) { return this.accounts.reportFailure(candidate,details); }
  async reportSuccess(candidate) { return this.accounts.reportSuccess(candidate); }
  async authenticate(token, options) { return this.tokens.validate(token,options); }
}
export async function createRouterCore(options = {}) {
  const config = await loadConfig(options);
  const core = new RouterCore({...options,config});
  // Resolve persisted provider catalog before establishing account isolation.
  const providers = await core.providers.resolve();
  core.accounts = new AccountRouter({config:{...config,providers},clock:core.clock});
  await core.accounts.load();
  return core;
}
export { TokenManager, RouterError, codexTokenAlias } from './tokens.mjs';
export { loadConfig, normalizeConfig, ProviderStore } from './config.mjs';
export { MemoryTokenStore, TextTokenStore, createTokenStore } from './storage.mjs';
export { AccountRouter } from './accounts.mjs';
