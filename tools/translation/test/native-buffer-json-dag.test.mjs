import test from 'node:test';
import assert from 'node:assert/strict';
import * as wire from './fixtures/complete-native-buffer-json-dag-hook-wire.mjs';

const projection=value=>JSON.parse(JSON.stringify(value));
const encode=value=>wire.encodeCompleteNativeBufferJsonDagHookWire(value);

test('native Buffer projection retains every byte and repeated event while ignoring native JSON ignored own fields',{timeout:60000},()=>{
 assert.equal(typeof wire.encodeCompleteNativeBufferJsonDagHookWire,'function');
 let callbacks=0;
 const bytes=Buffer.from(Array.from({length:65536},(_,at)=>(at*71+255)%256));
 Object.defineProperty(bytes,'ignored',{enumerable:true,get(){callbacks++;throw Error('ignored native JSON field');}});
 Object.defineProperty(bytes,Symbol('ignored symbol'),{enumerable:true,get(){callbacks++;throw Error('ignored symbol');}});
 const source={events:Array.from({length:4},(_,ordinal)=>({ordinal,args:[bytes,Buffer.from(bytes)]})),tail:'complete final event'};
 const actual=wire.decodeCompleteClosedJsonDagHookWire(encode(source));
 assert.deepEqual(projection(actual),projection(source));assert.equal(callbacks,0);
 assert.equal(actual.events.length,4);
 for(const event of actual.events)for(const value of event.args)assert.deepEqual(value,Buffer.from(bytes));
 assert.throws(()=>wire.encodeCompleteClosedJsonDagHookWire(bytes),/full bounded node/u);
 const original=encode(Buffer.from([0,255,17]));
 wire.compareCompleteClosedJsonDagHookWires(original,encode({type:'Buffer',data:[0,255,17]}));
 assert.throws(()=>wire.compareCompleteClosedJsonDagHookWires(original,encode(Buffer.from([0,254,17]))),/complete decoded bytes/u);
});

test('native Buffer projection refuses callbacks length overrides shared storage and old non Buffer domains before any input callback',{timeout:60000},()=>{
 let callbacks=0;const getter=()=>{callbacks++;return 1;};
 const length=Buffer.from([1]);Object.defineProperty(length,'length',{get:getter});
 const json=Buffer.from([1]);Object.defineProperty(json,'toJSON',{get:getter});
 const stack=Buffer.from([1]);Object.defineProperty(stack,'stack',{get:getter});
 const extra=new Uint8Array([1]);extra.ignored=2;
 const proxy=new Proxy(Buffer.from([1]),{get(){callbacks++;},ownKeys(){callbacks++;return [];},getPrototypeOf(){callbacks++;return null;}});
 const cases=[length,json,stack,extra,proxy,Object.create(Buffer.prototype),new (class Bytes extends Uint8Array {})([1]),new Error('unmaterialized stack')];
 if(typeof SharedArrayBuffer==='function')cases.push(Buffer.from(new SharedArrayBuffer(1)));
 for(const value of cases)assert.throws(()=>encode(value),/full bounded node/u);
 assert.equal(callbacks,0);
 assert.deepEqual(projection(wire.decodeCompleteClosedJsonDagHookWire(encode([Buffer.alloc(0),new Uint8Array([1,255])]))),projection([Buffer.alloc(0),new Uint8Array([1,255])]));
});

test('native Buffer projection rechecks stock native owners on every call and preserves subsequent original observations',{timeout:60000},()=>{
 let callbacks=0;const old=Object.getOwnPropertyDescriptor(Buffer.prototype,'toJSON');
 const value={bytes:Buffer.from([1,2,255])},before=encode(value);
 try{
  Object.defineProperty(Buffer.prototype,'toJSON',{...old,value(){callbacks++;return {changed:true};}});
  assert.throws(()=>encode(value),/full bounded node/u);
 }finally{Object.defineProperty(Buffer.prototype,'toJSON',old);}
 assert.equal(callbacks,0);wire.compareCompleteClosedJsonDagHookWires(before,encode(value));
 value.bytes[1]=3;assert.throws(()=>wire.compareCompleteClosedJsonDagHookWires(before,encode(value)),/complete decoded bytes/u);
 const nested=(depth,leaf)=>{for(let at=0;at<depth;at++)leaf={child:leaf};return leaf;};
 encode(nested(510,Buffer.from([1])));assert.throws(()=>encode(nested(511,Buffer.from([1]))),/full bounded node/u);
});

test('native Buffer projection ignores conversion getters on both sides of the byte index bound and on nonstock storage',{timeout:60000},()=>{
 for(const length of [1048576,1048577])for(const changedStorage of [false,true]){
  const backing=new ArrayBuffer(length+37),bytes=Buffer.from(backing,13,length);
  for(let at=0;at<length;at++)bytes[at]=(at*71+255)%256;
  const expected=Buffer.from(bytes),native=JSON.stringify(bytes);let callbacks=0;
  const ignored=()=>{callbacks++;throw Error('native Buffer JSON ignores this conversion getter');};
  for(const key of ['valueOf','buffer','byteOffset','byteLength',Symbol.toPrimitive])
   Object.defineProperty(bytes,key,{get:ignored,enumerable:true});
  if(changedStorage)Object.defineProperty(backing,'byteLength',{get:ignored});
  const decoded=wire.decodeCompleteClosedJsonDagHookWire(encode(bytes));
  assert.deepEqual(decoded,expected);assert.equal(JSON.stringify(decoded),native);
  assert.equal(JSON.stringify(bytes),native);assert.equal(callbacks,0);
 }
});

test('native Buffer projection refuses own iterator overrides without observing them',{timeout:60000},()=>{
 let callbacks=0;
 for(const length of [0,1,1048577])for(const accessor of [false,true]){
  const bytes=Buffer.alloc(length,255),observe=()=>{callbacks++;throw Error('observable native Buffer iterator');};
  Object.defineProperty(bytes,Symbol.iterator,accessor?{get:observe}:{value:observe});
  assert.throws(()=>encode(bytes),/full bounded node/u);
 }
 assert.equal(callbacks,0);
});
