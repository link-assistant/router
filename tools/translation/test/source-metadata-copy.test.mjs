import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {copyMetadata,metadataDigest} from '../extensions/source-links.mjs';
import {copyMetadata as previousCopy} from './fixtures/source-metadata-copy-previous.mjs';
import {copyMetadata as previousOwnIndexCopy} from './fixtures/source-metadata-own-index-previous.mjs';
const encode=value=>JSON.stringify(value,(_,item)=>typeof item==='bigint'?{$integer:item.toString()}:item);
function observation(copy,value,options,...rest){try{const result=copy(value,options,...rest);return {bytes:encode(result),keys:Reflect.ownKeys(result??{}).filter(key=>typeof key==='string')};}catch(error){return {error:error.name,message:error.message};}}
function same(value,options,...rest){const expected=observation(previousCopy,value,options,...rest),actual=observation(copyMetadata,value,options,...rest);assert.deepEqual(actual,expected);return actual;}
test('complete data snapshots keep previous canonical bytes, bigint encoding and signed nested key order',()=>{
 const certificate={z:1,a:{z:2,a:3},numeric:{10:'ten',2:'two'}},value={z:['λ😀',null,undefined,4n],a:true,copyCertificate:certificate};
 same(value);same(value,{preserveKeyOrder:true});assert.equal(metadataDigest(value),createHash('sha256').update(encode(previousCopy(value))).digest('hex'));
 const copied=copyMetadata(value);assert.deepEqual(Object.keys(copied),['a','copyCertificate','z']);assert.deepEqual(Object.keys(copied.copyCertificate),['z','a','numeric']);assert.deepEqual(Object.keys(copied.copyCertificate.a),['z','a']);
 const unusual=Object.create(null);Object.defineProperty(unusual,'__proto__',{value:{z:1,a:2},enumerable:true});unusual[10]=1;unusual[2]=2;same(unusual);
});
test('proxies, accessors, symbols, hidden fields, cycles and unsupported prototypes keep exact refusals without reads',()=>{
 let reads=0;const proxy=new Proxy({},{get(){reads++;throw Error('must not inspect');},ownKeys(){reads++;throw Error('must not inspect');}}),accessor={};Object.defineProperty(accessor,'bad',{enumerable:true,get(){reads++;throw Error('must not inspect');}});const hidden={};Object.defineProperty(hidden,'bad',{value:1});const symbol={};symbol[Symbol('bad')]=1;const cycle={};cycle.self=cycle;
 for(const value of [proxy,accessor,hidden,symbol,cycle,new Map(),new Set(),new Date(),()=>{},Symbol('bad'),1.5,NaN,Infinity,Object.create({foreign:true})])assert.ok(same(value).error);assert.equal(reads,0);
 const root={before:cycle};Object.defineProperty(root,'later',{enumerable:true,get(){reads++;}});assert.equal(same(root).message,'source links: accessor, symbol or hidden metadata');assert.equal(reads,0);
});
test('array length, holes, extras, hidden indexes and inherited numeric setters retain complete descriptor validation',()=>{
 const hole=Array(2),extra=[1];extra.extra=2;const replaced=Array(2);replaced[0]=1;replaced.extra=2;const hidden=[1];Object.defineProperty(hidden,'0',{enumerable:false});const symbol=[1];symbol[Symbol('x')]=2;
 for(const value of [hole,extra,replaced,hidden,symbol])assert.ok(same(value).error);same([]);same([undefined,null,[1,2]]);
 const old=Object.getOwnPropertyDescriptor(Array.prototype,'12000');let reads=0;Object.defineProperty(Array.prototype,'12000',{configurable:true,set(){reads++;}});try{same({a:[1,2]});assert.equal(reads,0);}finally{if(old)Object.defineProperty(Array.prototype,'12000',old);else delete Array.prototype[12000];}
});
test('cell, UTF8 byte and depth budgets retain exact errors and boundaries',()=>{
 for(const cells of [0,1,2,3,4,6])same({a:[1,2]}, {cells});for(const bytes of [0,1,2,3,4,5,6])same('λ😀',{bytes});let nested=0;for(let index=0;index<162;index++)nested={next:nested};same(nested);same([1,2],{cells:2});same('λ',{bytes:2});
});
test('fresh mutable snapshots retain no references and every subsequent mutation is rechecked',()=>{
 const value={b:{z:1,a:2},a:[1,2]},first=copyMetadata(value);value.b.z=4;value.a.push(3);same(value);assert.equal(first.b.z,1);assert.deepEqual(first.a,[1,2]);Object.defineProperty(value.b,'bad',{enumerable:true,get(){throw Error('must not inspect');}});assert.ok(same(value).error);
});
test('caller recursion state and coercible budgets preserve previous routes and callback ordering',()=>{
 let count=0;const cells={valueOf(){count++;return 6;}};const before=observation(previousCopy,{a:1},{cells});const first=count;count=0;assert.deepEqual(observation(copyMetadata,{a:1},{cells}),before);assert.equal(count,first);
 const state=new Set();same({a:1},undefined,0,state,{cells:6,bytes:20});same({a:1},undefined,161,new Set(),{cells:6,bytes:20});
});
test('native descriptor rebinding/accessors and iterator changes retain exact old fallback behavior',()=>{
 const original=Object.getOwnPropertyDescriptor(Object,'getOwnPropertyDescriptors');let calls=0;Object.defineProperty(Object,'getOwnPropertyDescriptors',{...original,value(value){calls++;return original.value(value);}});
 try{const old=observation(previousCopy,{a:{b:1}}),n=calls;calls=0;assert.deepEqual(observation(copyMetadata,{a:{b:1}}),old);assert.equal(calls,n);}finally{Object.defineProperty(Object,'getOwnPropertyDescriptors',original);}
 const singular=Object.getOwnPropertyDescriptor(Object,'getOwnPropertyDescriptor');let reads=0;Object.defineProperty(Object,'getOwnPropertyDescriptor',{configurable:true,get(){reads++;throw Error('singular descriptor getter must not be called');}});try{same({a:1});assert.equal(reads,0);}finally{Object.defineProperty(Object,'getOwnPropertyDescriptor',singular);}
 const iterator=Object.getOwnPropertyDescriptor(Array.prototype,Symbol.iterator);let iterations=0;Object.defineProperty(Array.prototype,Symbol.iterator,{...iterator,value:function*(){iterations++;yield* iterator.value.call(this);}});try{const old=observation(previousCopy,{a:1}),n=iterations;iterations=0;const actual=observation(copyMetadata,{a:1}),observed=iterations;assert.deepEqual(actual,old);assert.equal(observed,n);}finally{Object.defineProperty(Array.prototype,Symbol.iterator,iterator);}
});

test('fresh imports after intrinsic rebinding preserve complete bytes, callback counts and errors',()=>{
 const directory=mkdtempSync(join(tmpdir(),'router-metadata-prebound-')),driver=join(directory,'driver.mjs'),source=new URL('../extensions/source-links.mjs',import.meta.url).href,oracle=new URL('./fixtures/source-metadata-copy-previous.mjs',import.meta.url).href;
 const code=`import assert from'node:assert/strict';const original=Object.defineProperty;let calls=0,throws=false;Object.defineProperty=function(...args){calls++;if(throws)throw new TypeError('prebound callback rejection');return Reflect.apply(original,Object,args);};try{const{copyMetadata}=await import(${JSON.stringify(source)});const{copyMetadata:previous}=await import(${JSON.stringify(oracle)});const value={z:2,a:{x:1}};calls=0;const before=previous(value),expected=calls;calls=0;const after=copyMetadata(value),actual=calls;assert.equal(JSON.stringify(after),JSON.stringify(before));assert.equal(actual,expected);assert.equal(actual,3);throws=true;const observe=copy=>{calls=0;try{copy(value);return null;}catch(error){return{error:error.name,message:error.message,calls};}};assert.deepEqual(observe(copyMetadata),observe(previous));console.log(JSON.stringify({bytesEqual:true,callbacks:actual,errorPreserved:true}));}finally{Object.defineProperty=original;}`;
 try{writeFileSync(driver,code);for(const engine of ['node','bun']){const result=JSON.parse(execFileSync(engine,[driver],{encoding:'utf8',timeout:10000}));assert.deepEqual(result,{bytesEqual:true,callbacks:3,errorPreserved:true});}}finally{rmSync(directory,{recursive:true,force:true});}
});

test('same-key-count holes reject an inherited numeric descriptor before its getter while dense-array setters stay observable',{timeout:5000},()=>{
 const index=127,key=String(index),previous=Object.getOwnPropertyDescriptor(Object.prototype,key),define=Object.defineProperty;
 function observe(copy,hole){
  const value=Array.from({length:index+1},(_,at)=>at);if(hole){delete value[index];value.unrelated=true;}
  let reads=0,writes=0,result,error;
  define(Object.prototype,key,{configurable:true,get(){reads++;return {value:'inherited descriptor',enumerable:true};},set(value){writes++;define(this,key,{value,writable:true,enumerable:true,configurable:true});}});
  try{result=copy(value);}catch(cause){error={name:cause.name,message:cause.message};}
  finally{if(previous)define(Object.prototype,key,previous);else delete Object.prototype[key];}
  return {reads,writes,error,bytes:encode(result)};
 }
 const old=observe(previousOwnIndexCopy,true),actual=observe(copyMetadata,true);
 assert.equal(old.reads,1);assert.equal(old.error,undefined);assert.equal(actual.reads,0);assert.equal(actual.writes,0);
 assert.deepEqual(actual.error,{name:'TypeError',message:'source links: array metadata hole'});
 const denseOld=observe(previousOwnIndexCopy,false),dense=observe(copyMetadata,false);
 assert.equal(denseOld.error,undefined);assert.equal(dense.error,undefined);assert.equal(dense.reads,0);assert.equal(dense.writes,1);assert.deepEqual(dense,denseOld);
});

test('valid metadata keeps the complete mutable intrinsic callback tape and inherited toJSON behavior',{timeout:5000},()=>{
 const targets=[[Object,'getOwnPropertyDescriptors'],[Reflect,'ownKeys'],[Object,'hasOwn'],[Object,'defineProperty'],[Buffer,'byteLength'],[globalThis,'String'],[JSON,'stringify']];
 const pins=targets.map(([owner,key])=>({owner,key,descriptor:Object.getOwnPropertyDescriptor(owner,key)})),define=Object.defineProperty;let tape='';
 let expected,actual,expectedTape,actualTape;
 try{
  for(const pin of pins)define(pin.owner,pin.key,{...pin.descriptor,value:function(...args){tape+=pin.key+';';return Reflect.apply(pin.descriptor.value,this,args);}});
  const value={z:['λ😀',null,undefined,4n],a:{z:1,a:2},copyCertificate:{z:2,a:1}};
  tape='';expected=observation(previousOwnIndexCopy,value);expectedTape=tape;
  tape='';actual=observation(copyMetadata,value);actualTape=tape;
 }finally{for(let at=pins.length-1;at>=0;at--){const pin=pins[at];define(pin.owner,pin.key,pin.descriptor);}}
 assert.equal(expected.error,undefined);assert.equal(actual.error,undefined);assert.deepEqual(actual,expected);assert.equal(actualTape,expectedTape);assert.ok(actualTape.includes('defineProperty;'));assert.ok(actualTape.includes('String;'));
 const stringDescriptor=Object.getOwnPropertyDescriptor(globalThis,'String'),string=stringDescriptor.value;
 try{
  define(globalThis,'String',{...stringDescriptor,value(...args){tape+='String;';const key=Reflect.apply(string,undefined,args);return {[Symbol.toPrimitive](){tape+='key;';return key;}};}});
  tape='';expected=observation(previousOwnIndexCopy,[1,2]);expectedTape=tape;
  tape='';actual=observation(copyMetadata,[1,2]);actualTape=tape;
 }finally{define(globalThis,'String',stringDescriptor);}
 assert.equal(expected.error,undefined);assert.equal(actual.error,undefined);assert.deepEqual(actual,expected);assert.equal(actualTape,expectedTape);assert.equal(actualTape,'String;key;String;key;');
 for(const prototype of [Object.prototype,Array.prototype]){
  const original=Object.getOwnPropertyDescriptor(prototype,'toJSON');let calls=0,oldCalls,newCalls,oldDigest,newDigest;
  try{
   define(prototype,'toJSON',{configurable:true,value(){calls++;return this;}});
   const value={items:[{value:'λ'},3n]};
   calls=0;oldDigest=createHash('sha256').update(encode(previousOwnIndexCopy(value))).digest('hex');oldCalls=calls;
   calls=0;newDigest=metadataDigest(value);newCalls=calls;
  }finally{if(original)define(prototype,'toJSON',original);else delete prototype.toJSON;}
  assert.ok(oldCalls>0);assert.equal(newCalls,oldCalls);assert.equal(newDigest,oldDigest);
 }
});
