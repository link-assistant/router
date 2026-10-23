// Explicit stock-native inert-data storage lane. No semantic/source authority.
import {types} from 'node:util';
import {originalPrivateParserExpectedCommonIntrinsicsUnchanged,originalNamespaceTraversalIntrinsicsUnchanged} from './original-json-intrinsics.mjs';

export const FLAT_SEMANTIC_JSON_LIMITS=Object.freeze({bytes:64*1024*1024,objects:2000000,depth:512});
const nativeJson=JSON.stringify,ownKeys=Reflect.ownKeys,descriptor=Object.getOwnPropertyDescriptor,prototype=Object.getPrototypeOf;
const objectPrototype=Object.prototype,arrayPrototype=Array.prototype,mapPrototype=Map.prototype;
const mapEntries=Map.prototype.entries,mapNext=prototype(new Map().entries()).next;
const fail=reason=>{throw new TypeError('Flat semantic JSON: '+reason);};
function native(){if(!originalPrivateParserExpectedCommonIntrinsicsUnchanged()||!originalNamespaceTraversalIntrinsicsUnchanged())fail('original stock native operations required');}

// This API deliberately refuses observable objects/callbacks. The original
// semantic serializer and its ordinary observer contract remain unchanged.
function writeJson(value,emit){
 native();let bytes=0,objects=0;const active=new Set();
 const write=text=>{bytes+=Buffer.byteLength(text);if(bytes>FLAT_SEMANTIC_JSON_LIMITS.bytes)fail('original field byte budget exceeded');emit(text);};
 function visit(value,depth){
  if(depth>FLAT_SEMANTIC_JSON_LIMITS.depth)fail('original field depth budget exceeded');
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'){write(nativeJson(value));return;}
  if(value===undefined){write('null');return;}
  if(typeof value!=='object'||types.isProxy(value)||active.has(value))fail('acyclic inert values required');
  if(++objects>FLAT_SEMANTIC_JSON_LIMITS.objects)fail('original field object budget exceeded');
  const parent=prototype(value),keys=ownKeys(value);active.add(value);
  if(parent===mapPrototype){
   if(keys.length)fail('unmodified native Map required');
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
   if(parent!==objectPrototype&&parent!==null)fail('ordinary inert record required');
   write('{');let first=true;
   for(const key of keys){
    const field=descriptor(value,key);if(typeof key!=='string'||!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('enumerable own record data required');
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
 const flush=()=>{if(pending){chunks.push(Buffer.from(pending,'utf16le'));pending='';}};
 writeJson(value,text=>{if(pending.length+text.length>16384)flush();if(text.length>16384)chunks.push(Buffer.from(text,'utf16le'));else pending+=text;});
 flush();return Buffer.concat(chunks).toString('utf16le');
}

export function flatSemanticJsonMatches(value,text){
 if(typeof text!=='string')fail('primitive canonical text required');
 let at=0,matches=true;
 writeJson(value,piece=>{if(text.slice(at,at+piece.length)!==piece)matches=false;at+=piece.length;});
 return matches&&at===text.length;
}
