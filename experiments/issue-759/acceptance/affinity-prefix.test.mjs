import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load,temporary,upstream } from './helpers.mjs';
import { fixture,owner,request,reply } from './provider-resource-helpers.mjs';
const { AffinityStore }=await load('packages/javascript/native/affinities.mjs');
const { encodeLino,decodeLino }=await load('packages/javascript/native/storage.mjs');
const namespace='/api/services/openai/v1/responses',conversations='/api/services/openai/v1/conversations';
const row={namespace:'open_ai_responses',response_id:'resource',owner,destination:{kind:'stored_provider',name:'fixture',provider_kind:'openai-compatible',base_url:'https://fixture.test/v1'},created_at:1,expires_at:100};
const file={version:1,records:[row]},bom='\ufeff';
async function stored(t,source) {
  const directory=await temporary(t),path=join(directory,'response-affinities.lino');await writeFile(path,source);
  return {path,store:new AffinityStore({dataDir:directory,clock:()=>10})};
}

// fs::read_to_string preserves U+FEFF; lino_json::is_json uses Rust trim_start.
test('a leading UTF8 BOM cannot turn an invalid legacy affinity document into valid JSON',async t=>{
  const bytes=Buffer.from(bom+JSON.stringify(file)),{path,store}=await stored(t,bytes);
  await assert.rejects(store.verify(),/response-affinity document is invalid:/);assert.deepEqual(await readFile(path),bytes);
});

test('the typed Lino reader preserves BOM as a token rather than consuming ECMAScript whitespace',async t=>{
  const bytes=Buffer.from(bom+encodeLino(file)),{path,store}=await stored(t,bytes);
  await assert.rejects(store.verify(),/response-affinity document is invalid:/);assert.deepEqual(await readFile(path),bytes);
});

test('Rust NEL and Unicode whitespace are accepted before and between valid Lino tokens',async t=>{
  const bytes=Buffer.from('\u0085'+encodeLino(file).replace('version 1','version\u00851').replace('created_at 1','created_at\u20031')+'\u0085');
  const {path,store}=await stored(t,bytes);assert.equal((await store.get(namespace,owner,'resource')).created_at,1);assert.deepEqual(await readFile(path),bytes);
});

test('Rust format sniffing does not make non-JSON Unicode whitespace legal for the original JSON decoder',async t=>{
  for(const prefix of ['\u0085','\u00a0','\u2003','\u3000']) {
    const source=prefix+JSON.stringify(file),{path,store}=await stored(t,source);
    await assert.rejects(store.verify(),/response-affinity document is invalid:/);assert.equal(await readFile(path,'utf8'),source);
  }
  const {store}=await stored(t,' \t\r\n'+JSON.stringify(file));await store.verify();
});

test('quoted, escaped and base64 affinity identities preserve a legitimate leading BOM inside the string',async t=>{
  const text=encodeLino(file),id=bom+'resource';
  for(const value of ['"'+id+'"','(escaped "%EF%BB%BFresource")','(base64 "77u/cmVzb3VyY2U=")']) {
    const {store}=await stored(t,text.replace('response_id "resource"','response_id '+value));
    assert.equal((await store.get(namespace,owner,id)).id,id);assert.equal(await store.get(namespace,owner,'resource'),null);
  }
});

test('the generic Rust-whitespace hook preserves raw quoted text and keeps existing default callers unchanged',()=>{
  assert.equal(decodeLino(bom+'42'),42);
  assert.equal(decodeLino('\u008542'), '\u008542');
  const whitespace=c=>c==='\u0085' || c==='\n' || c===' ';
  assert.equal(decodeLino('(\n key\u0085"\u0085quoted\ufeff"\n)',{whitespace}).key,'\u0085quoted\ufeff');
});

// resource_capture.rs::json_id keeps serde_json::from_slice BOM refusal and
// still permits an independent Location identity after failed JSON parsing.
test('stored provider JSON with a leading BOM refuses identity capture but retains original Location fallback bytes',async t=>{
  const bytes=Buffer.from(bom+'{"id":"hidden"}');let location=false;
  const service=await upstream(t,(_request,response)=>{response.writeHead(200,{'content-type':'application/json',...(location?{location:'/v1/responses/location-id'}:{})});response.end(bytes);});
  const {app,affinities}=fixture(t,[service]);
  const refused=await app.fetch(request(namespace,'POST',{model:'one',input:'hello'}));assert.equal(refused.status,502);assert.equal(await affinities.get(namespace,owner,'hidden'),null);
  location=true;const accepted=await app.fetch(request(namespace,'POST',{model:'one',input:'hello'}));assert.equal(accepted.status,200);assert.deepEqual(Buffer.from(await accepted.arrayBuffer()),bytes);
  assert.ok(await affinities.get(namespace,owner,'location-id'));assert.equal(await affinities.get(namespace,owner,'hidden'),null);
});

test('Conversations BOM documents keep create refusal and opaque item-list relay without capturing IDs',async t=>{
  const service=await upstream(t,(observed,response)=>{
    if(observed.path.endsWith('/items')){response.writeHead(200,{'content-type':'application/json'});response.end(bom+'{"data":[{"id":"hidden-item"}]}');}
    else{response.writeHead(200,{'content-type':'application/json'});response.end(bom+'{"id":"hidden-conversation"}');}
  });
  const {app,affinities,candidates}=fixture(t,[service]);
  const create=await app.fetch(request(conversations,'POST',{}));assert.equal(create.status,502);assert.equal(await affinities.get(conversations,owner,'hidden-conversation'),null);
  await affinities.set(conversations,owner,'known',{destination:{provider:'vendor-0',account:'vendor-0',protocol:'openai',provider_kind:'openai-compatible',destination_kind:'stored_provider',base_url:candidates[0].base_url}});
  const items=await app.fetch(request(conversations+'/known/items'));assert.equal(items.status,200);assert.equal(Buffer.from(await items.arrayBuffer()).toString('utf8'),bom+'{"data":[{"id":"hidden-item"}]}');
  assert.equal(await affinities.get(conversations+'/items',owner,'hidden-item'),null);
});

test('literal BOM inside provider JSON ID is preserved while unquoted BOM SSE payloads wait for a later usable identity',async t=>{
  let stream=false;const id=bom+'resource';
  const service=await upstream(t,(_request,response)=>{
    if(!stream)reply(response,{id});
    else{response.writeHead(200,{'content-type':'text/event-stream'});response.end('data: '+bom+'{"id":"hidden"}\n\ndata: {"id":"later"}\n\n');}
  });
  const {app,affinities}=fixture(t,[service]);
  assert.equal((await app.fetch(request(namespace,'POST',{model:'one'}))).status,200);assert.ok(await affinities.get(namespace,owner,id));assert.equal(await affinities.get(namespace,owner,'resource'),null);
  stream=true;const response=await app.fetch(request(namespace,'POST',{model:'one',stream:true}));assert.equal(response.status,200);await response.arrayBuffer();
  assert.equal(await affinities.get(namespace,owner,'hidden'),null);assert.ok(await affinities.get(namespace,owner,'later'));
});
