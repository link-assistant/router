import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRouterCore, TokenManager, MemoryTokenStore, TextTokenStore, createTokenStore, codexTokenAlias } from '../native/core.mjs';
import { encodeLino, decodeLino, encodeTokenRecords, decodeTokenRecords } from '../native/storage.mjs';
import { encryptProviderSecret, decryptProviderSecret, loadConfig } from '../native/config.mjs';
import { validateAccountPolicy } from '../native/accounts.mjs';
const fixture = JSON.parse(await readFile(new URL('../../../parity/fixtures/core/behavior.json',import.meta.url),'utf8'));
const config = extra => ({...fixture,storage_policy:'memory',...extra});
const core = extra => createRouterCore({config:config(extra),env:{},clock:() => fixture.clock});
const rejectsCode = (promise,code) => assert.rejects(promise,error => error.code === code);

async function temporary(t) { const directory = await mkdtemp(join(tmpdir(),'router-native-core-')); t.after(() => rm(directory,{recursive:true,force:true})); return directory; }

test('Rust-compatible JWT carriers, signature, expiry leeway, revocation, admin scope',async () => {
  let now = fixture.clock; const manager = new TokenManager({secret:fixture.token_secret,clock:() => now});
  const issued = await manager.issue({ttl_hours:1,label:'test'});
  assert.equal((await manager.validate(codexTokenAlias(issued.token))).sub,issued.id);
  await rejectsCode(manager.validate(issued.token,{admin:true}),'admin_required');
  const admin = await manager.issue({ttl_hours:1,scope:'admin'});
  assert.equal((await manager.validate(admin.token,{admin:true})).is_admin,true);
  const wrong = new TokenManager({secret:'different',clock:() => now});
  await rejectsCode(wrong.validate(issued.token),'signature_invalid');
  now += 3660; await manager.validate(issued.token); now++;
  await rejectsCode(manager.validate(issued.token),'expired');
  now = fixture.clock; await manager.revoke(issued.id);
  await rejectsCode(manager.validate(issued.token),'revoked');
});
test('unsigned/algorithm-confused token and published sentinel cannot authenticate',async () => {
  const manager = new TokenManager({secret:fixture.token_secret,clock:() => fixture.clock});
  const token = `la_sk_${Buffer.from(JSON.stringify({alg:'none'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:'fake',exp:fixture.clock+100,iat:fixture.clock})).toString('base64url')}.AA`;
  await rejectsCode(manager.validate(token),'invalid_token');
  for (const secret of ['', '\0placeholder','unused-by-auth']) await rejectsCode(new TokenManager({secret}).issue({ttl_hours:1}),'issuer_secret_unset');
});
test('durable exact model authority fails closed for untracked and wrong model selectors',async () => {
  const manager = new TokenManager({secret:fixture.token_secret,clock:() => fixture.clock});
  const issued = await manager.issue({ttl_hours:1,model_policy:{allowed_models:['model-a']}});
  await manager.validate(issued.token,{model:'model-a'});
  await rejectsCode(manager.validate(issued.token,{model:'MODEL-A'}),'model_not_allowed');
  await manager.store.delete(issued.id);
  await manager.validate(issued.token);
  await rejectsCode(manager.validate(issued.token,{model:'model-a'}),'model_policy_unavailable');
});
test('client/principal and repository security boundaries',async () => {
  const manager = new TokenManager({secret:fixture.token_secret,clock:() => fixture.clock});
  await rejectsCode(manager.issue({ttl_hours:1,client_kind:'codex',principal_id:'primary',account:'other'}),'invalid_argument');
  const issued = await manager.issue({ttl_hours:1,client_kind:'codex',principal_id:'primary',account:'primary',github_repos:['Owner/Repo']});
  await manager.validate(issued.token,{repository:'owner/repo'});
  await rejectsCode(manager.validate(issued.token,{repository:'other/repo'}),'repository_not_allowed');
  await manager.store.transaction(records => { records.get(issued.id).principal_id = 'attacker'; });
  await rejectsCode(manager.validate(issued.token),'binding_mismatch');
});
test('atomic concurrent admission respects request, reserved-token and minute limits',async () => {
  const manager = new TokenManager({secret:fixture.token_secret,clock:() => fixture.clock});
  const issued = await manager.issue({ttl_hours:1,max_requests:10,max_tokens:7});
  const admissions = await Promise.all(Array.from({length:20},() => manager.admit(issued.id,2)));
  assert.equal(admissions.filter(v => v === 'admitted').length,3);
  assert.equal((await manager.get(issued.id)).reserved_tokens,6);
  await manager.settle(issued.id,2,3);
  assert.equal(await manager.admit(issued.id,0),'token_limit_exceeded');
  await manager.settle(issued.id,4,0);
  assert.equal(await manager.admit(issued.id,4),'admitted');
  const capped = await manager.issue({ttl_hours:1,max_requests:2});
  const results = await Promise.all(Array.from({length:30},() => manager.admit(capped.id)));
  assert.equal(results.filter(v => v === 'admitted').length,2);
});
test('fixed-minute window and sliding expiry follow injected time',async () => {
  let now = fixture.clock; const manager = new TokenManager({secret:fixture.token_secret,clock:() => now});
  const issued = await manager.issue({ttl_hours:1,rate_limit_per_minute:1,sliding_window_seconds:3600});
  assert.equal(await manager.admit(issued.id),'admitted');
  now += 59; assert.equal(await manager.admit(issued.id),'rate_limit_exceeded');
  now++; assert.equal(await manager.admit(issued.id),'admitted');
  now += 3500; assert.equal(await manager.admit(issued.id),'admitted');
  now += 101; assert.ok(now > issued.record.expires_at+60);
  await manager.validate(issued.token);
});
test('fixture budget arithmetic remains exhausted at zero reservation',async () => {
  const manager = new TokenManager({secret:fixture.token_secret,clock:() => fixture.clock});
  for (const row of fixture.budget_cases) {
    const issued = await manager.issue({ttl_hours:1,...(row.max >= 0 ? {max_tokens:row.max}: {})});
    await manager.store.transaction(records => Object.assign(records.get(issued.id),{used_tokens:row.used,reserved_tokens:row.reserved}));
    assert.equal(await manager.admit(issued.id,row.reserve) === 'admitted',row.admitted);
  }
});
test('Rust readable Links Notation strings, nested arrays and token metadata round trip',async () => {
  const values = {type:'RouterState',one:'"both \'quotes"',two:'back\\slash',three:'new\nline',four:'return\r%line',array:[1,true,null,{id:'x'}]};
  assert.deepEqual(JSON.parse(JSON.stringify(decodeLino(encodeLino(values)))),values);
  const manager = new TokenManager({secret:fixture.token_secret,clock:() => fixture.clock});
  const issued = await manager.issue({ttl_hours:1,label:'hi\n"quoted"',github_repos:['a/b'],model_policy:{allowed_models:['model-a']}});
  assert.deepEqual(decodeTokenRecords(encodeTokenRecords([issued.record])),[issued.record]);
  assert.throws(() => decodeTokenRecords('(\n type "Other"\n subtype "TokenStore"\n value ()\n)'));
});
test('text persistence survives reopening without storing JWT and coordinates independent instances',async t => {
  const directory = await temporary(t), path = join(directory,'tokens.lino');
  const first = new TokenManager({secret:fixture.token_secret,store:new TextTokenStore(path),clock:() => fixture.clock});
  const issued = await first.issue({ttl_hours:1,max_requests:2});
  const second = new TokenManager({secret:fixture.token_secret,store:new TextTokenStore(path),clock:() => fixture.clock});
  const results = await Promise.all(Array.from({length:20},(_,i) => (i%2 ? first:second).admit(issued.id)));
  assert.equal(results.filter(r => r === 'admitted').length,2);
  await second.revoke(issued.id); await rejectsCode(first.validate(issued.token),'revoked');
  const text = await readFile(path,'utf8'); assert.ok(!text.includes(issued.token)); assert.ok(text.includes('TokenRecord'));
  assert.equal((await stat(path)).mode & 0o777,0o600);
  assert.throws(() => createTokenStore({storage_policy:'both'}),e => e.code === 'native_unsupported');
});
test('provider store uses Rust AES-GCM nonce/ciphertext/tag shape and redacts keys',async t => {
  const directory = await temporary(t), c = await core({data_dir:directory,storage_policy:'text'});
  await c.upsertProvider({name:'added',base_url:'http://localhost:1/v1',models:['added-model'],api_key:'vendor-secret'});
  const saved = await readFile(join(directory,'providers.lenv'),'utf8');
  assert.ok(!saved.includes('vendor-secret')); assert.ok(saved.includes('aes256gcm:'));
  assert.ok(!JSON.stringify(await c.listProviders()).includes('vendor-secret'));
  const reopened = await core({data_dir:directory,storage_policy:'text'});
  assert.equal((await reopened.route({model:'added-model'})).api_key,'vendor-secret');
  const encrypted = encryptProviderSecret('sample',fixture.token_secret);
  assert.equal(decryptProviderSecret(encrypted,fixture.token_secret),'sample');
  assert.throws(() => decryptProviderSecret(encrypted,'wrong'));
});
test('exact provider/model and operator alias fixture routing never guesses prefixes',async () => {
  const c = await core();
  for (const row of fixture.model_cases) {
    if (row.error) await rejectsCode(c.route({model:row.selector}),row.error);
    else { const route = await c.route({model:row.selector}); assert.equal(route.model,row.expected_model); if (row.expected_account) assert.equal(route.account,row.expected_account); }
  }
  await rejectsCode(c.route({model:'MODEL-A'}),'model_not_found');
  const conflicting = await core({providers:[...fixture.providers,{...fixture.providers[0],name:'other'}]});
  await rejectsCode(conflicting.route({model:'model-a'}),'model_conflict');
  assert.equal((await conflicting.route({model:'model-a',provider:'fixture'})).provider,'fixture');
  await rejectsCode(conflicting.route({model:'fixture/model-a'}),'model_not_found');
});
test('scoped cooldown fails over only affected model/account and strict pins never escape',async () => {
  let now = fixture.clock; const c = await createRouterCore({config:config({account_strategy:'priority',account_failover:true}),env:{},clock:() => now});
  const selected = await c.route({model:'model-a',sessionKey:'session'});
  assert.equal(selected.account,'primary');
  await c.reportFailure(selected,{status:429,retryAfter:60,scope:'model'});
  assert.equal((await c.route({model:'model-a',sessionKey:'session'})).account,'secondary');
  assert.equal((await c.route({model:'model-b'})).account,'primary');
  await rejectsCode(c.route({model:'model-a',pinnedAccount:'primary'}),'pinned_account_unavailable');
  now += 60; assert.equal((await c.route({model:'model-a',sessionKey:'session'})).account,'primary');
});
test('session failover off rejects cooling binding; weighted and least-used selection',async () => {
  const c = await core({account_strategy:'priority'});
  const first = await c.route({model:'model-a',sessionKey:'strict'});
  // Default policy account provides strict affinity when failover is disabled.
  const plain = await core({accounts:fixture.accounts.map(a => ({...a,policy:{}})),account_strategy:'priority'});
  const p = await plain.route({model:'model-a',sessionKey:'strict'});
  await plain.reportFailure(p,{status:429,retryAfter:60});
  await rejectsCode(plain.route({model:'model-a',sessionKey:'strict'}),'session_account_unavailable');
  const weighted = await core({account_strategy:'weighted-round-robin'}), counts = {};
  for (let i=0;i<40;i++) { const r = await weighted.route({model:'model-b'}); counts[r.account] = (counts[r.account] ?? 0)+1; }
  assert.deepEqual(counts,{primary:30,secondary:10});
  const least = await core({account_strategy:'least-used',accounts:[{name:'primary',provider:'fixture',request_limit:10},{name:'secondary',provider:'fixture'}]});
  assert.equal((await least.route({model:'model-a'})).account,'primary');
});
test('account policies forbid auth/transport overwrite, unsupported header reads, and duplicate aliases',() => {
  for (const headers of [{authorization:'x'},{'x-router-account':'x'},{cookie:'x'},{'x-safe':'$Authorization'},{'x-safe':'x\r\ny'}]) assert.throws(() => validateAccountPolicy({headers}));
  assert.throws(() => validateAccountPolicy({model_aliases:[{model:'model-a',alias:'alias'},{model:'model-b',alias:'alias'}]}));
});
test('paused accounts and single-provider Rust limit projection survive restart',async t => {
  const directory = await temporary(t), c = await core({data_dir:directory,storage_policy:'text'});
  await c.accounts.pause('primary',{reason:'maintenance'});
  const reopened = await core({data_dir:directory,storage_policy:'text',account_strategy:'priority'});
  assert.equal((await reopened.route({model:'model-a'})).account,'secondary');
  await reopened.accounts.resume('primary'); assert.equal((await reopened.route({model:'model-a'})).account,'primary');
  assert.equal(JSON.parse(await readFile(join(directory,'account-limits.json'),'utf8')).provider,'fixture');
});
test('configuration file environment and explicit precedence with secret file',async t => {
  const directory = await temporary(t);
  const {writeFile} = await import('node:fs/promises');
  await writeFile(join(directory,'secret'),'file-secret\n');
  await writeFile(join(directory,'router.lenv'),'PORT: 1234\nTOKEN_SECRET: lenv-secret\n');
  const loaded = await loadConfig({configPath:join(directory,'router.lenv'),config:{port:4321},env:{TOKEN_SECRET_FILE:join(directory,'secret')}});
  assert.equal(loaded.port,4321); assert.equal(loaded.token_secret,'lenv-secret');
});

test('shared deterministic JWT and text projection fixture authenticate with durable model authority',async () => {
  const text = await readFile(new URL('../../../parity/fixtures/core/tokens.lino',import.meta.url),'utf8');
  const records = decodeTokenRecords(text);
  assert.deepEqual(records,[fixture.token_record]);
  const manager = new TokenManager({secret:fixture.token_secret,store:new MemoryTokenStore(records),clock:() => fixture.clock});
  assert.equal((await manager.validate(fixture.token,{model:'model-a'})).sub,fixture.token_record.id);
  await rejectsCode(manager.validate(fixture.token,{model:'model-b'}),'model_not_allowed');
});
test('native durable token admission is atomic across independent Node processes',async t => {
  const directory = await temporary(t), path = join(directory,'tokens.lino');
  const manager = new TokenManager({secret:fixture.token_secret,store:new TextTokenStore(path),clock:() => fixture.clock});
  const issued = await manager.issue({ttl_hours:1,max_requests:3});
  const {execFile} = await import('node:child_process'); const {promisify} = await import('node:util');
  const run = promisify(execFile);
  const moduleURL = new URL('../native/tokens.mjs',import.meta.url).href, storageURL = new URL('../native/storage.mjs',import.meta.url).href;
  const script = `import {TokenManager} from ${JSON.stringify(moduleURL)}; import {TextTokenStore} from ${JSON.stringify(storageURL)}; const manager = new TokenManager({secret:${JSON.stringify(fixture.token_secret)},store:new TextTokenStore(${JSON.stringify(path)}),clock:()=>${fixture.clock}}); const results=await Promise.all(Array.from({length:10},()=>manager.admit(${JSON.stringify(issued.id)}))); console.log(results.filter(v=>v==='admitted').length);`;
  const results = await Promise.all(Array.from({length:3},() => run(process.execPath,['--input-type=module','-e',script])));
  assert.equal(results.reduce((sum,r) => sum+Number(r.stdout.trim()),0),3);
  assert.equal((await manager.get(issued.id)).used_requests,3);
});

test('persistent provider deletes remain authoritative across stale store instances',async t => {
  const directory = await temporary(t);
  const first = await core({data_dir:directory,storage_policy:'text'});
  await first.upsertProvider({name:'temporary',base_url:'http://localhost:1/v1',models:['temporary-model'],api_key:'sensitive'});
  const second = await core({data_dir:directory,storage_policy:'text'});
  await second.upsertProvider({name:'other',base_url:'http://localhost:1/v1',models:['other-model']});
  await first.removeProvider('temporary');
  assert.equal(await second.showProvider('temporary'),null);
  await second.upsertProvider({name:'third',base_url:'http://localhost:1/v1',models:['third-model']});
  assert.equal(await first.showProvider('temporary'),null);
});

test('management strategy changes preserve affinity and cooldown reset preserves manual pauses',async () => {
  const c = await core({account_strategy:'priority'});
  const candidate = await c.route({model:'model-a',sessionKey:'bound'});
  assert.deepEqual(await c.updateRouting({strategy:'prio'}),{strategy:'fill-first'});
  await c.reportFailure(candidate,{status:429,scope:'model',retryAfter:50});
  await c.reportFailure({...candidate,model:'model-b'},{status:429,scope:'model',retryAfter:50});
  await c.accounts.pause('primary');
  assert.deepEqual(await c.resetCooldown('primary','MODEL-A'),{cleared:1});
  assert.equal(c.accounts.limits.get('primary').model_cooldowns['model-b'],fixture.clock+50);
  assert.deepEqual(await c.resetCooldowns(),{cleared:1});
  assert.ok(c.accounts.limits.get('primary').pause);
  await rejectsCode(c.route({model:'model-a',pinnedAccount:'primary'}),'pinned_account_unavailable');
});
test('rotation preserves authority and constraints while resetting Rust usage/clock semantics',async () => {
  let now = fixture.clock; const manager = new TokenManager({secret:fixture.token_secret,clock:() => now});
  const issued = await manager.issue({ttl_hours:3,scope:'',account:'primary',client_kind:'claude-code',principal_id:'primary',max_requests:3,max_tokens:20,github_repos:['a/b'],model_policy:{allowed_models:['model-a']},sliding_window_seconds:10});
  assert.equal((await manager.validate(issued.token)).client_kind,'claude');
  await manager.admit(issued.id,1); now += 60;
  const rotated = await manager.rotate(issued.id);
  assert.equal(rotated.record.expires_at,now+7200);
  assert.equal(rotated.record.used_requests,0);
  assert.equal(rotated.record.sliding_window_seconds,null);
  assert.deepEqual(rotated.record.model_policy,{allowed_models:['model-a']});
  assert.deepEqual(rotated.record.github_repos,['a/b']);
  await rejectsCode(manager.validate(issued.token),'revoked');
});

test('readable codec retains empty objects and trailing quote runs; single-line markers distinguish arrays',() => {
  const value = {empty:{},array:[],trailing:'both "quotes" and \'apostrophe"',legacy:'single "quote'};
  assert.deepEqual(JSON.parse(JSON.stringify(decodeLino(encodeLino(value)))),value);
  assert.deepEqual(JSON.parse(JSON.stringify(decodeLino('(o: (type "RouterState") (value ("a" "b")))'))),{type:'RouterState',value:['a','b']});
  assert.equal(decodeLino('"one ""quote"'), 'one "quote');
});
