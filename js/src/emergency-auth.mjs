import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {normalizeManagementPeer} from './management-access.mjs';

const requestOutcome = new AsyncLocalStorage();
const truthy = value => ['1','true','yes','on'].includes(String(value ?? '').trim().toLowerCase());
const failure = message => Object.assign(new Error(message),{code:'invalid_emergency_config',status:400});
const clientNames = new Set(['claude','codex','cursor','gemini','grok','opencode','qwen','agent']);
const aliases = {'claude-code':'claude','cursor-agent':'cursor','gemini-cli':'gemini','grok-cli':'grok','qwen-code':'qwen'};
const clientKind = value => {const name=String(value ?? '').trim().toLowerCase();return aliases[name] ?? (clientNames.has(name) ? name : null);};
export const isSyntheticTokenId = id => typeof id === 'string' && id.startsWith('emergency-bypass-');
export const tokenFingerprint = token => createHash('sha256').update(token).digest('hex').slice(0,12);
export function unverifiedPayload(token) {
  try {
    const part=token.replace(/^(la_sk_|at-)/,'').split('.')[1];
    if (!part || part.length > 65536 || !/^[A-Za-z0-9_-]+={0,2}$/.test(part)) return null;
    const payload=JSON.parse(Buffer.from(part,'base64url').toString('utf8'));
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
  } catch {return null;}
}
export const withAuthenticationScope = operation => requestOutcome.run({counted:false},operation);
export function firstAuthenticationOutcome() {const scope=requestOutcome.getStore();if (!scope) return true;const first=!scope.counted;scope.counted=true;return first;}
export function diagnosticReason(error) {
  return ({invalid_token:'malformed',not_yet_valid:'malformed',admin_required:'insufficient_scope',
    request_limit_exceeded:'request_budget',token_limit_exceeded:'token_budget',rate_limit_exceeded:'rate_limit',
    model_policy_unavailable:'model_policy',model_not_allowed:'model_policy'})[error?.code] ??
    (['invalid_prefix','signature_invalid','issuer_secret_unset','expired','revoked','missing_record','binding_mismatch','not_found','missing_credential'].includes(error?.code) ? error.code : 'storage');
}
export class AuthenticationDiagnostics {
  constructor({clock=()=>Math.floor(Date.now()/1000)}={}) {this.clock=clock;this.counts=new Map();this.recent=[];}
  record(reason,token) {
    this.counts.set(reason,(this.counts.get(reason) ?? 0)+1);
    const value={at:this.clock(),reason};
    if (typeof token === 'string' && token) {
      value.fingerprint=tokenFingerprint(token);
      const subject=unverifiedPayload(token)?.sub;
      if (typeof subject === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(subject)) value.token_id=subject.toLowerCase();
    }
    this.recent.push(value);if (this.recent.length > 64) this.recent.shift();
  }
  recordOutcome(reason,token) {if (firstAuthenticationOutcome()) this.record(reason,token);}
  snapshot() {return {failures_by_reason:Object.fromEntries([...this.counts].sort()),recent_failures:this.recent.slice().reverse().map(value=>({...value}))};}
  renderPrometheus() {
    const rows=[...this.counts].sort().map(([reason,count])=>`link_assistant_auth_failures_total{reason="${reason}"} ${count}`);
    return '# HELP link_assistant_auth_failures_total Router token authentication failures by reason.\n# TYPE link_assistant_auth_failures_total counter\n'+(rows.length ? rows.join('\n') : 'link_assistant_auth_failures_total 0')+'\n';
  }
}
export function normalizeEmergencyConfig(input={},env={}) {
  const duration=Number(input.emergency_duration_minutes ?? input.emergency?.duration_minutes ?? env.EMERGENCY_DURATION_MINUTES ?? 60);
  const enabled=truthy(input.emergency_accept_any_token ?? input.emergency?.enabled ?? env.EMERGENCY_ACCEPT_ANY_TOKEN);
  const config={enabled,allow_non_loopback:truthy(input.emergency_allow_non_loopback ?? input.emergency?.allow_non_loopback ?? env.EMERGENCY_ALLOW_NON_LOOPBACK),duration_minutes:duration};
  if (enabled && (!Number.isSafeInteger(duration) || duration < 1 || duration > 1440)) throw failure('Emergency duration must be between 1 and 1440 minutes');
  return config;
}
export class EmergencyAuthentication {
  constructor({config={},clock=()=>Math.floor(Date.now()/1000)}={}) {
    this.clock=clock;this.config=config;this.until=0;this.bypassed=0;this.reasons=new Map();
  }
  checkListeners(listeners) {
    if (!this.config.enabled) return;
    if (!Number.isSafeInteger(this.config.duration_minutes) || this.config.duration_minutes < 1 || this.config.duration_minutes > 1440) throw failure('Emergency duration must be between 1 and 1440 minutes');
    const loopback=address=>{const host=typeof address === 'string' ? address : address.address ?? address.host;if (host === 'localhost') return true;try {const peer=normalizeManagementPeer(host);return peer === '::1' || peer.startsWith('127.');} catch {return false;}};
    if (!this.config.allow_non_loopback && listeners.some(address=>!loopback(address))) throw failure('Emergency non-loopback listeners require explicit acknowledgement');
  }
  start(listeners) {this.checkListeners(listeners);if (this.config.enabled) this.until=this.clock()+this.config.duration_minutes*60;}
  activeUntil() {return this.until > this.clock() ? this.until : null;}
  isActive() {return this.activeUntil() != null;}
  disable() {const active=this.isActive();this.until=0;return active;}
  status() {const expiry=this.activeUntil();return {active:expiry != null,...(expiry != null ? {expires_at:expiry} : {}),bypassed_requests:this.bypassed,bypassed_by_reason:Object.fromEntries([...this.reasons].sort())};}
  claims(token,headers={}) {
    const get=name=>typeof headers.get === 'function' ? headers.get(name) : headers[name] ?? headers[name.toLowerCase()];
    const payload=unverifiedPayload(token),agent=String(get('user-agent') ?? '').toLowerCase();
    const inferred=clientKind(get('x-link-assistant-client')) ?? (agent.startsWith('claude') ? 'claude' : agent.startsWith('codex') ? 'codex' : agent.startsWith('opencode/') ? 'opencode' : agent.startsWith('grok') ? 'grok' :
      get('x-goog-api-client') || get('x-goog-api-key') ? 'gemini' : get('x-stainless-package-version') ? 'qwen' : token.startsWith('at-') ? 'codex' : null);
    const client=inferred ?? clientKind(payload?.client_kind),fingerprint=tokenFingerprint(token),now=this.clock();
    return {sub:`emergency-bypass-${fingerprint}`,iat:now,exp:now+60,label:'emergency-bypass',scope:'',github_repos:[],
      client_kind:client,principal_id:client ? typeof payload?.principal_id === 'string' && payload.principal_id.trim() ? payload.principal_id : `emergency-${fingerprint}` : null,
      account:null,record:null,is_admin:false};
  }
  admit(token,headers,reason,count = firstAuthenticationOutcome()) {
    if (count) {this.bypassed++;this.reasons.set(reason,(this.reasons.get(reason) ?? 0)+1);}
    return this.claims(token,headers);
  }
  renderPrometheus() {
    const rows=[...this.reasons].sort().map(([reason,count])=>`link_assistant_emergency_auth_bypassed_total{reason="${reason}"} ${count}`);
    return '# HELP link_assistant_emergency_auth_active 1 while the emergency any-token mode is on.\n# TYPE link_assistant_emergency_auth_active gauge\n'+
      `link_assistant_emergency_auth_active ${Number(this.isActive())}\n`+
      '# HELP link_assistant_emergency_auth_bypassed_total Requests admitted by the emergency any-token mode, by the check they bypassed.\n# TYPE link_assistant_emergency_auth_bypassed_total counter\n'+
      (rows.length ? rows.join('\n') : 'link_assistant_emergency_auth_bypassed_total 0')+'\n';
  }
}
