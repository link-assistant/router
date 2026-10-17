import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load, temporary } from './helpers.mjs';
import { fixture, owner, request } from './provider-resource-helpers.mjs';

const { AffinityStore, createRouterCore } = await load('packages/javascript/native/core.mjs');
const { encodeLino, decodeLino } = await load('packages/javascript/native/storage.mjs');
const namespace='/api/services/openai/v1/responses';
const canonical={kind:'stored_provider',name:'vendor',provider_kind:'openai-compatible',base_url:'https://vendor.test/v1'};
const row=(extra={})=>({namespace:'open_ai_responses',response_id:'response_1',owner:{...owner},destination:{...canonical},created_at:1,expires_at:100,...extra});
const document=(records=[row()])=>JSON.stringify({version:1,records});
async function setup(t,source,options={}) {
  const directory=await temporary(t),path=join(directory,'response-affinities.lino');
  if(source!==undefined)await writeFile(path,source);
  return {directory,path,store:new AffinityStore({dataDir:directory,clock:()=>10,...options})};
}
async function invalidWithoutWrite(t,source,pattern=/response-affinity document is invalid:/) {
  const {path,store}=await setup(t,source);
  await assert.rejects(store.verify(),pattern);
  assert.deepEqual(await readFile(path),Buffer.from(source));
}

// response_affinity.rs::load/open_with_limits: type validation precedes expiry
// and never re-validates the application ID/owner conditions on loaded rows.
test('typed malformed expired rows refuse opening before they can be pruned or rewritten',async t=>{
  for(const bad of [row({expires_at:'0'}),row({created_at:false}),row({owner:{principal_id:'alice'}}),row({destination:{...canonical,name:7}}),row({namespace:'imaginary_responses'}),row({parent_id:[]})])
    await invalidWithoutWrite(t,document([bad]));
});

test('required file fields and typed document version preserve original refusal policy',async t=>{
  for(const source of ['{}','{"version":1}','{"records":[]}','{"version":"1","records":[]}','{"version":1,"records":{}}','{"version":4294967296,"records":[]}'])await invalidWithoutWrite(t,source);
  await invalidWithoutWrite(t,'{"version":2,"records":[]}',/unsupported response-affinity document version 2/);
});

test('loaded string identities are structurally accepted even when new records would reject their application meaning',async t=>{
  const source=document([row({response_id:'',owner:{client_kind:'',principal_id:' '}})]),{path,store}=await setup(t,source);
  await store.verify();assert.equal(await readFile(path,'utf8'),source);
  await assert.rejects(store.set(namespace,owner,'',{destination:canonical}),/Invalid resource id/);
});

test('unknown fields and null Option defaults disappear only on a real write, while original enum aliases normalize',async t=>{
  const source=document([row({parent_id:null,unknown:'ignored',destination:{...canonical,provider_kind:'open-a-i-compatible',unknown:'ignored'}})]);
  const {path,store}=await setup(t,source);await store.verify();assert.equal(await readFile(path,'utf8'),source);
  assert.equal((await store.get(namespace,owner,'response_1')).destination.provider_kind,'openai-compatible');
  await store.set(namespace,owner,'new',{destination:canonical});
  const written=await readFile(path,'utf8');assert.ok(!written.includes('unknown'));assert.ok(!written.includes('parent_id'));assert.ok(!written.includes('open-a-i-compatible'));
});

test('persisted enums accept only serde spellings and explicit aliases, preserving runtime z.ai destination ABI',async t=>{
  for(const kind of ['openai','litellm','z.ai-coding-plan'])await invalidWithoutWrite(t,document([row({destination:{...canonical,provider_kind:kind}})]));
  const {path,store}=await setup(t,document([row({destination:{...canonical,provider_kind:'zai-coding-plan'}})]));
  assert.equal((await store.get(namespace,owner,'response_1')).destination.provider_kind,'z.ai-coding-plan');
  await store.set(namespace,owner,'new',{destination:{...canonical,provider_kind:'z.ai-coding-plan'}});
  assert.match(await readFile(path,'utf8'),/zai-coding-plan/);
  for(const provider of ['openai-codex','anthropic','google'])await invalidWithoutWrite(t,document([row({destination:{kind:'subscription',provider,account:'primary',base_url:'https://vendor.test'}})]));
});

// Pinned serde229 derive and TaggedContentVisitor accept named struct sequences.
test('original sequence struct and tagged enum forms load and become canonical on subsequent persistence',async t=>{
  const source='[1,[[{"open_ai_responses":null},"sequence",["codex","alice"],["subscription","codex","primary",null,"https://vendor.test"],null,1,100]]]';
  const {path,store}=await setup(t,source);await store.verify();
  const found=await store.get(namespace,owner,'sequence');assert.equal(found.destination.account,'primary');assert.equal(found.parent_id,undefined);
  await store.set(namespace,owner,'new',{destination:canonical});assert.match(await readFile(path,'utf8'),/namespace/);
});

test('known duplicate fields refuse rather than silently replacing typed values',async t=>{
  await invalidWithoutWrite(t,'{"version":1,"version":1,"records":[]}');
  await invalidWithoutWrite(t,document().replace('"created_at":1','"created_at":1,"created_at":2'));
  await invalidWithoutWrite(t,document().replace('"destination":{','"destination":{"kind":"stored_provider",'));
  await invalidWithoutWrite(t,document().replace('"created_at":1','"parent_id":null,"parent_id":null,"created_at":1'));
  const {store}=await setup(t,'{"version":1,"extra":1,"extra":2,"records":[]}');await store.verify();
});

test('unknown struct JSON values are ignored while internally tagged destination content is fully decoded',async t=>{
  const {store}=await setup(t,'{"version":1,"extra":[1e400,"\\ud800"],"records":[]}');await store.verify();
  await invalidWithoutWrite(t,document().replace('"destination":{','"destination":{"extra":"\\ud800",'));
  await invalidWithoutWrite(t,document().replace('"destination":{','"destination":{"extra":1e400,'));
  await invalidWithoutWrite(t,document().replace('"response_1"','"\\ud800"'));
});

test('typed destination buffering enforces the pinned JSON depth boundary while ignored values use iterative consumption',async t=>{
  const nested=count=>'['.repeat(count)+'null'+']'.repeat(count);
  const ignored=await setup(t,'{"version":1,"extra":'+nested(140)+',"records":[]}');await ignored.store.verify();
  const allowed=await setup(t,document().replace('"destination":{','"destination":{"extra":'+nested(123)+','));await allowed.store.verify();
  await invalidWithoutWrite(t,document().replace('"destination":{','"destination":{"extra":'+nested(124)+','));
});

test('typed i64 JSON values reject fraction, exponent, negative zero and coerced scalar domains',async t=>{
  for(const lexeme of ['1.0','1e0','-0','"1"','true','null','[]','{}'])await invalidWithoutWrite(t,document().replace('"created_at":1','"created_at":'+lexeme));
});

test('legacy JSON numeric syntax is checked without accepting prefixes or rounded integer fallbacks',async t=>{
  for(const lexeme of ['01','+1','1_0','0x1','1.','1e','--1'])await invalidWithoutWrite(t,document().replace('"created_at":1','"created_at":'+lexeme));
});

test('signed i64 endpoints and adjacent wide timestamps survive legacy JSON to Lino roundtrips exactly',async t=>{
  const source='{"version":1,"records":[{"namespace":"open_ai_responses","response_id":"wide","owner":{"client_kind":"codex","principal_id":"alice"},"destination":{"kind":"stored_provider","name":"vendor","provider_kind":"openai-compatible","base_url":"https://vendor.test/v1"},"created_at":-9223372036854775808,"expires_at":9223372036854775807}]}';
  const {path,store}=await setup(t,source);
  const first=await store.get(namespace,owner,'wide');assert.equal(first.created_at,-9223372036854775808n);assert.equal(first.expires_at,9223372036854775807n);
  await store.set(namespace,owner,'ordinary',{destination:canonical});
  const bytes=await readFile(path,'utf8');assert.match(bytes,/created_at -9223372036854775808/);assert.match(bytes,/expires_at 9223372036854775807/);
  const reloaded=new AffinityStore({dataDir:store.path.substring(0,store.path.lastIndexOf('/')),clock:()=>10});
  assert.equal((await reloaded.get(namespace,owner,'wide')).created_at,first.created_at);assert.equal((await reloaded.get(namespace,owner,'wide')).expires_at,first.expires_at);
  assert.equal(typeof (await reloaded.get(namespace,owner,'ordinary')).created_at,'number');
});

test('one-past signed i64 bounds refuse even for expired records',async t=>{
  for(const lexeme of ['9223372036854775808','-9223372036854775809'])await invalidWithoutWrite(t,document([row({expires_at:0})]).replace('"created_at":1','"created_at":'+lexeme));
});

test('Lino keeps signed integer lexemes, quoted strings and outside-i64 string fallback distinct',async t=>{
  const source=encodeLino({version:1,records:[row()]}).replace('created_at 1','created_at +0007');
  const {store}=await setup(t,source);assert.equal((await store.get(namespace,owner,'response_1')).created_at,7);
  const zero=await setup(t,source.replace('created_at +0007','created_at -0'));assert.equal((await zero.store.get(namespace,owner,'response_1')).created_at,0);
  await invalidWithoutWrite(t,source.replace('created_at +0007','created_at 9223372036854775808'));
  for(const value of ['1e0','1.0','"1"'])await invalidWithoutWrite(t,source.replace('created_at +0007','created_at '+value));
  const fallback=await setup(t,source.replace('"response_1"','9223372036854775808'));
  assert.equal((await fallback.store.get(namespace,owner,'9223372036854775808')).id,'9223372036854775808');
});

test('generic codec integer callback is opt-in and bigint encoding preserves literal decimal values',()=>{
  assert.throws(()=>decodeLino('(\n value 9007199254740993\n)'),/Unsafe storage integer/);
  assert.equal(decodeLino('(\n value 9007199254740993\n)',{integer:raw=>BigInt(raw)}).value,9007199254740993n);
  assert.match(encodeLino({value:9007199254740993n}),/value 9007199254740993/);
  assert.equal(decodeLino('(\n value "+007"\n)',{integer:raw=>BigInt(raw)}).value,'+007');
});

test('typed Lino strings distinguish bare floating and nonfinite values from quoted text',async t=>{
  const text=encodeLino({version:1,records:[row()]});
  for(const raw of ['1.0','1e0','NaN','Infinity','-Infinity','1e400'])await invalidWithoutWrite(t,text.replace('response_id "response_1"','response_id '+raw));
  for(const raw of ['1.0','1e0','NaN','Infinity']) {
    const {store}=await setup(t,text.replace('response_id "response_1"','response_id "'+raw+'"'));
    assert.equal((await store.get(namespace,owner,raw)).id,raw);
  }
  const {store}=await setup(t,text.replace('created_at 1','parent_id NaN\n    created_at 1'));
  assert.equal((await store.get(namespace,owner,'response_1')).parent_id,undefined);
});

test('typed escaped strings reject malformed byte sequences without changing the shared legacy default',async t=>{
  const text=encodeLino({version:1,records:[row()]});
  for(const raw of ['%FF','%C3','%GG','%'])await invalidWithoutWrite(t,text.replace('response_id "response_1"','response_id (escaped "'+raw+'")'));
  const {store}=await setup(t,text.replace('response_id "response_1"','response_id (escaped "%C3%A9")'));
  assert.equal((await store.get(namespace,owner,'é')).id,'é');
  assert.equal(decodeLino('(escaped "%FF")'),'\ufffd');
  await invalidWithoutWrite(t,text.replace('response_id "response_1"','response_id ("escaped" "%C3%A9")'));
});

test('Lino map conversion keeps last values and raw textual keys before typed deserialization',async t=>{
  const text=encodeLino({version:1,records:[row()]});
  const changed=text.replace('created_at 1','created_at 1\n    created_at 2').replace('version 1','version 0\n  +1 "ignored"\n  -0 "ignored"\n  true "ignored"\n  version 1');
  const {store}=await setup(t,changed);assert.equal((await store.get(namespace,owner,'response_1')).created_at,2);
  assert.throws(()=>decodeLino('(\n duplicate 1\n duplicate 2\n)'),/Duplicate Lino key/);
  const observed=decodeLino('(\n +1 7\n -0 8\n +1 9\n)',{scalar:raw=>BigInt(raw),object:entries=>Object.fromEntries(entries)});
  assert.deepEqual(observed,{'+1':9n,'-0':8n});
  const marked=await setup(t,'(o: (version 1) (+1 "ignored") (records ()))');await marked.store.verify();
});

test('original marked base64 strings require canonical bytes and valid UTF8 before typed use',async t=>{
  const text=encodeLino({version:1,records:[row()]});
  const {store}=await setup(t,text.replace('response_id "response_1"','response_id (base64 "w6k=")'));
  assert.equal((await store.get(namespace,owner,'é')).id,'é');
  for(const payload of ['/w==','w6k','w6l=','w6k===','!!=='])await invalidWithoutWrite(t,text.replace('response_id "response_1"','response_id (base64 "'+payload+'")'));
  await invalidWithoutWrite(t,text.replace('response_id "response_1"','response_id ("base64" "w6k=")'));
});

// response_affinity.rs::record_at_with_parent clips Duration seconds before sum.
test('clock and expiry use source i64 saturation with u64 TTL conversion order',async t=>{
  for(const [now,ttl,expires] of [[9223372036854775806n,10,9223372036854775807n],[9223372036854775807n,1,9223372036854775807n],[-9223372036854775808n,18446744073709551615n,-1],[-10,18446744073709551615n,9223372036854775797n],[1,1,2]]) {
    const {store}=await setup(t,undefined,{persistent:false,clock:()=>now,ttl});
    const inserted=await store.set(namespace,owner,'expiry',{destination:canonical});assert.equal(inserted.expires_at,expires);
    if(BigInt(now)===BigInt(expires))assert.equal(await store.get(namespace,owner,'expiry'),null);
  }
});

test('unsafe Number clocks and invalid Duration seconds are refused without rounding or persistence',async t=>{
  for(const ttl of [0,-1,1.5,18446744073709551616n,9007199254740992])assert.throws(()=>new AffinityStore({dataDir:'/unused',ttl}),/non-zero/);
  for(const clock of [()=>9007199254740992,()=>9223372036854775808n,()=>-9223372036854775809n]) {
    const {path,store}=await setup(t,document([]),{clock});
    await assert.rejects(store.set(namespace,owner,'unsafe',{destination:canonical}),/integer/);assert.equal(await readFile(path,'utf8'),document([]));
  }
});

test('expiry comparisons and oldest eviction distinguish adjacent wide integers without subtraction rounding',async t=>{
  let now=9007199254740992n;
  const {store}=await setup(t,undefined,{clock:()=>now,maxRecords:2,ttl:100});
  await store.set(namespace,owner,'old',{destination:canonical});now++;
  await store.set(namespace,owner,'next',{destination:canonical});now++;
  await store.set(namespace,owner,'new',{destination:canonical});
  assert.equal(await store.get(namespace,owner,'old'),null);assert.equal((await store.get(namespace,owner,'next')).created_at,9007199254740993n);
  now=9007199254741093n;assert.equal(await store.get(namespace,owner,'next'),null);assert.ok(await store.get(namespace,owner,'new'));
});

test('conditional removal compares original exact i64 lifetime and does not prune unrelated expired rows',async t=>{
  let now=9007199254740992n;
  const {path,store}=await setup(t,undefined,{clock:()=>now,ttl:100});
  const first=await store.set(namespace,owner,'race',{destination:canonical});
  await store.set(namespace,owner,'unrelated',{destination:canonical});
  const text=await readFile(path,'utf8');await writeFile(path,text.replace('created_at 9007199254740992','created_at 9007199254740993'));
  assert.equal(await store.delete(namespace,owner,'race',undefined,first),false);
  const second=await store.get(namespace,owner,'race');now+=200n;
  assert.equal(await store.delete(namespace,owner,'race',undefined,second),true);
  assert.match(await readFile(path,'utf8'),/unrelated/);
});

test('Existing preserves original lifetime and returns without flushing incidental expired records',async t=>{
  const source=document([row(),row({response_id:'expired',expires_at:5})]),{path,store}=await setup(t,source);
  const existing=await store.set(namespace,owner,'response_1',{destination:canonical});assert.equal(existing.expires_at,100);assert.equal(await readFile(path,'utf8'),source);
});

test('real core factory refuses the existing malformed affinity file before exposing routing state',async t=>{
  const source=document([row({created_at:'not-time'})]),{path,directory}=await setup(t,source);
  await assert.rejects(createRouterCore({config:{data_dir:directory,storage_policy:'text',token_secret:'acceptance-secret',providers:[],accounts:[]},env:{}}),/response-affinity document is invalid:/);
  assert.equal(await readFile(path,'utf8'),source);
});

test('public Responses lookup and continuation surface original storage503 envelopes before upstream dispatch',async t=>{
  const {store}=await setup(t,document([row({expires_at:'bad'})]));
  const endpoint={origin:'https://unused.test'},state=fixture(t,[endpoint],{affinities:store});
  for(const [path,method,body] of [[namespace+'/response_1','GET'],[namespace,'POST',{model:'one',previous_response_id:'response_1'}]]) {
    const response=await state.app.fetch(request(path,method,body));assert.equal(response.status,503);
    const error=(await response.json()).error;assert.equal(error.type,'api_error');assert.match(error.message,/^response affinity is unavailable: response-affinity document is invalid:/);
  }
  const helper=await state.app.fetch(request(namespace+'/compact','POST',{model:'one',previous_response_id:'response_1'}));
  assert.equal(helper.status,503);assert.deepEqual(await helper.json(),{error:{type:'api_error',message:'resource affinity is unavailable'}});
});

test('invalid UTF8 affinity files fail as original storage errors rather than replacement-character rows',async t=>{
  const {store,path}=await setup(t,undefined);await writeFile(path,Buffer.from([0xff,0xfe]));
  await assert.rejects(store.verify(),/^RouterError: response-affinity storage failed:/);assert.deepEqual(await readFile(path),Buffer.from([0xff,0xfe]));
});
