// CLOSED callback-free JSON projection DATA only; trusted stock observation
// bootstrap/intrinsics are required. No source/owner/type/runtime authority.
import {types} from 'node:util';
import {Buffer} from 'node:buffer';
import {Hash} from 'node:crypto';
import {encodeCompleteHookWire,decodeCompleteHookWire,compareCompleteHookWires} from './complete-hook-wire.mjs';
const stringify=JSON.stringify,keys=Reflect.ownKeys,objectKeys=Object.keys,descriptor=Object.getOwnPropertyDescriptor,prototype=Object.getPrototypeOf,own=Object.hasOwn,apply=Reflect.apply,define=Object.defineProperty,arrayFrom=Array.from;
const NativeMap=Map,NativeSet=Set,NativeWeakMap=WeakMap,NativeWeakSet=WeakSet,Failure=TypeError;
const array=Array.isArray,finite=Number.isFinite,integer=Number.isInteger,objectIs=Object.is,proxy=types.isProxy,boxed=types.isBoxedPrimitive,nativeError=types.isNativeError,isBytes=types.isUint8Array,isShared=types.isSharedArrayBuffer,isView=ArrayBuffer.isView;
const OBJECT=Object.prototype,ARRAY=Array.prototype,BYTE=Uint8Array.prototype,BUFFER=Buffer.prototype,Byte=Uint8Array,typed=prototype(BYTE),lengthOf=descriptor(typed,'length').get,bufferOf=descriptor(typed,'buffer').get;
const bufferFrom=Buffer.from,bufferText=Buffer.prototype.toString,bufferJson=descriptor(BUFFER,'toJSON'),byteLength=Buffer.byteLength,OMIT={};
const SCHEMA='complete-closed-json-structural-DAG-v1',LIMIT=384*1024*1024,CHUNK=32768,EDGES=Math.floor((LIMIT-64)/32);
// These are trusted-bootstrap fixed intrinsic owners, not input prototypes.
// A changed census is rejected BEFORE descriptors of any newly added lazy key.
// Realizing the stock lazy global Buffer is an explicit observation bootstrap.
const observationGlobalBuffer=globalThis.Buffer;
const hostGlobals=['Object','Array','Map','Set','WeakMap','WeakSet','String','Number','Math','JSON','Reflect','ArrayBuffer','Uint8Array','Buffer','TypeError'].map(name=>({name,field:descriptor(globalThis,name)}));
const hostOwners=[OBJECT,ARRAY,Map.prototype,Set.prototype,WeakMap.prototype,WeakSet.prototype,String.prototype,BYTE,typed,BUFFER,Buffer,Hash,Hash.prototype,Object,Array,Number,Math,JSON,Reflect,ArrayBuffer,types],hostPins=hostOwners.map(owner=>({owner,parent:prototype(owner),names:keys(owner),fields:keys(owner).map(key=>descriptor(owner,key))}));
function fail(detail=''){throw Failure('Complete closed JSON DAG: full bounded node/string/projection equation differs'+(detail?': '+detail:''));}
function same(a,b){return !!a&&!!b&&own(a,'value')===own(b,'value')&&a.enumerable===b.enumerable&&a.configurable===b.configurable&&(own(a,'value')?objectIs(a.value,b.value)&&a.writable===b.writable:a.get===b.get&&a.set===b.set);}
function host(){if(observationGlobalBuffer!==Buffer)fail('global Buffer');for(let at=0;at<hostGlobals.length;at++){const pin=hostGlobals[at];if(!same(descriptor(globalThis,pin.name),pin.field))fail('global '+pin.name);}for(let index=0;index<hostPins.length;index++){const pin=hostPins[index];if(proxy(pin.owner)||prototype(pin.owner)!==pin.parent)fail('owner '+index+' ancestry');const names=keys(pin.owner);if(names.length!==pin.names.length)fail('owner '+index+' census');for(let at=0;at<names.length;at++)if(names[at]!==pin.names[at])fail('owner '+index+' key '+at);for(let at=0;at<names.length;at++)if(!same(descriptor(pin.owner,names[at]),pin.fields[at]))fail('owner '+index+' descriptor '+at);}}
function list(value,length){if(!array(value)||value.length!==length)fail();}
function id(value,length){if(!integer(value)||value<0||value>=length)fail();return value;}
function isByte(value){return typeof value==='number'&&integer(value)&&value>=0&&value<=255;}
function base64(value){return apply(bufferText,apply(bufferFrom,Buffer,[value]),['base64']);}
export function encodeCompleteClosedJsonDagHookWire(value){
 host();const strings=[],nodes=[],heights=[],stringIds=new NativeMap(),nodeIds=new NativeMap(),memo=new NativeWeakMap(),active=new NativeWeakSet(),safePrototypes=new NativeWeakSet();let cost=256;
 function charge(amount){cost+=amount;if(cost>LIMIT)fail();}
 function intern(text){
  if(stringIds.has(text))return stringIds.get(text);const chunks=[];let size=16;
  for(let at=0;at<text.length;at+=CHUNK){const chunk=text.slice(at,at+CHUNK);size+=byteLength(stringify(chunk))+1;if(size>LIMIT)fail();chunks.push(chunk);}
  if(!chunks.length){size+=3;chunks.push('');}charge(size);const next=strings.length;strings.push(chunks);stringIds.set(text,next);return next;
 }
 function node(def){const signature=stringify(def);if(signature.length>LIMIT)fail();if(nodeIds.has(signature))return nodeIds.get(signature);let height=0;if(def[0]==='a8'||def[0]==='o8')height=strings[def[1]][0].length?1:0;else if(def[0]==='a')for(const child of def[1])height=Math.max(height,1+heights[child]);else if(def[0]==='o')for(const row of def[1])height=Math.max(height,1+heights[row[1]]);if(height>512)fail();charge(signature.length+1);const next=nodes.length;nodes.push(def);heights.push(height);nodeIds.set(signature,next);return next;}
 function domain(item,buffer=false){
  const path=[];let owner=item,depth=0;
  while(owner!==null){if(++depth>512)fail();if(owner!==item&&safePrototypes.has(owner))break;if(proxy(owner)||boxed(owner)||nativeError(owner))fail();const field=descriptor(owner,'toJSON');if(field&&!(buffer&&owner===BUFFER&&bufferJson&&own(bufferJson,'value')&&typeof bufferJson.value==='function'&&same(field,bufferJson)))fail();path.push(owner);owner=prototype(owner);}
  for(const owner of path)if(owner!==item&&owner!==BUFFER)safePrototypes.add(owner);
 }
 function normalized(item){
  if(item===undefined||typeof item==='symbol')return OMIT;
  if(typeof item==='function'){if(proxy(item))fail();domain(item);return OMIT;}
  if(typeof item==='bigint')fail();return item;
 }
 function byteNode(tag,values){return node([tag,intern(base64(values))]);}
 function visit(item,depth){
  if(depth>512)fail();item=normalized(item);if(item===OMIT)fail();
  if(item===null)return node(['z']);if(typeof item==='boolean')return node(['b',item]);if(typeof item==='number')return finite(item)?node(['n',objectIs(item,-0)?0:item]):node(['z']);if(typeof item==='string')return node(['s',intern(item)]);
  if(typeof item!=='object'||proxy(item)||boxed(item)||nativeError(item))fail();if(active.has(item))fail();if(memo.has(item))return memo.get(item);
  // No input callback runs in this closed operation. Retain one complete own
  // key census for stack refusal, exact byte shape and ordered object fields.
  // Numeric typed-array key names can otherwise allocate twice per full byte
  // payload; this list remains local to this visit and is never authority.
  const names=keys(item);if(names.includes('stack'))fail();const bytes=isBytes(item),buffer=bytes&&prototype(item)===BUFFER;domain(item,buffer);active.add(item);
  try{
   let result;
   if(bytes){
    const length=apply(lengthOf,item,[]),storage=apply(bufferOf,item,[]);if(!buffer&&prototype(item)!==BYTE||isShared(storage)||length>LIMIT*3/4||names.length!==length)fail();
    if(buffer){const type=intern('type'),name=node(['s',intern('Buffer')]),data=intern('data'),contents=byteNode('a8',item);result=node(['o',[[type,name],[data,contents]]]);}
    else result=byteNode('o8',item);
   }else if(isView(item))fail();
   else if(array(item)){
    const length=descriptor(item,'length');if(!length||!own(length,'value')||length.value>EDGES)fail();const values=[],parents=[];for(let owner=item;owner!==null;owner=prototype(owner))parents.push(owner);let allBytes=true;
    for(let at=0;at<length.value;at++){let field;for(const owner of parents){field=descriptor(owner,''+at);if(field)break;}if(field&&!own(field,'value'))fail();let value=normalized(field?field.value:undefined);if(value===OMIT)value=null;values.push(value);if(!isByte(value))allBytes=false;}
    result=allBytes?byteNode('a8',values):node(['a',values.map(value=>visit(value,depth+1))]);
   }else{
    if(names.length>EDGES)fail();const rows=[];let allBytes=true;
    for(const key of names){if(typeof key!=='string')continue;const field=descriptor(item,key);if(!field)fail();if(!field.enumerable)continue;if(!own(field,'value'))fail();const value=normalized(field.value);if(value===OMIT)continue;if(key!==''+rows.length||!isByte(value))allBytes=false;rows.push([key,value]);}
    result=allBytes?byteNode('o8',rows.map(row=>row[1])):node(['o',rows.map(([key,value])=>[intern(key),visit(value,depth+1)])]);
   }
   memo.set(item,result);return result;
  }finally{active.delete(item);}
 }
 try{const root=visit(value,0);host();return encodeCompleteHookWire({schema:SCHEMA,strings,nodes,root});}finally{stringIds.clear();nodeIds.clear();strings.length=0;nodes.length=0;heights.length=0;}
}
export function decodeCompleteClosedJsonDagHookWire(text){
 host();const value=decodeCompleteHookWire(text);if(!value||stringify(objectKeys(value))!==stringify(['schema','strings','nodes','root'])||value.schema!==SCHEMA||!array(value.strings)||!array(value.nodes)||!value.nodes.length)fail();
 const dictionary=[],heights=[],uniqueStrings=new NativeSet(),signatures=new NativeSet(),rawBytes=new NativeMap();let cost=256;
 function charge(amount){cost+=amount;if(cost>LIMIT)fail();}
 for(const chunks of value.strings){if(!array(chunks)||!chunks.length)fail();let size=16;for(let at=0;at<chunks.length;at++){const chunk=chunks[at];if(typeof chunk!=='string'||chunk.length>CHUNK||at<chunks.length-1&&chunk.length!==CHUNK||chunks.length>1&&!chunk.length)fail();size+=byteLength(stringify(chunk))+1;if(size>LIMIT)fail();}charge(size);const string=chunks.join('');if(uniqueStrings.has(string))fail();uniqueStrings.add(string);dictionary.push(string);}
 function stringRef(at){return dictionary[id(at,dictionary.length)];}
 function bytesRef(at){id(at,dictionary.length);if(rawBytes.has(at))return rawBytes.get(at);const source=dictionary[at],raw=apply(bufferFrom,Buffer,[source,'base64']);if(apply(bufferText,raw,['base64'])!==source)fail();rawBytes.set(at,raw);return raw;}
 for(let at=0;at<value.nodes.length;at++){
  const def=value.nodes[at];if(!array(def)||typeof def[0]!=='string')fail();const tag=def[0],signature=stringify(def);if(signatures.has(signature))fail();signatures.add(signature);charge(signature.length+1);
  if(tag==='z')list(def,1);
  else if(tag==='b'){list(def,2);if(typeof def[1]!=='boolean')fail();}
  else if(tag==='n'){list(def,2);if(typeof def[1]!=='number'||!finite(def[1])||objectIs(def[1],-0))fail();}
  else if(tag==='s'){list(def,2);stringRef(def[1]);}
  else if(tag==='a8'||tag==='o8'){list(def,2);bytesRef(def[1]);}
  else if(tag==='a'){list(def,2);if(!array(def[1])||def[1].length>EDGES||def[1].every(child=>{id(child,at);const node=value.nodes[child];return node[0]==='n'&&isByte(node[1]);}))fail();for(const child of def[1])id(child,at);}
  else if(tag==='o'){
   list(def,2);if(!array(def[1])||def[1].length>EDGES)fail();const names=[],seen=new NativeSet(),order={};let allBytes=true;
   for(const row of def[1]){list(row,2);const key=stringRef(row[0]);id(row[1],at);if(seen.has(key))fail();seen.add(key);define(order,key,{__proto__:null,value:0,enumerable:true});names.push(key);const child=value.nodes[row[1]];if(key!==''+(names.length-1)||child[0]!=='n'||!isByte(child[1]))allBytes=false;}
   if(allBytes||stringify(objectKeys(order))!==stringify(names))fail();
  }else fail();
  let height=0;if(tag==='a8'||tag==='o8')height=bytesRef(def[1]).length?1:0;else if(tag==='a')for(const child of def[1])height=Math.max(height,1+heights[child]);else if(tag==='o')for(const row of def[1])height=Math.max(height,1+heights[row[1]]);if(height>512)fail();heights.push(height);
 }
 const visited=new NativeSet(),usedStrings=new NativeSet();let nextNode=0;
 function useString(at){id(at,dictionary.length);if(!usedStrings.has(at)){if(at!==usedStrings.size)fail();usedStrings.add(at);}}
 function canonical(at,depth){
  id(at,value.nodes.length);if(depth>512)fail();if(visited.has(at))return;const def=value.nodes[at],tag=def[0];
  if(tag==='s'||tag==='a8'||tag==='o8')useString(def[1]);else if(tag==='a')for(const child of def[1])canonical(child,depth+1);else if(tag==='o')for(const row of def[1]){useString(row[0]);canonical(row[1],depth+1);}
  if(at!==nextNode++)fail();visited.add(at);
 }
 canonical(value.root,0);if(visited.size!==value.nodes.length||usedStrings.size!==dictionary.length)fail();const decoded=new NativeMap();
 function materialize(at){
  if(decoded.has(at))return decoded.get(at);const def=value.nodes[at],tag=def[0];let result;
  if(tag==='z')result=null;else if(tag==='n'||tag==='b')result=def[1];else if(tag==='s')result=dictionary[def[1]];
  else if(tag==='o8')result=new Byte(bytesRef(def[1]));else if(tag==='a8')result=arrayFrom(bytesRef(def[1]));else if(tag==='a')result=def[1].map(materialize);
  else{
   const rows=def[1],type=rows.length===2&&dictionary[rows[0][0]]==='type'&&dictionary[rows[1][0]]==='data',name=type?value.nodes[rows[0][1]]:null,data=type?value.nodes[rows[1][1]]:null;
   if(type&&name[0]==='s'&&dictionary[name[1]]==='Buffer'&&data[0]==='a8')result=apply(bufferFrom,Buffer,[bytesRef(data[1])]);
   else{result={};for(const [key,child]of rows)define(result,dictionary[key],{__proto__:null,value:materialize(child),enumerable:true,writable:true,configurable:true});}
  }
  decoded.set(at,result);return result;
 }
 const result=materialize(value.root);host();return result;
}
// The caller independently decodes the baseline DAG, then equality proves every
// candidate representation byte is that same completely validated projection.
export function compareCompleteClosedJsonDagHookWires(left,right){host();const result=compareCompleteHookWires(left,right);host();return result;}
