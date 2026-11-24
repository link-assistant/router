// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=30fa896de2ce108ee600e33da1e20a71bcad4ae2af2f1cd7c29df36c8ad3f191; dynamic any annotations are explicit draft gaps.
import { isIP } from 'node:net';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { atomicWrite, encodeLino, serialized } from "./storage.js";
import { RouterError } from "./tokens.js";
export function normalizeManagementPeer(peer?: any): string {
    if (typeof peer !== 'string' || !isIP(peer))
        throw new (RouterError as any)('permission_error', 'Management requires a valid socket peer', 403);
    if (isIP(peer) === 4)
        return peer;
    const normalized: string = new (URL as any)(`http://[${peer}]/`).hostname.slice(1, -1);
    const mapped: any = /^::ffff:([0-9a-f]+):([0-9a-f]+)$/i.exec(normalized);
    if (!mapped)
        return normalized;
    const high: number = (Number as any).parseInt((mapped as any)[1], 16), low: number = (Number as any).parseInt((mapped as any)[2], 16);
    return `${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`;
}
const loopback: any = (peer?: any): boolean => peer === '::1' || /^127\./.test(peer);
export class ManagementAccess {
    declare attempts: any;
    declare clock: any;
    declare lastPersistenceError: any;
    declare maxClients: any;
    declare monotonic: any;
    declare path: any;
    declare persistent: any;
    declare policy: any;
    constructor({ config = {}, dataDir, persistent = true, clock = (): number => (Math as any).floor((Date as any).now() / 1000), monotonic = (): number => performance.now() / 1000, maxClients = 4096 }: any = {}) {
        this.policy = { allow_remote: false, lockout_failures: 5, lockout_secs: 1800, exempt_loopback: true, ...config };
        for (const key of ['lockout_failures', 'lockout_secs'] as any)
            if (!(Number as any).isSafeInteger((this.policy as any)[key]) || (this.policy as any)[key] < 0)
                throw new (RouterError as any)('invalid_config', `management ${key} must be nonnegative`);
        this.path = dataDir ? join(dataDir, 'management-lockouts.lenv') : null;
        this.persistent = persistent;
        this.clock = clock;
        this.monotonic = monotonic;
        this.maxClients = maxClients;
        this.attempts = new (Map as any)();
        this.lastPersistenceError = null;
    }
    config(): any { return { ...this.policy }; }
    exempt(peer?: any): boolean { return !this.policy.lockout_failures || !this.policy.lockout_secs || this.policy.exempt_loopback && loopback(peer); }
    remaining(entry?: any, now: any = this.monotonic()): null | number {
        if (entry?.banned_at == null)
            return null;
        const seconds: number = this.policy.lockout_secs - (Math as any).max(0, now - entry.banned_at);
        return seconds > 0 ? (Math as any).ceil(seconds) : null;
    }
    expired(entry?: any, now?: any): boolean { return entry.banned_at == null ? (Math as any).max(0, now - entry.last_failure) >= this.policy.lockout_secs : this.remaining(entry, now) == null; }
    check(peer?: any): null | number {
        (peer as any) = normalizeManagementPeer(peer);
        if (this.exempt(peer))
            return null;
        const now: number = this.monotonic(), entry: any = this.attempts.get(peer);
        if (entry && this.expired(entry, now)) {
            this.attempts.delete(peer);
            if (entry.banned_at != null)
                this.save().catch((error?: any): void => { this.lastPersistenceError = error.code ?? 'storage_failed'; });
        }
        const existing: any = this.attempts.get(peer);
        if (existing)
            return this.remaining(existing, now);
        if (this.attempts.size >= this.maxClients) {
            for (const [ip, held] of this.attempts as any)
                if (this.expired(held, now))
                    this.attempts.delete(ip);
            this.save().catch((error?: any): void => { this.lastPersistenceError = error.code ?? 'storage_failed'; });
            if (this.attempts.size >= this.maxClients)
                return 1;
        }
        return null;
    }
    async failure(peer?: any): Promise<any> {
        (peer as any) = normalizeManagementPeer(peer);
        if (this.exempt(peer))
            return null;
        const now: number = this.monotonic();
        if (!this.attempts.has(peer) && this.attempts.size >= this.maxClients)
            return null;
        const entry: any = this.attempts.get(peer) ?? { failures: 0, last_failure: now, banned_at: null, expires_at: 0 };
        if (this.expired(entry, now)) {
            entry.failures = 0;
            entry.banned_at = null;
        }
        if (entry.banned_at != null)
            return null;
        entry.failures = (Math as any).min(0xffffffff, entry.failures + 1);
        entry.last_failure = now;
        this.attempts.set(peer, entry);
        if (entry.failures < this.policy.lockout_failures)
            return null;
        entry.banned_at = now;
        entry.expires_at = this.clock() + this.policy.lockout_secs;
        await this.save().catch((error?: any): void => { this.lastPersistenceError = error.code ?? 'storage_failed'; });
        return { client_ip: peer, expires_at: entry.expires_at };
    }
    success(peer?: any): void { (peer as any) = normalizeManagementPeer(peer); if (this.attempts.get(peer)?.banned_at == null)
        this.attempts.delete(peer); }
    activeBans(): any {
        const now: number = this.monotonic();
        for (const [peer, entry] of this.attempts as any)
            if (this.expired(entry, now))
                this.attempts.delete(peer);
        return [...this.attempts].filter(([, entry]: any): boolean => entry.banned_at != null).map(([peer, entry]: any): any => ({ client_ip: peer, expires_at: entry.expires_at })).sort((left?: any, right?: any): any => (left.client_ip.localeCompare as any)(right.client_ip));
    }
    async save(): Promise<any> {
        if (!this.persistent || !this.path)
            return;
        return serialized(this.path, async (): Promise<void> => {
            const bans: any = [...this.attempts].filter(([, entry]: any): boolean => entry.banned_at != null).map(([peer, entry]: any): any => ({ client_ip: peer, expires_at: entry.expires_at }));
            if (bans.length)
                await atomicWrite(this.path, encodeLino(bans));
            else
                try {
                    await unlink(this.path);
                }
                catch (error: any) {
                    if (error.code !== 'ENOENT')
                        throw error;
                }
        });
    }
}
