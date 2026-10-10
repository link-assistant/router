import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { CredentialFileStore, OAuthManager, ClaudeLogin, importCredential, parseCredentialDocument, mergeCredentialDocument, validateOAuthEndpoint, validateCredentialCatalog, oauthHeaders, executeAuthOperation, CLAUDE_CLIENT_ID, CODEX_CLIENT_ID } from '../native/oauth.mjs';
import { createRouterCore } from '../native/core.mjs';
import { atomicWrite, decodeLino } from '../native/storage.mjs';
const fixture = JSON.parse(await readFile(new URL('../../../parity/fixtures/oauth/credential-shapes.json',import.meta.url),'utf8'));
const clock = () => fixture.clock;
const jsonResponse = (data,status = 200) => new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const rejectCode = (promise,code) => assert.rejects(promise,error => error.code === code);
async function temporary(t) { const home = await mkdtemp(join(tmpdir(),'router-native-oauth-')); t.after(() => rm(home,{recursive:true,force:true})); return home; }
async function seed(home,provider,document) { await mkdir(home,{recursive:true}); await writeFile(join(home,provider === 'claude' ? '.credentials.json' : 'auth.json'),JSON.stringify(document),{mode:0o600}); }
const store = (home,provider = 'claude',extra = {}) => new CredentialFileStore({provider,home,dataDir:join(home,'state'),clock,...extra});
const expiredClaude = () => ({...structuredClone(fixture.claude_nested),claudeAiOauth:{...fixture.claude_nested.claudeAiOauth,expiresAt:fixture.clock*1000-1}});

test('Claude layout pairs nested access with nested refresh/expiry and accepts flat snake_case',() => {
  const mixed = {...fixture.claude_nested,accessToken:'old-flat',refreshToken:'old-refresh',expiresAt:1};
  const nested = parseCredentialDocument('anthropic',mixed);
  assert.equal(nested.token.access_token,'fixture-claude-access');
  assert.equal(nested.token.refresh_token,'fixture-claude-refresh');
  assert.equal(nested.token.expires_at_ms,1700003600000);
  assert.deepEqual(nested.scopes,['user:inference','user:profile']);
  assert.equal(parseCredentialDocument('claude',fixture.claude_flat).token.access_token,'fixture-flat-access');
  assert.throws(() => parseCredentialDocument('claude',{claudeAiOauth:{accessToken:'x',expiresAt:'tomorrow'}}));
});
test('Codex derives expiry and identity hints from exact nested carrier and refuses API-key auth',() => {
  const parsed = parseCredentialDocument('chatgpt',fixture.codex);
  assert.equal(parsed.token.account_id,'fixture-account');
  assert.equal(parsed.token.expires_at_ms,1700003600000);
  assert.equal(oauthHeaders('codex',parsed.token)['chatgpt-account-id'],'fixture-account');
  assert.throws(() => parseCredentialDocument('codex',{OPENAI_API_KEY:'fixture-api-key'}),error => error.code === 'credential_missing_token');
  assert.ok(!oauthHeaders('codex',{account_id:'injected\r\nvalue'})['chatgpt-account-id']);
});
test('OAuth grant endpoints reject credentials, redirects, remote overrides and plain HTTP',async () => {
  for (const url of ['http://remote.invalid/token','https://user:secret@auth.openai.com/oauth/token','https://auth.openai.com/oauth/token#fragment','https://attacker.invalid/token']) assert.throws(() => new OAuthManager({fetch:async()=>{},endpoints:{codex:url}}),error => error.code === 'invalid_oauth_endpoint');
  assert.equal(validateOAuthEndpoint('http://127.0.0.1:3210/token',{allowLoopback:true,expected:'https://official.invalid/token'}),'http://127.0.0.1:3210/token');
});
test('Claude concurrent refresh deduplicates across manager instances and durably rotates before return',async t => {
  const home = await temporary(t); await seed(home,'claude',expiredClaude());
  const calls = [];
  const fetch = async (url,request) => { calls.push({url,request}); await new Promise(resolve => setTimeout(resolve,10)); return jsonResponse(fixture.refresh_response); };
  const first = new OAuthManager({fetch,clock}), second = new OAuthManager({fetch,clock});
  const held = store(home);
  const tokens = await Promise.all(Array.from({length:20},(_,i) => (i%2 ? first:second).getFresh(held)));
  assert.equal(calls.length,1); assert.equal(tokens[0].access_token,'fixture-successor-access');
  const body = JSON.parse(calls[0].request.body);
  assert.deepEqual(body,{grant_type:'refresh_token',refresh_token:'fixture-claude-refresh',client_id:CLAUDE_CLIENT_ID});
  assert.equal(calls[0].request.headers['user-agent'],'anthropic-sdk-typescript/0.112.1 userOAuthProvider');
  assert.equal(calls[0].request.redirect,'error');
  const written = JSON.parse(await readFile(join(home,'.credentials.json'),'utf8'));
  assert.equal(written.claudeAiOauth.refreshToken,'fixture-successor-refresh');
  assert.deepEqual(written.unrelated,{preserve:true});
  assert.equal((await stat(join(home,'.credentials.json'))).mode & 0o777,0o600);
  assert.equal((await new OAuthManager({fetch:async()=>assert.fail('unexpected exchange'),clock}).getFresh(store(home))).refresh_token,'fixture-successor-refresh');
});
test('refresh respects five-minute skew and expired credentials without refresh grants fail closed',async t => {
  const home = await temporary(t), document = structuredClone(fixture.claude_nested);
  document.claudeAiOauth.expiresAt = fixture.clock*1000+299000;
  await seed(home,'claude',document); let exchanges = 0;
  const manager = new OAuthManager({fetch:async()=>{exchanges++;return jsonResponse(fixture.refresh_response);},clock});
  await manager.getFresh(store(home)); assert.equal(exchanges,1);
  document.claudeAiOauth.expiresAt = fixture.clock*1000-1; delete document.claudeAiOauth.refreshToken;
  await seed(home,'claude',document);
  await rejectCode(manager.getFresh(store(home)),'no_refresh_token');
});
test('Codex refresh uses JSON public client and preserves id_token, auth_mode and unknown fields',async t => {
  const home = await temporary(t), document = structuredClone(fixture.codex);
  document.tokens.access_token = 'header.eyJleHAiOjF9.signature';
  await seed(home,'codex',document); let request;
  const manager = new OAuthManager({fetch:async(_url,options)=>{request=options;return jsonResponse(fixture.refresh_response);},clock});
  const token = await manager.getFresh(store(home,'codex'));
  assert.equal(JSON.parse(request.body).client_id,CODEX_CLIENT_ID);
  assert.equal(request.headers['content-type'],'application/json');
  assert.equal(token.account_id,'fixture-account');
  const written = JSON.parse(await readFile(join(home,'auth.json'),'utf8'));
  assert.equal(written.tokens.id_token,document.tokens.id_token); assert.equal(written.auth_mode,'chatgpt'); assert.equal(written.unknown_field,'preserve');
  assert.equal(written.last_refresh,new Date(fixture.clock*1000).toISOString());
});
test('read-only primary retains Rust recovery projection and restores successor after restart',async t => {
  const home = await temporary(t); await seed(home,'claude',expiredClaude());
  const credential = store(home,'claude',{write:async(path,text) => {if (path.endsWith('.credentials.json')) throw new Error('read-only');return atomicWrite(path,text);}});
  const manager = new OAuthManager({fetch:async()=>jsonResponse(fixture.refresh_response),clock});
  assert.equal((await manager.getFresh(credential)).access_token,'fixture-successor-access');
  const recovery = JSON.parse(await readFile(credential.recoveryPath,'utf8'));
  assert.equal(recovery.version,1); assert.equal(recovery.provider,'claude'); assert.match(recovery.baseline_fingerprint,/^[0-9a-f]{64}$/);
  assert.equal((await stat(credential.recoveryPath)).mode & 0o777,0o600);
  const restored = await store(home).transaction(() => store(home).reload());
  assert.equal(restored.token.access_token,'fixture-successor-access');
  assert.equal(JSON.parse(await readFile(join(home,'.credentials.json'),'utf8')).claudeAiOauth.refreshToken,'fixture-successor-refresh');
});
test('persistence failure and uncertain grant never return access credentials or retry spent chain',async t => {
  const home = await temporary(t); await seed(home,'claude',expiredClaude());
  let count = 0;
  const credential = store(home,'claude',{write:async()=>{throw new Error('unwritable');}});
  const manager = new OAuthManager({fetch:async()=>{count++;return jsonResponse(fixture.refresh_response);},clock});
  await rejectCode(manager.getFresh(credential),'credential_persistence_failed');
  await rejectCode(manager.getFresh(credential),'oauth_exchange_uncertain'); assert.equal(count,1);
  const updated = expiredClaude(); updated.claudeAiOauth.refreshToken = 'owner-advanced-refresh'; await seed(home,'claude',updated);
  const uncertain = new OAuthManager({fetch:async()=>{count++;throw new Error('network included secret');},clock});
  await rejectCode(uncertain.getFresh(store(home)),'oauth_exchange_uncertain');
  await rejectCode(uncertain.getFresh(store(home)),'oauth_exchange_uncertain'); assert.equal(count,2);
});
test('external refresh owners, platform keychain, binary stores and malformed recovery fail closed',async t => {
  const home = await temporary(t), document = expiredClaude();
  document._link_assistant_router = {refresh_owner:'external'}; await seed(home,'claude',document);
  const manager = new OAuthManager({fetch:async()=>assert.fail('external exchange must not occur'),clock});
  await rejectCode(manager.getFresh(store(home)),'external_refresh_owner');
  for (const origin of ['keychain','binary']) assert.throws(() => store(home,'claude',{origin}),error => error.code === 'native_unsupported');
  delete document._link_assistant_router; await seed(home,'claude',document);
  const credential = store(home); await mkdir(join(home,'state','refresh-recovery'),{recursive:true}); await writeFile(credential.recoveryPath,'{broken');
  await rejectCode(manager.getFresh(credential),'credential_recovery_invalid');
});
test('adopted pointers read latest owner document and refresh owning file rather than pointer',async t => {
  const root = await temporary(t), source = join(root,'source'), destination = join(root,'destination');
  await seed(source,'claude',expiredClaude()); await mkdir(destination);
  const pointer = {_link_assistant_router:{credential_source:join(source,'.credentials.json'),promotion_receipt:'fixture'}};
  await writeFile(join(destination,'.credentials.json'),JSON.stringify(pointer));
  const manager = new OAuthManager({fetch:async()=>jsonResponse(fixture.refresh_response),clock});
  await manager.getFresh(store(destination));
  assert.deepEqual(JSON.parse(await readFile(join(destination,'.credentials.json'),'utf8')),pointer);
  assert.equal(JSON.parse(await readFile(join(source,'.credentials.json'),'utf8')).claudeAiOauth.refreshToken,'fixture-successor-refresh');
});
test('exact Claude scope denial occurs before inference bearer preparation',async t => {
  const home = await temporary(t), document = structuredClone(fixture.claude_nested); document.claudeAiOauth.scopes = ['user:profile'];
  await seed(home,'claude',document);
  await rejectCode(new OAuthManager({fetch:async()=>assert.fail('no refresh'),clock}).headers(store(home)),'oauth_scope_missing');
});
test('catalog acceptance authenticates exact provider identity and checks pagination',async () => {
  let calls = 0;
  const models = await validateCredentialCatalog({provider:'claude',token:{access_token:'fixture'},fetch:async(url,request)=>{assert.equal(request.headers.authorization,'Bearer fixture');assert.equal(request.headers['anthropic-beta'],'oauth-2025-04-20');assert.equal(request.redirect,'error');calls++;return jsonResponse(calls===1 ? {data:[{id:'exact-a'}],has_more:true,last_id:'cursor-a'}:{data:[{id:'exact-b'}]});}});
  assert.deepEqual(models,['exact-a','exact-b']);
  await rejectCode(validateCredentialCatalog({provider:'codex',token:{access_token:'fixture'},fetch:async()=>jsonResponse({models:[]})}),'catalog_unverified');
});
test('validated import preserves source bytes, atomically references owner and leaves old credential on rejection',async t => {
  const root = await temporary(t), source = join(root,'source'), destination = join(root,'destination'), data = join(root,'data');
  await seed(source,'claude',fixture.claude_nested); await seed(destination,'claude',fixture.claude_flat);
  const original = await readFile(join(source,'.credentials.json'),'utf8');
  const args = {provider:'claude',sourceHome:source,destinationHome:destination,dataDir:data,clock};
  await rejectCode(importCredential({...args,validateCatalog:async()=>{throw Object.assign(new Error('rejected'),{code:'catalog_rejected'});}}),'catalog_rejected');
  assert.equal(parseCredentialDocument('claude',await readFile(join(destination,'.credentials.json'),'utf8')).token.access_token,'fixture-flat-access');
  const report = await importCredential({...args,validateCatalog:async()=>['model-a']});
  assert.equal(report.results[0].outcome,'promoted'); assert.ok(!JSON.stringify(report).includes('fixture-claude-access'));
  assert.equal(await readFile(join(source,'.credentials.json'),'utf8'),original);
  assert.equal((await store(destination).readPrimary()).token.access_token,'fixture-claude-access');
  assert.equal((await importCredential({...args,ifAbsent:true,validateCatalog:async()=>assert.fail('should not validate')})).results[0].outcome,'already_present');
});
test('snapshot import marks external refresh ownership and source changes during validation cannot promote',async t => {
  const root = await temporary(t), source = join(root,'source'), destination = join(root,'destination'), data = join(root,'data');
  await seed(source,'claude',fixture.claude_nested);
  const args = {provider:'claude',sourceHome:source,destinationHome:destination,dataDir:data,clock};
  await rejectCode(importCredential({...args,validateCatalog:async()=>{const doc=structuredClone(fixture.claude_nested);doc.claudeAiOauth.accessToken='owner-new-access';await seed(source,'claude',doc);return ['model-a'];}}),'credential_changed');
  await importCredential({...args,snapshot:true,validateCatalog:async()=>['model-a']});
  assert.equal((await store(destination).readPrimary()).origin,'external');
});
test('Claude PKCE persisted flow uses Rust pending carrier and exchange shape with narrow scope',async t => {
  const home = await temporary(t), requests = [];
  const manager = new OAuthManager({clock,fetch:async(_url,request)=>{requests.push(request);return jsonResponse({...fixture.refresh_response,scope:'user:inference'});}});
  const begun = await ClaudeLogin.begin({home,mode:'setup-token',clock,manager});
  const url = new URL(begun.authorizationURL());
  assert.equal(url.searchParams.get('scope'),'user:inference'); assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  const pending = decodeLino(await readFile(join(home,'.link-assistant-router-claude-login.json'),'utf8'));
  assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(pending.code_verifier).digest('base64url'));
  assert.equal((await stat(join(home,'.link-assistant-router-claude-login.json'))).mode & 0o777,0o600);
  const resumed = await ClaudeLogin.resume({home,mode:'setup-token',clock,manager});
  const report = await resumed.complete(`copied-code#${pending.state}`,{validateCatalog:async()=>['model-a']});
  assert.equal(report.results[0].outcome,'promoted');
  const body = JSON.parse(requests[0].body); assert.equal(body.grant_type,'authorization_code'); assert.equal(body.code_verifier,pending.code_verifier);
  assert.deepEqual((await store(home).readPrimary()).scopes,['user:inference']);
  await rejectCode(ClaudeLogin.resume({home,clock,manager}),'pending_login_missing');
  await rejectCode(resumed.complete('copied-code'),'pending_login_consumed');
});
test('PKCE state mismatch and expiry cannot exchange or replace existing credentials',async t => {
  const home = await temporary(t); await seed(home,'claude',fixture.claude_nested);
  const manager = new OAuthManager({fetch:async()=>assert.fail('must not exchange'),clock});
  await ClaudeLogin.begin({home,clock,manager});
  const resumed = await ClaudeLogin.resume({home,clock,manager});
  await rejectCode(resumed.complete('code#wrong-state'),'oauth_state_mismatch');
  await ClaudeLogin.begin({home,clock,manager});
  await rejectCode(ClaudeLogin.resume({home,clock:()=>fixture.clock+601,manager}),'pending_login_expired');
  assert.equal((await store(home).readPrimary()).token.access_token,'fixture-claude-access');
});
test('core prepares only selected OAuth credentials and cannot bypass account pause/pin',async t => {
  const root = await temporary(t), first = join(root,'first'), second = join(root,'second');
  await seed(first,'claude',expiredClaude()); await seed(second,'claude',expiredClaude()); let exchanges = 0;
  const core = await createRouterCore({env:{},clock,fetch:async()=>{exchanges++;return jsonResponse(fixture.refresh_response);},config:{token_secret:'test',storage_policy:'memory',data_dir:join(root,'state'),account_strategy:'priority',providers:[{name:'claude',kind:'anthropic',base_url:'https://api.anthropic.com',models:['exact-model']}],accounts:[{name:'first',provider:'claude',credential_home:first},{name:'second',provider:'claude',credential_home:second}]}});
  const candidates = await core.candidates({model:'exact-model'}); assert.equal(exchanges,0);
  const route = await core.prepareCandidate(candidates[0]);
  assert.equal(exchanges,1); assert.equal(route.auth_type,'oauth'); assert.equal(route.apiKey,'fixture-successor-access'); assert.equal(route.oauth_headers['anthropic-beta'],'oauth-2025-04-20');
  await core.accounts.pause('first');
  await rejectCode(core.prepareCandidate(candidates[0]),'account_unavailable');
  await rejectCode(core.route({model:'exact-model',pinnedAccount:'first'}),'pinned_account_unavailable');
  assert.equal(exchanges,1);
});
test('native auth operation refuses unavailable resume, bulk, remote and Codex interactive flows',async t => {
  const home = await temporary(t);
  for (const options of [{all:true},{resume:'id'},{router:'remote'}]) await rejectCode(executeAuthOperation({name:'auth.import',options,config:{data_dir:home},env:{CLAUDE_CODE_HOME:home}}),'native_unsupported');
  await rejectCode(executeAuthOperation({name:'auth.codex',options:{},config:{data_dir:home,codex_home:home}}),'native_unsupported');
});

test('account paused while refresh is in flight cannot issue an inference bearer candidate',async t => {
  const home = await temporary(t); await seed(home,'claude',expiredClaude());
  let entered, release; const started = new Promise(resolve => {entered=resolve;}); const barrier = new Promise(resolve => {release=resolve;});
  const core = await createRouterCore({env:{},clock,fetch:async()=>{entered();await barrier;return jsonResponse(fixture.refresh_response);},config:{storage_policy:'memory',data_dir:join(home,'state'),providers:[{name:'claude',kind:'anthropic',base_url:'https://api.anthropic.com',models:['model-a'],credential_home:home}]}});
  const preparing = core.route({model:'model-a'}); await started; await core.accounts.pause('claude'); release();
  await rejectCode(preparing,'account_unavailable');
});
test('catalogFor isolates pinned account aliases and exact client compatibility without advancing account selection',async t => {
  const home = await temporary(t);
  const core = await createRouterCore({env:{},clock,config:{data_dir:home,storage_policy:'memory',providers:[{name:'local',base_url:'http://127.0.0.1:1/v1',models:['model-a'],supported_clients:['codex']}],accounts:[{name:'one',provider:'local',policy:{model_aliases:[{model:'model-a',alias:'only-one',fork:true}]}},{name:'two',provider:'local',policy:{model_aliases:[{model:'model-a',alias:'only-two',fork:true}]}}]}});
  const pinned = await core.catalogFor({client:'codex',pinnedAccount:'one'});
  assert.ok(pinned.some(row => row.id === 'only-one')); assert.ok(!pinned.some(row => row.id === 'only-two'));
  assert.deepEqual(await core.catalogFor({client:'claude'}),[]); assert.equal(core.accounts.cursor,0);
});

test('completing a begun PKCE object atomically consumes its persisted pending grant',async t => {
  const home = await temporary(t), manager = new OAuthManager({clock,fetch:async()=>jsonResponse(fixture.refresh_response)});
  const login = await ClaudeLogin.begin({home,clock,manager});
  await login.complete('code',{validateCatalog:async()=>['model-a']});
  await rejectCode(ClaudeLogin.resume({home,clock,manager}),'pending_login_missing');
});
