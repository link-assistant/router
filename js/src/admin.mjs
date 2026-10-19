import { randomUUID,createHash,timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicWrite,decodeLino,encodeLino,readOptional,serialized } from './storage.mjs';
import { rustLockPath,withAdvisoryFileLock } from './file-lock.mjs';
import { RouterError } from './tokens.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
function equal(left,right) { const a = Buffer.from(left ?? ''), b = Buffer.from(right ?? ''); return a.length === b.length && timingSafeEqual(a,b); }
const ttl = hours => Number.isSafeInteger(hours) && hours > 0 ? Math.min(hours,8760) : 8760;
const claimed = file => Boolean(file.token_id || file.token_sha256);
const refuse = (code,message,status) => { throw new RouterError(code,message,status); };

/** Rust's two-phase claim: mint revoked, confirm possession, then activate. */
export class AdminClaim {
  constructor(core,{candidateTtl = 120,env = core.env} = {}) {
    this.core = core; this.path = join(core.config.data_dir,'admin-claim.json');
    this.persistent = core.config.storage_policy !== 'memory'; this.candidateTtl = candidateTtl;
    this.envKey = core.config.token_admin_key ?? core.config.admin_key ?? env.TOKEN_ADMIN_KEY ?? null;
    this.file = {}; this.candidate = null; this.queue = {};
  }
  async load() {
    if (this.persistent) {
      const source = await readOptional(this.path,null);
      if (source != null) {
        try {
          const parsed = source.trimStart().startsWith('{') ? JSON.parse(source) : decodeLino(source);
          if (parsed && claimed(parsed)) this.file = parsed;
        } catch { /* Rust loads invalid legacy claim documents as unclaimed. */ }
      }
    }
    if (this.candidate && this.candidate.expires_at <= this.core.clock()) this.candidate = null;
    return this.file;
  }
  async transaction(operation) {
    return serialized(this.queue,() => this.persistent ? withAdvisoryFileLock(rustLockPath(this.path),async () => { await this.load(); return operation(); }) : operation());
  }
  async persist(file) { if (this.persistent) await atomicWrite(this.path,encodeLino(file)); this.file = file; }
  status() {
    return this.transaction(async () => {
      await this.load(); const provisioned = Boolean(this.envKey), active = provisioned || claimed(this.file);
      return {claimed:active,bootstrap_open:!active,provisioned_by_environment:provisioned,candidate_pending:Boolean(this.candidate),
        claimed_at:this.file.claimed_at ?? null,credential_kind:provisioned ? 'environment' : this.file.token_id ? 'jwt' : this.file.token_sha256 ? 'legacy_opaque' : 'none',
        ...(this.file.token_id ? {token_id:this.file.token_id} : {})};
    });
  }
  async verify(bearer) {
    if (typeof bearer !== 'string' || !bearer) return false;
    if (this.envKey && equal(this.envKey,bearer)) return true;
    await this.load();
    if (this.file.token_id) {
      try { return (await this.core.tokens.validate(bearer,{admin:true})).sub === this.file.token_id; } catch { return false; }
    }
    return Boolean(this.file.token_sha256 && equal(this.file.token_sha256,digest(bearer)));
  }
  async beginWithTtl(hours) {
    return this.transaction(async () => {
      await this.load();
      if (this.envKey) refuse('already_claimed','An admin credential is provisioned by environment',409);
      if (claimed(this.file)) refuse('already_claimed','Admin is already claimed',409);
      const ttlHours = ttl(hours), issued = await this.core.tokens.issue({scope:'admin',label:'first-visitor-admin',ttl_hours:ttlHours});
      await this.core.tokens.revoke(issued.id);
      const claimId = randomUUID();
      this.candidate = {claim_id:claimId,token_sha256:digest(issued.token),token_id:issued.id,ttl_hours:ttlHours,expires_at:this.core.clock()+this.candidateTtl};
      return {claim_id:claimId,token:issued.token,expires_in_secs:this.candidateTtl,ttl_hours:ttlHours,confirm_url:'/api/management/admin/bootstrap/confirm'};
    });
  }
  async confirm(claimId,bearer) {
    return this.transaction(async () => {
      await this.load();
      if (this.envKey || claimed(this.file)) refuse('already_claimed','Admin bootstrap is closed',409);
      const candidate = this.candidate;
      if (!candidate) refuse('invalid_request_error','No outstanding bootstrap candidate',400);
      if (!equal(candidate.claim_id,claimId)) refuse('invalid_request_error','claim_id does not match the outstanding candidate',400);
      if (typeof bearer !== 'string' || !equal(candidate.token_sha256,digest(bearer))) refuse('authentication_error','Presented token does not match the outstanding candidate',401);
      const file = {token_sha256:'',token_id:candidate.token_id,ttl_hours:candidate.ttl_hours,claimed_at:this.core.clock()};
      await this.persist(file);
      await this.core.tokens.store.transaction(records => {
        const active = records.get(candidate.token_id);
        if (!active) refuse('api_error','Candidate token record is unavailable',500);
        active.revoked = false;
        for (const record of records.values()) if (record.scope === 'admin' && record.id !== active.id) record.revoked = true;
      });
      this.candidate = null;
      return {claimed:true};
    });
  }
  async rotate(bearer,hours) {
    return this.transaction(async () => {
      await this.load();
      if (this.envKey) refuse('already_claimed','Rotate the environment credential at deployment',409);
      if (!claimed(this.file)) refuse('invalid_request_error','No claimed admin credential',400);
      if (!await this.verify(bearer)) refuse('authentication_error','Active admin credential is required',401);
      const ttlHours = hours == null && this.file.ttl_hours > 0 ? this.file.ttl_hours : ttl(hours);
      const issued = this.file.token_id ? await this.core.tokens.rotate(this.file.token_id,{ttl_hours:ttlHours,label:'first-visitor-admin'}) : await this.core.tokens.issue({scope:'admin',label:'first-visitor-admin',ttl_hours:ttlHours});
      await this.persist({token_sha256:'',token_id:issued.id,ttl_hours:ttlHours,claimed_at:this.core.clock()}); this.candidate = null;
      return {token:issued.token,token_id:issued.id,credential_kind:'jwt'};
    });
  }
  async summary() {
    const credentials = this.core.credentialStatus ? await this.core.credentialStatus() : null;
    const version = JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
    return {version,upstream_provider:this.core.config.upstream_provider ?? 'claude',
      upstream_base_url:this.core.config.upstream_base_url ?? 'https://api.anthropic.com',accounts:this.core.accounts.records.size,
      claude_credential:credentials?.credentials?.claude?.path ?? null,subscription:null,login_api_enabled:Boolean(this.core.login),
      admin:await this.status(),management_bans:this.core.managementAccess?.activeBans() ?? [],emergency_auth:this.core.emergency?.status() ?? null};
  }
}
