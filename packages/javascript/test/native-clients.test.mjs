import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,realpath,mkdir,writeFile,readFile,stat,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {clientPaths,writeClientEnvironment,readClientEnvironment} from '../native/client-files.mjs';
import {nativeClientStatus} from '../native/client-status.mjs';
import {setupClientJSON,removeClientJSON} from '../native/client-json.mjs';
import {fetchNativeClientCatalog,parseNativeClientCatalog,nativeClientModelAuthorized,selectNativeClientModel} from '../native/client-catalog.mjs';
import {createNativeRouter} from '../native/operations.mjs';
async function root(t) {const path=await realpath(await mkdtemp(join(tmpdir(),'router-clients-')));t.after(()=>rm(path,{recursive:true,force:true}));return path;}
async function put(path,value) {await mkdir(dirname(path),{recursive:true});await writeFile(path,typeof value==='string' ? value : JSON.stringify(value));}
test('client paths canonicalize aliases and honor explicit isolated home over ambient credentials',async t=>{
  const home=await root(t),env={HOME:home,CODEX_HOME:join(home,'other'),QWEN_HOME:'~/portable',GEMINI_CLI_HOME:join(home,'gemini-home'),ANTHROPIC_AUTH_TOKEN:'secret'};
  assert.equal(clientPaths('claude-code',{env}).info.client,'claude');assert.equal(clientPaths('codex',{env}).config,join(home,'other/config.toml'));
  assert.equal(clientPaths('qwen-code',{env}).config,join(home,'portable/settings.json'));assert.equal(clientPaths('gemini',{env}).config,join(home,'gemini-home/.gemini/settings.json'));
  const status=await nativeClientStatus('claude',{home,env});assert.equal(status.token_env_set,false);assert.equal(status.ownership_state,'unconfigured');
  assert.throws(()=>clientPaths('codex',{env:{HOME:''}}),/absolute/);
});
test('all eight rows survive a malformed JSON configuration and show the matching error',async t=>{
  const home=await root(t);await put(clientPaths('claude',{home}).config,'{broken');
  const router=createNativeRouter({env:{HOME:home,PATH:''}}),list=await router.execute('clients.list');
  assert.equal(list.success,false);assert.equal(list.data.length,8);const claude=list.data.find(row=>row.client==='claude');
  assert.equal(claude.ownership_state,'ambiguous');assert.match(claude.unreadable,/invalid JSON/);
  assert.equal(list.data.find(row=>row.client==='agent').ownership_state,'unconfigured');assert(!JSON.stringify(list).includes('{broken'));
  const show=await router.execute('clients.show',{client:'claude'});assert.equal(show.success,false);assert.equal(show.data.client,'claude');
});
test('Codex reads real TOML quoted keys inline tables and rejects malformed grammar',async t=>{
  const home=await root(t),paths=clientPaths('codex',{home});
  await put(paths.config,'model_provider = "link-assistant"\n[model_providers]\n"link-assistant" = { base_url = "https://router.test/api/services/codex/v1", wire_api = "responses", env_key = "LINK_ASSISTANT_TOKEN" }\n');
  const status=await nativeClientStatus('codex',{home,env:{PATH:''}});assert.equal(status.base_url,'https://router.test');assert.equal(status.ownership_state,'foreign');
  await put(paths.config,'model_provider = [broken');assert.match((await nativeClientStatus('codex',{home})).unreadable,/invalid TOML/);
});
test('OpenCode setup refreshes owned models preserves user settings and restores previous provider',async t=>{
  const home=await root(t),paths=clientPaths('opencode',{home});const previous={custom:true,models:{user:{name:'User'}}};
  await put(paths.config,{unrelated:7,provider:{vendor:{apiKey:'vendor-secret'},'link-assistant':previous}});
  let result=await setupClientJSON(paths,'https://router.test/api/services/openai/v1',[{id:'first'}]);assert(result.changed);assert.equal((await stat(result.backup)).mode & 0o777,0o600);
  const initial=JSON.parse(await readFile(paths.config,'utf8'));assert.equal(initial.unrelated,7);assert.equal(initial.provider.vendor.apiKey,'vendor-secret');assert.equal(initial.provider['link-assistant'].options.apiKey,'{env:LINK_ASSISTANT_TOKEN}');
  const again=await setupClientJSON(paths,'https://router.test/api/services/openai/v1',[{id:'first'}]);assert.equal(again.changed,false);
  await setupClientJSON(paths,'https://router.test/api/services/openai/v1',[{id:'second'},{id:'__proto__'}]);
  const refreshed=JSON.parse(await readFile(paths.config,'utf8'));assert(!Object.hasOwn(refreshed.provider['link-assistant'].models,'first'));assert(Object.hasOwn(refreshed.provider['link-assistant'].models,'user'));assert(Object.hasOwn(refreshed.provider['link-assistant'].models,'__proto__'));
  await removeClientJSON(paths);const removed=JSON.parse(await readFile(paths.config,'utf8'));assert.deepEqual(removed.provider['link-assistant'],previous);assert.equal(removed.unrelated,7);
});
test('user drift is preserved on removal and Qwen removes only exact owned entries',async t=>{
  const home=await root(t),paths=clientPaths('agent',{home});await setupClientJSON(paths,'https://router.test/v1',[{id:'owned'}]);
  const document=JSON.parse(await readFile(paths.config,'utf8'));document.provider['link-assistant'].options.baseURL='https://user.test';await put(paths.config,document);
  const result=await removeClientJSON(paths);assert.equal(result.changed,false);assert.equal(JSON.parse(await readFile(paths.config,'utf8')).provider['link-assistant'].options.baseURL,'https://user.test');
  const qwen=clientPaths('qwen',{home}),foreign={id:'foreign',name:'Vendor',envKey:'VENDOR',baseUrl:'https://vendor.test'};
  await put(qwen.config,{modelProviders:{openai:[foreign]},theme:'user'});await setupClientJSON(qwen,'https://router.test/api/services/qwen/v1',[{id:'owned'}]);
  const current=JSON.parse(await readFile(qwen.config,'utf8'));current.modelProviders.openai[1].baseUrl='https://user.test';await put(qwen.config,current);
  await removeClientJSON(qwen);const final=JSON.parse(await readFile(qwen.config,'utf8'));assert.equal(final.modelProviders.openai.length,2);assert.deepEqual(final.modelProviders.openai[0],foreign);assert.equal(final.theme,'user');
});
test('credential metadata and actual config establish ownership; conflicting ambient values expose only key names',async t=>{
  const home=await root(t),paths=clientPaths('opencode',{env:{HOME:home}});await setupClientJSON(paths,'https://router.test/api/services/openai/v1',[{id:'owned'}]);
  await writeClientEnvironment(paths,'https://router.test','la_sk_secret');await put(paths.metadata,{client:'opencode',source:'minted',token_id:'record',router:'https://router.test'});
  let status=await nativeClientStatus('opencode',{env:{HOME:home,PATH:''}});assert.equal(status.configured,true);assert.equal(status.ownership_state,'managed-intact');
  status=await nativeClientStatus('opencode',{env:{HOME:home,LINK_ASSISTANT_TOKEN:'foreign-secret'}});assert.equal(status.ownership_state,'managed-drifted');assert.deepEqual(status.conflicts,['ambient:LINK_ASSISTANT_TOKEN']);assert(!JSON.stringify(status).includes('secret'));
  await symlink(paths.config,join(home,'symlink.json'));await assert.rejects(()=>setupClientJSON({...paths,config:join(home,'symlink.json')},'https://router.test/v1',[{id:'owned'}]),/Could not read/);
});
test('managed exports round trip shell quoting and contain Codex control-plane aliases privately',async t=>{
  const home=await root(t),paths=clientPaths('codex',{home}),token="la_sk_payload'quoted";const path=await writeClientEnvironment(paths,'https://router.test',token),source=await readFile(path,'utf8');
  assert.equal(readClientEnvironment(source,'LINK_ASSISTANT_TOKEN'),token);assert.equal(readClientEnvironment(source,'CODEX_ACCESS_TOKEN'),"at-payload'quoted");assert.equal(readClientEnvironment(source,'CODEX_AUTHAPI_BASE_URL'),'https://router.test/api/services/codex');assert.equal((await stat(path)).mode & 0o777,0o600);
});
test('catalog consumes canonical authenticated endpoint and rejects every malformed row without silently dropping it',async()=>{
  const seen=[];const rows=await fetchNativeClientCatalog('gemini','https://router.test/api/services/gemini','secret',{fetch:async(url,options)=>{seen.push({url,headers:options.headers});return new Response(JSON.stringify({data:[{id:'z',owned_by:'google',selector_kind:'provider_dynamic_alias'},{id:'a',owned_by:'openai'},{id:'z',owned_by:'google'}]}));}});
  assert.equal(seen[0].url,'https://router.test/api/models');assert.equal(seen[0].headers['x-link-assistant-client'],'gemini');assert.equal(seen[0].headers['x-goog-api-key'],'secret');assert.deepEqual(rows.map(row=>row.id),['a','z']);
  assert.throws(()=>parseNativeClientCatalog([{id:'good'},{id:'bad',supported_reasoning_levels:'invalid'}]),/supported_reasoning_levels/);
  assert.equal(selectNativeClientModel('claude',[{id:'unrelated',owned_by:'openai'}]),null);assert.equal(selectNativeClientModel('qwen',[{id:'fallback',owned_by:'openai'}]),'fallback');
  assert(nativeClientModelAuthorized('claude',[{id:'claude-live',owned_by:'anthropic'}],'claude-live[1m]'));assert(!nativeClientModelAuthorized('claude',[{id:'glm',owned_by:'z.ai'}],'glm[1m]'));
  await assert.rejects(()=>fetchNativeClientCatalog('codex','https://router.test','secret',{fetch:()=>new Promise(()=>{}),timeoutMs:5}),/deadline|cancelled/);
});
