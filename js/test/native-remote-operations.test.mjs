import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,mkdir,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:http';
import {nativeRemoteCall,parsePauseUntil,executeRemoteOperation,sendRemoteManagement} from '../src/remote-operations.mjs';
import {selectedManagedTarget} from '../src/managed-server.mjs';
const target = {server:'http://127.0.0.1:9000',managementServer:'http://127.0.0.1:9001',source:'flag',token:'admin-secret'};

test('management calls preserve canonical routes and typed Rust DTO fields',()=> {
  assert.deepEqual(nativeRemoteCall('tokens.rotate',{id:'old',ttl_hours:'48',max_requests:'0',max_tokens:'12',rate_limit_per_minute:'5'}),{
    method:'POST',path:'/api/management/tokens/rotate-client',body:{id:'old',ttl_hours:48,label:null,max_requests:0,max_tokens:12,rate_limit_per_minute:5,account:null}});
  assert.deepEqual(nativeRemoteCall('tokens.issue',{}).body,{ttl_hours:24,label:'',account:null,max_requests:null,max_tokens:null,rate_limit_per_minute:null,scope:null,github_repos:null,allowed_models:null});
  assert.equal(nativeRemoteCall('tokens.list').path,'/api/management/tokens');
  assert.deepEqual(nativeRemoteCall('accounts.pause',{name:'team/a !',until:'90m'},{nowUnix:100}).body,{reason:'paused by an operator',until_unix:5500});
  assert.equal(nativeRemoteCall('accounts.pause',{name:'team/a !'}).path,'/api/management/accounts/team%2Fa%20%21/pause');
  assert.throws(()=>nativeRemoteCall('tokens.rotate',{max_requests:'garbage'}),/safe integer/);
});
test('pause deadlines accept seconds, delays, timezone offsets and reject pre-epoch or unsafe values',()=> {
  assert.equal(parsePauseUntil(' 1710000000 '),1710000000);
  assert.equal(parsePauseUntil('2d',100),172900);
  assert.equal(parsePauseUntil('1970-01-01T01:00:00+01:00'),0);
  for (const value of ['-1','90M','yesterday','1969-12-31T23:59:59Z','999999999999999999999999']) assert.throws(()=>parsePauseUntil(value));
});
test('real remote HTTP preserves selected destination, bearer, request body and list/show semantics',async t=> {
  const seen=[];
  const server=createServer(async(req,res)=> {
    const chunks=[];for await (const bytes of req) chunks.push(bytes);
    seen.push({path:req.url,method:req.method,token:req.headers.authorization,body:chunks.length ? JSON.parse(Buffer.concat(chunks)) : null});
    res.setHeader('content-type','application/json');res.end(JSON.stringify(req.method==='POST' ? {token:'issued'} : {data:[{id:'one',label:'first'}]}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const held={...target,managementServer:`http://127.0.0.1:${server.address().port}`};
  assert.deepEqual(await executeRemoteOperation({name:'tokens.issue',options:{admin:true,ttl_hours:'2'},target:held}),{token:'issued'});
  assert.deepEqual(await executeRemoteOperation({name:'tokens.show',options:{id:'one'},target:held}),{id:'one',label:'first'});
  await assert.rejects(executeRemoteOperation({name:'tokens.show',options:{id:'missing'},target:held}),error=>error.exitCode===2);
  assert.equal(seen[0].path,'/api/management/tokens');assert.equal(seen[0].token,'Bearer admin-secret');assert.equal(seen[0].body.scope,'admin');assert.equal(seen[0].body.ttl_hours,2);
});
test('selected deployment has no silent local fallback or redirect and never exposes token on errors',async()=> {
  let calls=0;const fetch=async()=>{calls++;throw new Error('admin-secret');};
  await assert.rejects(executeRemoteOperation({name:'tokens.import',target,fetch}),error=>error.exitCode===2 && /no remote form/.test(error.message));
  await assert.rejects(executeRemoteOperation({name:'logs.query',target,fetch}),/cannot answer for selected router/);assert.equal(calls,0);
  await assert.rejects(executeRemoteOperation({name:'tokens.list',target,fetch}),error=>!error.message.includes('admin-secret'));
  await assert.rejects(sendRemoteManagement(target,nativeRemoteCall('tokens.list'),{fetch:async()=>({url:'https://other.example/',ok:true,status:200})}),/changed origin/);
});
test('deadline caps uncooperative fetch and uncooperative body without hanging cancel',async()=> {
  const before=Date.now();await assert.rejects(sendRemoteManagement(target,nativeRemoteCall('tokens.list'),{deadlineMs:30,fetch:()=>new Promise(()=>{})}),/deadline/);
  const body = new ReadableStream({pull:()=>new Promise(()=>{}),cancel:()=>new Promise(()=>{})});
  await assert.rejects(sendRemoteManagement(target,nativeRemoteCall('tokens.list'),{deadlineMs:30,fetch:async()=>new Response(body)}),/deadline/);
  assert.ok(Date.now()-before<1000);
});
test('response bounds and malformed or failed server responses fail closed',async()=> {
  await assert.rejects(sendRemoteManagement(target,nativeRemoteCall('tokens.list'),{maxOutputBytes:4,fetch:async()=>new Response('{"data":[]}')}),/output budget/);
  await assert.rejects(sendRemoteManagement(target,nativeRemoteCall('tokens.list'),{fetch:async()=>new Response('not json')}),/invalid JSON/);
  await assert.rejects(sendRemoteManagement(target,nativeRemoteCall('tokens.list'),{fetch:async()=>new Response('{}',{status:404})}),error=>error.exitCode===2);
  await assert.rejects(executeRemoteOperation({name:'tokens.list',target,fetch:async()=>new Response('{}')}),/malformed/);
});
test('saved selection tokens follow matching origins and explicit targets override invalid saved state',async t=> {
  const dir=await realpath(await mkdtemp(join(tmpdir(),'router-remote-')));t.after(()=>rm(dir,{recursive:true,force:true}));await mkdir(join(dir,'native-managed'));
  const path=join(dir,'native-managed','server.json');
  await writeFile(path,JSON.stringify({server:'http://127.0.0.1:9000',management_server:'http://127.0.0.1:9001',token:'persisted'}));
  assert.equal((await selectedManagedTarget({name:'tokens.list',options:{server:target.server},config:{data_dir:dir}})).token,'persisted');
  assert.equal((await selectedManagedTarget({name:'tokens.list',options:{server:'http://127.0.0.1:9002'},config:{data_dir:dir}})).token,undefined);
  assert.equal(await selectedManagedTarget({name:'tokens.list',options:{local:true,server:target.server},config:{data_dir:dir}}),null);
  await writeFile(path,'{}');
  assert.equal((await selectedManagedTarget({name:'tokens.list',options:{server:target.server},config:{data_dir:dir}})).source,'flag');
  await assert.rejects(selectedManagedTarget({name:'tokens.list',config:{data_dir:dir}}));
});

test('provider imports are parsed before requests, stop at first failure and redact unknown response secrets',async t=> {
  const {parseProviderImport}=await import('../src/provider-manifest.mjs');
  const samples=[JSON.stringify([{name:'a',base_url:'https://vendor.invalid'}]),'{"providers":[{"name":"a","base_url":"https://vendor.invalid"}]}','PROVIDER: {"name":"a","base_url":"https://vendor.invalid"}','a\n  base-url "https://vendor.invalid"\n  models one, two\n  enabled yes'];
  for (const sample of samples) assert.equal(parseProviderImport(sample)[0].name,'a');
  assert.deepEqual(parseProviderImport(samples[3])[0].models,['one','two']);
  assert.throws(()=>parseProviderImport('[{"name":"a","kind":"lefine","base_url":"https://vendor.invalid","api_key":"private"}]'),/plaintext/);
  const dir=await realpath(await mkdtemp(join(tmpdir(),'router-providers-')));t.after(()=>rm(dir,{recursive:true,force:true}));
  const path=join(dir,'providers.json');await writeFile(path,JSON.stringify(['a','b','c'].map(name=>({name,base_url:'https://vendor.invalid'}))));let calls=0;
  const fetch=async(_,request)=> {
    calls++;const record=JSON.parse(request.body);
    if (record.name==='b') return new Response(JSON.stringify({error:{outcome:'credential_rejected'}}),{status:401});
    return new Response(JSON.stringify({name:record.name,outcome:'created',kind:'openai-compatible',base_url:record.base_url,models:[],supported_clients:[],unsupported_clients:[],has_encrypted_api_key:false,enabled:true,intermediary_risk_acknowledged:false,api_key:'must-not-appear'}));
  };
  await assert.rejects(executeRemoteOperation({name:'providers.import',options:{path:'providers.json'},invocation:{cwd:dir},target,fetch}),failure=> {
    const report=JSON.parse(failure.data.output[0]);assert.equal(report.complete,false);assert.deepEqual(report.results.map(result=>result.outcome),['created','credential_rejected']);assert.equal(JSON.stringify(report).includes('must-not-appear'),false);return true;
  });assert.equal(calls,2);
});

test('server use copies trust privately and management HTTPS verifies the selected CA',async t=> {
  const {execFileSync}=await import('node:child_process'),{createServer:createHttpsServer}=await import('node:https');
  const {executeManagedOperation}=await import('../src/managed-server.mjs');
  const dir=await realpath(await mkdtemp(join(tmpdir(),'router-remote-ca-')));t.after(()=>rm(dir,{recursive:true,force:true}));
  const cert=join(dir,'source.pem'),key=join(dir,'key.pem');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1'],{stdio:'ignore',timeout:10000});
  const {readFile}=await import('node:fs/promises');const server=createHttpsServer({key:await readFile(key),cert:await readFile(cert)},(req,res)=>res.end('{"data":[]}'));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`https://127.0.0.1:${server.address().port}`,env={XDG_CONFIG_HOME:join(dir,'config')},config={data_dir:join(dir,'data')};
  await executeManagedOperation({name:'server.use',options:{server:url,ca_cert:cert},config,env});
  const selected=await selectedManagedTarget({name:'tokens.list',config,env});assert.equal(selected.managementServer,url);assert.notEqual(selected.managementCaCert,cert);
  await rm(cert);assert.deepEqual(await executeRemoteOperation({name:'tokens.list',target:selected}),[]);
  await assert.rejects(executeRemoteOperation({name:'tokens.list',target:{...selected,managementCaCert:undefined}}),/request failed/);
});
