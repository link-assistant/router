import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { access, mkdir, open, readFile, realpath, rename, rm, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { constants } from 'node:fs';
import { tokenExpired } from '../portable/policy.mjs';
import { atomicWrite, decodeLino, encodeLino, readOptional, serialized, withNativeFileLock } from './storage.mjs';
import { RouterError } from './tokens.mjs';

export const CLAUDE_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
export const CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
export const CLAUDE_TOKEN_URL = 'https://platform.claude.com/v1/oauth/token';
export const CODEX_TOKEN_URL = 'https://auth.openai.com/oauth/token';
export const CLAUDE_AUTHORIZE_URL = 'https://claude.com/cai/oauth/authorize';
export const CLAUDE_REDIRECT_URI = 'https://platform.claude.com/oauth/code/callback';
export const CLAUDE_SCOPES = 'org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload';
export const CLAUDE_INFERENCE_SCOPE = 'user:inference';
export const CLAUDE_OAUTH_USER_AGENT = 'anthropic-sdk-typescript/0.112.1 userOAuthProvider';
const PENDING_FILE = '.link-assistant-router-claude-login.json';
const files = {claude:['.credentials.json','credentials.json','auth.json','oauth.json','config.json'],codex:['auth.json']};
const flights = new Map();
const uncertain = new Map();
const nonempty = value => typeof value === 'string' && value.length ? value : null;
const field = (object,...names) => names.map(name => object?.[name]).find(value => value != null) ?? null;
const fail = (code,message,status = 400) => new RouterError(code,message,status);
export function subscriptionProvider(value) {
  const name = String(value).trim().toLowerCase();
  if (['claude','anthropic','claude-code'].includes(name)) return 'claude';
  if (['codex','chatgpt','openai-codex'].includes(name)) return 'codex';
  throw fail('native_unsupported','Native OAuth supports explicit Claude and Codex file credentials',501);
}
function integer(value,name) {
  if (value == null) return null;
  if (!Number.isSafeInteger(value)) throw fail('credential_invalid',`${name} must be a safe integer`);
  return value;
}
function jwtHint(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload)) return null;
    const parsed = JSON.parse(Buffer.from(payload,'base64url'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch { return null; }
}
function scopesFrom(block) {
  const scopes = block?.scopes ?? [];
  if (!Array.isArray(scopes) || scopes.some(value => typeof value !== 'string')) throw fail('credential_invalid','Credential scopes must be strings');
  if (block?.scope != null && typeof block.scope !== 'string') throw fail('credential_invalid','Credential scope must be a string');
  return [...new Set([...scopes,...(block?.scope?.split(/\s+/).filter(Boolean) ?? [])])];
}
// JWT fields here are local expiry/account hints, never proof of authentication.
// The OAuth endpoint and authenticated provider catalog remain authoritative.
export function parseCredentialDocument(provider, input) {
  provider = subscriptionProvider(provider);
  let document;
  try { document = typeof input === 'string' ? JSON.parse(input) : structuredClone(input); }
  catch { throw fail('credential_invalid','Credential document is not valid JSON'); }
  if (!document || typeof document !== 'object' || Array.isArray(document)) throw fail('credential_invalid','Credential document must be an object');
  let token;
  if (provider === 'claude') {
    const nested = document.claudeAiOauth ?? document.claude_ai_oauth;
    const nestedAccess = nonempty(field(nested,'accessToken','access_token')) ?? nonempty(field(nested,'oauthToken','oauth_token','token'));
    const block = nestedAccess ? nested : document;
    const accessToken = nestedAccess ?? nonempty(field(block,'accessToken','access_token')) ?? nonempty(field(block,'oauthToken','oauth_token','token'));
    if (!accessToken) throw fail('credential_missing_token','Claude credential contains no access token',401);
    token = {access_token:accessToken,refresh_token:nonempty(field(block,'refreshToken','refresh_token')),
      expires_at_ms:integer(field(block,'expiresAt','expires_at','expiryDate','expiry_date'),'Credential expiry'),account_id:null,resource_url:null};
    return {document,token,scopes:scopesFrom(block)};
  }
  const block = document.tokens;
  const accessToken = nonempty(field(block,'access_token','accessToken'));
  if (!accessToken) throw fail('credential_missing_token','Codex credential contains no subscription access token',401);
  const hint = jwtHint(accessToken), idHint = jwtHint(field(block,'id_token','idToken') ?? '');
  const exp = hint?.exp;
  const expiryHint = Number.isSafeInteger(exp) && Number.isSafeInteger(exp*1000) ? exp*1000 : null;
  const auth = idHint?.['https://api.openai.com/auth'];
  const account = nonempty(field(block,'account_id','accountId')) ?? nonempty(field(document,'account_id','accountId','chatgpt_account_id')) ?? nonempty(auth?.chatgpt_account_id ?? idHint?.chatgpt_account_id ?? auth?.account_id);
  token = {access_token:accessToken,refresh_token:nonempty(field(block,'refresh_token','refreshToken')),
    expires_at_ms:integer(field(document,'expiry_date','expiryDate','expiresAt','expires_at'),'Credential expiry') ?? expiryHint,account_id:account,resource_url:null};
  return {document,token,scopes:scopesFrom(document)};
}
export function mergeCredentialDocument(provider, document, token, nowMs) {
  provider = subscriptionProvider(provider); document = structuredClone(document);
  if (provider === 'claude') {
    const nestedName = Object.hasOwn(document,'claudeAiOauth') ? 'claudeAiOauth' : Object.hasOwn(document,'claude_ai_oauth') ? 'claude_ai_oauth' : null;
    const target = nestedName ? document[nestedName] : document;
    const key = (camel,snake) => Object.hasOwn(target,snake) && !Object.hasOwn(target,camel) ? snake : camel;
    target[key('accessToken','access_token')] = token.access_token;
    if (token.refresh_token) target[key('refreshToken','refresh_token')] = token.refresh_token;
    if (token.expires_at_ms != null) target[key('expiresAt','expires_at')] = token.expires_at_ms;
  } else {
    document.tokens ??= {};
    document.tokens.access_token = token.access_token;
    if (token.refresh_token) document.tokens.refresh_token = token.refresh_token;
    document.last_refresh = new Date(nowMs).toISOString();
  }
  return document;
}
export function credentialFingerprint(token) {
  const hash = createHash('sha256');
  const string = value => {
    if (value == null) { hash.update(Buffer.from([0])); return; }
    const bytes = Buffer.from(value), length = Buffer.alloc(8); length.writeBigUInt64LE(BigInt(bytes.length));
    hash.update(Buffer.from([1])); hash.update(length); hash.update(bytes);
  };
  string(token.access_token); string(token.refresh_token);
  if (token.expires_at_ms == null) hash.update(Buffer.from([0]));
  else { const expiry = Buffer.alloc(8); expiry.writeBigInt64LE(BigInt(token.expires_at_ms)); hash.update(Buffer.from([1])); hash.update(expiry); }
  string(token.account_id); string(token.resource_url); return hash.digest('hex');
}
export function validateOAuthEndpoint(value,{allowLoopback = false,expected} = {}) {
  let url;
  try { url = new URL(value); } catch { throw fail('invalid_oauth_endpoint','OAuth endpoint must be an absolute URL'); }
  const loopback = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if (url.username || url.password || url.hash || url.search || !['https:','http:'].includes(url.protocol) || url.protocol === 'http:' && !(allowLoopback && loopback)) throw fail('invalid_oauth_endpoint','OAuth endpoint must use HTTPS or an explicitly allowed loopback test endpoint');
  if (expected && url.href.replace(/\/$/,'') !== new URL(expected).href.replace(/\/$/,'') && !(allowLoopback && loopback)) throw fail('invalid_oauth_endpoint','OAuth token endpoint must match the configured provider');
  return url.href;
}
export function oauthHeaders(provider, token, {codexVersion = '0.154.0'} = {}) {
  provider = subscriptionProvider(provider);
  if (provider === 'claude') return {'anthropic-version':'2023-06-01','anthropic-beta':'oauth-2025-04-20'};
  const headers = {originator:'codex_cli_rs','user-agent':`codex_cli_rs/${codexVersion} (${process.platform}; ${process.arch}) unknown`};
  if (token.account_id && !/[\r\n\0]/.test(token.account_id)) headers['chatgpt-account-id'] = token.account_id;
  return headers;
}
export class CredentialFileStore {
  constructor({provider,home,path,dataDir,account = 'primary',origin = 'file',write = atomicWrite,clock = () => Math.floor(Date.now()/1000)}) {
    this.provider = subscriptionProvider(provider);
    if (!home && !path) throw fail('invalid_argument','An explicit credential home or path is required');
    if (!['file','adopted','external','keychain','binary'].includes(origin)) throw fail('invalid_argument','Unknown credential origin');
    if (['keychain','binary'].includes(origin)) throw fail('native_unsupported','Native OAuth does not implement platform keychain or binary credential stores',501);
    this.home = resolve(home ?? dirname(path)); this.path = path ? resolve(path) : null;
    this.dataDir = resolve(dataDir ?? join(this.home,'.router')); this.account = account; this.origin = origin; this.write = write; this.clock = clock;
    const digest = createHash('sha256').update(account).digest('hex');
    this.recoveryPath = join(this.dataDir,'refresh-recovery',`${this.provider}-${digest}.json`);
    this.lockPath = join(this.dataDir,'refresh-recovery',`${this.provider}-${digest}.lock`);
  }
  async readPrimary() {
    let lastError;
    for (const candidate of this.path ? [this.path] : files[this.provider].map(name => join(this.home,name))) {
      let raw;
      try { raw = await readOptional(candidate,null); } catch { throw fail('credential_read_failed','Subscription credential file cannot be read',401); }
      if (raw == null) continue;
      if (Buffer.byteLength(raw) > 4*1024*1024) throw fail('credential_invalid','Credential file exceeds the allowed size');
      try {
        let parsed = JSON.parse(raw), target = candidate, origin = this.origin;
        const metadata = parsed?._link_assistant_router;
        if (metadata?.credential_source) {
          const source = metadata.credential_source;
          if (typeof source !== 'string' || !isAbsolute(source) || resolve(source) === resolve(candidate)) throw fail('credential_invalid','Adopted credential source is invalid');
          target = await realpath(source);
          parsed = JSON.parse(await readFile(target,'utf8'));
          if (parsed?._link_assistant_router?.credential_source) throw fail('credential_invalid','Nested adopted credential sources are unsupported');
          origin = 'adopted';
        }
        if (metadata?.refresh_owner === 'external' || parsed?._link_assistant_router?.refresh_owner === 'external') origin = 'external';
        const normalized = parseCredentialDocument(this.provider,parsed);
        return {...normalized,path:target,pointer:candidate,origin};
      } catch (error) { lastError = error; }
    }
    if (lastError) throw fail(lastError.code ?? 'credential_invalid','Subscription credential file is unusable',401);
    return null;
  }
  async reload() {
    const primary = await this.readPrimary();
    const raw = await readOptional(this.recoveryPath,null); if (raw == null) return primary;
    let record;
    try { record = JSON.parse(raw); }
    catch { throw fail('credential_recovery_invalid','Credential recovery record is unusable',503); }
    if (record.version !== 1 || record.provider !== this.provider || typeof record.token?.access_token !== 'string' || !record.token.access_token || ['account_id','resource_url'].some(field => record.token[field] != null && typeof record.token[field] !== 'string') || record.token.refresh_token != null && typeof record.token.refresh_token !== 'string' || record.baseline_fingerprint != null && !/^[a-f0-9]{64}$/.test(record.baseline_fingerprint)) throw fail('credential_recovery_invalid','Credential recovery record is unusable',503);
    integer(record.token.expires_at_ms,'Recovery expiry');
    const primaryHash = primary ? credentialFingerprint(primary.token) : null, recoveredHash = credentialFingerprint(record.token);
    if (primaryHash === recoveredHash || primaryHash != null && primaryHash !== record.baseline_fingerprint) { await unlink(this.recoveryPath); return primary; }
    if (!primary) throw fail('credential_recovery_invalid','Recovery has no primary credential document',503);
    try { await this.persistPrimary(primary,record.token); await unlink(this.recoveryPath); } catch {}
    return {...primary,token:record.token,recovered:true};
  }
  async prepareRefresh(held) {
    if (held.origin === 'external') throw fail('external_refresh_owner','Cannot spend an externally owned refresh chain',401);
    if (!held.token.refresh_token) throw fail('no_refresh_token','Subscription credential has no refresh token',401);
    await mkdir(dirname(this.recoveryPath),{recursive:true,mode:0o700});
    const probe = `${this.recoveryPath}.${randomUUID()}.probe`;
    let file;
    try { file = await open(probe,'wx',0o600); await file.writeFile(''); await file.sync(); await file.close(); file = null; }
    catch { throw fail('credential_persistence_unavailable','A durable refresh recovery store is required',503); }
    finally { await file?.close(); await unlink(probe).catch(error => {if (error.code !== 'ENOENT') throw error;}); }
  }
  async persistPrimary(held, token) {
    if (held.origin === 'external') throw fail('external_refresh_owner','Cannot rewrite externally owned refresh credentials',401);
    const document = mergeCredentialDocument(this.provider,held.document,token,this.clock()*1000);
    await this.write(held.path,JSON.stringify(document,null,2)+'\n');
  }
  async persist(held, token) {
    try { await this.persistPrimary(held,token); await unlink(this.recoveryPath).catch(error => {if (error.code !== 'ENOENT') throw error;}); }
    catch {
      const record = {version:1,provider:this.provider,baseline_fingerprint:credentialFingerprint(held.token),token};
      try { await this.write(this.recoveryPath,JSON.stringify(record)+'\n'); }
      catch { throw fail('credential_persistence_failed','Rotated credential could not be durably persisted',503); }
    }
  }
  async transaction(operation) { return serialized(this.lockPath,() => withNativeFileLock(this.lockPath,operation,5000)); }
}

async function boundedJSON(response,code,maxBytes = 1024*1024) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw fail(code,'OAuth response exceeds the allowed size',502);
  const reader = response.body?.getReader();
  let text = '';
  if (reader) {
    const buffers = []; let bytes = 0;
    try { for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > maxBytes) { await reader.cancel(); throw fail(code,'OAuth response exceeds the allowed size',502); } buffers.push(part.value); } }
    finally { reader.releaseLock(); }
    text = Buffer.concat(buffers).toString('utf8');
  } else text = await response.text();
  try { return JSON.parse(text); } catch { throw fail(code,'Provider returned an invalid JSON response',502); }
}
export class OAuthManager {
  constructor({fetch = globalThis.fetch,clock = () => Math.floor(Date.now()/1000),endpoints = {},allowLoopback = false,timeoutMs = 20000} = {}) {
    if (typeof fetch !== 'function') throw fail('invalid_argument','OAuth requires a fetch implementation');
    this.fetch = fetch; this.clock = clock; this.allowLoopback = allowLoopback; this.timeoutMs = timeoutMs;
    this.endpoints = {};
    for (const [provider,official] of [['claude',CLAUDE_TOKEN_URL],['codex',CODEX_TOKEN_URL]]) this.endpoints[provider] = validateOAuthEndpoint(endpoints[provider] ?? official,{allowLoopback,expected:official});
  }
  async exchange(provider,body) {
    provider = subscriptionProvider(provider);
    const headers = {'content-type':'application/json'};
    if (provider === 'claude') { headers['anthropic-beta'] = 'oauth-2025-04-20'; headers['user-agent'] = CLAUDE_OAUTH_USER_AGENT; }
    else Object.assign(headers,oauthHeaders(provider,{}));
    let response;
    try { response = await this.fetch(this.endpoints[provider],{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(this.timeoutMs)}); }
    catch { throw fail('oauth_exchange_uncertain','OAuth exchange outcome is uncertain; the refresh grant was not retried',502); }
    if (!response.ok) {
      const data = await boundedJSON(response,'oauth_response_invalid').catch(() => ({}));
      const recognized = ['invalid_grant','invalid_client','unauthorized_client','unsupported_grant_type'].includes(data.error) ? data.error : 'oauth_rejected';
      throw fail(recognized,`OAuth token endpoint rejected the ${provider} grant`,response.status === 429 ? 429 : 401);
    }
    const data = await boundedJSON(response,'oauth_response_invalid');
    if (!nonempty(data.access_token) || data.token_type != null && !/^bearer$/i.test(data.token_type)) throw fail('oauth_response_invalid','OAuth response has no usable bearer access token',502);
    if (data.expires_in != null && (!Number.isSafeInteger(data.expires_in) || data.expires_in < 0 || !Number.isSafeInteger(this.clock()*1000+data.expires_in*1000))) throw fail('oauth_response_invalid','OAuth expiry is not representable',502);
    if (data.refresh_token != null && typeof data.refresh_token !== 'string') throw fail('oauth_response_invalid','OAuth refresh token is invalid',502);
    return data;
  }
  async getFresh(store,{force = false} = {}) {
    if (!(store instanceof CredentialFileStore)) throw fail('invalid_argument','A native file credential store is required');
    const key = store.lockPath;
    if (flights.has(key)) return structuredClone(await flights.get(key));
    const flight = store.transaction(async () => {
      const held = await store.reload(); if (!held) throw fail('credentials_missing','Subscription credentials are absent',401);
      const fingerprint = credentialFingerprint(held.token);
      if (uncertain.get(key) === fingerprint) throw fail('oauth_exchange_uncertain','Previous OAuth exchange is uncertain; credential must advance before another grant is spent',503);
      if (uncertain.has(key)) uncertain.delete(key);
      const nowMs = this.clock()*1000;
      const due = force || held.token.expires_at_ms != null && tokenExpired(nowMs,held.token.expires_at_ms,-300000);
      if (!due || !held.token.refresh_token && (held.token.expires_at_ms == null || !tokenExpired(nowMs,held.token.expires_at_ms,0))) return {...held.token,scopes:held.scopes};
      await store.prepareRefresh(held);
      let response;
      try { response = await this.exchange(store.provider,{grant_type:'refresh_token',refresh_token:held.token.refresh_token,client_id:store.provider === 'claude' ? CLAUDE_CLIENT_ID : CODEX_CLIENT_ID}); }
      catch (error) { if (error.code === 'oauth_exchange_uncertain' || error.code === 'oauth_response_invalid') uncertain.set(key,fingerprint); throw error; }
      const token = {...held.token,access_token:response.access_token,refresh_token:nonempty(response.refresh_token) ?? held.token.refresh_token,
        expires_at_ms:response.expires_in == null ? null : nowMs+response.expires_in*1000};
      try { await store.persist(held,token); } catch (error) { uncertain.set(key,fingerprint); throw error; }
      return {...token,scopes:held.scopes};
    });
    flights.set(key,flight);
    try { return structuredClone(await flight); } finally { if (flights.get(key) === flight) flights.delete(key); }
  }
  async headers(store, options) {
    const token = await this.getFresh(store,options);
    if (store.provider === 'claude' && token.scopes.length && !token.scopes.includes(CLAUDE_INFERENCE_SCOPE)) throw fail('oauth_scope_missing','Claude credential lacks user:inference scope',403);
    return {token,headers:oauthHeaders(store.provider,token)};
  }
}

export async function validateCredentialCatalog({provider,token,fetch = globalThis.fetch,baseURL,allowLoopback = false,timeoutMs = 20000}) {
  provider = subscriptionProvider(provider);
  const official = provider === 'claude' ? 'https://api.anthropic.com' : 'https://chatgpt.com/backend-api/codex';
  const base = validateOAuthEndpoint(baseURL ?? official,{allowLoopback,expected:official+'/'}).replace(/\/$/,'');
  const models = [], seen = new Set(); let after = null;
  for (let page = 0;page < 16;page++) {
    const url = new URL(base+(provider === 'claude' ? '/v1/models' : '/models'));
    url.searchParams.set(provider === 'claude' ? 'limit' : 'client_version',provider === 'claude' ? '1000' : '0.154.0');
    if (after) url.searchParams.set('after_id',after);
    let response;
    try { response = await fetch(url,{method:'GET',headers:{authorization:`Bearer ${token.access_token}`,...oauthHeaders(provider,token)},redirect:'error',signal:AbortSignal.timeout(timeoutMs)}); }
    catch { throw fail('catalog_unverified','Subscription catalog could not be verified',502); }
    if (!response.ok) throw fail('catalog_rejected','Subscription catalog rejected the credential',401);
    const data = await boundedJSON(response,'catalog_invalid',4*1024*1024);
    const rows = provider === 'codex' ? data.models ?? data.data : data.data;
    if (!Array.isArray(rows) || rows.some(row => !nonempty(row.id ?? row.slug))) throw fail('catalog_invalid','Subscription catalog has no exact model identities',502);
    for (const row of rows) { const id = row.id ?? row.slug; if (!models.includes(id)) models.push(id); }
    if (!data.has_more) { if (!models.length) throw fail('catalog_unverified','Subscription catalog returned no models',403); return models; }
    const next = data.last_id;
    if (!nonempty(next) || seen.has(next)) throw fail('catalog_invalid','Subscription catalog pagination is invalid',502);
    seen.add(next); after = next;
  }
  throw fail('catalog_invalid','Subscription catalog exceeded pagination limits',502);
}

function loginMode(value = 'full') {
  const normalized = String(value).trim().toLowerCase();
  if (['','full','login','default'].includes(normalized)) return 'full';
  if (['setup-token','setup_token','inference','narrow'].includes(normalized)) return 'setup-token';
  throw fail('invalid_argument','Claude login mode must be full or setup-token');
}
function acceptedModels(value) {
  if (!Array.isArray(value) || !value.length || value.some(model => typeof model !== 'string' || !model)) throw fail('catalog_unverified','Credential catalog acceptance requires exact nonempty model ids',403);
  return [...new Set(value)];
}
async function installAcceptedDocument({provider,document,sourcePath,destinationHome,dataDir,ifAbsent = false,follow = false,snapshot = false}) {
  const store = new CredentialFileStore({provider,home:destinationHome,dataDir});
  return store.transaction(async () => {
    const previous = await store.readPrimary();
    if (ifAbsent && previous) return {schema_version:1,results:[{provider,phase:'preflight',outcome:'already_present',transaction_id:null,previous_credential_safe:true}]};
    const destination = previous?.pointer ?? join(store.home,files[store.provider][0]);
    const transactionId = randomUUID().replaceAll('-','');
    let installed = structuredClone(document);
    if (follow) installed = {_link_assistant_router:{credential_source:await realpath(sourcePath),promotion_receipt:transactionId}};
    else {
      installed._link_assistant_router = {...installed._link_assistant_router,promotion_receipt:transactionId};
      if (snapshot) installed._link_assistant_router.refresh_owner = 'external';
    }
    await atomicWrite(destination,JSON.stringify(installed,null,2)+'\n');
    return {schema_version:1,results:[{provider,phase:'promotion',outcome:'promoted',transaction_id:transactionId,previous_credential_safe:true}]};
  });
}

// Non-destructive access-token validation followed by an atomic source reference
// is a supported import path. Full Rust rotating-candidate resume is not claimed.
export async function importCredential({provider,sourceHome,destinationHome,dataDir,ifAbsent = false,snapshot = false,fetch = globalThis.fetch,clock = () => Math.floor(Date.now()/1000),validateCatalog = validateCredentialCatalog,catalogBaseURL,allowLoopback = false} = {}) {
  provider = subscriptionProvider(provider);
  if (!sourceHome || !destinationHome || !dataDir) throw fail('invalid_argument','Import requires explicit source, destination and Router data directories');
  const source = new CredentialFileStore({provider,home:sourceHome,dataDir:join(dataDir,'import-source'),clock});
  const destination = new CredentialFileStore({provider,home:destinationHome,dataDir,clock});
  if (resolve(sourceHome) === resolve(destinationHome)) throw fail('invalid_argument','Credential import source and destination must differ');
  const existing = await destination.readPrimary();
  if (ifAbsent && existing) return {schema_version:1,results:[{provider,phase:'preflight',outcome:'already_present',transaction_id:null,previous_credential_safe:true}]};
  const held = await source.readPrimary();
  if (!held) throw fail('credentials_missing','Credential import source has no usable file credential',401);
  if (existing?.path === held.path || await realpath(destinationHome).catch(() => resolve(destinationHome)) === await realpath(sourceHome)) throw fail('invalid_argument','Credential import source and destination must differ');
  if (held.token.expires_at_ms != null && tokenExpired(clock()*1000,held.token.expires_at_ms,0)) throw fail('credential_expired','Import requires a live access token; externally owned grants are not spent',401);
  if (held.origin === 'external' && !snapshot) throw fail('external_refresh_owner','A non-snapshot import requires a writable owning source file',401);
  if (!snapshot) {
    try { await access(dirname(held.path),constants.W_OK); await access(held.path,constants.W_OK); }
    catch { throw fail('credential_persistence_unavailable','Owning source credential must be writable for safe refresh-chain import',503); }
  }
  const stage = join(dataDir,'auth-import-candidates',randomUUID().replaceAll('-',''));
  const stagePath = join(stage,provider,files[provider][0]);
  await atomicWrite(stagePath,JSON.stringify(held.document,null,2)+'\n');
  try {
    const models = acceptedModels(await validateCatalog({provider,token:held.token,fetch,baseURL:catalogBaseURL,allowLoopback}));
    // Re-read after validation: a source file moved by its owner must be validated
    // again, rather than installing the different chain link it now contains.
    const current = await source.readPrimary();
    if (!current || credentialFingerprint(current.token) !== credentialFingerprint(held.token)) throw fail('credential_changed','Credential changed during import; retry validation',409);
    return await installAcceptedDocument({provider,document:held.document,sourcePath:held.path,destinationHome,dataDir,ifAbsent,follow:!snapshot,snapshot,models});
  } finally { await rm(stage,{recursive:true,force:true}); }
}

export class ClaudeLogin {
  #pending;
  constructor({home,mode = 'full',manager = new OAuthManager(),authorizeURL = CLAUDE_AUTHORIZE_URL,allowLoopback = false,clock = () => Math.floor(Date.now()/1000),pending} = {}) {
    if (!home) throw fail('invalid_argument','Claude login requires an explicit credential home');
    this.home = resolve(home); this.mode = loginMode(mode); this.manager = manager; this.clock = clock;
    this.authorizeURL = validateOAuthEndpoint(authorizeURL,{allowLoopback,expected:CLAUDE_AUTHORIZE_URL});
    this.#pending = pending ?? {state:randomBytes(32).toString('base64url'),code_verifier:randomBytes(32).toString('base64url'),expires_at:clock()*1000+600000};
    this.used = false;
  }
  static async begin(options = {}) {
    const login = new ClaudeLogin(options);
    await atomicWrite(join(login.home,PENDING_FILE),encodeLino(login.#pending));
    return login;
  }
  static async resume(options = {}) {
    if (!options.home) throw fail('invalid_argument','Claude login requires an explicit credential home');
    const path = join(resolve(options.home),PENDING_FILE), claimed = `${path}.${randomUUID()}.claimed`;
    try { await rename(path,claimed); } catch { throw fail('pending_login_missing','No pending Claude authorization; begin a code flow first',404); }
    let pending;
    try { const raw = await readFile(claimed,'utf8'); pending = raw.trim().startsWith('{') ? JSON.parse(raw) : decodeLino(raw); }
    catch { throw fail('pending_login_invalid','Pending Claude authorization is invalid'); }
    finally { await unlink(claimed); }
    const now = (options.clock?.() ?? Math.floor(Date.now()/1000))*1000;
    if (!pending?.state || !pending.code_verifier || !Number.isSafeInteger(pending.expires_at) || pending.expires_at <= now) throw fail('pending_login_expired','Pending Claude authorization expired');
    return new ClaudeLogin({...options,pending});
  }
  authorizationURL() {
    const url = new URL(this.authorizeURL);
    for (const [name,value] of Object.entries({code:'true',client_id:CLAUDE_CLIENT_ID,response_type:'code',redirect_uri:CLAUDE_REDIRECT_URI,
      scope:this.mode === 'setup-token' ? CLAUDE_INFERENCE_SCOPE : CLAUDE_SCOPES,
      code_challenge:createHash('sha256').update(this.#pending.code_verifier).digest('base64url'),code_challenge_method:'S256',state:this.#pending.state})) url.searchParams.set(name,value);
    return url.href;
  }
  async complete(pasted,{dataDir = join(this.home,'.router'),validateCatalog = validateCredentialCatalog,catalogBaseURL,allowLoopback = false} = {}) {
    if (this.used) throw fail('pending_login_consumed','Claude authorization code flow already consumed');
    this.used = true;
    const [code,returnedState] = String(pasted).trim().split('#');
    if (!code) throw fail('invalid_argument','Claude authorization code is empty');
    if (returnedState != null && returnedState !== this.#pending.state) throw fail('oauth_state_mismatch','Claude authorization state did not match');
    if (this.#pending.expires_at <= this.clock()*1000) throw fail('pending_login_expired','Pending Claude authorization expired');
    const response = await this.manager.exchange('claude',{grant_type:'authorization_code',code,state:returnedState ?? this.#pending.state,
      client_id:CLAUDE_CLIENT_ID,redirect_uri:CLAUDE_REDIRECT_URI,code_verifier:this.#pending.code_verifier});
    const scopes = response.scope == null ? (this.mode === 'setup-token' ? CLAUDE_INFERENCE_SCOPE : CLAUDE_SCOPES).split(' ') : typeof response.scope === 'string' ? response.scope.split(/\s+/).filter(Boolean) : null;
    if (!scopes) throw fail('oauth_response_invalid','Claude response has invalid granted scopes',502);
    const oauth = {accessToken:response.access_token,scopes,subscriptionType:response.subscription_type ?? null,rateLimitTier:response.rate_limit_tier ?? null};
    if (response.refresh_token) oauth.refreshToken = response.refresh_token;
    if (response.expires_in != null) oauth.expiresAt = this.clock()*1000+response.expires_in*1000;
    if (response.refresh_token_expires_in != null) {
      if (!Number.isSafeInteger(response.refresh_token_expires_in) || response.refresh_token_expires_in < 0 || !Number.isSafeInteger(this.clock()*1000+response.refresh_token_expires_in*1000)) throw fail('oauth_response_invalid','Claude refresh expiry is invalid',502);
      oauth.refreshTokenExpiresAt = this.clock()*1000+response.refresh_token_expires_in*1000;
    }
    const document = {claudeAiOauth:oauth};
    const parsed = parseCredentialDocument('claude',document);
    const stage = join(dataDir,'auth-import-candidates',randomUUID().replaceAll('-',''));
    await atomicWrite(join(stage,'claude','.credentials.json'),JSON.stringify(document,null,2)+'\n');
    let accepted = false;
    try {
      const models = acceptedModels(await validateCatalog({provider:'claude',token:parsed.token,fetch:this.manager.fetch,baseURL:catalogBaseURL,allowLoopback}));
      const report = await installAcceptedDocument({provider:'claude',document,destinationHome:this.home,dataDir,models});
      accepted = true;
      return report;
    } catch (error) {
      // A successfully exchanged rotating chain is retained in its durable stage
      // when catalog/promotion fails. No Rust resume parity is implied.
      error.transaction_id = stage.split('/').at(-1);
      throw error;
    } finally { if (accepted) await rm(stage,{recursive:true,force:true}); }
  }
}

export async function executeAuthOperation({name,options = {},core,config = core?.config ?? {},env = {},fetch = globalThis.fetch,clockSeconds = core?.clock ?? (() => Math.floor(Date.now()/1000)),oauth = {}} = {}) {
  if (!['auth.import','auth.claude','auth.codex'].includes(name)) throw fail('native_unsupported','Native OAuth operation is not implemented',501);
  if (options.router || options.url || options.target) throw fail('native_unsupported','Native local credential adoption does not support remote deployment targets',501);
  if (options.all || options.resume || options.force || options.clear || options.port || options.agent || options.device) throw fail('native_unsupported','Native OAuth does not implement bulk, rotating transaction resume, forced adoption or credential withdrawal',501);
  const provider = subscriptionProvider(name === 'auth.import' ? options.provider : name.slice(5));
  const home = options.home ?? (provider === 'claude' ? config.claude_code_home ?? env.CLAUDE_CODE_HOME : config.codex_home ?? env.CODEX_HOME);
  if (!home) throw fail('invalid_argument','Native OAuth requires an explicit destination credential home');
  const sourceHome = options.dir ?? options.from_claude_home ?? options.from_codex_home;
  const manager = new OAuthManager({fetch,clock:clockSeconds,...oauth});
  if (name === 'auth.import' || sourceHome != null) {
    if (!sourceHome) throw fail('native_unsupported','Native import requires an explicit source directory; platform keychain defaults are not implemented',501);
    return importCredential({provider,sourceHome,destinationHome:home,dataDir:config.data_dir,ifAbsent:options.if_absent,snapshot:options.snapshot,fetch,clock:clockSeconds,...oauth});
  }
  if (name === 'auth.codex') throw fail('native_unsupported','Native Codex browser/device authorization is not implemented; use an explicit validated file import',501);
  if (options.flow && !['auto','code'].includes(options.flow)) throw fail('native_unsupported','Native Claude authorization supports the code flow',501);
  const loginOptions = {home,mode:options.mode,manager,clock:clockSeconds,...oauth};
  if (!options.code) { const login = await ClaudeLogin.begin(loginOptions); return {output:[login.authorizationURL()]}; }
  const login = await ClaudeLogin.resume(loginOptions);
  const result = await login.complete(options.code,{dataDir:config.data_dir,...oauth});
  return {output:[`Claude authorization ${result.results[0].outcome}.`]};
}
