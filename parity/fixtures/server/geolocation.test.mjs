import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeRequestHeaders} from '../../../js/src/native-service.mjs';
import {readFileSync} from 'node:fs';
import {sanitizeGeolocation,sharesGeolocation} from '../../../js/src/geolocation.mjs';
import {WebSocketInspector,encodeWebSocketFrame,privateWebSocketPayload} from '../../../js/src/websocket-relay.mjs';
import {createNativeRouter} from '../../../js/src/server.mjs';

const fixtures = JSON.parse(readFileSync(new URL('../geolocation.json',import.meta.url),'utf8'));

test('native forwarding removes explicit location headers by default', () => {
  const incoming = new Headers({authorization:'Bearer router-secret',
    'CF-IPCountry':'GB','X-Vercel-IP-City':'London','x-request-id':'keep',
    'anthropic-beta':'keep-beta'});
  const headers = nativeRequestHeaders(incoming,{apiKey:'upstream-secret'});
  assert.equal(headers.get('cf-ipcountry'),null);
  assert.equal(headers.get('x-vercel-ip-city'),null);
  assert.equal(headers.get('x-request-id'),'keep');
  assert.equal(headers.get('anthropic-beta'),'keep-beta');
  assert.equal(headers.get('authorization'),'Bearer upstream-secret');
});

for (const fixture of fixtures.bodies) test(`location policy: ${fixture.name}`, () => {
  const value=structuredClone(fixture.input);
  assert.equal(sanitizeGeolocation(value),JSON.stringify(fixture.input)!==JSON.stringify(fixture.expected));
  assert.deepEqual(value,fixture.expected);
  assert.equal(sanitizeGeolocation(value),false);
  const allowed=structuredClone(fixture.input);
  assert.equal(sanitizeGeolocation(allowed,true),false);
  assert.deepEqual(allowed,fixture.input);
});

test('only one explicit true opts in; control and network-origin headers stay private', () => {
  for (const optIn of [undefined,'false','1','TRUE','true, true','true, false','true']) {
    const incoming=new Headers({'x-request-id':'keep'});
    for(const name of fixtures.networkHeaders)incoming.set(name,'203.0.113.1');
    if(optIn!==undefined)incoming.set('x-router-share-geolocation',optIn);
    for(const name of fixtures.headers)incoming.set(name,'synthetic');
    const expected=optIn==='true';
    assert.equal(sharesGeolocation(incoming),expected);
    const headers=nativeRequestHeaders(incoming,{apiKey:'upstream'});
    for(const name of fixtures.headers)assert.equal(headers.get(name),expected?'synthetic':null,name);
    assert.equal(headers.get('x-router-share-geolocation'),null);
    for(const name of fixtures.networkHeaders)assert.equal(headers.get(name),null,name);
    assert.equal(headers.get('x-request-id'),'keep');
  }
  const repeated=new Headers([['x-router-share-geolocation','true'],['x-router-share-geolocation','true']]);
  assert.equal(sharesGeolocation(repeated),false);
});

test('HTTP Chat forwarding sanitizes before fetch and permits explicit sharing',async () => {
  for(const share of [false,true]) {
    let captured;
    const core={config:{api_key:'secret'},candidates:()=>[{provider:'openai',protocol:'chat',model:'upstream',baseUrl:'http://upstream/v1',apiKey:'upstream-secret',headers:{'x-geo-city':'London','x-request-id':'keep'}}]};
    const router=createNativeRouter({core,fetch:async(url,init)=>{captured=init;return Response.json({id:'c',object:'chat.completion',choices:[{index:0,message:{role:'assistant',content:'ok'},finish_reason:'stop'}]});}});
    const input={model:'alias',messages:[{role:'user',content:'London'}],web_search_options:{user_location:{city:'London'}}};
    const headers={authorization:'Bearer secret','content-type':'application/json'};
    if(share)headers['x-router-share-geolocation']='true';
    const response=await router.fetch(new Request('http://router/v1/chat/completions',{method:'POST',headers,body:JSON.stringify(input)}));
    assert.equal(response.status,200,await response.text());
    assert.equal(JSON.parse(captured.body).web_search_options.user_location?.city,share?'London':undefined);
    assert.equal(captured.headers.get('x-geo-city'),share?'London':null);
    assert.equal(captured.headers.get('x-router-share-geolocation'),null);
  }
});

test('fragmented WebSocket messages disclose no location before complete inspection',async () => {
  const fixture=fixtures.bodies.find(value=>value.name==='WebSocket response');
  const payload=Buffer.from(JSON.stringify(fixture.input));
  const parts=[payload.subarray(0,20),payload.subarray(20)];
  const first=encodeWebSocketFrame(1,parts[0]);first[0]&=0x7f;
  const last=encodeWebSocketFrame(0,parts[1]);
  const forwarded=[];
  const inspector=new WebSocketInspector({masked:true,onMessage:(opcode,value)=>forwarded.push(encodeWebSocketFrame(opcode,privateWebSocketPayload(opcode,value)))});
  await inspector.feed(first);assert.equal(forwarded.length,0);
  await inspector.feed(last);assert.equal(forwarded.length,1);
  const receiver=new WebSocketInspector({masked:true,onMessage:(_opcode,value)=>assert.deepEqual(JSON.parse(value),fixture.expected)});
  await receiver.feed(forwarded[0]);
  assert.deepEqual(privateWebSocketPayload(1,payload,true),payload);
  assert.deepEqual(privateWebSocketPayload(2,payload),payload);
});

test('native replay filters Responses metadata, preserves safe bytes and rejects opaque encoded inference',async () => {
  for(const share of [false,true]) {
    let captured;
    const candidate={provider:'p',provider_kind:'openai-compatible',account:'a',base_url:'http://upstream/v1',api_key:'upstream'};
    const router=createNativeRouter({core:{config:{},nativeCandidates:()=>[candidate],tokens:{validate:()=>({client_kind:'agent',principal_id:'p'})}},fetch:async(url,init)=>{captured=init;return Response.json({id:'r',output:[]});}});
    const headers={authorization:'Bearer secret','content-type':'application/json','cf-ipcity':'London'};
    if(share)headers['x-router-share-geolocation']='true';
    const raw=' { "model":"m", "input":"hello", "store":false, "tools":[{"type":"web_search","user_location":{"city":"London"}}]} ';
    const request=(body,suffix='')=>new Request(`http://router/api/services/openai/v1/responses${suffix}`,{method:'POST',headers,body});
    const response=await router.fetch(request(raw));assert.equal(response.status,200,await response.text());
    assert.equal(JSON.parse(captured.body).tools[0].user_location?.city,share?'London':undefined);
    assert.equal(captured.headers.get('cf-ipcity'),share?'London':null);
    if(share)assert.equal(Buffer.from(captured.body).toString(),raw);
    const safe=' { "model":"m", "input":"hello", "store":false } ';
    assert.equal((await router.fetch(request(safe))).status,200);
    assert.equal(Buffer.from(captured.body).toString(),safe);
    if(!share){headers['content-encoding']='future';captured=undefined;assert.equal((await router.fetch(request('opaque','/compact'))).status,415);assert.equal(captured,undefined);}
  }
});
