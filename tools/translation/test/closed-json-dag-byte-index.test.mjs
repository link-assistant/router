import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {prepareClosedJsonDagByteIndex,loadOriginalClosedJsonDagByteIndexCodec} from '../prepare-closed-json-dag-byte-index.mjs';
import {encodeCompleteClosedJsonDagHookWire as encode,decodeCompleteClosedJsonDagHookWire as decode,compareCompleteClosedJsonDagHookWires as compare} from './fixtures/complete-closed-json-dag-hook-wire.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),PATH='tools/translation/test/fixtures/complete-closed-json-dag-hook-wire.mjs',ARCHIVE='tools/translation/source-profiles/closed-json-dag-byte-index/original.json.gz',projection=value=>JSON.parse(JSON.stringify(value));
const outcome=run=>{try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}};
function exact(original,value){const before=original.encodeCompleteClosedJsonDagHookWire(value),after=encode(value),sizes=compare(before,after);assert.ok(sizes.left.storedBytes<=64*1024*1024&&sizes.right.storedBytes<=64*1024*1024&&sizes.left.logicalBytes<=384*1024*1024&&sizes.right.logicalBytes<=384*1024*1024);return {before,after,value:decode(after)};}

test('the actual whole codec retains its complete old census and decoder through native spans both CST phases and inverse',{timeout:60000},()=>{
 const plan=prepareClosedJsonDagByteIndex();assert.equal(plan.path,PATH);assert.equal(plan.originalVisitAndRefusalsUnchanged,true);assert.equal(plan.performanceQualified,false);assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeAuthority,false);assert.equal(plan.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(plan.independentNativeInverse,plan.before);assert.equal(plan.inverse,plan.before);assert.equal(transportConcreteSyntaxMeta(plan.beforeMeta).source,plan.before);assert.equal(transportConcreteSyntaxMeta(plan.afterMeta).source,plan.after);assert.deepEqual(plan.stages.map(row=>row.phase),['language','repository']);assert.ok(plan.stages.every(row=>row.completeInverse));assert.equal(plan.originalReceiver.inverse,plan.before);assert.equal(plan.originalReceiver.stages.length,2);assert.equal(plan.nativeEdits.length,2);
 const root=mkdtempSync(resolve(tmpdir(),'closed-byte-census-source-'));try{for(const path of [PATH,ARCHIVE]){mkdirSync(dirname(resolve(root,path)),{recursive:true});writeFileSync(resolve(root,path),readFileSync(resolve(ROOT,path)));}const source=readFileSync(resolve(root,PATH),'utf8'),modified=source.replace("const names=keys(item);if(names.includes('stack'))fail();", "const names=[];if(names.includes('stack'))fail();");assert.notEqual(modified,source);writeFileSync(resolve(root,PATH),modified);assert.throws(()=>prepareClosedJsonDagByteIndex({root}),/fresh per-object refusal\/census changed/);}finally{rmSync(root,{recursive:true,force:true});}
});

test('fresh equal byte objects retain every original byte event alias layout and canonical framed wire',{timeout:60000},async()=>{
 const original=await loadOriginalClosedJsonDagByteIndexCodec(),bytes=Uint8Array.from({length:4096},(_,at)=>(at*29+17)&255),events=Array.from({length:512},(_,at)=>({operation:'Hash.update',args:[new Uint8Array(bytes),'utf8'],ordinal:at})),source={events,fullBuffer:Buffer.from(bytes),nested:{text:'original complete result',bytes:new Uint8Array(bytes)},emptyBytes:new Uint8Array(),plainBytes:Array.from(bytes)};
 const result=exact(original,source);assert.equal(result.value.events.length,512);for(const [index,event]of result.value.events.entries()){assert.equal(event.ordinal,index);assert.equal(event.operation,'Hash.update');assert.equal(event.args[1],'utf8');assert.deepEqual(event.args[0],bytes);}assert.deepEqual(result.value.fullBuffer,Buffer.from(bytes));assert.deepEqual(result.value.nested.bytes,bytes);assert.equal(result.value.nested.text,source.nested.text);
 const shared={bytes},a={first:shared,second:shared},b={first:{bytes:new Uint8Array(bytes)},second:{bytes:new Uint8Array(bytes)}};compare(encode(a),encode(b));exact(original,a);exact(original,b);
 result.value.events[257]={...result.value.events[257],args:[new Uint8Array(bytes),'utf8']};result.value.events[257].args[0][2047]^=1;assert.throws(()=>compare(result.after,encode(result.value)),/complete decoded bytes/u);
});

test('equal bytes never bypass fresh extra-key accessor proxy shared-storage class or stack refusals',{timeout:60000},async()=>{
 const original=await loadOriginalClosedJsonDagByteIndexCodec(),bytes=new Uint8Array([0,1,255,128]);let calls=0;const getter=()=>{calls++;return 1;},extra=new Uint8Array(bytes),hidden=new Uint8Array(bytes),symbol=new Uint8Array(bytes),stack=new Uint8Array(bytes),toJSON=new Uint8Array(bytes);extra.tail=1;Object.defineProperty(hidden,'hidden',{get:getter});symbol[Symbol('extra')]=1;Object.defineProperty(stack,'stack',{get:getter});Object.defineProperty(toJSON,'toJSON',{get:getter});const cases=[extra,hidden,symbol,stack,toJSON,new Proxy(new Uint8Array(bytes),{ownKeys(){calls++;return [];}}),new(class Bytes extends Uint8Array{})(bytes)];if(typeof SharedArrayBuffer==='function')cases.push(new Uint8Array(new SharedArrayBuffer(bytes.length)));
 for(const second of cases){const source={first:new Uint8Array(bytes),second},before=outcome(()=>original.encodeCompleteClosedJsonDagHookWire(source)),after=outcome(()=>encode(source));assert.deepStrictEqual(after,before);assert.ok(after.error);}assert.equal(calls,0);
});

test('offset views foreign storage getters and changed storage prototype use exact original copy semantics without callbacks',{timeout:60000},async()=>{
 const original=await loadOriginalClosedJsonDagByteIndexCodec(),storage=new ArrayBuffer(32),all=new Uint8Array(storage);all.set(Array.from({length:32},(_,at)=>at*7&255));const views={first:new Uint8Array(storage,7,13),second:Buffer.from(storage,7,13)};exact(original,views);let calls=0;Object.defineProperty(storage,'byteLength',{get(){calls++;return 32;},configurable:true});exact(original,views);assert.equal(calls,0);delete storage.byteLength;
 class Storage extends ArrayBuffer{}const foreign=new Storage(8);Object.defineProperty(foreign,'byteLength',{get(){calls++;return 8;}});exact(original,{bytes:new Uint8Array(foreign)});assert.equal(calls,0);
 const field=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'byteLength');try{Object.defineProperty(ArrayBuffer.prototype,'byteLength',{...field,get(){calls++;return Reflect.apply(field.get,this,[]);}});exact(original,views);}finally{Object.defineProperty(ArrayBuffer.prototype,'byteLength',field);}assert.equal(calls,0);
 if(typeof structuredClone==='function'){const buffer=new ArrayBuffer(8),view=new Uint8Array(buffer);structuredClone(buffer,{transfer:[buffer]});assert.deepStrictEqual(outcome(()=>encode(view)),outcome(()=>original.encodeCompleteClosedJsonDagHookWire(view)));}
});

test('scratch eviction oversized uncached payloads and later invocations retain exact complete frames and mutations',{timeout:60000},async()=>{
 const original=await loadOriginalClosedJsonDagByteIndexCodec(),payloads=Array.from({length:5},(_,index)=>{const bytes=new Uint8Array(270000);bytes.fill(index+1);return bytes;}),source={first:payloads.map(bytes=>new Uint8Array(bytes)),again:payloads.map(bytes=>new Uint8Array(bytes)),uncached:new Uint8Array(1024*1024+1)};source.uncached[1024*1024]=255;const result=exact(original,source);assert.equal(result.value.uncached.length,1024*1024+1);assert.equal(result.value.uncached[1024*1024],255);for(let at=0;at<payloads.length;at++){assert.deepEqual(result.value.first[at],payloads[at]);assert.deepEqual(result.value.again[at],payloads[at]);}
 const bytes=new Uint8Array([1,2,3]),first=exact(original,{bytes}).after;bytes[1]=255;const changed=exact(original,{bytes}).after;assert.throws(()=>compare(first,changed),/complete decoded bytes/u);assert.equal(decode(changed).bytes[1],255);
});

test('new Latin1 Map and view operations retain the original late-hook refusal boundary and all JSON field semantics',{timeout:60000},async()=>{
 const original=await loadOriginalClosedJsonDagByteIndexCodec();let calls=0;for(const [owner,key]of [[Buffer.prototype,'toString'],[Map.prototype,'get'],[Buffer,'from']]){const field=Object.getOwnPropertyDescriptor(owner,key);let before,after;try{Object.defineProperty(owner,key,{...field,value(){calls++;throw Error('unexpected callback');}});before=outcome(()=>original.encodeCompleteClosedJsonDagHookWire({bytes:new Uint8Array([1,2])}));after=outcome(()=>encode({bytes:new Uint8Array([1,2])}));}finally{Object.defineProperty(owner,key,field);}assert.deepStrictEqual(after,before);assert.ok(after.error);}assert.equal(calls,0);
 const value={'10':'integer order','2':'first',nul:'\0\ud800😀',unknown:undefined,numbers:[NaN,-0,Infinity,undefined],bytes:new Uint8Array([0,255,128])},result=exact(original,value);assert.deepStrictEqual(projection(result.value),projection(value));compare(result.after,encode(result.value));
});
