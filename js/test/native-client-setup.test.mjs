import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,realpath,rm,mkdir,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createRouterCore} from '../src/core.mjs';
import {setupNativeClient,removeNativeClient} from '../src/client-setup.mjs';
import {clientPaths,readClientEnvironment} from '../src/client-files.mjs';
import {nativeClientStatus} from '../src/client-status.mjs';
import {readNativeText} from '../src/operation-input.mjs';
import {parseNativeArguments} from '../src/cli.mjs';
async function fixture(t) {
  const home=await realpath(await mkdtemp(join(tmpdir(),'router-client-setup-')));t.after(()=>rm(home,{recursive:true,force:true}));
  const core=await createRouterCore({config:{data_dir:join(home,'router'),token_secret:'client-setup-authority',storage_policy:'memory'},env:{}});
  const options={client:'opencode',home,base_url:'https://router.test'};
  const fetch=async(url,request)=>{assert.equal(url,'https://router.test/api/models');const token=request.headers.authorization.slice(7);try {const claims=await core.tokens.validate(token);assert.equal(claims.client_kind,request.headers['x-link-assistant-client']);return Response.json({data:[{id:'real-live-model',owned_by:'openai'}]});}catch{return new Response('denied',{status:401});}};
  return {home,core,options,fetch,paths:clientPaths('opencode',{home})};
}
test('client setup mints exact bound credential and writes no token into public config or output',async t=>{
  const f=await fixture(t),result=await setupNativeClient(f),records=await f.core.tokens.list();assert.equal(records.length,1);assert.equal(records[0].client_kind,'opencode');assert.equal(records[0].principal_id,'primary');assert.equal(records[0].account,'primary');
  const config=await readFile(f.paths.config,'utf8'),environment=await readFile(f.paths.environment,'utf8'),metadata=JSON.parse(await readFile(f.paths.metadata,'utf8'));
  const token=readClientEnvironment(environment,'LINK_ASSISTANT_TOKEN');assert.equal((await f.core.tokens.validate(token)).sub,records[0].id);assert(!config.includes(token));assert(!JSON.stringify(result).includes(token));assert(!JSON.stringify(metadata).includes(token));assert.equal(metadata.source,'minted');
  assert.equal((await stat(f.paths.environment)).mode & 0o777,0o600);assert.equal((await nativeClientStatus('opencode',{home:f.home,env:{}})).ownership_state,'managed-intact');
  await setupNativeClient(f);assert.equal((await f.core.tokens.list()).length,1);
  await removeNativeClient(f);assert.equal((await f.core.tokens.list())[0].revoked,true);await assert.rejects(()=>readFile(f.paths.environment),{code:'ENOENT'});assert.equal((await nativeClientStatus('opencode',{home:f.home,env:{}})).ownership_state,'foreign');
});
test('transaction failure after config/environment/metadata restores original bytes and mode and revokes unused minted token',async t=>{
  for(const stage of ['config','environment','metadata']) {
    const f=await fixture(t);await mkdir(dirname(f.paths.config),{recursive:true});const original='{ "editor": "user" }\n';await writeFile(f.paths.config,original,{mode:0o640});
    await assert.rejects(()=>setupNativeClient({...f,checkpoint:actual=>{if(actual===stage) throw new Error('fixture write failure');}}),/fixture write failure/);
    assert.equal(await readFile(f.paths.config,'utf8'),original);assert.equal((await stat(f.paths.config)).mode & 0o777,0o640);assert((await f.core.tokens.list()).every(record=>record.revoked));
    await assert.rejects(()=>readFile(f.paths.environment),{code:'ENOENT'});await assert.rejects(()=>readFile(f.paths.metadata),{code:'ENOENT'});assert(!(await readdir(dirname(f.paths.config))).some(name=>name.endsWith('.bak')));
  }
});
test('catalog rejection and wrong-client credentials never alter existing client configuration',async t=>{
  const f=await fixture(t);await mkdir(dirname(f.paths.config),{recursive:true});await writeFile(f.paths.config,'{"editor":"user"}');
  await assert.rejects(()=>setupNativeClient({...f,fetch:async()=>new Response('denied',{status:401})}),/catalog request failed/);assert((await f.core.tokens.list()).every(record=>record.revoked));assert.equal(await readFile(f.paths.config,'utf8'),'{"editor":"user"}');
  const wrong=await f.core.tokens.issue({client_kind:'qwen',principal_id:'primary',account:'primary'});await assert.rejects(()=>setupNativeClient({...f,options:{...f.options,token:wrong.token}}),/exact canonical/);assert.equal((await f.core.tokens.list()).find(record=>record.id===wrong.id).revoked,false);
});
test('supplied credentials stay valid by default on removal; explicit revocation requires actual owned metadata',async t=>{
  const f=await fixture(t),issued=await f.core.tokens.issue({client_kind:'opencode',principal_id:'primary',account:'primary'});
  await setupNativeClient({...f,options:{...f.options,token_stdin:true},invocation:{stdin:issued.token}});assert.equal(JSON.parse(await readFile(f.paths.metadata,'utf8')).source,'supplied');
  await removeNativeClient(f);assert.equal((await f.core.tokens.list()).find(record=>record.id===issued.id).revoked,false);
  await setupNativeClient({...f,options:{...f.options,token:issued.token}});await removeNativeClient({...f,options:{...f.options,revoke_supplied:true}});assert.equal((await f.core.tokens.list()).find(record=>record.id===issued.id).revoked,true);
});
test('concurrent operator edit is preserved and failed transaction retains its private recovery snapshot',async t=>{
  const f=await fixture(t),foreign='operator content';
  await assert.rejects(()=>setupNativeClient({...f,checkpoint:async stage=>{if(stage==='config') {await mkdir(dirname(f.paths.environment),{recursive:true});await writeFile(f.paths.environment,foreign);}}}),/concurrent edits were preserved/);
  assert.equal(await readFile(f.paths.environment,'utf8'),foreign);const snapshots=await readdir(join(f.paths.configHome,'link-assistant-router/repairs'));assert.equal(snapshots.length,1);assert.equal((await stat(join(f.paths.configHome,'link-assistant-router/repairs',snapshots[0]))).mode & 0o777,0o700);assert((await f.core.tokens.list()).every(record=>record.revoked));
});
test('operation text reads preserve BOM bytes instead of changing the transaction digest',async t=>{
  const f=await fixture(t),path=join(f.home,'bom.json');await writeFile(path,Buffer.from([0xef,0xbb,0xbf,0x7b,0x7d]));assert.equal((await readNativeText(path)).charCodeAt(0),0xfeff);
});
test('hashed log directory selector is usable while bearer credential flags remain refused',()=>{
  assert.equal(parseNativeArguments(['logs','summary','--token-id','public-hash-prefix']).options.token,'public-hash-prefix');
  assert.throws(()=>parseNativeArguments(['clients','setup','opencode','--token','la_sk_private']),/secret/);
});
