import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,realpath,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {NativeRouter} from '../native/operations.mjs';
async function fixture(t) {const dir=await realpath(await mkdtemp(join(tmpdir(),'router-op-context-')));t.after(()=>rm(dir,{recursive:true,force:true}));const router=new NativeRouter({config:{data_dir:dir,storage_policy:'memory',token_secret:'native-operation-context-fixture'},env:{}});t.after(()=>router.close());return {dir,router};}

test('per-invocation signing authority isolates stores while repeated identical context shares them',async t=> {
  const {router}=await fixture(t),env={TOKEN_SECRET:'second-context-authority'};
  assert.equal((await router.execute('tokens.issue',{ttl_hours:1},{env})).success,true);
  assert.equal((await router.execute('tokens.list',{local:true},{env})).data.length,1);
  assert.equal((await router.execute('tokens.list',{local:true})).data.length,0);
  assert.equal((await router.execute('tokens.issue',{ttl_hours:1},{env})).success,true);assert.equal((await router.execute('tokens.list',{local:true},{env})).data.length,2);
});
test('explicit storage/data overrides resolve against invocation cwd and durable file reflects actual issued record',async t=> {
  const {router,dir}=await fixture(t),options={data_dir:'chosen',storage_policy:'text',local:true};
  const issued=await router.execute('tokens.issue',{...options,ttl_hours:1},{cwd:dir});assert.equal(issued.success,true,issued.diagnostics.join('\n'));
  const rows=await router.execute('tokens.list',options,{cwd:dir});assert.equal(rows.data.length,1);assert.match(await readFile(join(dir,'chosen','tokens.lino'),'utf8'),new RegExp(rows.data[0].id));
  assert.equal((await router.tokens.list({local:true})).data.length,0);
});
test('unimplemented shared config effects remain explicit and aborted operation cannot mutate store',async t=> {
  const {router}=await fixture(t),before={...process.env};
  const refused=await router.execute('tokens.issue',{upstream_base_url:'https://unimplemented.invalid'});assert.equal(refused.success,false);assert.match(refused.diagnostics[0],/does not implement upstream_base_url/);
  const controller=new AbortController();controller.abort();const cancelled=await router.execute('tokens.issue',{}, {signal:controller.signal});assert.equal(cancelled.success,false);
  assert.equal((await router.tokens.list({local:true})).data.length,0);assert.deepEqual({...process.env},before);
});
