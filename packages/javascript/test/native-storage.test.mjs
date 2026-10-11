import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,writeFile,stat,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BinaryTokenStore,DualTokenStore,TextTokenStore,encodeLino,recoverTransactionalWrite,createTokenStore } from '../native/storage.mjs';
import { encodeBinaryTokenRecords,decodeBinaryTokenRecords,tokenSemanticLinks,encodeDoublets } from '../native/doublets.mjs';
import { AffinityStore } from '../native/affinities.mjs';
import { createRouterCore,createOperationContext,TokenManager } from '../native/core.mjs';
import { withAdvisoryFileLock } from '../native/file-lock.mjs';
const secret = 'independent-native-storage-test-signing-authority';
async function directory(t) { const path = await mkdtemp(join(tmpdir(),'router-native-storage-')); t.after(() => rm(path,{recursive:true,force:true})); return path; }
async function record() { const tokens = new TokenManager({secret,clock:() => 1000}); return (await tokens.issue({ttl_hours:1,label:'quotes " utf8 😀',max_requests:10,max_tokens:100})).record; }
const owner = {client_kind:'codex',principal_id:'primary'};
const destination = {provider:'codex',provider_kind:'codex',destination_kind:'subscription',account:'primary',protocol:'responses',account_id:'account-one',base_url:'https://chatgpt.com/backend-api/codex'};

test('binary bytes carry schema points, unique links and valid two-axis tree indexes',async () => {
  const held = await record(), bytes = encodeBinaryTokenRecords([held]);
  const field = (index,position) => Number(bytes.readBigUInt64LE(index*64+position*8));
  const count = field(0,0);
  assert.ok(bytes.length < 1024*1024); assert.equal(bytes.length,(count+1)*64); assert.equal(field(0,2),0);
  for (let index = 1; index <= 259; index++) { assert.equal(field(index,0),index); assert.equal(field(index,1),index); }
  const pairs = new Set();
  for (let index = 1; index <= count; index++) { const key = `${field(index,0)},${field(index,1)}`; assert.ok(!pairs.has(key)); pairs.add(key); }
  for (const [rootField,childField,axes] of [[4,2,[0,1]],[5,5,[1,0]]]) {
    const visited = new Set(), ordered = [];
    function walk(index) {
      if (!index) return 0;
      assert.ok(index <= count && !visited.has(index)); visited.add(index);
      const left = walk(field(index,childField)); ordered.push(axes.map(axis => field(index,axis)));
      const right = walk(field(index,childField+1)); assert.equal(field(index,childField+2),1+left+right); return 1+left+right;
    }
    assert.equal(walk(field(0,rootField)),count);
    for (let index = 1; index < ordered.length; index++) assert.ok(ordered[index-1][0] < ordered[index][0] || ordered[index-1][0] === ordered[index][0] && ordered[index-1][1] < ordered[index][1]);
  }
  assert.deepEqual(decodeBinaryTokenRecords(bytes),[held]);
  const missingSchema = tokenSemanticLinks([held]).filter(([source]) => source !== 'StorageFormat');
  assert.throws(() => decodeBinaryTokenRecords(encodeDoublets(missingSchema)),/schema/);
  const broken = Buffer.from(bytes); broken.writeBigUInt64LE(99n,64); assert.throws(() => decodeBinaryTokenRecords(broken),/schema point/);
  assert.throws(() => decodeBinaryTokenRecords(bytes.subarray(0,-1)),/header/);
});
test('binary transactions survive reopening and migrate legacy length-prefixed JSON on mutation',async t => {
  const path = join(await directory(t),'tokens.bin'), held = await record();
  const json = Buffer.from(JSON.stringify(held)), length = Buffer.alloc(4); length.writeUInt32LE(json.length);
  await writeFile(path,Buffer.concat([Buffer.from('LARTOK01'),length,json]));
  const store = new BinaryTokenStore(path); assert.deepEqual(await store.get(held.id),held);
  await store.transaction(records => { records.get(held.id).used_requests = 3; });
  const bytes = await readFile(path); assert.notEqual(bytes.subarray(0,8).toString(),'LARTOK01');
  assert.equal((await new BinaryTokenStore(path).get(held.id)).used_requests,3);
  assert.equal((await stat(path)).mode & 0o777,0o600);
});
test('dual transaction journal replays both projections before returning a record',async t => {
  const home = await directory(t), held = await record(), store = new DualTokenStore(home);
  held.used_requests = 7;
  await writeFile(join(home,'tokens.transaction.json'),encodeLino([held]));
  assert.deepEqual(await store.get(held.id),held);
  assert.deepEqual(await new TextTokenStore(join(home,'tokens.lino')).get(held.id),held);
  assert.deepEqual(await new BinaryTokenStore(join(home,'tokens.bin')).get(held.id),held);
  await assert.rejects(stat(join(home,'tokens.transaction.json')),error => error.code === 'ENOENT');
  await store.delete(held.id); assert.equal(await new DualTokenStore(home).get(held.id),null);
});
test('dual reads avoid binary rewrites and mutations reconcile safer reservation/revocation values',async t => {
  const home = await directory(t), held = await record(), store = new DualTokenStore(home);
  await store.put(held); const before = await stat(join(home,'tokens.bin'));
  await store.get(held.id); assert.equal((await stat(join(home,'tokens.bin'))).mtimeMs,before.mtimeMs);
  const binary = new BinaryTokenStore(join(home,'tokens.bin'));
  await binary.transaction(records => { const value = records.get(held.id); value.revoked = true; value.used_requests = 8; value.reserved_tokens = 4; });
  await store.transaction(() => {});
  const value = await store.get(held.id); assert.equal(value.revoked,true); assert.equal(value.used_requests,8); assert.equal(value.reserved_tokens,4);
});
test('durable replacement recovery respects commit markers and never resurrects removed prior state',async t => {
  const home = await directory(t), path = join(home,'state.lino'), rollback = join(home,'.state.lino.router-rollback'), commit = join(home,'.state.lino.router-commit');
  await writeFile(path,'new'); await writeFile(rollback,Buffer.from('\x01old')); await recoverTransactionalWrite(path); assert.equal(await readFile(path,'utf8'),'old');
  await writeFile(path,'new'); await writeFile(rollback,Buffer.from('\x01old')); await writeFile(commit,'committed\n'); await recoverTransactionalWrite(path); assert.equal(await readFile(path,'utf8'),'new');
  await writeFile(rollback,Buffer.from([0])); await recoverTransactionalWrite(path); await assert.rejects(stat(path),error => error.code === 'ENOENT');
});
test('OS locks coordinate separate helpers, allow shared readers, and time out an exclusive contender',async t => {
  const path = join(await directory(t),'interop.lock'); let release;
  const wait = new Promise(resolve => { release = resolve; }); let acquired;
  const ready = new Promise(resolve => { acquired = resolve; });
  const first = withAdvisoryFileLock(path,async () => { acquired(); await wait; },{shared:true});
  await ready;
  try {
    assert.equal(await withAdvisoryFileLock(path,() => 'second-reader',{shared:true}),'second-reader');
    await assert.rejects(withAdvisoryFileLock(path,() => assert.fail('contender entered'),{timeout:60}),/timeout/);
  } finally { release(); await first; }
  assert.equal(await withAdvisoryFileLock(path,() => 'exclusive'),'exclusive');
});
test('resource ownership, account identity collisions, parent ambiguity and expiry survive restart',async t => {
  const home = await directory(t); let now = 100;
  const make = () => new AffinityStore({dataDir:home,clock:() => now,ttl:10,maxRecords:5});
  const store = make(), namespace = '/api/services/codex/v1/conversations';
  await store.set(namespace,owner,'conv-one',{destination});
  assert.equal((await make().get(namespace,owner,'conv-one')).destination.account_id,'account-one');
  assert.equal(await make().get(namespace,{...owner,principal_id:'another'},'conv-one'),null);
  await assert.rejects(store.set(namespace,owner,'conv-one',{destination:{...destination,account_id:'account-two'}}),error => error.code === 'affinity_collision');
  await store.set(namespace,owner,'shared-item',{destination,parent_id:'parent-one'});
  await store.set(namespace,owner,'shared-item',{destination,parent_id:'parent-two'});
  assert.equal(await store.get(namespace,owner,'shared-item'),null);
  assert.equal((await store.get(namespace,owner,'shared-item','parent-one')).parent_id,'parent-one');
  assert.equal((await store.list(namespace,owner)).length,3);
  const persisted = await readFile(join(home,'response-affinities.lino'),'utf8');
  assert.ok(persisted.includes('codex_conversations')); assert.ok(persisted.includes('upstream_account_id')); assert.ok(!persisted.includes('api_key'));
  now = 110; assert.equal(await make().get(namespace,owner,'conv-one'),null);
});
test('operation contexts preserve authority and counters while isolating explicit state identities',async t => {
  const home = await directory(t), config = {token_secret:secret,storage_policy:'memory',data_dir:home,providers:[{name:'service',kind:'openai-compatible',base_url:'http://localhost:1234/v1',models:['model'],supported_clients:['codex']}],accounts:[{name:'primary',provider:'service'},{name:'secondary',provider:'service'}]};
  const core = await createRouterCore({config,env:{},clock:() => 100});
  const context = await createOperationContext(core,{configOverrides:{account_cooldown_seconds:15},cwd:home});
  assert.equal(context.core.tokens,core.tokens); assert.equal(context.core.config.account_cooldown_seconds,15);
  assert.equal((await core.nativeCandidates({service:'openai',client:'codex'}))[0].account,'primary');
  assert.equal((await context.core.nativeCandidates({service:'openai',client:'codex'}))[0].account,'secondary');
  await assert.rejects(core.nativeCandidates({service:'anthropic',client:'claude'}),error => error.code === 'native_provider_unavailable');
  const held = await core.tokens.issue({ttl_hours:1});
  const isolated = await createOperationContext(core,{configOverrides:{data_dir:'different'},cwd:home});
  assert.equal(isolated.config.data_dir,join(home,'different')); assert.notEqual(isolated.core.tokens,core.tokens); assert.equal(await isolated.core.tokens.get(held.id),null);
  assert.equal((await createOperationContext(core,{configOverrides:{data_dir:'different'},cwd:home})).core.tokens,isolated.core.tokens);
  const environment = await createOperationContext(core,{env:{PORT:'0',ACCOUNT_FAILOVER:'yes',TOKEN_ADMIN_KEY:'new-independent-admin'}});
  assert.equal(environment.config.port,0); assert.equal(environment.config.account_failover,true);
  assert.equal((await environment.core.authenticate('new-independent-admin',{admin:true})).is_admin,true);
  assert.equal(await core.admin.verify('new-independent-admin'),false);
  assert.equal(createTokenStore({storage_policy:'clink'}).constructor.name,'BinaryTokenStore');
});
