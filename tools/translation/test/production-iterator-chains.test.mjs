import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
import {staticSourceLifecycleContext} from './real-source-fixtures.mjs';
const staticOriginal=staticSourceLifecycleContext("production-iterator-chains.test.mjs");
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const tag=($,fields={})=>Object.freeze({$,...fields}),some=field0=>tag('Some',{field0}),none=tag('None');
function json(value) {
  if(value===null)return tag('Null');if(typeof value==='string')return tag('String',{field0:value});if(typeof value==='boolean')return tag('Bool',{field0:value});
  if(typeof value==='bigint')return tag('Number',{field0:tag(value<0n?'NegInt':'PosInt',{field0:value})});
  if(Array.isArray(value))return tag('Array',{field0:Object.freeze(value.map(json))});
  const entries=Object.keys(value).sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b))).map(key=>tag('MapEntry',{key,value:json(value[key])}));return tag('Object',{field0:tag('Map',{entries:Object.freeze(entries)})});
}
function original(path,sourceSha256,names,imports=[]) {
  const source=staticOriginal.source(path);assert.equal(hash(source),sourceSha256);
  const items=sourceItems(source),selected=[...imports.map(text=>{const matches=items.filter(item=>item.term==='use'&&source.slice(item.start,item.end).trim()===text);assert.equal(matches.length,1);return matches[0];}),...names.map(name=>{const matches=items.filter(item=>item.term==='fn'&&item.name===name);assert.equal(matches.length,1);return matches[0];})].sort((a,b)=>a.start-b.start);
  // Select complete original declarations mechanically. No Rust body tokens,
  // attributes, identifiers or operators are replaced to obtain admission.
  const text=selected.map(item=>source.slice(item.start,item.end)).join('\n'),result=translateProject({entry:path,paths:[path],readSource:()=>text});
  assert.deepEqual(result.meta.refused,[]);assert.deepEqual(result.meta.executable.filter(item=>item.term==='fn').map(item=>item.name).sort(),[...names].sort());
  const compiledItems=sourceItems(text);
  for(const name of names){const before=selected.find(item=>item.name===name),after=compiledItems.find(item=>item.name===name),checked=result.meta.executable.find(item=>item.name===name);assert.deepEqual(checked.span,{start:after.start,end:after.end});assert.equal(hash(text.slice(after.start,after.end)),hash(source.slice(before.start,before.end)));}
  assert.equal(result.meta.runtimeParity,false);return result;
}

test('unchanged usage first_u64 token_parts and token_count execute their complete dependency chain',{timeout:60_000},async()=>{
  const result=original('src/usage.rs','58cb4eb54cd5cc9358b24edb70095c02e74bcb895117f476ca9c344727a0cd2a',['token_count','token_parts','first_u64'],['use serde_json::Value;']);
  await verifyCohortTargets(result,api=>{
    for(const [input,expected]of [
      [{usage:{input_tokens:3n,output_tokens:2n}},some(5n)],
      [{usage:{prompt_tokens:4n,completion_tokens:6n,total_tokens:10n}},some(10n)],
      [{usageMetadata:{promptTokenCount:7n,candidatesTokenCount:8n}},some(15n)],
      [{usageMetadata:{totalTokenCount:15n}},some(15n)],
      [{type:'message_start',message:{usage:{input_tokens:3n,output_tokens:2n}}},some(5n)],
      [{usage:{}},none],[{usageMetadata:{}},none],
      [{usage:{input_tokens:3n,cache_creation_input_tokens:4n,cache_read_input_tokens:5n,output_tokens:2n}},some(14n)],
      [{response:{message:{usageMetadata:{promptTokenCount:2n}}}},some(2n)],
      [{usage:{input_tokens:18446744073709551615n,cache_creation_input_tokens:1n,output_tokens:2n}},some(18446744073709551615n)],
    ])assert.deepEqual(api.token_count(json(input)),expected);
    assert.deepEqual(api.first_u64(json({bad:'wrong',zero:0n,later:3n}),Object.freeze(['bad','zero','later'])),some(0n));
  });
});

test('unchanged account home reader flattens borrowed JSON accounts and returns an owned String',{timeout:60_000},async()=>{
  const result=original('src/auth_remote.rs','10e9e8cf780427d1a75abcc2ccfa567a69ba7b4d66c26e51646af216466fd05f',['home_in_accounts']);
  await verifyCohortTargets(result,api=>{
    const single={accounts:[],credentials:[{name:'claude',home:'/srv/deployment-claude',credential:'ok'},{name:'codex',home:'/srv/deployment-codex',credential:'missing'}]};
    for(const [body,provider,expected]of [[single,'claude',some('/srv/deployment-claude')],[single,'codex',some('/srv/deployment-codex')],[{accounts:[{name:'claude',home:'/pool/a'}]},'claude',some('/pool/a')],[{},'claude',none],[{accounts:[]},'claude',none],[{credentials:[{name:'codex',home:'/srv/c'}]},'claude',none],[{credentials:[{name:'claude'}]},'claude',none],[{credentials:[{name:'CLAUDE',home:'/first'}],accounts:[{name:'claude',home:'/second'}]},'claude',some('/first')]])assert.deepEqual(api.home_in_accounts(json(body),provider),expected);
    let reads=0;const proxy=new Proxy(json(single),{get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');},getPrototypeOf(){reads++;throw Error('prototype');}});assert.throws(()=>api.home_in_accounts(proxy,'claude'),TypeError);assert.equal(reads,0);
  });
});

test('unchanged verification preparation predicate uses the resolved standard matches macro',{timeout:30_000},async()=>{
  const result=original('src/verification.rs','839dc354baff84b057fd6ec5c84d1f52d9dd4e0ed657843626a500425ef2ffa4',['needs_client_preparation']);
  await verifyCohortTargets(result,api=>{for(const value of ['real-clients','anthropic-entitlements','zai-only-entitlements','staging'])assert.equal(api.needs_client_preparation(value),true);for(const value of ['','real-clients-extra','REAL-CLIENTS','unit','bounded'])assert.equal(api.needs_client_preparation(value),false);});
});
