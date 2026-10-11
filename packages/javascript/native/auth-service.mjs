/** Provider-verified credential reports and bounded native login sessions. */
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import * as oauthPrimitives from './oauth.mjs';
import {CodexLogin} from './codex-login.mjs';

const {CredentialFileStore,OAuthManager,ClaudeLogin,importCredential,validateCredentialCatalog} = oauthPrimitives;
const fail = (code,message,status = 400) => Object.assign(new Error(message),{code,status});
const providers = ['claude','codex','gemini','qwen'];
const pending = new Set(['awaiting_code','awaiting_callback','awaiting_device']);
const integer = (value,fallback,name) => {
  value = value ?? fallback;
  if (!Number.isSafeInteger(value) || value <= 0) throw fail('invalid_login_config',`${name} must be a positive safe integer`);
  return value;
};
function homeFor(core,provider,env = {}) {
  const config = core.config;
  return resolve(provider === 'claude' ? config.claude_code_home ?? config.claude_home ?? env.CLAUDE_CODE_HOME ?? join(config.data_dir,'claude')
    : config[`${provider}_home`] ?? env[`${provider.toUpperCase()}_HOME`] ?? join(config.data_dir,provider));
}
function safeCode(error) {return /^[a-z0-9_-]{1,100}$/i.test(error?.code ?? '') ? error.code : 'authorization_failed';}

export async function nativeCredentialStatus(core,{env = {},fetch = core.oauth?.fetch ?? globalThis.fetch,validateCatalog = validateCredentialCatalog,catalogBaseURL,allowLoopback = false} = {}) {
  const credentials = [],sources = [];
  for (const provider of providers) {
    const home = homeFor(core,provider,env);let held,store;
    try {
      store = new CredentialFileStore({provider,home,dataDir:core.config.data_dir,clock:core.clock});
      held = await store.reload();
      if (!held) {credentials.push({provider,home,state:'absent'});sources.push({provider,source:{kind:'absent'}});continue;}
      sources.push({provider,source:held.origin === 'adopted' ? {kind:'followed',source:held.path,present:true}
        : held.origin === 'external' ? {kind:'externally-owned'} : {kind:'owned'}});
      const token = await core.oauth.getFresh(store);
      const models = await validateCatalog({provider,token,fetch,baseURL:typeof catalogBaseURL === 'object' ? catalogBaseURL[provider] : catalogBaseURL,allowLoopback});
      if (!Array.isArray(models) || !models.some(model=>typeof model === 'string' && model.trim())) throw fail('catalog_unverified','Provider catalog did not verify an executable model',502);
      credentials.push({provider,home,state:'usable'});
    } catch (error) {
      const code = safeCode(error),state = code === 'catalog_rejected' ? 'rejected' : /refresh|no_refresh_token|external_refresh_owner/.test(code) ? 'refresh-failed' : 'unverified';
      credentials.push({provider,home,state,detail:`Credential inspection failed (${code})`});
    }
  }
  return {credentials,sources,api_key_providers:(await core.providers.list()).map(provider=>({
    name:provider.name,kind:provider.kind ?? 'openai-compatible',base_url:provider.base_url,
    models:provider.models ?? [],supported_clients:provider.supported_clients ?? [],
    has_encrypted_api_key:Boolean(provider.has_encrypted_api_key ?? provider.api_key),enabled:provider.enabled !== false,
    intermediary_risk_acknowledged:Boolean(provider.intermediary_risk_acknowledged),unsupported_clients:provider.unsupported_clients ?? [],
    ...Object.fromEntries(['api_key_env','default_model','subscriber_id'].filter(key=>provider[key] !== undefined).map(key=>[key,provider[key]])),
  })),output:[]};
}

export class NativeLoginManager {
  constructor(core,{env = {},fetch = core.oauth?.fetch ?? globalThis.fetch,clock = core.clock,loginFactories = {},validateCatalog = validateCredentialCatalog,...oauth} = {}) {
    this.core = core;this.env = env;this.fetch = fetch;this.clock = clock;this.factories = loginFactories;this.validateCatalog = validateCatalog;this.oauth = oauth;
    this.enabled = core.config.login?.enabled ?? core.config.disable_login_api !== true;
    this.maxSessions = integer(core.config.login?.max_sessions ?? core.config.login_max_sessions,4,'max_sessions');
    this.ttlSeconds = integer(core.config.login?.session_ttl_secs ?? core.config.login_session_ttl_secs,900,'session_ttl_secs');
    this.retentionSeconds = integer(core.config.login?.terminal_retention_secs,60,'terminal_retention_secs');
    this.sessions = new Map();
  }
  view(session) {
    return {login_id:session.id,provider:session.provider,status:session.status,session_expires_at:new Date(session.expires * 1000).toISOString(),
      ...(pending.has(session.status) && session.url ? {url:session.url} : {}),
      ...(pending.has(session.status) && session.userCode ? {user_code:session.userCode} : {}),
      ...(session.credentialExpiry !== undefined ? {expires_at:session.credentialExpiry} : {}),
      ...(session.error ? {error:session.error} : {})};
  }
  async sweep() {
    const now = this.clock();
    for (const [id,session] of this.sessions) {
      if (pending.has(session.status) && !session.promoting && session.expires <= now) {
        session.status = 'expired';session.error = 'login session expired before authorization completed';session.settled = now;session.controller.abort();
        if (!session.inFlight) await rm(session.stage,{recursive:true,force:true});
      } else if (session.settled !== undefined && session.settled + this.retentionSeconds <= now) this.sessions.delete(id);
    }
  }
  async begin(body = {}) {
    if (!this.enabled) throw fail('login_disabled','the login API is disabled',403);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('invalid_login','login request must be an object');
    const provider = body.provider ?? 'claude';
    if (!providers.includes(provider)) throw fail('invalid_provider','unknown subscription provider');
    await this.sweep();
    if ([...this.sessions.values()].filter(session=>pending.has(session.status)).length >= this.maxSessions) throw fail('too_many_sessions',`too many pending logins (limit ${this.maxSessions}); cancel one first`,429);
    const factory = this.factories[provider] ?? (provider === 'claude' ? async options=>ClaudeLogin.begin(options)
      : provider === 'codex' ? async options=>CodexLogin.begin(options) : null);
    if (!factory) throw fail('native_unsupported',`${provider} native login driver is unavailable`,501);
    const id = randomUUID(),stage = join(this.core.config.data_dir,'native-login-sessions',id),home = join(stage,provider);
    const session = {id,provider,stage,home,status:provider === 'claude' ? 'awaiting_code' : 'awaiting_device',expires:this.clock()+this.ttlSeconds,controller:new AbortController(),inFlight:false};
    // Reserve before awaiting a driver so simultaneous begin calls cannot
    // exceed the configured pending-session budget.
    this.sessions.set(id,session);
    try {
      const fetch = (url,options = {})=>this.fetch(url,{...options,signal:options.signal ? AbortSignal.any([options.signal,session.controller.signal]) : session.controller.signal});
      const manager = new OAuthManager({fetch,clock:this.clock,...this.oauth});
      session.driver = await factory({provider,home,manager,clock:this.clock,signal:session.controller.signal,mode:body.mode,flow:body.flow,dataDir:this.core.config.data_dir,validateCatalog:this.validateCatalog,...this.oauth});
      if (this.sessions.get(id) !== session || session.controller.signal.aborted) throw fail('login_cancelled','login session cancelled',409);
      session.url = typeof session.driver.authorizationURL === 'function' ? session.driver.authorizationURL() : session.driver.url;
      session.userCode = session.driver.userCode ?? session.driver.user_code;
      if (session.driver.status) session.status = session.driver.status;
      if (!pending.has(session.status) || typeof session.url !== 'string') throw fail('invalid_login_driver','login driver did not return a pending authorization URL',502);
      if (session.status !== 'awaiting_code' && typeof session.driver.wait === 'function') {
        session.inFlight = true;
        session.background = this.finish(session,()=>session.driver.wait({signal:session.controller.signal})).finally(()=>{session.inFlight = false;});
      }
      return this.view(session);
    } catch (error) {
      this.sessions.delete(id);session.controller.abort();await rm(stage,{recursive:true,force:true});throw error;
    }
  }
  async status(id) {await this.sweep();const session = this.sessions.get(id);return session ? this.view(session) : null;}
  active(session) {
    if (this.sessions.get(session.id) !== session || session.controller.signal.aborted || !pending.has(session.status) || !session.promoting && session.expires <= this.clock()) throw fail('login_cancelled','login no longer owns credential promotion',409);
  }
  async finish(session,complete) {
    try {
      await complete();this.active(session);
      await importCredential({provider:session.provider,sourceHome:session.home,destinationHome:homeFor(this.core,session.provider,this.env),dataDir:this.core.config.data_dir,
        fetch:this.fetch,clock:this.clock,validateCatalog:this.validateCatalog,owned:true,beforePromote:()=>{this.active(session);session.promoting = true;},...this.oauth});
      this.active(session);
      const credential = await new CredentialFileStore({provider:session.provider,home:homeFor(this.core,session.provider,this.env),dataDir:this.core.config.data_dir,clock:this.clock}).reload();
      if (!credential) throw fail('credential_missing','login did not persist a readable credential',502);
      session.status = 'authorized';session.promoting = false;session.settled = this.clock();
      if (credential.token.expires_at_ms !== undefined) session.credentialExpiry = Math.floor(credential.token.expires_at_ms / 1000);
      await rm(session.stage,{recursive:true,force:true});
    } catch (error) {
      session.promoting = false;
      if (this.sessions.get(session.id) === session && session.status !== 'expired') {session.status = 'failed';session.error = `Authorization failed (${safeCode(error)})`;session.settled = this.clock();}
      // Exchanged credentials stay in the private recovery stage if final
      // promotion failed. A failed session never reports authorization.
      session.controller.abort();
    }
    return this.view(session);
  }
  async submitCode(id,code) {
    if (!this.enabled) throw fail('login_disabled','the login API is disabled',403);
    await this.sweep();const session = this.sessions.get(id);
    if (!session) throw fail('login_not_found','unknown login_id',404);
    if (session.status !== 'awaiting_code' || session.inFlight) throw fail('login_not_pending',`login is not awaiting a code (status: ${session.status})`,409);
    if (typeof code !== 'string' || !code.trim() || Buffer.byteLength(code) > 16384) throw fail('invalid_code','authorization code must be nonempty and within 16 KiB');
    session.inFlight = true;
    try {return await this.finish(session,()=>session.driver.complete(code.trim(),{dataDir:this.core.config.data_dir,validateCatalog:this.validateCatalog,...this.oauth}));}
    finally {session.inFlight = false;}
  }
  async cancel(id) {
    const session = this.sessions.get(id);if (!session) return false;
    if (session.promoting) throw fail('login_promotion_in_progress','credential promotion has begun and cannot be cancelled',409);
    this.sessions.delete(id);session.controller.abort();await session.driver?.cancel?.();
    if (!session.inFlight) await rm(session.stage,{recursive:true,force:true});
    return true;
  }
  async dispose() {await Promise.all([...this.sessions.keys()].map(id=>this.cancel(id)));}
}
