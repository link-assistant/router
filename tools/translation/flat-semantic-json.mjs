// Explicit stock-native inert-data storage lane. No semantic/source authority.
import {types} from 'node:util';
import {Buffer as NativeBuffer} from 'node:buffer';
import {originalPrivateParserExpectedCommonIntrinsicsUnchanged,originalNamespaceTraversalIntrinsicsUnchanged} from './original-json-intrinsics.mjs';

export const FLAT_SEMANTIC_JSON_LIMITS=Object.freeze({bytes:64*1024*1024,objects:2000000,depth:512});
const nativeJson=JSON.stringify,ownKeys=Reflect.ownKeys,descriptor=Object.getOwnPropertyDescriptor,prototype=Object.getPrototypeOf;
const objectPrototype=Object.prototype,arrayPrototype=Array.prototype,mapPrototype=Map.prototype;
const mapEntries=Map.prototype.entries,mapNext=prototype(new Map().entries()).next;
const fail=reason=>{throw new TypeError('Flat semantic JSON: '+reason);};
// As in the existing native output lane, Buffer infrastructure is trusted at
// module birth. Pin its complete constructor/prototype chains thereafter.
const hosts=[],seenHosts=new Set(),globalBuffer=descriptor(globalThis,'Buffer');
for(const first of [NativeBuffer,NativeBuffer.prototype])for(let owner=first;owner!==null&&!seenHosts.has(owner);owner=prototype(owner)){seenHosts.add(owner);const keys=ownKeys(owner);hosts.push({owner,parent:prototype(owner),keys,fields:keys.map(key=>descriptor(owner,key))});}
function sameDescriptor(a,b){return !!a&&!!b&&Object.hasOwn(a,'value')===Object.hasOwn(b,'value')&&a.enumerable===b.enumerable&&a.configurable===b.configurable&&(Object.hasOwn(a,'value')?a.value===b.value&&a.writable===b.writable:a.get===b.get&&a.set===b.set);}
function native(){
 if(!originalPrivateParserExpectedCommonIntrinsicsUnchanged()||!originalNamespaceTraversalIntrinsicsUnchanged())fail('original stock native operations required');
 if(!globalBuffer||Object.hasOwn(globalBuffer,'value')&&globalBuffer.value!==NativeBuffer||!sameDescriptor(globalBuffer,descriptor(globalThis,'Buffer')))fail('original Buffer binding required');
 for(const host of hosts){const keys=ownKeys(host.owner);if(prototype(host.owner)!==host.parent||keys.length!==host.keys.length)fail('original Buffer host required');for(let index=0;index<keys.length;index++)if(keys[index]!==host.keys[index]||!sameDescriptor(host.fields[index],descriptor(host.owner,keys[index])))fail('original Buffer host required');}
}

// This API deliberately refuses observable objects/callbacks. The original
// semantic serializer and its ordinary observer contract remain unchanged.
function writeJson(value,emit,projectField=false){
 native();if(value===undefined)fail('canonical JSON root required');let bytes=0,objects=0;const active=new Set();
 const write=text=>{bytes+=NativeBuffer.byteLength(text);if(bytes>FLAT_SEMANTIC_JSON_LIMITS.bytes)fail('original field byte budget exceeded');emit(text);};
 function visit(value,depth){
  if(depth>FLAT_SEMANTIC_JSON_LIMITS.depth)fail('original field depth budget exceeded');
  if(typeof value==='bigint'&&projectField){visit({$bigint:value.toString()},depth);return;}
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'){write(nativeJson(value));return;}
  if(value===undefined){write('null');return;}
  if(typeof value!=='object'||types.isProxy(value)||active.has(value))fail('acyclic inert values required');
  if(++objects>FLAT_SEMANTIC_JSON_LIMITS.objects)fail('original field object budget exceeded');
  const parent=prototype(value),keys=ownKeys(value);active.add(value);
  if(parent===mapPrototype){
   if(keys.length)fail('unmodified native Map required');
   if(projectField){
    const cursor=Reflect.apply(mapEntries,value,[]);for(;;){const row=Reflect.apply(mapNext,cursor,[]);if(row.done)break;const key=row.value[0];if(key!==null&&(typeof key==='object'||typeof key==='function'))fail('primitive project Map keys required');}
    // Original field serialization uses Object.fromEntries, including integer
    // key ordering, duplicate property keys and native primitive coercions.
    objects--;visit(Object.fromEntries(value),depth);active.delete(value);return;
   }
   // Exactly the original semantic replacer's {$map:[...value]} encoding.
   if(++objects>FLAT_SEMANTIC_JSON_LIMITS.objects)fail('original field object budget exceeded');
   write('{"$map":[');const cursor=Reflect.apply(mapEntries,value,[]);let first=true;
   for(;;){const row=Reflect.apply(mapNext,cursor,[]);if(row.done)break;if(!first)write(',');first=false;visit(row.value,depth+2);}
   write(']}');
  }else if(parent===arrayPrototype){
   const length=descriptor(value,'length');if(!length||!Object.hasOwn(length,'value')||keys.length!==length.value+1)fail('dense ordinary array required');
   write('[');for(let index=0;index<length.value;index++){
    const field=descriptor(value,String(index));if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('dense array data required');
    if(index)write(',');visit(field.value,depth+1);
   }write(']');
  }else{
   if(projectField&&[Set.prototype,WeakMap.prototype,WeakSet.prototype,RegExp.prototype,ArrayBuffer.prototype].includes(parent)&&keys.every(key=>key==='lastIndex'&&!descriptor(value,key).enumerable)){write('{}');active.delete(value);return;}
   if(parent!==objectPrototype&&parent!==null)fail('ordinary inert record required');
   write('{');let first=true;
   for(const key of keys){
    const field=descriptor(value,key);if(projectField&&typeof key==='symbol')continue;if(projectField&&field&&!field.enumerable&&key!=='toJSON')continue;if(typeof key!=='string'||!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('enumerable own record data required');
    if(field.value===undefined)continue;
    if(!first)write(',');first=false;write(nativeJson(key));write(':');visit(field.value,depth+1);
   }write('}');
  }
  active.delete(value);
 }
 visit(value,0);native();return {bytes,objects};
}

export function serializeFlatSemanticJson(value){
 // UTF16LE buffers keep completed chunks outside the V8 string heap and retain
 // every code unit, including lone surrogates escaped by native JSON.stringify.
 const chunks=[];let pending='';
 const flush=()=>{if(pending){chunks.push(NativeBuffer.from(pending,'utf16le'));pending='';}};
 writeJson(value,text=>{if(pending.length+text.length>16384)flush();if(text.length>16384)chunks.push(NativeBuffer.from(text,'utf16le'));else pending+=text;});
 flush();native();const result=NativeBuffer.concat(chunks).toString('utf16le');native();return result;
}

export function flatSemanticJsonMatches(value,text){
 if(typeof text!=='string')fail('primitive canonical text required');
 let at=0,matches=true;
 writeJson(value,piece=>{if(text.slice(at,at+piece.length)!==piece)matches=false;at+=piece.length;});
 return matches&&at===text.length;
}

// Complete original project-field JSON bytes, without a whole UTF16 document.
export function serializeFlatProjectJsonUtf8(value){
 const chunks=[];let pending='';const flush=()=>{if(pending){chunks.push(NativeBuffer.from(pending,'utf8'));pending='';}};
 writeJson(value,text=>{if(pending.length+text.length>16384)flush();if(text.length>16384)chunks.push(NativeBuffer.from(text,'utf8'));else pending+=text;},true);
 flush();native();const result=NativeBuffer.concat(chunks);native();return result;
}
