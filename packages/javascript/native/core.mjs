import { loadConfig, ProviderStore,nativeConfigEnvironment } from './config.mjs';
import { createTokenStore } from './storage.mjs';
import { TokenManager, RouterError } from './tokens.mjs';
import { AccountRouter } from './accounts.mjs';
import { OAuthManager, CredentialFileStore, subscriptionProvider,subscriptionHome,subscriptionBaseURL } from './oauth.mjs';
import { modelCandidates, catalogModels } from './routing.mjs';
import { AffinityStore } from './affinities.mjs';
import { AdminClaim } from './admin.mjs';
import { NativeLoginManager,nativeCredentialStatus } from './auth-service.mjs';
import { ManagementAccess } from './management-access.mjs';
import { EmergencyAuthentication,AuthenticationDiagnostics,withAuthenticationScope } from './emergency-auth.mjs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

export class RouterCore {
  constructor({ config, storage, clock = () => Math.floor(Date.now()/1000), env = process.env, fetch = globalThis.fetch, oauth = {},management = {} }) {
    this.config = config; this.clock = clock; this.env = env; this.fetch = fetch; this.oauthOptions = oauth; this.contexts = new Map();
    this.emergency = new EmergencyAuthentication({config:config.emergency,clock});this.emergency.start([config.host]);
    this.diagnostics = new AuthenticationDiagnostics({clock});this.withAuthenticationScope=withAuthenticationScope;
    this.tokens = new TokenManager({secret:config.token_secret,store:createTokenStore({...config,storage}),clock,emergency:this.emergency,diagnostics:this.diagnostics});
    this.providers = new ProviderStore({dataDir:config.data_dir,secret:config.token_secret,env,records:config.providers,persistent:config.storage_policy !== 'memory'});
    this.accounts = new AccountRouter({config,clock});
    this.oauth = new OAuthManager({fetch,clock,env,...oauth});
    this.credentialStores = new Map();
    this.affinities = new AffinityStore({dataDir:config.data_dir,persistent:config.storage_policy !== 'memory',clock});
    this.admin = new AdminClaim(this,{env});
    this.login = new NativeLoginManager(this,{env,fetch,clock,...oauth});
    this.credentialStatus = () => nativeCredentialStatus(this,{env,fetch,...oauth});
    this.managementAccess = new ManagementAccess({config:config.management,dataDir:config.data_dir,persistent:config.storage_policy !== 'memory',clock,...management});
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
    return this.attachCredentials(ordered,providers);
  }
  attachCredentials(ordered,providers) {
    for (const candidate of ordered) {
      const account = this.accounts.records.get(candidate.account), provider = providers.find(p => p.name === candidate.provider);
      const subscription = ['anthropic','claude','codex','gemini','qwen'].includes(provider?.kind);
      const home = account?.credential_home ?? account?.oauth?.home ?? provider?.credential_home ?? provider?.oauth?.home ?? (subscription ? account?.home ?? subscriptionHome(provider.kind,{config:this.config,env:this.env}) : null);
      if (home) {
        const kind = subscriptionProvider(account?.oauth_provider ?? account?.oauth?.provider ?? provider?.oauth?.provider ?? provider.kind);
        const key = `${kind}\0${candidate.account}\0${home}`;
        if (!this.credentialStores.has(key)) this.credentialStores.set(key,new CredentialFileStore({provider:kind,home,dataDir:this.config.data_dir,account:candidate.account,clock:this.clock}));
        candidate.auth_type = 'oauth'; candidate.oauth_provider = kind;
        Object.defineProperty(candidate,'credential_key',{value:key,enumerable:false});
      }
    }
    return ordered;
  }
  async nativeCandidates(context = {}) {
    const service = context.service;
    const kinds = {openai:['openai-compatible','openai','litellm'],anthropic:['anthropic','claude'],codex:['codex'],
      'codex-backend':['codex'],qwen:['qwen'],gemini:['gemini'],vertex:['vertex','vertex-ai'],bedrock:['bedrock']};
    if (!kinds[service]) throw new RouterError('invalid_argument','Unknown native service');
    const providers = (await this.providers.resolve()).filter(provider => kinds[service].includes(provider.kind));
    const configured = this.config.services?.[service]?.provider ?? (service === 'openai' ? this.config.openai_compatible_provider_name : undefined);
    const selected = providers.filter(provider => (!context.provider || context.provider === provider.name || context.provider === (provider.kind === 'anthropic' ? 'claude' : provider.kind)) &&
      (!configured || provider.name === configured) && (!context.client || provider.supported_clients.includes(context.client)));
    if (!selected.length) throw new RouterError('native_provider_unavailable','Native service provider is unavailable',503);
    if (service === 'openai' && selected.length > 1 && !configured && !context.provider) throw new RouterError('provider_conflict','Native OpenAI service requires an exact provider selection',409);
    let candidates;
    if (context.model) candidates = modelCandidates(selected,this.accounts.records,{...context,provider:undefined});
    else candidates = selected.flatMap(provider => [...this.accounts.records.values()].filter(account => account.provider === provider.name && account.enabled !== false).map(account => ({
      provider:provider.name,kind:provider.kind,account:account.name,base_url:provider.base_url,baseUrl:provider.base_url,
      api_key:account.api_key ?? provider.api_key,apiKey:account.api_key ?? provider.api_key,protocol:provider.protocol,
      headers:{...account.policy.headers},supported_clients:provider.supported_clients,default_model:provider.default_model,
    })));
    for (const candidate of candidates) {
      const subscription = !['openai-compatible','openai','litellm'].includes(candidate.kind);
      candidate.provider_kind = candidate.kind === 'anthropic' ? 'claude' : ['openai','litellm'].includes(candidate.kind) ? 'openai-compatible' : candidate.kind;
      candidate.destination_kind = subscription ? 'subscription' : 'stored_provider';
    }
    return this.attachCredentials(this.accounts.order(candidates,context),selected);
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
      ...(store.provider === 'qwen' && token.resource_url ? {base_url:subscriptionBaseURL('qwen',token),baseUrl:subscriptionBaseURL('qwen',token)} : {}),
      ...(store.provider === 'codex' ? {endpointPath:'/responses',protocol:'responses'} : {})};
  }
  async resolveCandidates(model, context = {}) { return this.candidates({ ...context,model }); }
  async route(context = {}) { const candidate = await this.prepareCandidate((await this.candidates(context))[0]); this.accounts.recordUse(candidate,context); return candidate; }
  async reportFailure(candidate, details) { return this.accounts.reportFailure(candidate,details); }
  async reportSuccess(candidate) { return this.accounts.reportSuccess(candidate); }
  async authenticate(token, options) {
    if (options?.admin && (this.config.allow_anonymous_admin || await this.admin.verify(token))) {
      try { return await this.tokens.validate(token,options); }
      catch { return {scope:'admin',is_admin:true,admin_credential_kind:this.config.allow_anonymous_admin ? 'anonymous' : this.admin.envKey ? 'environment' : 'legacy_opaque',record:null}; }
    }
    return options?.admin ? this.tokens.validate(token,options) : this.tokens.authenticateIncoming(token,options);
  }
  async withConfig(overrides = {},{env = this.env,cwd = process.cwd()} = {}) {
    const input = {...this.config,...overrides};
    for (const [environment,field] of Object.entries(nativeConfigEnvironment)) if (!Object.hasOwn(overrides,field) && env[environment] !== this.env[environment]) input[field] = env[environment];
    if (overrides.data_dir != null || overrides.dataDir != null) input.data_dir = resolve(cwd,overrides.data_dir ?? overrides.dataDir);
    if (overrides.home != null) input.home = resolve(cwd,overrides.home);
    const config = await loadConfig({config:input,env});
    const identity = createHash('sha256').update(JSON.stringify([config.data_dir,config.storage_policy,config.token_secret])).digest('hex');
    const baseIdentity = createHash('sha256').update(JSON.stringify([this.config.data_dir,this.config.storage_policy,this.config.token_secret])).digest('hex');
    if (identity !== baseIdentity) {
      if (!this.contexts.has(identity)) this.contexts.set(identity,await createRouterCore({config,env,clock:this.clock,fetch:this.fetch,oauth:this.oauthOptions}));
      return this.contexts.get(identity).withConfig({}, {env,cwd});
    }
    const context = Object.assign(Object.create(Object.getPrototypeOf(this)),this,{config,env});
    context.oauth = Object.assign(Object.create(Object.getPrototypeOf(this.oauth)),this.oauth,{env});
    context.providers = Object.assign(Object.create(Object.getPrototypeOf(this.providers)),this.providers,{env});
    Object.defineProperty(context.providers,'records',{get:() => this.providers.records,set:value => {this.providers.records=value;},enumerable:true});
    context.accounts = Object.assign(Object.create(Object.getPrototypeOf(this.accounts)),this.accounts,{config});
    for (const key of ['cursor','failoverCursor']) Object.defineProperty(context.accounts,key,{get:() => this.accounts[key],set:value => {this.accounts[key]=value;},enumerable:true});
    if (overrides.account_strategy != null) context.accounts.setStrategy(config.account_strategy);
    context.admin = Object.assign(Object.create(Object.getPrototypeOf(this.admin)),this.admin,{core:context,envKey:config.token_admin_key});
    for (const key of ['file','candidate']) Object.defineProperty(context.admin,key,{get:() => this.admin[key],set:value => {this.admin[key]=value;},enumerable:true});
    context.login = Object.assign(Object.create(Object.getPrototypeOf(this.login)),this.login,{core:context,env,enabled:config.login?.enabled ?? !config.disable_login_api,
      maxSessions:config.login?.max_sessions ?? config.login_max_sessions ?? this.login.maxSessions,
      ttlSeconds:config.login?.session_ttl_secs ?? config.login_session_ttl_secs ?? this.login.ttlSeconds});
    context.credentialStatus = () => nativeCredentialStatus(context,{env,fetch:this.fetch,...this.oauthOptions});
    context.managementAccess = Object.assign(Object.create(Object.getPrototypeOf(this.managementAccess)),this.managementAccess,{policy:config.management});
    return context;
  }
}
export async function createOperationContext(baseCore,{configOverrides = {},env,cwd = process.cwd(),signal} = {}) {
  env = {...baseCore.env,...env};
  const core = await baseCore.withConfig(configOverrides,{env,cwd});
  return {core,config:core.config,env,cwd,signal};
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
export { nativeConfigOptions } from './config.mjs';
export { MemoryTokenStore, TextTokenStore, BinaryTokenStore, DualTokenStore, createTokenStore } from './storage.mjs';
export { AffinityStore } from './affinities.mjs';
export { AccountRouter } from './accounts.mjs';

export { OAuthManager, CredentialFileStore, ClaudeLogin, importCredential, executeAuthOperation } from './oauth.mjs';
