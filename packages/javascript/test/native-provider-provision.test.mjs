import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile,stat,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ProviderStore} from '../native/config.mjs';
import {createRouterCore} from '../native/core.mjs';
import {NativeRouter} from '../native/operations.mjs';
const secret='provider-acceptance-fixture-secret';
async function temporary(t) {const dir=await realpath(await mkdtemp(join(tmpdir(),'router-provider-acceptance-')));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}
const record=name=>({name,base_url:'https://vendor.invalid/v1',models:['actual-model'],supported_clients:['opencode']});
test('atomic IfAbsent stages invalid candidates first and preserves accepted bytes without rewriting',async t=> {
  const dir=await temporary(t);const store=new ProviderStore({dataDir:dir,secret});
  assert.equal((await store.install({...record('saved'),api_key:'never-print-this'})).outcome,'created');
  const before=await readFile(store.path),beforeStat=await stat(store.path);
  const kept=await store.install({...record('saved'),if_absent:true,base_url:'https://replacement.invalid'});
  assert.equal(kept.outcome,'already_present');assert.equal(kept.record.base_url,'https://vendor.invalid/v1');
  assert.deepEqual(await readFile(store.path),before);assert.equal((await stat(store.path)).mtimeMs,beforeStat.mtimeMs);
  await assert.rejects(store.install({...record('saved'),base_url:'not-an-url',if_absent:true}),error=>error.code==='invalid_provider');
  assert.ok(!JSON.stringify(kept).includes('never-print-this'));assert.ok(!before.includes(Buffer.from('never-print-this')));
});
test('concurrent independent stores return one atomic created result and the same accepted record',async t=> {
  const dir=await temporary(t);const stores=[0,1].map(()=>new ProviderStore({dataDir:dir,secret}));
  const results=await Promise.all(stores.map((store,index)=>store.install({...record('race'),if_absent:true,models:[`winner-${index}`]})));
  assert.deepEqual(results.map(result=>result.outcome).sort(),['already_present','created']);
  assert.deepEqual(results[0].record.models,results[1].record.models);
});
test('all supported local import formats activate routing and return secret-free acceptance reports',async t=> {
  const dir=await temporary(t);let fetches=0;
  const core=await createRouterCore({config:{token_secret:secret,data_dir:dir,storage_policy:'memory'},env:{},fetch:()=>{fetches++;throw Error('must not probe generic OpenAI');}});
  const router=new NativeRouter({core});
  const samples=[JSON.stringify(record('json')),JSON.stringify({providers:[record('wrapper')]}),'PROVIDER: '+JSON.stringify(record('rows')),'indent\n  base-url https://vendor.invalid/v1\n  models actual-model\n  supported-clients opencode'];
  for(let index=0;index<samples.length;index++) {
    const path=join(dir,`import-${index}`);await writeFile(path,samples[index]);
    const result=await router.providers.import({path,local:true});const report=JSON.parse(result.data.output.join('\n'));
    assert.equal(report.complete,true);assert.equal(report.results[0].outcome,'created');
    assert.ok((await core.candidates({model:'actual-model',client:'opencode',provider:report.results[0].name})).some(candidate=>candidate.provider===report.results[0].name));
  }
  assert.equal(fetches,0);
});
test('imports parse before writes, preserve completed records and stop on first rejected candidate',async t=> {
  const dir=await temporary(t);const router=new NativeRouter({config:{token_secret:secret,data_dir:dir,storage_policy:'memory'},env:{}});
  const path=join(dir,'providers');await writeFile(path,JSON.stringify([record('first'),{...record('second'),base_url:'broken'},record('third')]));
  const result=await router.execute('providers.import',{path,local:true});assert.equal(result.success,false);assert.equal(result.exit_code,1);
  const report=JSON.parse(result.data.output[0]);assert.deepEqual(report.results.map(row=>[row.name,row.outcome]),[['first','created'],['second','invalid_candidate']]);
  assert.deepEqual((await router.providers.list({local:true})).data.map(row=>row.name),['first']);
  await writeFile(path,JSON.stringify([record('must-not-write'),{name:'no-base'}]));
  const malformed=await router.execute('providers.import',{path,local:true});assert.equal(malformed.exit_code,2);
  assert.deepEqual((await router.providers.list({local:true})).data.map(row=>row.name),['first']);
});
test('provider add canonical client validation, atomic replacement and IfAbsent never expose secrets',async t=> {
  const dir=await temporary(t);const router=new NativeRouter({config:{token_secret:secret,data_dir:dir,storage_policy:'memory'},env:{}});
  const made=await router.providers.add({name:'single',base_url:'https://vendor.invalid',api_key_stdin:true,local:true},{stdin:'private-vendor-key'});
  assert.equal(made.data.outcome,'created');assert.equal(made.data.has_encrypted_api_key,true);assert.ok(!JSON.stringify(made).includes('private-vendor-key'));
  const kept=await router.providers.add({name:'single',base_url:'https://other.invalid',if_absent:true,local:true});assert.equal(kept.data.outcome,'already_present');assert.equal(kept.data.base_url,'https://vendor.invalid');
  const bad=await router.execute('providers.add',{name:'single',base_url:'https://other.invalid',supported_clients:['claude-code'],local:true});assert.equal(bad.success,false);
  assert.equal((await router.providers.show({name:'single',local:true})).data.base_url,'https://vendor.invalid');
  const specialized=await router.execute('providers.add',{name:'special',kind:'lefine',base_url:'https://special.invalid',local:true});assert.equal(specialized.success,false);assert.match(specialized.diagnostics.join(),/reviewed live catalog probe/);
});

test('staged environment references remain references and follow rotation without storing key bytes',async t=> {
  const dir=await temporary(t),env={LIVE_VENDOR_KEY:'first-environment-secret'};
  const store=new ProviderStore({dataDir:dir,secret,env});
  const installed=await store.install({...record('environment'),api_key_env:'LIVE_VENDOR_KEY'});
  assert.equal(installed.record.has_encrypted_api_key,false);
  const bytes=await readFile(store.path,'utf8');assert.ok(!bytes.includes('first-environment-secret'));assert.ok(!bytes.includes('aes256gcm:'));
  assert.equal((await store.resolve())[0].api_key,'first-environment-secret');env.LIVE_VENDOR_KEY='rotated-secret';assert.equal((await store.resolve())[0].api_key,'rotated-secret');
});
