import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {NativeLoginManager,nativeCredentialStatus} from '../native/auth-service.mjs';
import {OAuthManager,CredentialFileStore} from '../native/oauth.mjs';
const document=()=>({claudeAiOauth:{accessToken:'accepted-access',refreshToken:'owned-refresh',expiresAt:1800000000000,scopes:['user:inference']}});
async function fixture(t,extra={}) {
  const root=await realpath(await mkdtemp(join(tmpdir(),'router-login-')));t.after(()=>rm(root,{recursive:true,force:true}));
  const core={config:{data_dir:join(root,'data'),claude_code_home:join(root,'claude'),codex_home:join(root,'codex'),...extra},clock:()=>1700000000,providers:{list:async()=>[]},oauth:new OAuthManager({clock:()=>1700000000})};
  return {root,core};
}
const writeDriver=async({home})=>({authorizationURL:()=> 'https://claude.ai/oauth/authorize?state=fixture',complete:async()=> {
  await mkdir(home,{recursive:true});await writeFile(join(home,'.credentials.json'),JSON.stringify(document()));
}});

test('login reserves concurrent capacity before waiting for driver construction',async t=> {
  const {core}=await fixture(t,{login:{max_sessions:1}});let release;
  const manager=new NativeLoginManager(core,{loginFactories:{claude:async options=>{await new Promise(resolve=>release=resolve);return writeDriver(options);}}});t.after(()=>manager.dispose());
  const beginning=manager.begin();await new Promise(resolve=>setImmediate(resolve));
  await assert.rejects(manager.begin(),error=>error.status===429);release();
  const session=await beginning;assert.equal(session.status,'awaiting_code');assert.equal(await manager.cancel(session.login_id),true);assert.equal(await manager.status(session.login_id),null);
});
test('session expiry and retention use injected clock and never accept an expired code',async t=> {
  const {core}=await fixture(t,{login:{session_ttl_secs:10,terminal_retention_secs:5}});let now=1700000000;
  const manager=new NativeLoginManager(core,{clock:()=>now,loginFactories:{claude:writeDriver}});t.after(()=>manager.dispose());
  const session=await manager.begin();now+=10;
  assert.equal((await manager.status(session.login_id)).status,'expired');
  await assert.rejects(manager.submitCode(session.login_id,'code'),error=>error.status===409);now+=5;assert.equal(await manager.status(session.login_id),null);
});
test('successful login installs owned durable credential before deleting private staging source',async t=> {
  const {core}=await fixture(t);const manager=new NativeLoginManager(core,{loginFactories:{claude:writeDriver},validateCatalog:async()=>['fixture']});t.after(()=>manager.dispose());
  const session=await manager.begin();const result=await manager.submitCode(session.login_id,'code');assert.equal(result.status,'authorized',JSON.stringify(result));
  const store=new CredentialFileStore({provider:'claude',home:core.config.claude_code_home,dataDir:core.config.data_dir,clock:core.clock});
  const held=await store.reload();assert.equal(held.token.refresh_token,'owned-refresh');assert.equal(held.origin,'file');
  const saved=JSON.parse(await readFile(join(core.config.claude_code_home,'.credentials.json'),'utf8'));assert.equal(saved._link_assistant_router?.credential_source,undefined);
  await assert.rejects(readFile(join(core.config.data_dir,'native-login-sessions',session.login_id,'claude','.credentials.json')),error=>error.code==='ENOENT');
  assert.equal(JSON.stringify(result).includes('owned-refresh'),false);
});
test('cancel during provider exchange prevents destination credential promotion',async t=> {
  const {core}=await fixture(t);let exchanged,release;
  const ready=new Promise(resolve=>exchanged=resolve);
  const manager=new NativeLoginManager(core,{loginFactories:{claude:async options=> {
    const driver=await writeDriver(options);return {...driver,complete:async()=>{exchanged();await new Promise(resolve=>release=resolve);await driver.complete();}};
  }},validateCatalog:async()=>['fixture']});t.after(()=>manager.dispose());
  const session=await manager.begin(),finishing=manager.submitCode(session.login_id,'code');await ready;await manager.cancel(session.login_id);release();await finishing;
  assert.equal(await manager.status(session.login_id),null);await assert.rejects(readFile(join(core.config.claude_code_home,'.credentials.json')),error=>error.code==='ENOENT');
});
test('credential inspection verifies catalogs and redacts provider API keys',async t=> {
  const {core}=await fixture(t);await mkdir(core.config.claude_code_home,{recursive:true});await writeFile(join(core.config.claude_code_home,'.credentials.json'),JSON.stringify(document()));
  core.providers.list=async()=>[{name:'fixture',kind:'openai-compatible',base_url:'https://vendor.invalid',api_key:'private-api-key'}];let checks=0;
  const result=await nativeCredentialStatus(core,{validateCatalog:async({provider,token})=>{assert.equal(provider,'claude');assert.equal(token.access_token,'accepted-access');checks++;return ['fixture'];}});
  assert.equal(checks,1);assert.equal(result.credentials.find(record=>record.provider==='claude').state,'usable');assert.equal(result.sources.find(record=>record.provider==='claude').source.kind,'owned');
  assert.equal(JSON.stringify(result).includes('private-api-key'),false);assert.equal(JSON.stringify(result).includes('owned-refresh'),false);
});
test('disabled login, unsupported providers, unknown code and malformed drivers fail explicitly',async t=> {
  const {core}=await fixture(t);const disabled=new NativeLoginManager({...core,config:{...core.config,disable_login_api:true}});
  await assert.rejects(disabled.begin(),error=>error.status===403);
  const manager=new NativeLoginManager(core,{loginFactories:{claude:async()=>({url:'https://claude.ai',status:'authorized'})}});t.after(()=>manager.dispose());
  await assert.rejects(manager.begin({provider:'unknown'}),error=>error.status===400);await assert.rejects(manager.begin(),/pending authorization URL/);
  await assert.rejects(manager.submitCode('unknown','code'),error=>error.status===404);assert.equal(await manager.cancel('unknown'),false);
});
