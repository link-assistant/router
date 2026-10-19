import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {readTokenImportSource,importTokenRecords} from '../native/token-import.mjs';
import {MemoryTokenStore,encodeTokenRecords} from '../native/storage.mjs';
import {encodeBinaryTokenRecords} from '../native/doublets.mjs';
const record=(id,extra={})=>({id,issued_at:1,expires_at:2000000000,revoked:false,used_requests:0,used_tokens:0,reserved_tokens:0,rate_window_started_at:0,rate_window_requests:0,label:id,scope:'client',github_repos:[],model_policy:{},...extra});
async function directory(t) {const dir=await realpath(await mkdtemp(join(tmpdir(),'router-token-import-')));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}

test('all Rust file/deployment/checkpoint source formats decode without mutating source bytes',async t=> {
  const dir=await directory(t),records=[record('one')];
  const files=[['export.json',JSON.stringify(records)],['export.lino',encodeTokenRecords(records)],['export.bin',encodeBinaryTokenRecords(records)]];
  for (const [name,bytes] of files) {const path=join(dir,name);await writeFile(path,bytes);const before=await readFile(path),result=await readTokenImportSource(path);assert.equal(result[0].id,'one');assert.deepEqual(await readFile(path),before);}
  const deployment=join(dir,'deployment'),data=join(deployment,'data');await mkdir(data,{recursive:true});
  await writeFile(join(data,'tokens.lino'),encodeTokenRecords([record('one',{used_requests:8})]));await writeFile(join(data,'tokens.bin'),encodeBinaryTokenRecords([record('one',{revoked:true,used_requests:3})]));await writeFile(join(data,'tokens.json'),JSON.stringify([record('two')]));
  const result=await readTokenImportSource(deployment);assert.deepEqual(result.map(value=>value.id),['one','two']);assert.equal(result[0].revoked,true);assert.equal(result[0].used_requests,8);
});
test('merge reports exact differing fields and missing selections without reviving or replacing records',async t=> {
  const dir=await directory(t),store=new MemoryTokenStore([record('held',{revoked:true})]);
  const result=await importTokenRecords({source:[record('held',{label:'changed'}),record('new')],store,dataDir:dir,options:{ids:['held','new','missing']}});
  assert.deepEqual(result.added,['new']);assert.deepEqual(result.conflicts,[{id:'held',fields:['label','revoked']}]);assert.deepEqual(result.missing_from_source,['missing']);assert.equal((await store.get('held')).revoked,true);assert.equal((await store.get('held')).label,'held');
});
test('replace saves private pre-change backup and retains larger usage and revocation',async t=> {
  const dir=await directory(t),original=record('one',{revoked:true,used_requests:9,used_tokens:20,reserved_tokens:8}),store=new MemoryTokenStore([original]);
  const result=await importTokenRecords({source:[record('one',{label:'replacement',used_requests:1})],store,dataDir:dir,clock:()=>1700000000,options:{replace:true}});
  assert.equal(result.mode,'replace');assert.deepEqual(result.kept_revoked,['one']);assert.equal(result.replaced.length,1);
  const final=await store.get('one');assert.equal(final.revoked,true);assert.equal(final.used_requests,9);assert.equal(final.used_tokens,20);assert.equal(final.reserved_tokens,8);assert.equal(final.label,'replacement');
  assert.deepEqual(JSON.parse(await readFile(result.backup,'utf8')),[original]);
});
test('dry run computes replacement effects without target or backup changes and unknown input is refused',async t=> {
  const dir=await directory(t),store=new MemoryTokenStore([record('one')]),original=await store.list();
  const result=await importTokenRecords({source:[record('one',{label:'replacement'}),record('two')],store,dataDir:dir,options:{replace:true,dry_run:true}});
  assert.equal(result.backup,undefined);assert.deepEqual(await store.list(),original);assert.deepEqual(result.added,['two']);assert.equal(result.replaced.length,1);
  await assert.rejects(readTokenImportSource(dir),/holds no tokens/);await writeFile(join(dir,'wrong.txt'),'[]');await assert.rejects(readTokenImportSource(join(dir,'wrong.txt')),/requires a .lino/);
  await writeFile(join(dir,'duplicate.json'),JSON.stringify([record('one'),record('one')]));await assert.rejects(readTokenImportSource(join(dir,'duplicate.json')),/Duplicate/);
});
