import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CredentialFileStore,OAuthManager,parseCredentialDocument,mergeCredentialDocument,subscriptionHome,subscriptionBaseURL,validateCredentialCatalog,GEMINI_CLIENT_ID,GEMINI_CLIENT_SECRET,QWEN_CLIENT_ID} from '../src/oauth.mjs';
import {withAdvisoryFileLock} from '../src/file-lock.mjs';
import {createRouterCore} from '../src/core.mjs';
const now = 1700000000,clock = () => now;
const json = value => new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
async function fixture(t,provider) {
  const home = await mkdtemp(join(tmpdir(),'router-flat-oauth-'));t.after(()=>rm(home,{recursive:true,force:true}));
  const document = {accessToken:'old-access',refreshToken:'chain+/=',expiryDate:1,scope:'openid cloud-platform',resourceUrl:provider === 'qwen' ? 'portal.qwen.ai' : undefined,unknown:{retained:true}};
  await writeFile(join(home,'oauth_creds.json'),JSON.stringify(document));
  return {home,document,store:new CredentialFileStore({provider,home,dataDir:join(home,'data'),clock})};
}
test('Gemini and Qwen flat aliases preserve ownership metadata while refreshed fields match vendor canonical layout',()=>{
  for (const provider of ['google','dashscope']) {
    const parsed = parseCredentialDocument(provider,{oauthToken:'access',refreshToken:'refresh',expiryDate:1200,accountId:'account',resourceUrl:'portal.qwen.ai',unknown:7});
    assert.equal(parsed.token.account_id,'account');assert.equal(parsed.token.expires_at_ms,1200);
    const merged = mergeCredentialDocument(provider,parsed.document,{...parsed.token,access_token:'successor',refresh_token:'next',expires_at_ms:5000},1000);
    assert.equal(merged.access_token,'successor');assert.equal(merged.refresh_token,'next');assert.equal(merged.expiry_date,5000);assert.equal(merged.resourceUrl,'portal.qwen.ai');assert.equal(merged.unknown,7);
  }
  assert.equal(subscriptionBaseURL('qwen',{resource_url:'portal.qwen.ai'}),'https://portal.qwen.ai/v1');
  assert.equal(subscriptionBaseURL('qwen',{resource_url:'https://portal.qwen.ai/v1/'}),'https://portal.qwen.ai/v1/');
  assert.throws(()=>subscriptionBaseURL('qwen',{resource_url:'https://user:secret@portal.qwen.ai'}));
});
test('home selection honors official Gemini root and isolated operation environment',()=>{
  assert.equal(subscriptionHome('gemini',{config:{data_dir:'/data'},env:{GEMINI_CLI_HOME:'/official',GEMINI_HOME:'/legacy'}}),'/official/.gemini');
  assert.equal(subscriptionHome('qwen',{config:{home:'/owner'},env:{}}),'/owner/.qwen');
  assert.equal(subscriptionHome('claude',{config:{claude_code_home:'/explicit'},env:{HOME:'/owner'}}),'/explicit');
});
for (const provider of ['gemini','qwen']) test(`${provider} refresh uses encoded form grant and durable canonical successor`,async t=>{
  const {home,store} = await fixture(t,provider);let request,url;
  const manager = new OAuthManager({clock,fetch:async (address,options)=>{url=address;request=options;return json({access_token:'successor',refresh_token:'successor-refresh',expires_in:3600});}});
  const token = await manager.getFresh(store);
  assert.equal(request.headers['content-type'],'application/x-www-form-urlencoded');
  const form = new URLSearchParams(request.body);
  assert.equal(form.get('refresh_token'),'chain+/=');assert.equal(form.get('client_id'),provider === 'gemini' ? GEMINI_CLIENT_ID : QWEN_CLIENT_ID);
  assert.equal(form.get('client_secret'),provider === 'gemini' ? GEMINI_CLIENT_SECRET : null);
  assert.equal(url,provider === 'gemini' ? 'https://oauth2.googleapis.com/token' : 'https://chat.qwen.ai/api/v1/oauth2/token');
  assert.equal(token.access_token,'successor');assert.equal(token.resource_url,provider === 'qwen' ? 'portal.qwen.ai' : null);
  const document = JSON.parse(await readFile(join(home,'oauth_creds.json'),'utf8'));
  assert.equal(document.access_token,'successor');assert.equal(document.expiry_date,(now+3600)*1000);assert.deepEqual(document.unknown,{retained:true});
});
test('Gemini custom installed client overrides are atomic and operation scoped',async t=>{
  const {store} = await fixture(t,'gemini');let called = 0;
  const fetch = async (_url,options)=>{called++;const form=new URLSearchParams(options.body);assert.equal(form.get('client_id'),'custom-id');assert.equal(form.get('client_secret'),'custom-secret');return json({access_token:'successor',expires_in:3600});};
  await assert.rejects(new OAuthManager({clock,fetch,env:{GEMINI_OAUTH_CLIENT_ID:'custom-id'}}).getFresh(store),error=>error.code === 'invalid_oauth_client');
  assert.equal(called,0);
  await new OAuthManager({clock,fetch,env:{GEMINI_OAUTH_CLIENT_ID:'custom-id',GEMINI_OAUTH_CLIENT_SECRET:'custom-secret'}}).getFresh(store);assert.equal(called,1);
});
test('credential refresh waits for the exact shared Rust advisory lock path',async t=>{
  const {store} = await fixture(t,'qwen');let release,entered,exchanges = 0;
  const held = new Promise(resolve=>{entered=resolve;}),barrier=new Promise(resolve=>{release=resolve;});
  const owning = withAdvisoryFileLock(store.lockPath,async()=>{entered();await barrier;});await held;
  const manager = new OAuthManager({clock,fetch:async()=>{exchanges++;return json({access_token:'successor',expires_in:3600});}});
  const refresh = manager.getFresh(store);await new Promise(resolve=>setTimeout(resolve,100));assert.equal(exchanges,0);release();await owning;await refresh;assert.equal(exchanges,1);
});
test('Gemini authenticated catalog uses registry pagination and exact names rather than guessed model aliases',async()=>{
  const urls = [];
  const models = await validateCredentialCatalog({provider:'gemini',token:{access_token:'credential'},fetch:async(url,request)=>{
    urls.push(url);assert.equal(request.headers.authorization,'Bearer credential');
    return json(url.searchParams.has('pageToken') ? {models:[{name:'models/exact-second'}]} : {models:[{name:'models/exact-first'}],nextPageToken:'page-2'});
  }});
  assert.deepEqual(models,['models/exact-first','models/exact-second']);assert.equal(urls[0].origin,'https://generativelanguage.googleapis.com');assert.equal(urls[0].pathname,'/v1beta/models');assert.equal(urls[1].searchParams.get('pageToken'),'page-2');
});
test('Qwen core lazily prepares only selected owning file and applies resource URL after refresh',async t=>{
  const {home} = await fixture(t,'qwen');let exchanges = 0;
  const core = await createRouterCore({env:{QWEN_HOME:home},clock,fetch:async()=>{exchanges++;return json({access_token:'successor',expires_in:3600});},config:{data_dir:join(home,'data'),storage_policy:'memory',providers:[{name:'qwen',kind:'qwen',base_url:'https://dashscope.aliyuncs.com/compatible-mode/v1',models:['model']}]}});
  const candidates = await core.nativeCandidates({service:'qwen',client:'qwen'});assert.equal(exchanges,0);
  const prepared = await core.prepareCandidate(candidates[0]);assert.equal(exchanges,1);assert.equal(prepared.base_url,'https://portal.qwen.ai/v1');assert.equal(prepared.api_key,'successor');
});
