import { isIP } from 'node:net';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { atomicWrite,encodeLino,serialized } from './storage.mjs';
import { RouterError } from './tokens.mjs';

export function normalizeManagementPeer(peer) {
  if (typeof peer !== 'string' || !isIP(peer)) throw new RouterError('permission_error','Management requires a valid socket peer',403);
  if (isIP(peer) === 4) return peer;
  const normalized = new URL(`http://[${peer}]/`).hostname.slice(1,-1);
  const mapped = /^::ffff:([0-9a-f]+):([0-9a-f]+)$/i.exec(normalized);
  if (!mapped) return normalized;
  const high = Number.parseInt(mapped[1],16), low = Number.parseInt(mapped[2],16);
  return `${high>>>8}.${high&255}.${low>>>8}.${low&255}`;
}
const loopback = peer => peer === '::1' || /^127\./.test(peer);
/** Management bans use monotonic time; disk contains diagnostics only. */
export class ManagementAccess {
  constructor({config = {},dataDir,persistent = true,clock = () => Math.floor(Date.now()/1000),monotonic = () => performance.now()/1000,maxClients = 4096} = {}) {
    this.policy = {allow_remote:false,lockout_failures:5,lockout_secs:1800,exempt_loopback:true,...config};
    for (const key of ['lockout_failures','lockout_secs']) if (!Number.isSafeInteger(this.policy[key]) || this.policy[key] < 0) throw new RouterError('invalid_config',`management ${key} must be nonnegative`);
    this.path = dataDir ? join(dataDir,'management-lockouts.lenv') : null;
    this.persistent = persistent; this.clock = clock; this.monotonic = monotonic; this.maxClients = maxClients;
    this.attempts = new Map(); this.lastPersistenceError = null;
  }
  config() { return {...this.policy}; }
  exempt(peer) { return !this.policy.lockout_failures || !this.policy.lockout_secs || this.policy.exempt_loopback && loopback(peer); }
  remaining(entry,now = this.monotonic()) {
    if (entry?.banned_at == null) return null;
    const seconds = this.policy.lockout_secs-Math.max(0,now-entry.banned_at);
    return seconds > 0 ? Math.ceil(seconds) : null;
  }
  expired(entry,now) { return entry.banned_at == null ? Math.max(0,now-entry.last_failure) >= this.policy.lockout_secs : this.remaining(entry,now) == null; }
  check(peer) {
    peer = normalizeManagementPeer(peer); if (this.exempt(peer)) return null;
    const now = this.monotonic(), entry = this.attempts.get(peer);
    if (entry && this.expired(entry,now)) {
      this.attempts.delete(peer); if (entry.banned_at != null) this.save().catch(error => {this.lastPersistenceError = error.code ?? 'storage_failed';});
    }
    const existing = this.attempts.get(peer);
    if (existing) return this.remaining(existing,now);
    if (this.attempts.size >= this.maxClients) {
      for (const [ip,held] of this.attempts) if (this.expired(held,now)) this.attempts.delete(ip);
      this.save().catch(error => {this.lastPersistenceError = error.code ?? 'storage_failed';});
      if (this.attempts.size >= this.maxClients) return 1;
    }
    return null;
  }
  async failure(peer) {
    peer = normalizeManagementPeer(peer); if (this.exempt(peer)) return null;
    const now = this.monotonic();
    if (!this.attempts.has(peer) && this.attempts.size >= this.maxClients) return null;
    const entry = this.attempts.get(peer) ?? {failures:0,last_failure:now,banned_at:null,expires_at:0};
    if (this.expired(entry,now)) {entry.failures = 0; entry.banned_at = null;}
    if (entry.banned_at != null) return null;
    entry.failures = Math.min(0xffffffff,entry.failures+1); entry.last_failure = now; this.attempts.set(peer,entry);
    if (entry.failures < this.policy.lockout_failures) return null;
    entry.banned_at = now; entry.expires_at = this.clock()+this.policy.lockout_secs;
    await this.save().catch(error => {this.lastPersistenceError = error.code ?? 'storage_failed';});
    return {client_ip:peer,expires_at:entry.expires_at};
  }
  success(peer) { peer = normalizeManagementPeer(peer); if (this.attempts.get(peer)?.banned_at == null) this.attempts.delete(peer); }
  activeBans() {
    const now = this.monotonic(); for (const [peer,entry] of this.attempts) if (this.expired(entry,now)) this.attempts.delete(peer);
    return [...this.attempts].filter(([,entry]) => entry.banned_at != null).map(([peer,entry]) => ({client_ip:peer,expires_at:entry.expires_at})).sort((left,right) => left.client_ip.localeCompare(right.client_ip));
  }
  async save() {
    if (!this.persistent || !this.path) return;
    return serialized(this.path,async () => {
      const bans = [...this.attempts].filter(([,entry]) => entry.banned_at != null).map(([peer,entry]) => ({client_ip:peer,expires_at:entry.expires_at}));
      if (bans.length) await atomicWrite(this.path,encodeLino(bans));
      else try { await unlink(this.path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    });
  }
}
