// Complete observation DATA only. String occurrences are indexed, never omitted.
// No compiler source, proof, verdict or encoded record survives an invocation.
import {types} from 'node:util';
import {Buffer} from 'node:buffer';
import {encodeCompleteHookWire,decodeCompleteHookWire,compareCompleteHookWires} from './complete-hook-wire.mjs';
const stringify=JSON.stringify,own=Object.hasOwn,keys=Reflect.ownKeys,descriptor=Object.getOwnPropertyDescriptor,prototype=Object.getPrototypeOf,define=Object.defineProperty;
const OBJECT=Object.prototype,ARRAY=Array.prototype,BUFFER=Buffer.prototype,proxy=types.isProxy,array=Array.isArray,bytes=Buffer.byteLength,apply=Reflect.apply;
const bufferText=Buffer.prototype.toString,bufferFrom=Buffer.from,bufferTest=Buffer.isBuffer,bufferLength=descriptor(prototype(Uint8Array.prototype),'length').get;
const SCHEMA='complete-hook-indexed-primitive-DATA-v1',LIMIT=384*1024*1024,CHUNK=32768;
function fail(){throw TypeError('Complete indexed hook DATA: full bounded tree/string equation differs');}
function list(value,length){if(!array(value)||value.length!==length)fail();}
function shape(value,names){if(!value||typeof value!=='object'||array(value)||stringify(Object.keys(value))!==stringify(names))fail();}
function index(value,length){if(!Number.isSafeInteger(value)||value<0||value>=length)fail();return value;}
export function encodeCompleteIndexedHookWire(value){
 const strings=[],ids=new Map(),active=new WeakSet();let cost=256;
 function charge(amount){cost+=amount;if(cost>LIMIT)fail();}
 function intern(text){
  if(ids.has(text))return ids.get(text);const parts=[];charge(4);
  for(let at=0;at<text.length;at+=CHUNK){const part=text.slice(at,at+CHUNK);charge(bytes(stringify(part))+1);parts.push(part);}
  if(!parts.length){charge(3);parts.push('');}const id=strings.length;strings.push(parts);ids.set(text,id);return id;
 }
 function visit(item,depth){
  charge(64);if(depth>512)fail();
  if(item===null)return ['z'];if(item===undefined)return ['u'];
  if(typeof item==='string')return ['s',intern(item)];if(typeof item==='boolean')return ['b',item];
  if(typeof item==='number')return Number.isFinite(item)&&!Object.is(item,-0)?['n',item]:['x',Number.isNaN(item)?'NaN':Object.is(item,-0)?'-0':item===Infinity?'+Infinity':'-Infinity'];
  if(typeof item==='bigint')return ['i',intern(''+item)];
  if(typeof item!=='object'||proxy(item)||active.has(item))fail();
  if(bufferTest(item)){
   const length=apply(bufferLength,item,[]);if(prototype(item)!==BUFFER||length>LIMIT*3/4||keys(item).length!==length)fail();
   // Deliberate Buffer normalization: decoding restores ALL original bytes,
   // whose ordinary Buffer.toJSON projection is the same as the old JSON wire.
   return ['v',intern(apply(bufferText,item,['base64']))];
  }
  const isArray=array(item),parent=prototype(item);if(parent!==(isArray?ARRAY:OBJECT)&&parent!==null)fail();active.add(item);
  try{
   const names=keys(item),rows=[];let length;
   if(isArray){const field=descriptor(item,'length');if(!field||!own(field,'value'))fail();length=field.value;}
   for(const key of names){if(typeof key!=='string')fail();if(isArray&&key==='length')continue;const field=descriptor(item,key);if(!field||!own(field,'value')||!field.enumerable)fail();charge(64);rows.push([intern(key),visit(field.value,depth+1)]);}
   // Original JSON wire equality deliberately ignores null-vs-ordinary
   // prototypes. Preserve every field while retaining that same equation.
   return isArray?['a',length,rows]:['o',rows];
  }finally{active.delete(item);}
 }
 try{return encodeCompleteHookWire({schema:SCHEMA,strings,root:visit(value,0)});}finally{ids.clear();strings.length=0;}
}
export function decodeCompleteIndexedHookWire(text){
 const value=decodeCompleteHookWire(text);shape(value,['schema','strings','root']);if(value.schema!==SCHEMA||!array(value.strings))fail();
 const dictionary=[],unique=new Set(),used=new Set();let cost=256;
 function charge(amount){cost+=amount;if(cost>LIMIT)fail();}
 for(const parts of value.strings){
  if(!array(parts)||!parts.length)fail();charge(4);let length=0;
  for(let at=0;at<parts.length;at++){const part=parts[at];if(typeof part!=='string'||part.length>CHUNK||at<parts.length-1&&part.length!==CHUNK||parts.length>1&&part.length===0)fail();charge(bytes(stringify(part))+1);length+=part.length;}
  const string=parts.join('');if(string.length!==length||unique.has(string))fail();unique.add(string);dictionary.push(string);
 }
 function read(id){index(id,dictionary.length);if(!used.has(id)){if(id!==used.size)fail();used.add(id);}return dictionary[id];}
 function visit(node,depth){
  charge(64);if(depth>512||!array(node)||typeof node[0]!=='string')fail();const tag=node[0];
  if(tag==='z'||tag==='u'){list(node,1);return tag==='z'?null:undefined;}
  if(tag==='s'){list(node,2);return read(node[1]);}if(tag==='b'){list(node,2);if(typeof node[1]!=='boolean')fail();return node[1];}
  if(tag==='n'){list(node,2);if(typeof node[1]!=='number'||!Number.isFinite(node[1])||Object.is(node[1],-0))fail();return node[1];}
  if(tag==='x'){list(node,2);if(!['NaN','-0','+Infinity','-Infinity'].includes(node[1]))fail();return node[1]==='NaN'?NaN:node[1]==='-0'?-0:node[1]==='+Infinity'?Infinity:-Infinity;}
  if(tag==='i'){list(node,2);const source=read(node[1]);if(!/^(?:0|-[1-9][0-9]*|[1-9][0-9]*)$/u.test(source))fail();return BigInt(source);}
  if(tag==='v'){list(node,2);const source=read(node[1]),result=bufferFrom(source,'base64');if(apply(bufferText,result,['base64'])!==source)fail();return result;}
  if(!['a','o'].includes(tag))fail();list(node,tag==='a'?3:2);const rows=node[tag==='a'?2:1];if(!array(rows))fail();
  const result=tag==='a'?[]:{},names=[];
  if(tag==='a'){if(!Number.isSafeInteger(node[1])||node[1]<0||node[1]>4294967295)fail();result.length=node[1];}
  for(const row of rows){list(row,2);charge(64);const key=read(row[0]);if(own(result,key)||tag==='a'&&key==='length')fail();names.push(key);define(result,key,{__proto__:null,value:visit(row[1],depth+1),enumerable:true,writable:true,configurable:true});}
  const actual=keys(result).filter(key=>!(tag==='a'&&key==='length'));if(stringify(actual)!==stringify(names)||tag==='a'&&result.length!==node[1])fail();return result;
 }
 const result=visit(value.root,0);if(used.size!==dictionary.length)fail();return result;
}
export function compareCompleteIndexedHookWires(left,right){
 // Deterministic first-occurrence IDs and every ordered tree row are in these
 // full frame bytes. No digest-only or selected-field equality can pass here.
 return compareCompleteHookWires(left,right);
}
