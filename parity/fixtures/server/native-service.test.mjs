import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createNativeRouter} from '../../../packages/javascript/native/server.mjs';
import {NativeAffinityStore,nativeURL,nativeRequestHeaders,nativeResponseHeaders} from '../../../packages/javascript/native/native-service.mjs';
import {HTTP_ROUTES,matchHTTPRoute} from '../../../packages/javascript/native/http-route-contract.mjs';

const req = (path,method='GET',body,token='alice',headers={}) => new Request(`http://router${path}`,{method,headers:{authorization:`Bearer ${token}`,...headers},...(body === undefined ? {} : {body:typeof body === 'string' ? body : JSON.stringify(body)})});
const candidate = {provider:'vendor',account:'primary',protocol:'chat',provider_kind:'openai-compatible',base_url:'http://localhost:1/v1',api_key:'vendor-secret'};
const core = (extra={}) => ({config:{},nativeCandidates:async () => [candidate],tokens:{validate:token => ({sub:token,client_kind:'claude',principal_id:token})},...extra});
test('canonical route matcher accepts declared methods and rejects unlisted vendor operations',() => {
  assert.equal(HTTP_ROUTES.length,368);
  assert.ok(matchHTTPRoute('GET','/api/services/anthropic/v1/skills/s/versions/1/content'));
  assert.equal(matchHTTPRoute('POST','/api/services/openai/v1/arbitrary'),undefined);
  assert.equal(matchHTTPRoute('DELETE','/api/services/openai/v1/models/m'),undefined);
});
test('opaque relay forwards actual multipart bytes/query and application headers through localhost',async t => {
  let observed;
  const upstream = createServer(async (incoming,outgoing) => {
    const parts=[];for await (const chunk of incoming)parts.push(chunk);
    observed={method:incoming.method,url:incoming.url,headers:incoming.headers,body:Buffer.concat(parts).toString()};
    outgoing.writeHead(202,{'content-type':'application/octet-stream','x-vendor-info':'kept','set-cookie':'upstream-secret','connection':'x-private','x-private':'drop'});outgoing.end('binary\x00response');
  });
  await new Promise(resolve => upstream.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => {upstream.close(resolve);upstream.closeIdleConnections();}));
  const c=core({nativeCandidates:async () => [{...candidate,base_url:`http://127.0.0.1:${upstream.address().port}/v1`}]});
  const router=createNativeRouter({core:c});
  const body='--part\r\nContent-Disposition: form-data; name="file"\r\n\r\nsecret\x00bytes\r\n--part--\r\n';
  const response=await router.fetch(req('/api/services/openai/v1/audio/transcriptions?language=ru','POST',body,'alice',{'content-type':'multipart/form-data; boundary=part','x-stainless-lang':'js','cookie':'client-secret','x-forwarded-for':'client-origin','x-router-internal':'private','connection':'x-client-private','x-client-private':'private'}));
  assert.equal(response.status,202);assert.equal(await response.text(),'binary\x00response');
  assert.equal(response.headers.get('x-vendor-info'),'kept');assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('x-private'),null);
  assert.equal(observed.url,'/v1/audio/transcriptions?language=ru');assert.equal(observed.body,body);assert.equal(observed.headers.authorization,'Bearer vendor-secret');assert.equal(observed.headers['x-stainless-lang'],'js');
  for(const key of ['cookie','x-forwarded-for','x-router-internal','x-client-private'])assert.equal(observed.headers[key],undefined);
});
test('Conversations retain owner/exact destination and capture upstream-owned child items',async () => {
  const calls=[],affinities=new NativeAffinityStore();let changed=false;
  const c=core({affinities,nativeCandidates:async () => [{...candidate,base_url:changed?'http://other/v1':candidate.base_url}]});
  const router=createNativeRouter({core:c,fetch:async (url,options) => {
    calls.push([String(url),options.method]);
    if(options.method === 'POST' && String(url).endsWith('/conversations'))return Response.json({id:'conv_1',object:'conversation',metadata:{}});
    if(options.method === 'POST')return Response.json({object:'list',data:[{id:'item_1',object:'conversation.item'}]});
    if(String(url).endsWith('/items'))return Response.json({data:[{id:'item_1'},{id:'foreign'}],has_more:false});
    return Response.json({id:'conv_1'});
  }});
  assert.equal((await router.fetch(req('/api/services/openai/v1/conversations','POST',{}))).status,200);
  assert.equal((await router.fetch(req('/api/services/openai/v1/conversations/conv_1','GET',undefined,'bob'))).status,404);
  assert.equal(calls.length,1);
  assert.equal((await router.fetch(req('/api/services/openai/v1/conversations/conv_1/items','POST',{items:[{type:'message'}]}))).status,200);
  const list=await (await router.fetch(req('/api/services/openai/v1/conversations/conv_1/items'))).json();assert.deepEqual(list.data,[{id:'item_1'},{id:'foreign'}]);
  changed=true;assert.equal((await router.fetch(req('/api/services/openai/v1/conversations/conv_1'))).status,503);assert.equal(calls.length,3);
});
test('native Responses capture foreground/background and stream IDs before exposing bytes, then relay exact lifecycle',async()=>{
  const calls=[],affinities=new NativeAffinityStore();
  const router=createNativeRouter({core:core({affinities}),fetch:async(url,options)=>{
    calls.push([String(url),options.method,options.body?.toString()]);
    if(options.method === 'GET')return Response.json({id:'r',status:'completed',output:[]});
    const body=JSON.parse(options.body);
    if(body.stream)return new Response('data: {"type":"response.created","response":{"id":"stream","status":"in_progress"}}\n\ndata: {"type":"response.completed","response":{"id":"stream","usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2}}}\n\n',{headers:{'content-type':'text/event-stream'}});
    return Response.json({id:body.store===false?'unretained':'r',status:body.background?'queued':'completed',model:'m',output:[]});
  }});
  assert.equal((await router.fetch(req('/api/services/openai/v1/responses','POST',{model:'m',input:'hello',background:true}))).status,200);
  assert.equal((await router.fetch(req('/api/services/openai/v1/responses/r'))).status,200);
  assert.equal((await router.fetch(req('/api/services/openai/v1/responses/r','GET',undefined,'bob'))).status,404);
  assert.equal((await router.fetch(req('/api/services/openai/v1/responses','POST',{model:'m',input:'hello',previous_response_id:'r'}))).status,200);
  assert.equal((await router.fetch(req('/api/services/openai/v1/responses','POST',{model:'m',input:'hello',store:false}))).status,200);
  assert.equal((await router.fetch(req('/api/services/openai/v1/responses/unretained'))).status,404);
  const stream=await router.fetch(req('/api/services/openai/v1/responses','POST',{model:'m',input:'hello',stream:true}));assert.equal(stream.status,200);assert.ok(await affinities.get('/api/services/openai/v1/responses',{client_kind:'claude',principal_id:'alice'},'stream'));assert.match(await stream.text(),/response.completed/);
  assert.equal(calls.length,5);
});
test('vendor resources enforce official client, native error passthrough, bounded bodies and references',async () => {
  let calls=0;
  const router=createNativeRouter({core:core(),maxBodyBytes:16,fetch:async () => {calls++;return new Response('upstream failure',{status:422,headers:{'x-request-id':'r'}});}});
  assert.equal((await router.fetch(req('/api/services/anthropic/v1/files','POST','x'.repeat(17)))).status,413);
  const response=await router.fetch(req('/api/services/anthropic/v1/files','POST','bytes'));assert.equal(response.status,422);assert.equal(await response.text(),'upstream failure');assert.equal(response.headers.get('x-request-id'),'r');
  assert.equal((await router.fetch(req('/api/services/anthropic/v1/files/not-owned'))).status,404);
  assert.equal((await router.fetch(req('/api/services/codex/backend-api/wham/usage'))).status,403);
  assert.equal((await router.fetch(req('/api/services/openai/v1/realtime/client_secrets','POST',{}))).status,501);
  assert.equal((await router.fetch(req('/api/services/openai/v1/responses/compact','POST',{previous_response_id:'foreign'}))).status,413);
  assert.equal(calls,1);
});
test('header and URL boundaries preserve native protocol without credential leaks',() => {
  const headers=nativeRequestHeaders(new Headers({'anthropic-version':'2025','anthropic-beta':'native','authorization':'Bearer router','chatgpt-account-id':'client','x-goog-api-key':'secret'}),{api_key:'upstream',oauth_headers:{'chatgpt-account-id':'operator'}});
  assert.equal(headers.get('anthropic-version'),'2025');assert.equal(headers.get('anthropic-beta'),'native');assert.equal(headers.get('authorization'),'Bearer upstream');assert.equal(headers.get('chatgpt-account-id'),'operator');assert.equal(headers.get('x-goog-api-key'),null);
  assert.equal(nativeResponseHeaders(new Headers({'set-cookie':'private','x-ratelimit-tokens-remaining':'10'})).get('x-ratelimit-tokens-remaining'),'10');
  assert.equal(String(nativeURL('http://localhost/backend-api/codex','codex-backend','/api/services/codex/backend-api/wham/usage')),'http://localhost/backend-api/wham/usage');
  assert.throws(() => nativeURL('http://user:password@localhost','openai','/v1/files'),/invalid/);
});
