import { loadConfig, ProviderStore } from './config.mjs';
import { createTokenStore } from './storage.mjs';
import { TokenManager, RouterError } from './tokens.mjs';
import { AccountRouter } from './accounts.mjs';
import { OAuthManager, CredentialFileStore, subscriptionProvider } from './oauth.mjs';
import { modelCandidates, catalogModels } from './routing.mjs';

export class RouterCore {
  constructor({ config, storage, clock = () => Math.floor(Date.now()/1000), env = process.env, fetch = globalThis.fetch, oauth = {} }) {
    this.config = config; this.clock = clock;
    this.tokens = new TokenManager({secret:config.token_secret,store:createTokenStore({...config,storage}),clock});
    this.providers = new ProviderStore({dataDir:config.data_dir,secret:config.token_secret,env,records:config.providers,persistent:config.storage_policy !== 'memory'});
    this.accounts = new AccountRouter({config,clock});
    this.oauth = new OAuthManager({fetch,clock,...oauth});
    this.credentialStores = new Map();
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
  async catalogFor({client,pinnedAccount,provider} = {}) {
    const providers = (await this.providers.resolve()).filter(record => (!provider || record.name === provider) && (!client || record.supported_clients.includes(client)));
    const accounts = new Map([...this.accounts.records].filter(([,account]) => !pinnedAccount || account.name === pinnedAccount));
    if (pinnedAccount && !accounts.size) throw new RouterError('unknown_pinned_account','Pinned account does not exist',404);
    return catalogModels(providers,accounts);
  }
  async candidates(context = {}) {
    const providers = await this.providers.resolve();
    const ordered = this.accounts.order(modelCandidates(providers,this.accounts.records,context),context);
    for (const candidate of ordered) {
      const account = this.accounts.records.get(candidate.account), provider = providers.find(p => p.name === candidate.provider);
      const home = account?.credential_home ?? account?.oauth?.home ?? provider?.credential_home ?? provider?.oauth?.home ?? ((provider?.kind === 'anthropic' || provider?.kind === 'codex') ? account?.home : null);
      if (home) {
        const kind = subscriptionProvider(account?.oauth_provider ?? account?.oauth?.provider ?? provider?.oauth?.provider ?? provider.kind);
        const key = `${kind}\0${candidate.account}\0${home}`;
        if (!this.credentialStores.has(key)) this.credentialStores.set(key,new CredentialFileStore({provider:kind,home,dataDir:this.config.data_dir,account:candidate.account,clock:this.clock}));
        candidate.auth_type = 'oauth'; candidate.oauth_provider = kind; candidate.credential_key = key;
      }
    }
    return ordered;
  }
  async prepareCandidate(candidate) {
    if (!this.accounts.serves(candidate.account,candidate.model)) throw new RouterError('account_unavailable','Account became unavailable',503);
    if (candidate.auth_type !== 'oauth') return candidate;
    const store = this.credentialStores.get(candidate.credential_key);
    if (!store) throw new RouterError('credentials_missing','Credential route is not configured',401);
    const {token,headers} = await this.oauth.headers(store);
    if (!this.accounts.serves(candidate.account,candidate.model)) throw new RouterError('account_unavailable','Account became unavailable during credential preparation',503);
    const {credential_key,...prepared} = candidate;
    return {...prepared,api_key:token.access_token,apiKey:token.access_token,account_id:token.account_id,oauth_headers:headers,
      ...(store.provider === 'codex' ? {endpointPath:'/responses',protocol:'responses'} : {})};
  }
  async resolveCandidates(model, context = {}) { return this.candidates({ ...context,model }); }
  async route(context = {}) { const candidate = await this.prepareCandidate((await this.candidates(context))[0]); this.accounts.recordUse(candidate,context); return candidate; }
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

export { OAuthManager, CredentialFileStore, ClaudeLogin, importCredential, executeAuthOperation } from './oauth.mjs';
