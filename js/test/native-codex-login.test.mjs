import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {mkdtemp,rm,readFile,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {CodexLogin} from '../src/codex-login.mjs';
import {CODEX_CLIENT_ID} from '../src/oauth.mjs';
const verifier='fixture-verifier',challenge=createHash('sha256').update(verifier).digest('base64url');
const access='header.'+Buffer.from(JSON.stringify({exp:1800000000})).toString('base64url')+'.signature';
async function fixture(t,handler) {
  const root=await realpath(await mkdtemp(join(tmpdir(),'router-codex-login-')));t.after(()=>rm(root,{recursive:true,force:true}));
  const requests=[],server=createServer(async(req,res)=> {
    const chunks=[];for await (const bytes of req) chunks.push(bytes);
    const text=Buffer.concat(chunks).toString(),body=req.headers['content-type']==='application/x-www-form-urlencoded' ? Object.fromEntries(new URLSearchParams(text)) : text ? JSON.parse(text) : null;
    const record={path:req.url,method:req.method,body,type:req.headers['content-type']};requests.push(record);res.setHeader('content-type','application/json');
    const result=await handler(record);res.writeHead(result.status ?? 200);res.end(JSON.stringify(result.body));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  return {root,issuer:`http://127.0.0.1:${server.address().port}`,requests};
}
const successful = record=>record.path.endsWith('/usercode') ? {body:{device_auth_id:'device-1',usercode:'ABCD-EFGH',interval:'0'}}
  : record.path.endsWith('/deviceauth/token') ? {body:{authorization_code:'authorized-code',code_verifier:verifier,code_challenge:challenge}}
  : record.path==='/oauth/token' ? {body:{id_token:'id-hint',access_token:access,refresh_token:'rotating-refresh'}}
  : {body:{models:[{slug:'fixture-model'}]}};

test('device authorization uses public client, actual poll/PKCE/form grant and catalog before owned installation',async t=> {
  let polls=0;const {root,issuer,requests}=await fixture(t,record=>record.path.endsWith('/deviceauth/token') && polls++===0 ? {status:403,body:{error:'authorization_pending'}} : successful(record));
  const home=join(root,'codex'),login=await CodexLogin.begin({home,manager:{fetch},issuer,allowLoopback:true,dataDir:join(root,'data'),clock:()=>1700000000});t.after(()=>login.cancel());
  assert.equal(login.userCode,'ABCD-EFGH');assert.equal(login.authorizationURL(),issuer+'/codex/device');await login.wait();
  assert.deepEqual(requests[0].body,{client_id:CODEX_CLIENT_ID});assert.deepEqual(requests[1].body,{device_auth_id:'device-1',user_code:'ABCD-EFGH'});
  const grant=requests.find(record=>record.path==='/oauth/token');assert.equal(grant.type,'application/x-www-form-urlencoded');assert.deepEqual(grant.body,{grant_type:'authorization_code',code:'authorized-code',redirect_uri:issuer+'/deviceauth/callback',client_id:CODEX_CLIENT_ID,code_verifier:verifier});
  assert.ok(requests.some(record=>record.path.startsWith('/models?client_version=')));
  const saved=JSON.parse(await readFile(join(home,'auth.json'),'utf8'));assert.equal(saved.auth_mode,'chatgpt');assert.equal(saved.tokens.refresh_token,'rotating-refresh');assert.equal(saved._link_assistant_router.credential_source,undefined);
  await assert.rejects(login.wait(),error=>error.code==='pending_login_consumed');
});
test('device response PKCE mismatch never exchanges or installs tokens',async t=> {
  const {root,issuer,requests}=await fixture(t,record=>record.path.endsWith('/deviceauth/token') ? {body:{authorization_code:'code',code_verifier:verifier,code_challenge:'wrong'}} : successful(record));
  const home=join(root,'codex'),login=await CodexLogin.begin({home,manager:{fetch},issuer,allowLoopback:true});t.after(()=>login.cancel());
  await assert.rejects(login.wait(),error=>error.code==='oauth_pkce_mismatch');assert.equal(requests.some(record=>record.path==='/oauth/token'),false);
  await assert.rejects(readFile(join(home,'auth.json')),error=>error.code==='ENOENT');
});
test('device denial and cancelled pending polling never install credentials',async t=> {
  const {root,issuer}=await fixture(t,record=>record.path.endsWith('/deviceauth/token') ? {status:400,body:{error:'access_denied'}} : successful(record));
  const login=await CodexLogin.begin({home:join(root,'codex'),manager:{fetch},issuer,allowLoopback:true});t.after(()=>login.cancel());
  await assert.rejects(login.wait(),error=>error.code==='authorization_failed');
  const pending=await CodexLogin.begin({home:join(root,'other'),manager:{fetch:async(_,request)=>JSON.parse(request.body).client_id ? new Response(JSON.stringify({device_auth_id:'id',user_code:'code',interval:100})) : new Response('{"error":"authorization_pending"}',{status:403})},timeoutMs:30});
  await assert.rejects(pending.wait(),error=>error.name==='AbortError' || error.code==='login_cancelled');
});
test('loopback validates state without consuming callback and closes listener before form grant',async t=> {
  const {root,issuer,requests}=await fixture(t,successful),home=join(root,'codex');
  const login=await CodexLogin.begin({home,manager:{fetch},issuer,allowLoopback:true,flow:'loopback',port:0,dataDir:join(root,'data'),clock:()=>1700000000});t.after(()=>login.cancel());
  const authorize=new URL(login.authorizationURL()),state=authorize.searchParams.get('state');assert.equal(authorize.searchParams.get('originator'),'codex_cli_rs');assert.equal(authorize.searchParams.get('code_challenge_method'),'S256');
  const callback=`http://127.0.0.1:${login.port}/auth/callback`;
  assert.equal((await fetch(callback+'?state=wrong&code=code')).status,400);
  assert.equal((await fetch(callback+`?state=${state}&code=loop-code`)).status,200);
  assert.equal((await fetch(callback+`?state=${state}&code=another`)).status,409);
  await login.wait();assert.equal(login.server,null);assert.equal(requests.find(record=>record.path==='/oauth/token').body.redirect_uri,authorize.searchParams.get('redirect_uri'));
  assert.equal(JSON.parse(await readFile(join(home,'auth.json'),'utf8')).tokens.access_token,access);
});
test('unsupported issuer, flow, malformed interval and missing token fields fail explicitly',async t=> {
  for (const issuer of ['https://attacker.invalid','http://auth.openai.com','https://auth.openai.com/path','https://user:secret@auth.openai.com']) await assert.rejects(CodexLogin.begin({home:'unused',manager:{fetch},issuer}),error=>error.code==='invalid_oauth_endpoint');
  await assert.rejects(CodexLogin.begin({home:'unused',manager:{fetch},flow:'code'}),error=>error.code==='invalid_argument');
  await assert.rejects(CodexLogin.begin({home:'unused',manager:{fetch:async()=>new Response('{"device_auth_id":"id","user_code":"code","interval":"invalid"}')}}),error=>error.code==='oauth_response_invalid');
  const {root,issuer}=await fixture(t,record=>record.path==='/oauth/token' ? {body:{access_token:'missing-fields'}} : successful(record));const login=await CodexLogin.begin({home:join(root,'codex'),manager:{fetch},issuer,allowLoopback:true});t.after(()=>login.cancel());
  await assert.rejects(login.wait(),error=>error.code==='oauth_response_invalid');
});

test('HTTP login session uses real Codex driver and reports authorized only after final owned promotion',{timeout:15000},async t=> {
  const {NativeLoginManager}=await import('../src/auth-service.mjs'),{CredentialFileStore}=await import('../src/oauth.mjs');
  const {root,issuer}=await fixture(t,successful),core={config:{data_dir:join(root,'data'),codex_home:join(root,'final')},clock:()=>1700000000,oauth:{fetch},providers:{list:async()=>[]}};
  const manager=new NativeLoginManager(core,{issuer,allowLoopback:true,catalogBaseURL:issuer});t.after(()=>manager.dispose());const begun=await manager.begin({provider:'codex'});
  assert.equal(begun.status,'awaiting_device');assert.equal(begun.user_code,'ABCD-EFGH');
  // Two owning-file promotions use the real advisory lock and durable writes.
  // Observe their result within a bounded window, rather than assuming 1s I/O.
  let status;const deadline=performance.now()+10000;
  do {status=await manager.status(begun.login_id);if (status.status!=='awaiting_device') break;await new Promise(resolve=>setTimeout(resolve,25));}while(performance.now()<deadline);
  assert.equal(status.status,'authorized',JSON.stringify(status));assert.equal(JSON.stringify(status).includes('rotating-refresh'),false);
  assert.equal((await new CredentialFileStore({provider:'codex',home:core.config.codex_home,dataDir:core.config.data_dir}).reload()).token.refresh_token,'rotating-refresh');
});
