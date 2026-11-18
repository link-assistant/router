import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {createHash,randomBytes} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createNativeRouter} from '../../../js/src/server.mjs';
import {WebSocketInspector,encodeWebSocketFrame} from '../../../js/src/websocket-relay.mjs';
import {createScannerHandler} from '../../../examples/sensitive-data-scanner.mjs';
import {localDetectorFactory} from '../../../examples/sensitive-data-detectors.mjs';

test('local privacy detectors validate reports and isolate fallback policy', {timeout:5000}, async t => {
  const text = 'é Alice';
  const calls = [];
  const server = createServer(async (incoming,outgoing) => {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const document = JSON.parse(Buffer.concat(chunks));
    calls.push(document);
    const isModel = incoming.url === '/v1/chat/completions';
    const input = isModel ? document.messages[1].content : document.text;
    const span = {start:3,end:8,category:isModel ? 'person_name' : 'private_person',confidence:0.9};
    outgoing.end(JSON.stringify(isModel ? {choices:[{message:{
      content:JSON.stringify({findings:input === text ? [span] : [{...span,confidence:9}]}),
    }}]} : {detected_spans:[span]}));
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const normalize = (input,entries,{unit}) => entries.map(({start,end,type}) => ({
    text:Buffer.from(input).subarray(start,end).toString(),type,unit,
  }));
  const model = {kind:'model',model:'fixture',endpoint:`${origin}/v1/chat/completions`,timeoutMs:3000};
  const [strict,opf] = localDetectorFactory([model,{kind:'opf',endpoint:`${origin}/scan`,timeoutMs:3000}],normalize)();
  const expected = [{text:'Alice',type:'PERSON',unit:'byte'}];
  assert.deepEqual(await strict.detect(text),expected);
  assert.deepEqual(await strict.detect(text),expected);
  assert.deepEqual(await opf.detect(text),expected);
  assert.equal(calls.length,2);
  await assert.rejects(strict.detect('invalid fixture'),/detector failed/);
  const [fallback] = localDetectorFactory([{...model,failPolicy:'regex_only'}],normalize)();
  assert.deepEqual(await fallback.detect('invalid fixture'),[]);
  assert.throws(() => localDetectorFactory([{...model,endpoint:'http://detector.test:8080/v1/chat/completions'}],normalize),/loopback/);
});

const token = 'fixture_loopback_scanner_credential';
const name = 'Synthetic Person';
const company = 'Synthetic Company';
const typed = /^\[\[Router_[a-f0-9]{32}_Person_1\]\]$/;

async function fixtureScanner(t,options = {}) {
  let scans = 0;
  const handler = createScannerHandler({
    token,
    createRestoreMap: () => ({entries:[],documents:[]}),
    createSanitizer: ({transformation:{map}}) => ({
      async sanitize(input) {
        scans++;
        for (const [label,value] of [['Person',name],['Organization',company]]) {
          if (!input.includes(value)) continue;
          const marker = `[[Router_${label}_1]]`;
          if (!map.entries.some(entry => entry.token === marker)) map.entries.push({token:marker,values:[value]});
          input = input.replaceAll(value,marker);
        }
        return {text:input.replaceAll('private-fixture-credential','[REDACTED]')};
      },
    }),
    ...options,
  });
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return {
    scans: () => scans,
    env: {
      ROUTER_SENSITIVE_DATA_SCANNER_URL:`http://127.0.0.1:${server.address().port}/scan`,
      ROUTER_SENSITIVE_DATA_SCANNER_TOKEN:token,
    },
  };
}

const path = '/api/services/openai/v1/responses';
const core = (base = 'http://provider/v1') => ({
  config:{},
  nativeCandidates: () => [{provider:'provider',provider_kind:'openai-compatible',account:'primary',api_key:'provider-fixture',base_url:base}],
  tokens:{validate: key => ['alice','bob'].includes(key) ? {client_kind:'agent',principal_id:key} : null},
});
function inference(body,{key='alice',headers={},query='',route=path} = {}) {
  return new Request(`http://router${route}${query}`,{
    method:'POST',
    headers:{authorization:`Bearer ${key}`,'content-type':'application/json','x-router-privacy-session':'fixture',...headers},
    body:typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body),
  });
}
const providerBody = value => ({id:'r',object:'response',status:'completed',output:[{content:[{text:value}]}]});

test('sensitive data stays disabled by default', async () => {
  let captured;
  const router = createNativeRouter({env:{},core:core(),fetch:async (_url,init) => {
    captured = JSON.parse(init.body).input;
    return Response.json(providerBody(captured));
  }});
  const response = await router.fetch(inference({model:'m',input:name,store:false}));
  assert.equal(response.status,200);
  assert.equal(captured,name);
  assert.deepEqual(await response.json(),providerBody(name));
});

test('protects gzip JSON and metadata, rehydrates only the authenticated session', {timeout:5000}, async t => {
  const {env,scans} = await fixtureScanner(t);
  const observed = [];
  const router = createNativeRouter({env,core:core(),fetch:async (url,init) => {
    const body = JSON.parse(init.body);
    observed.push({body,url:new URL(url),headers:init.headers});
    return Response.json(providerBody(body.input === 'repeat' ? observed[0].body.input : body.input));
  }});
  const body = {model:'m',input:name,store:false,metadata:{organization:company,secret:'private-fixture-credential'}};
  const response = await router.fetch(inference(gzipSync(JSON.stringify(body)),{
    headers:{'content-encoding':'gzip','x-application-value':name},query:`?tag=${encodeURIComponent(company)}`,
  }));
  assert.equal(response.status,200,await response.clone().text());
  assert.deepEqual(await response.json(),providerBody(name));
  const sent = observed[0];
  assert.match(sent.body.input,typed);
  assert.match(sent.body.metadata.organization,/_Company_1\]\]$/);
  assert.equal(sent.body.metadata.secret,'[REDACTED]');
  assert.equal(sent.headers.get('x-application-value'),sent.body.input);
  assert.equal(sent.url.searchParams.get('tag'),sent.body.metadata.organization);
  assert.equal(sent.headers.get('authorization'),'Bearer provider-fixture');
  assert.equal(sent.headers.get('x-router-privacy-session'),null);
  assert.equal(sent.headers.get('content-encoding'),null);
  for (const [key,session,expected] of [
    ['alice','fixture',name],['alice','different',sent.body.input],['bob','fixture',sent.body.input],
  ]) {
    const next = await router.fetch(inference({model:'m',input:'repeat',store:false},{
      key,headers:{'x-router-privacy-session':session},
    }));
    assert.deepEqual(await next.json(),providerBody(expected));
  }
  const same = await router.fetch(inference(body));
  assert.equal(same.status,200);
  assert.deepEqual(await same.json(),providerBody(name));
  assert.equal(observed.at(-1).body.input,sent.body.input);
  assert.equal(scans(),5);
});

test('restores an SSE placeholder spanning physical chunks', {timeout:5000}, async t => {
  const {env} = await fixtureScanner(t);
  const router = createNativeRouter({env,core:core(),fetch:async (_url,init) => {
    const marker = JSON.parse(init.body).input;
    return new Response(new ReadableStream({start(controller) {
      const encoder = new TextEncoder();
      for (const part of ['data: {"type":"response.output_text.delta","delta":"',marker.slice(0,15),marker.slice(15),'"}\n\ndata: [DONE]\n\n']) {
        controller.enqueue(encoder.encode(part));
      }
      controller.close();
    }}),{headers:{'content-type':'text/event-stream','cache-control':'public, max-age=600','etag':'"masked"'}});
  }});
  const response = await router.fetch(inference({model:'m',input:name,stream:true,store:false}));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.has('etag'),false);
  assert.equal(await response.text(),`data: {"type":"response.output_text.delta","delta":"${name}"}\n\ndata: [DONE]\n\n`);
});

test('restores SSE fragments in their own outputs and retains incomplete text', {timeout:5000}, async t => {
  const {env} = await fixtureScanner(t);
  const router = createNativeRouter({env,core:core(),fetch:async (_url,init) => {
    const marker = JSON.parse(init.body).input;
    const delta = (item_id,value) => `event: response.output_text.delta\r\ndata: ${JSON.stringify({type:'response.output_text.delta',item_id,delta:value})}\r\n\r\n`;
    const wire = delta('first',`Hello ${marker.slice(0,14)}`) + delta('other','ordinary output') +
      delta('first',`${marker.slice(14)}!`) + delta('other','Literal [') + 'data: [DONE]\r\n\r\n';
    return new Response(wire,{headers:{'content-type':'text/event-stream'}});
  }});
  const response = await router.fetch(inference({model:'m',input:name,stream:true,store:false}));
  assert.equal(response.status,200);
  const results = (await response.text()).split('\r\n')
    .filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6)));
  assert.deepEqual(results.map(event => [event.item_id,event.delta]),[
    ['first','Hello '],['other','ordinary output'],['first',`${name}!`],['other','Literal ['],
  ]);
});

test('restoration policy can select categories or keep all responses pseudonymized', {timeout:5000}, async t => {
  for (const options of [{restoreTypes:['company']},{restore:false}]) {
    const {env} = await fixtureScanner(t,options);
    const router = createNativeRouter({env,core:core(),fetch:async (_url,init) => {
      const {input} = JSON.parse(init.body);
      return Response.json(providerBody(input));
    }});
    const response = await router.fetch(inference({model:'m',input:`${name} of ${company}`,store:false}));
    assert.equal(response.status,200);
    const text = (await response.json()).output[0].content[0].text;
    assert.match(text,/^\[\[Router_[a-f0-9]{32}_Person_1\]\] of /);
    if (options.restore === false) assert.match(text,/_Company_1\]\]$/);
    else assert.ok(text.endsWith(company));
  }
});

test('refuses unauthorized, opaque, invalid and scanner-failed requests before provider access', {timeout:5000}, async t => {
  const {env,scans} = await fixtureScanner(t);
  let calls = 0;
  const fetch = async () => { calls++; return Response.json(providerBody('unexpected')); };
  const router = createNativeRouter({env,core:core(),fetch});
  const requests = [
    [401,inference({model:'m',input:name},{key:'unknown'})],
    [415,inference({model:'m',input:[{type:'input_image',image_url:'https://example.test/fixture'}]})],
    [415,inference({model:'m',input:[{type:'input_file',file_url:'https://example.test/fixture'}]})],
    [415,inference({model:'m',messages:[{role:'user',content:[{type:'image',source:{type:'base64',data:'opaque'}}]}]},{route:'/api/services/anthropic/v1/messages'})],
    [415,inference('opaque',{headers:{'content-type':'application/octet-stream'}})],
    [415,inference({},{route:'/api/services/codex/v1/live'})],
    [400,inference('{')],
    [400,inference({model:'m',input:name},{headers:{'x-router-privacy-session':'bad value'}})],
  ];
  for (const [status,input] of requests) {
    const response = await router.fetch(input);
    assert.equal(response.status,status,await response.text());
  }
  const badToken = createNativeRouter({core:core(),fetch,env:{...env,ROUTER_SENSITIVE_DATA_SCANNER_TOKEN:'fixture_incorrect_scanner_credential'}});
  const unavailable = await badToken.fetch(inference({model:'m',input:name}));
  assert.equal(unavailable.status,503);
  assert.equal(scans(),0);
  assert.equal(calls,0);
});

test('WebSocket shields complete text events and rejects opaque client messages', {timeout:5000}, async t => {
  const {env} = await fixtureScanner(t);
  const sockets = [];
  const received = [];
  const upstream = createServer();
  upstream.on('upgrade',(incoming,socket) => {
    sockets.push(socket);
    const accept = createHash('sha1').update(incoming.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const inspector = new WebSocketInspector({masked:true,onMessage(opcode,bytes) {
      if (opcode !== 1) return;
      const event = JSON.parse(bytes);
      received.push(event);
      socket.write(encodeWebSocketFrame(1,Buffer.from(JSON.stringify({text:event.input})),false));
    }});
    socket.on('data',chunk => inspector.feed(chunk).catch(() => socket.destroy()));
  });
  await new Promise(resolve => upstream.listen(0,'127.0.0.1',resolve));
  const router = createNativeRouter({env,core:core(`http://127.0.0.1:${upstream.address().port}/v1`)});
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await router.close();
    await new Promise(resolve => upstream.close(resolve));
  });
  await router.listen({port:0});
  const {socket,head} = await new Promise((resolve,reject) => {
    const call = request(`http://127.0.0.1:${router.address.port}/api/services/openai/v1/realtime`,{headers:{
      authorization:'Bearer alice',connection:'Upgrade',upgrade:'websocket',
      'sec-websocket-key':randomBytes(16).toString('base64'),'sec-websocket-version':'13',
    }});
    call.on('response',response => reject(new Error(`Unexpected handshake status ${response.statusCode}`)));
    call.on('upgrade',(_response,socket,head) => resolve({socket,head}));
    call.on('error',reject);
    call.end();
  });
  sockets.push(socket);
  let answer,close;
  const echoed = new Promise(resolve => {answer=resolve;});
  const closed = new Promise(resolve => {close=resolve;});
  const inspector = new WebSocketInspector({masked:false,onMessage(opcode,bytes) {
    if (opcode === 1) answer(JSON.parse(bytes));
    if (opcode === 8) close(bytes.readUInt16BE(0));
  }});
  socket.on('data',chunk => inspector.feed(chunk).catch(() => socket.destroy()));
  if (head.length) await inspector.feed(head);
  const data = Buffer.from(JSON.stringify({type:'session.update',input:name}));
  const first = encodeWebSocketFrame(1,data.subarray(0,12)); first[0] &= 0x7f;
  socket.write(first);
  socket.write(encodeWebSocketFrame(0,data.subarray(12)));
  assert.deepEqual(await echoed,{text:name});
  assert.match(received[0].input,typed);
  socket.write(encodeWebSocketFrame(2,Buffer.from(name)));
  assert.equal(await closed,1008);
  assert.equal(received.length,1);
});
