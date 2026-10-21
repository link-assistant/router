import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,Hash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {projectCanonicalJsonStringFields} from '../canonical-json-projection.mjs';
import {prepareStaticJsonPreflight} from '../prepare-static-json-preflight.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {readStaticSourceLifecycle,readStaticSourceLifecyclePreflight} from './real-source-fixtures.mjs';
const patterns=[['sources','*','canonical']],hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function expected(source){const value=JSON.parse(source);if(value?.sources&&typeof value.sources==='object')for(const row of Object.values(value.sources))if(row&&typeof row==='object'&&typeof row.canonical==='string')row.canonical=null;return value;}

test('complete canonical projection matches independent native JSON replacement and every original span',{timeout:60000},()=>{
 const values=[null,true,1,-0,'plain',[],{}, {sources:{a:{source:'pub fn f(){}',canonical:'{"whole":"CST"}'},b:{canonical:17},c:{canonical:null}},canonical:'retained'},JSON.parse('{"sources":{"__proto__":{"canonical":"kept as own data"}}}')];
 for(const value of values)for(const suffix of ['','\n']){
  const source=JSON.stringify(value)+suffix,result=projectCanonicalJsonStringFields(source,patterns);assert.ok(result);assert.deepEqual(JSON.parse(result.source),expected(source));
  let restored=result.source;for(const row of [...result.omissions].reverse())assert.equal(typeof JSON.parse(source.slice(...row.span)),'string');
  const parts=[];let at=0;for(const row of result.omissions){parts.push(source.slice(at,row.span[0]),'null');at=row.span[1];}parts.push(source.slice(at));assert.equal(result.source,parts.join(''));assert.equal(typeof restored,'string');
 }
});

test('native escapes Unicode integer keys and deterministic generated inputs retain exact JSON meaning',{timeout:60000},()=>{
 let seed=17;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0,alphabet=['a','"','\\','\n','\u0000','猫','😀','\ud800','\udfff'];
 for(let i=0;i<600;i++){
  const text=Array.from({length:next()%40},()=>alphabet[next()%alphabet.length]).join(''),value={sources:{[String(next()%1000)]:{source:text,canonical:JSON.stringify({text,nodes:[['root',0,text.length]]})}},after:[text,next()]},source=JSON.stringify(value),result=projectCanonicalJsonStringFields(source,patterns);
  assert.ok(result);assert.deepEqual(JSON.parse(result.source),expected(source));assert.equal(result.omissions.length,1);assert.equal(JSON.parse(source.slice(...result.omissions[0].span)),Object.values(value.sources)[0].canonical);
 }
});

test('noncanonical malformed duplicate-key and deeply nested inputs decline without changing native acceptance',{timeout:60000},()=>{
 for(const source of [' {"a":1}','{"a": 1}','{"a":1,"a":2}','{"2":0,"1":0}','1.0','-0','1e999','"\\u0061"','{}\n\n','[1,]','{"x":','"\\x"','['.repeat(514)+'0'+']'.repeat(514)])assert.equal(projectCanonicalJsonStringFields(source,patterns),null,source.slice(0,80));
 for(const input of [null,{},1])assert.throws(()=>projectCanonicalJsonStringFields(input,patterns),TypeError);
 for(const pattern of [null,{},Array(1),[[]],[[1]],Array.from({length:17},()=>['x'])])assert.throws(()=>projectCanonicalJsonStringFields('{}',pattern),TypeError);
});

test('a large escaped canonical string is removed while its complete source span remains inspectable',{timeout:60000},()=>{
 const canonical='["猫😀\\\"\n"]'.repeat(150000),source=JSON.stringify({sources:{a:{source:'kept',canonical}},other:'unchanged'}),result=projectCanonicalJsonStringFields(source,patterns);
 assert.ok(result);assert.equal(result.source,JSON.stringify({sources:{a:{source:'kept',canonical:null}},other:'unchanged'}));assert.equal(JSON.parse(source.slice(...result.omissions[0].span)),canonical);assert.equal(result.omissions[0].span[1]>result.omissions[0].span[0],true);
});

test('both actual source producers reproduce complete copied scanner metadata checks and CST inverses',{timeout:60000},()=>{
 const result=prepareStaticJsonPreflight();assert.equal(result.files.length,3);
 for(const row of result.files){assert.equal(row.before,row.after);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.original);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.original);assert.deepEqual(row.trace.map(x=>x.phase),['language','repository']);}
 assert.equal(result.existingCompleteReaderBodyUnchanged,true);assert.equal(result.allOriginalPublicReaderBodiesUnchanged,true);assert.equal(result.additionalMetadataCallbackContract,true);assert.equal(result.originalLimitsUnchanged,true);assert.equal(result.newCaches,false);assert.equal(result.sourceAuthority,false);assert.equal(result.runtimeAuthority,false);
});

test('a complete valid legacy bank still receives every original canonical document and source equation',{timeout:60000},t=>{
 const pristine=readStaticSourceLifecycle(),folder=mkdtempSync(join(tmpdir(),'router-valid-legacy-bank-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const raw=Buffer.from(JSON.stringify(pristine.bundle)+'\n'),packed=gzipSync(raw),index={...pristine.index,rawBytes:raw.length,rawSha256:hash(raw),bytes:packed.length,sha256:hash(packed)};delete index.storage;
 writeFileSync(join(folder,'originals.json.gz'),packed);writeFileSync(join(folder,'manifest.json'),JSON.stringify(index));
 const current=readStaticSourceLifecyclePreflight({folder});assert.deepEqual(current.bundle,pristine.bundle);assert.deepEqual(current.index,index);
});

test('live JSON and crypto observers retain the original complete legacy callback route',{timeout:60000},t=>{
 const folder=mkdtempSync(join(tmpdir(),'router-legacy-bank-observers-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const raw=Buffer.from('{"schema":"wrong"}\n'),packed=gzipSync(raw),index={schema:'router-static-source-lifecycle-v1',archive:'originals.json.gz',rawBytes:raw.length,rawSha256:hash(raw),bytes:packed.length,sha256:hash(packed)};
 writeFileSync(join(folder,'originals.json.gz'),packed);writeFileSync(join(folder,'manifest.json'),JSON.stringify(index));
 for(const [owner,key]of [[JSON,'parse'],[Hash.prototype,'update']]){
  const prior=Object.getOwnPropertyDescriptor(owner,key),calls=[];
  try{Object.defineProperty(owner,key,{...prior,value(...args){calls.push(typeof args[0]==='string'?args[0]:Buffer.from(args[0]).toString('base64'));return Reflect.apply(prior.value,this,args);}});assert.throws(()=>readStaticSourceLifecycle({folder}),/test-data contract differs/);}
  finally{Object.defineProperty(owner,key,prior);}
  assert.equal(calls.length,2,key);if(key==='update')assert.deepEqual(calls,[packed.toString('base64'),raw.toString('base64')]);else assert.deepEqual(calls,[JSON.stringify(index),raw.toString()]);
 }
});
