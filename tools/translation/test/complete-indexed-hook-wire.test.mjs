import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeCompleteIndexedHookWire as encode,decodeCompleteIndexedHookWire as decode,compareCompleteIndexedHookWires as compare} from './fixtures/complete-indexed-hook-wire.mjs';
import {encodeCompleteHookWire,decodeCompleteHookWire} from './fixtures/complete-hook-wire.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';

test('complete indexed DATA retains every original JSON field event order Buffer byte and null-prototype projection',{timeout:60000},()=>{
 const source={kind:'hash-hook',workload:{tape:[{operation:'Hash.update',args:[Buffer.from([0,255,1]),undefined]},{operation:'Hash.digest',args:['hex'],value:'actual digest'}],result:{value:[Object.assign(Object.create(null),{flags:{},files:['source']})]}}};
 const wire=encode(source),actual=decode(wire);assert.equal(JSON.stringify(actual),JSON.stringify(source));assert.deepStrictEqual(actual.workload.tape[0].args[0],source.workload.tape[0].args[0]);compare(wire,encode(actual));
 const ordinary={field:1},dictionary=Object.assign(Object.create(null),ordinary);compare(encode(ordinary),encode(dictionary));
 const row=actual.workload.tape[1];row.value+=' ';assert.throws(()=>compare(wire,encode(actual)),/complete decoded bytes/u);
});

test('a complete tape with over512MiB repeated primitive payloads avoids monolithic stringify while retaining all600 occurrences',{timeout:60000},()=>{
 const payload='original payload '.repeat(65536),source={tape:Array.from({length:600},(_,ordinal)=>({ordinal,operation:'Hash.update',args:[payload,'utf8']})),tail:{retained:'complete final field'}};
 assert.ok(payload.length*source.tape.length>512*1024*1024);const wire=encode(source),sizes=compare(wire,wire),actual=decode(wire);assert.ok(sizes.left.logicalBytes<384*1024*1024);assert.ok(sizes.left.storedBytes<=64*1024*1024);assert.equal(actual.tape.length,600);
 for(let at=0;at<600;at++){assert.equal(actual.tape[at].ordinal,at);assert.deepStrictEqual(actual.tape[at].args,[payload,'utf8']);assert.equal(actual.tape[at].operation,'Hash.update');}assert.deepStrictEqual(actual.tail,source.tail);
});

test('primitive tags retain undefined BigInt negativezero nonfinite numbers loneUTF16 and special keys',{timeout:60000},()=>{
 const source={values:[undefined,123456789012345678901234567890n,-0,NaN,Infinity,-Infinity,'x'.repeat(32767)+'😀\ud800'],undefinedField:undefined};Object.defineProperty(source,'__proto__',{value:{get:'own complete field'},enumerable:true});
 const actual=decode(encode(source));assert.deepStrictEqual(actual,source);assert.equal(Object.hasOwn(actual,'undefinedField'),true);assert.equal(Object.getPrototypeOf(actual),Object.prototype);assert.equal(actual.__proto__.get,'own complete field');
});

test('unknown executables classes cycles proxies accessors symbols and custom Buffer hooks refuse without invocation',{timeout:60000},()=>{
 let calls=0;const cycle={};cycle.self=cycle;const buffer=Buffer.from([1]);Object.defineProperty(buffer,'toJSON',{get(){calls++;},enumerable:true});
 const values=[()=>0,new (class Unknown {})(),cycle,new Proxy({field:1},{get(){calls++;},ownKeys(){calls++;return [];}}),Object.defineProperty({},'field',{get(){calls++;},enumerable:true}),{[Symbol('unknown')]:1},buffer];
 for(const value of values)assert.throws(()=>encode(value),/full bounded tree/u);assert.equal(calls,0);
});

test('valid complete frames with forged tree IDs duplicate strings or omitted original occurrences remain strict',{timeout:60000},()=>{
 const source={tape:[{value:'actual digest'},{value:'actual digest'}]},wire=encode(source);
 for(const kind of ['id','duplicate','omitted','extra']){
  const representation=decodeCompleteHookWire(wire);
  if(kind==='id')representation.root[1][0][0]=representation.strings.length;
  else if(kind==='duplicate')representation.strings.push([...representation.strings[0]]);
  else if(kind==='extra')representation.extra='unrecognized';
  else representation.root[1][0][1][2].pop();
  const changed=encodeCompleteHookWire(representation);assert.throws(()=>compare(wire,changed),/complete decoded bytes/u);
  if(kind!=='omitted')assert.throws(()=>decode(changed),/full bounded tree/u);
 }
 assert.equal(decode(wire).tape.length,2);const changed=encode({tape:[{value:'changed between actual calls'},{value:'actual digest'}]});assert.throws(()=>compare(wire,changed),/complete decoded bytes/u);compare(wire,encode(source));
});

test('complete authored indexed codec and actual child source retain whole serialized CST and inverses',{timeout:60000},()=>{
 for(const name of ['fixtures/complete-indexed-hook-wire.mjs','fixtures/whole-owner-core-corpus-hook-child.mjs']){
  const source=readFileSync(new URL('./'+name,import.meta.url),'utf8'),first=transportConcreteSyntaxSource(source,{language:'JavaScript'}),sequence={languageRules:[{id:'javascript:complete-lossless-observation-source',edits:[]}],repositoryRules:[{id:'router:retain-every-observation-field-and-original-case-bound',edits:[]}]},run=applyConcreteSyntaxSubstitutions(first.document,sequence),stored=serializeConcreteSyntaxMeta(run.value);assert.equal(transportConcreteSyntaxMeta(stored).source,source);assert.equal(transportConcreteSyntaxMeta(first.meta).source,source);assert.equal(readFileSync(new URL('./'+name,import.meta.url),'utf8'),source);
 }
});
