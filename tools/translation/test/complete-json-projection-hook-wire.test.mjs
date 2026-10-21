import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeCompleteJsonProjectionHookWire as encode,decodeCompleteJsonProjectionHookWire as decode,compareCompleteJsonProjectionHookWires as compare} from './fixtures/complete-json-projection-hook-wire.mjs';
import {encodeCompleteHookWire,decodeCompleteHookWire} from './fixtures/complete-hook-wire.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
test('complete native JSON projection retains classes Buffer omissions keys and original callback order',{timeout:60000},()=>{
 function run(project){const tape=[];class Record{constructor(){this.name='actual';this.omitted=undefined;this.fn=()=>1;}toJSON(key){tape.push(['toJSON',key]);return {name:this.name,get field(){tape.push(['getter','field']);return '@0';}};}}
  const value={record:new Record(),buffer:Buffer.from([0,255]),emptyMap:new Map([['entry',1]]),values:[undefined,NaN,-0],nested:{name:'actual'}};Object.defineProperty(value,'__proto__',{enumerable:true,value:'own DATA'});return {value:project(value),tape};}
 assert.deepStrictEqual(run(value=>decode(encode(value))),run(value=>JSON.parse(JSON.stringify(value))));
 const bytes={tape:[{args:[new Uint8Array([0,128,255]),new Uint8Array(0)]}]},wire=encode(bytes),actual=decode(wire);assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(bytes)));compare(wire,encode(actual));assert.deepStrictEqual([...actual.tape[0].args[0]],[0,128,255]);actual.tape[0].args[0][1]=127;assert.throws(()=>compare(wire,encode(actual)),/complete decoded bytes/u);
});
test('over512MiB of complete string occurrences avoid an expanded trace string',{timeout:60000},()=>{
 const payload='actual source '.repeat(65536),value={tape:Array.from({length:600},(_,at)=>({at,args:[payload,'utf8']})),last:'complete tail'};assert.ok(payload.length*600>512*1024*1024);const wire=encode(value),actual=decode(wire);compare(wire,encode(actual));assert.equal(actual.tape.length,600);for(let at=0;at<600;at++)assert.deepStrictEqual(actual.tape[at],value.tape[at]);assert.equal(actual.last,value.last);
});
test('native string indices retain loneUTF16 marker-like originals integer keys and first-occurrence order',{timeout:60000},()=>{
 const value={12:'@0',2:'@1',nested:{last:'x'.repeat(32767)+'😀\ud800',first:'@0'},empty:'',also:'@0'};assert.deepStrictEqual(decode(encode(value)),JSON.parse(JSON.stringify(value)));compare(encode(value),encode(decode(encode(value))));
});
test('complete re-encoded changes missing strings and forged occurrence metadata remain strict',{timeout:60000},()=>{
 const wire=encode({whole:{digest:'actual',tail:'retained'}}),changed=decode(wire);changed.whole.digest+=' ';assert.throws(()=>compare(wire,encode(changed)),/complete decoded bytes/u);
 for(const field of ['occurrences','codeUnits']){const packet=decodeCompleteHookWire(wire);packet[field]++;assert.throws(()=>decode(encodeCompleteHookWire(packet)),/full bounded string/u);}
 const packet=decodeCompleteHookWire(wire);packet.strings.push(['unused complete string']);assert.throws(()=>decode(encodeCompleteHookWire(packet)),/full bounded string/u);
});
test('cycles BigInt and post-replacer boxed strings refuse while ordinary primitive JSON behavior remains original',{timeout:60000},()=>{
 const cycle={};cycle.self=cycle;const extra=new Uint8Array([1]);extra.extra='must remain a refusal';const shared=new Uint8Array(new SharedArrayBuffer(1));for(const value of [cycle,1n,Object('boxed'),{toJSON(){return Object('boxed');}},extra,shared])assert.throws(()=>encode(value));for(const value of [null,true,7,-0,NaN,'@0',Object(7),Object(false)])assert.deepStrictEqual(decode(encode(value)),JSON.parse(JSON.stringify(value)));
});
test('complete authored projection transport retains serialized CST and whole inverse',{timeout:60000},()=>{
 const source=readFileSync(new URL('./fixtures/complete-json-projection-hook-wire.mjs',import.meta.url),'utf8'),first=transportConcreteSyntaxSource(source,{language:'JavaScript'}),run=applyConcreteSyntaxSubstitutions(first.document,{languageRules:[{id:'javascript:complete-native-JSON-projection-transport',edits:[]}],repositoryRules:[{id:'router:retain-full-observer-workloads-and-original-deadlines',edits:[]}]});assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(run.value)).source,source);assert.equal(transportConcreteSyntaxMeta(first.meta).source,source);
});
