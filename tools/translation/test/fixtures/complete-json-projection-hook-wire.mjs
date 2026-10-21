// Separate full native JSON projection: preserve original class/toJSON/getter
// behavior and omissions, while indexing every projected primitive string.
import {types} from 'node:util';
import {Buffer} from 'node:buffer';
import {encodeCompleteHookWire,decodeCompleteHookWire,compareCompleteHookWires} from './complete-hook-wire.mjs';
const stringify=JSON.stringify,parse=JSON.parse,isStringObject=types.isStringObject,apply=Reflect.apply;
const mapHas=Map.prototype.has,mapGet=Map.prototype.get,mapSet=Map.prototype.set,mapClear=Map.prototype.clear,weakGet=WeakMap.prototype.get,weakSet=WeakMap.prototype.set;
const SCHEMA='complete-native-json-projection-indexed-strings-v1',LIMIT=384*1024*1024,CHUNK=32768;
function fail(){throw TypeError('Complete JSON projection wire: full bounded string/projection equation differs');}
export function encodeCompleteJsonProjectionHookWire(value){
 const strings=[],ids=new Map(),depths=new WeakMap();let cost=256,occurrences=0,codeUnits=0;
 function charge(amount){cost+=amount;if(cost>LIMIT)fail();}
 function intern(text){
  occurrences++;codeUnits+=text.length;if(!Number.isSafeInteger(codeUnits))fail();
  if(apply(mapHas,ids,[text]))return apply(mapGet,ids,[text]);const chunks=[];charge(16);
  for(let at=0;at<text.length;at+=CHUNK){const chunk=text.slice(at,at+CHUNK);charge(Buffer.byteLength(stringify(chunk))+1);chunks.push(chunk);}
  if(!chunks.length){charge(3);chunks.push('');}const id=strings.length;strings.push(chunks);apply(mapSet,ids,[text,id]);return id;
 }
 try{
  const projection=stringify(value,function(key,item){
   charge(64+key.length*12);const depth=(apply(weakGet,depths,[this])??-1)+1;if(depth>512)fail();
   // JSON unboxes String objects after a replacer. Refuse that distinct
   // domain, so every projected string has an unambiguous dictionary ID.
   if(isStringObject(item))fail();if(item&&typeof item==='object')apply(weakSet,depths,[item,depth]);
   return typeof item==='string'?'@'+intern(item):item;
  });
  if(typeof projection!=='string')fail();return encodeCompleteHookWire({schema:SCHEMA,strings,projection,occurrences,codeUnits});
 }finally{apply(mapClear,ids,[]);strings.length=0;}
}
export function decodeCompleteJsonProjectionHookWire(text){
 const value=decodeCompleteHookWire(text);
 if(!value||stringify(Object.keys(value))!==stringify(['schema','strings','projection','occurrences','codeUnits'])||value.schema!==SCHEMA||!Array.isArray(value.strings)||typeof value.projection!=='string'||!Number.isSafeInteger(value.occurrences)||value.occurrences<0||!Number.isSafeInteger(value.codeUnits)||value.codeUnits<0)fail();
 const dictionary=[],unique=new Set(),used=new Set();let cost=256,occurrences=0,codeUnits=0;
 function charge(amount){cost+=amount;if(cost>LIMIT)fail();}
 for(const chunks of value.strings){
  if(!Array.isArray(chunks)||!chunks.length)fail();charge(16);
  for(let at=0;at<chunks.length;at++){const chunk=chunks[at];if(typeof chunk!=='string'||chunk.length>CHUNK||at<chunks.length-1&&chunk.length!==CHUNK||chunks.length>1&&!chunk.length)fail();charge(Buffer.byteLength(stringify(chunk))+1);}
  const string=chunks.join('');if(unique.has(string))fail();unique.add(string);dictionary.push(string);
 }
 const tree=parse(value.projection);if(stringify(tree)!==value.projection)fail();
 // Native JSON visits values in preorder. Parse revivers visit children
 // first, so restore IDs through an explicit complete preorder instead.
 function visit(item,key,depth){
  charge(64+key.length*12);if(depth>512)fail();
  if(typeof item==='string'){
   if(!/^@(0|[1-9][0-9]*)$/u.test(item))fail();const id=Number(item.slice(1));if(!Number.isSafeInteger(id)||id>=dictionary.length)fail();
   if(!used.has(id)){if(id!==used.size)fail();used.add(id);}occurrences++;codeUnits+=dictionary[id].length;return dictionary[id];
  }
  if(item&&typeof item==='object')for(const child of Object.keys(item))Object.defineProperty(item,child,{__proto__:null,value:visit(item[child],child,depth+1),enumerable:true,writable:true,configurable:true});return item;
 }
 const result=visit(tree,'',0);if(used.size!==dictionary.length||occurrences!==value.occurrences||codeUnits!==value.codeUnits)fail();return result;
}
export const compareCompleteJsonProjectionHookWires=compareCompleteHookWires;
