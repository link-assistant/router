// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=86eeb96cb9090265963f4dff8e21d8fda07b81683f7ff00d8e59a269d2675d27; dynamic any annotations are explicit draft gaps.
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicWrite, decodeLino, encodeLino, readOptional, serialized } from "./storage.js";
import { rustLockPath, withAdvisoryFileLock } from "./file-lock.js";
import { RouterError } from "./tokens.js";
const digest: any = (value?: any): string => createHash('sha256').update(value).digest('hex');
function equal(left?: any, right?: any): boolean { const a: any = (Buffer as any).from(left ?? ''), b: any = (Buffer as any).from(right ?? ''); return a.length === b.length && timingSafeEqual(a, b); }
const ttl: any = (hours?: any): number => (Number as any).isSafeInteger(hours) && hours > 0 ? (Math as any).min(hours, 8760) : 8760;
const claimed: any = (file?: any): boolean => Boolean(file.token_id || file.token_sha256);
const refuse: any = (code?: any, message?: any, status?: any): any => { throw new (RouterError as any)(code, message, status); };
export class AdminClaim {
    declare candidate: any;
    declare candidateTtl: any;
    declare core: any;
    declare envKey: any;
    declare file: any;
    declare path: any;
    declare persistent: any;
    declare queue: any;
    constructor(core: any, { candidateTtl = 120, env = core.env }: any = {}) {
        this.core = core;
        this.path = join(core.config.data_dir, 'admin-claim.json');
        this.persistent = core.config.storage_policy !== 'memory';
        this.candidateTtl = candidateTtl;
        this.envKey = core.config.token_admin_key ?? core.config.admin_key ?? env.TOKEN_ADMIN_KEY ?? null;
        this.file = {};
        this.candidate = null;
        this.queue = {};
    }
    async load(): Promise<any> {
        if (this.persistent) {
            const source: string = await readOptional(this.path, null);
            if (source != null) {
                try {
                    const parsed: any = source.trimStart().startsWith('{') ? (JSON as any).parse(source) : decodeLino(source);
                    if (parsed && claimed(parsed))
                        this.file = parsed;
                }
                catch { }
            }
        }
        if (this.candidate && this.candidate.expires_at <= this.core.clock())
            this.candidate = null;
        return this.file;
    }
    async transaction(operation?: any): Promise<any> {
        return serialized(this.queue, (): any => this.persistent ? withAdvisoryFileLock(rustLockPath(this.path), async (): Promise<any> => { await this.load(); return operation(); }) : operation());
    }
    async persist(file?: any): Promise<void> { if (this.persistent)
        await atomicWrite(this.path, encodeLino(file)); this.file = file; }
    status(): any {
        return this.transaction(async (): Promise<any> => {
            await this.load();
            const provisioned: boolean = Boolean(this.envKey), active: boolean = provisioned || claimed(this.file);
            return { claimed: active, bootstrap_open: !active, provisioned_by_environment: provisioned, candidate_pending: Boolean(this.candidate),
                claimed_at: this.file.claimed_at ?? null, credential_kind: provisioned ? 'environment' : this.file.token_id ? 'jwt' : this.file.token_sha256 ? 'legacy_opaque' : 'none',
                ...(this.file.token_id ? { token_id: this.file.token_id } : {}) };
        });
    }
    async verify(bearer?: any): Promise<boolean> {
        if (typeof bearer !== 'string' || !bearer)
            return false;
        if (this.envKey && equal(this.envKey, bearer))
            return true;
        await this.load();
        if (this.file.token_id) {
            try {
                return (await (this.core.tokens.validate as any)(bearer, { admin: true })).sub === this.file.token_id;
            }
            catch {
                return false;
            }
        }
        return Boolean(this.file.token_sha256 && equal(this.file.token_sha256, digest(bearer)));
    }
    async beginWithTtl(hours?: any): Promise<any> {
        return this.transaction(async (): Promise<any> => {
            await this.load();
            if (this.envKey)
                refuse('already_claimed', 'An admin credential is provisioned by environment', 409);
            if (claimed(this.file))
                refuse('already_claimed', 'Admin is already claimed', 409);
            const ttlHours: number = ttl(hours), issued: any = await (this.core.tokens.issue as any)({ scope: 'admin', label: 'first-visitor-admin', ttl_hours: ttlHours });
            await (this.core.tokens.revoke as any)(issued.id);
            const claimId: string = randomUUID();
            this.candidate = { claim_id: claimId, token_sha256: digest(issued.token), token_id: issued.id, ttl_hours: ttlHours, expires_at: this.core.clock() + this.candidateTtl };
            return { claim_id: claimId, token: issued.token, expires_in_secs: this.candidateTtl, ttl_hours: ttlHours, confirm_url: '/api/management/admin/bootstrap/confirm' };
        });
    }
    async confirm(claimId?: any, bearer?: any): Promise<any> {
        return this.transaction(async (): Promise<any> => {
            await this.load();
            if (this.envKey || claimed(this.file))
                refuse('already_claimed', 'Admin bootstrap is closed', 409);
            const candidate: any = this.candidate;
            if (!candidate)
                refuse('invalid_request_error', 'No outstanding bootstrap candidate', 400);
            if (!equal(candidate.claim_id, claimId))
                refuse('invalid_request_error', 'claim_id does not match the outstanding candidate', 400);
            if (typeof bearer !== 'string' || !equal(candidate.token_sha256, digest(bearer)))
                refuse('authentication_error', 'Presented token does not match the outstanding candidate', 401);
            const file: any = { token_sha256: '', token_id: candidate.token_id, ttl_hours: candidate.ttl_hours, claimed_at: this.core.clock() };
            await this.persist(file);
            await (this.core.tokens.store.transaction as any)((records?: any): void => {
                const active: any = (records.get as any)(candidate.token_id);
                if (!active)
                    refuse('api_error', 'Candidate token record is unavailable', 500);
                active.revoked = false;
                for (const record of records.values() as any)
                    if (record.scope === 'admin' && record.id !== active.id)
                        record.revoked = true;
            });
            this.candidate = null;
            return { claimed: true };
        });
    }
    async rotate(bearer?: any, hours?: any): Promise<any> {
        return this.transaction(async (): Promise<any> => {
            await this.load();
            if (this.envKey)
                refuse('already_claimed', 'Rotate the environment credential at deployment', 409);
            if (!claimed(this.file))
                refuse('invalid_request_error', 'No claimed admin credential', 400);
            if (!await this.verify(bearer))
                refuse('authentication_error', 'Active admin credential is required', 401);
            const ttlHours: any = hours == null && this.file.ttl_hours > 0 ? this.file.ttl_hours : ttl(hours);
            const issued: any = this.file.token_id ? await (this.core.tokens.rotate as any)(this.file.token_id, { ttl_hours: ttlHours, label: 'first-visitor-admin' }) : await (this.core.tokens.issue as any)({ scope: 'admin', label: 'first-visitor-admin', ttl_hours: ttlHours });
            await this.persist({ token_sha256: '', token_id: issued.id, ttl_hours: ttlHours, claimed_at: this.core.clock() });
            this.candidate = null;
            return { token: issued.token, token_id: issued.id, credential_kind: 'jwt' };
        });
    }
    async summary(): Promise<any> {
        const credentials: any = this.core.credentialStatus ? await this.core.credentialStatus() : null;
        const version: any = (JSON as any).parse(await readFile(new (URL as any)('../package.json', import.meta.url), 'utf8')).version;
        return { version, upstream_provider: this.core.config.upstream_provider ?? 'claude',
            upstream_base_url: this.core.config.upstream_base_url ?? 'https://api.anthropic.com', accounts: this.core.accounts.records.size,
            claude_credential: credentials?.credentials?.claude?.path ?? null, subscription: null, login_api_enabled: Boolean(this.core.login),
            admin: await this.status(), management_bans: this.core.managementAccess?.activeBans() ?? [], emergency_auth: this.core.emergency?.status() ?? null };
    }
}
