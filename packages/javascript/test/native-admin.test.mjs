import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRouterCore } from '../native/core.mjs';
const secret = 'native-two-phase-admin-independent-signing-authority';
async function fixture(t,{storage_policy = 'memory',...extra} = {}) {
  const home = await mkdtemp(join(tmpdir(),'router-native-admin-')); t.after(() => rm(home,{recursive:true,force:true}));
  let now = 1000;
  const config = {token_secret:secret,data_dir:home,storage_policy,...extra};
  const core = await createRouterCore({config,env:{},clock:() => now});
  return {core,config,home,advance:seconds => {now+=seconds;},reopen:() => createRouterCore({config,env:{},clock:() => now})};
}
test('admin candidates remain revoked until proof of possession and confirmed claim retires older admins',async t => {
  const {core} = await fixture(t), old = await core.tokens.issue({ttl_hours:1,scope:'admin'});
  const candidate = await core.admin.beginWithTtl(2);
  assert.equal((await core.admin.status()).bootstrap_open,true);
  await assert.rejects(core.authenticate(candidate.token,{admin:true}),error => error.code === 'revoked');
  await assert.rejects(core.admin.confirm(candidate.claim_id,'wrong'),error => error.status === 401);
  await assert.rejects(core.admin.confirm('wrong',candidate.token),error => error.status === 400);
  await core.admin.confirm(candidate.claim_id,candidate.token);
  assert.equal((await core.authenticate(candidate.token,{admin:true})).sub,(await core.admin.status()).token_id);
  assert.equal((await core.admin.status()).credential_kind,'jwt');
  assert.equal(await core.admin.verify(candidate.token),true);
  await assert.rejects(core.authenticate(old.token,{admin:true}),error => error.code === 'revoked');
  await assert.rejects(core.admin.beginWithTtl(1),error => error.status === 409);
});
test('only the latest candidate can confirm and expiry leaves bootstrap open',async t => {
  const {core,advance} = await fixture(t), first = await core.admin.beginWithTtl(1), second = await core.admin.beginWithTtl(1);
  await assert.rejects(core.admin.confirm(first.claim_id,first.token),error => error.status === 400);
  advance(120); await assert.rejects(core.admin.confirm(second.claim_id,second.token),error => error.status === 400);
  assert.equal((await core.admin.status()).bootstrap_open,true);
  const huge = await core.admin.beginWithTtl(Number.MAX_SAFE_INTEGER); assert.equal(huge.ttl_hours,8760);
});
test('claimed JWT survives restart without storing bearer, rotates and stays revoked or expired',async t => {
  const {core,home,reopen,advance} = await fixture(t,{storage_policy:'text'}), candidate = await core.admin.beginWithTtl(1);
  await core.admin.confirm(candidate.claim_id,candidate.token);
  const persisted = await readFile(join(home,'admin-claim.json'),'utf8');
  assert.ok(!persisted.includes(candidate.token)); assert.ok(persisted.includes('token_id'));
  const fresh = await reopen(); assert.equal(await fresh.admin.verify(candidate.token),true);
  const replacement = await fresh.admin.rotate(candidate.token,2); assert.equal(await core.admin.verify(candidate.token),false);
  assert.equal(await core.admin.verify(replacement.token),true);
  await fresh.tokens.revoke(replacement.token_id); assert.equal(await fresh.admin.verify(replacement.token),false);
  advance(10000); assert.equal(await fresh.admin.verify(replacement.token),false);
});
test('environment administrator closes bootstrap and anonymous management requires explicit opt-out',async t => {
  const {core} = await fixture(t,{token_admin_key:'independent-environment-admin'});
  assert.equal((await core.admin.status()).credential_kind,'environment');
  await assert.rejects(core.admin.beginWithTtl(),error => error.status === 409);
  assert.equal((await core.authenticate('independent-environment-admin',{admin:true})).is_admin,true);
  assert.equal((await core.authenticate('independent-environment-admin',{admin:true})).sub,undefined);
  await assert.rejects(core.authenticate(undefined,{admin:true}));
  const other = await fixture(t,{allow_anonymous_admin:true}); assert.equal((await other.core.authenticate(undefined,{admin:true})).is_admin,true);
});
test('legacy opaque claim migrates to revocable admin JWT',async t => {
  const {core,home} = await fixture(t,{storage_policy:'text'}), bearer = 'la_admin_independent_legacy_value';
  const {createHash} = await import('node:crypto');
  await writeFile(join(home,'admin-claim.json'),JSON.stringify({token_sha256:createHash('sha256').update(bearer).digest('hex'),claimed_at:900}));
  assert.equal(await core.admin.verify(bearer),true);
  const result = await core.admin.rotate(bearer,1); assert.ok(result.token.startsWith('la_sk_')); assert.equal(await core.admin.verify(bearer),false);
});
test('run lease can recover heartbeat outage but cannot promote ordinary, revoked or expired records',async t => {
  const {core,advance} = await fixture(t), ordinary = await core.tokens.issue({ttl_hours:1}), ephemeral = await core.tokens.issue({ttl_hours:1,ephemeral:true,run_lease_seconds:120});
  await assert.rejects(core.tokens.renewRunLease(ordinary.id),error => error.code === 'invalid_token');
  advance(200); assert.equal(await core.tokens.renewRunLease(ephemeral.id),1320);
  await core.tokens.revoke(ephemeral.id); await assert.rejects(core.tokens.renewRunLease(ephemeral.id));
  const short = await core.tokens.issue({ttl_hours:1,ephemeral:true,run_lease_seconds:120}); advance(3600); await assert.rejects(core.tokens.renewRunLease(short.id));
});
test('native resource admission consumes request quota exactly once and token settlement does not consume another request',async t => {
  const {core} = await fixture(t), issued = await core.tokens.issue({ttl_hours:1,max_requests:1,max_tokens:20});
  await core.tokens.enforceRequestBudget(issued.id); await core.tokens.recordUsage(issued.id,5);
  assert.equal((await core.tokens.get(issued.id)).used_requests,1); assert.equal((await core.tokens.get(issued.id)).used_tokens,5);
  await assert.rejects(core.tokens.enforceRequestBudget(issued.id),error => error.status === 429);
});
