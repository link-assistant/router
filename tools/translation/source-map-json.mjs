// Complete owned JSON DATA only; no source or semantic authority. Split the
// large source map into whole native-serialized rows, preserving key order.
import {createHash} from 'node:crypto';
const plain=value=>value!==null&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
function* fragments(value){
 if(!plain(value)||Object.hasOwn(value,'toJSON')||!plain(value.sources)||Object.hasOwn(value.sources,'toJSON')){yield JSON.stringify(value)+'\n';return;}
 yield '{';let first=true;
 for(const [key,child]of Object.entries(value)){
  if(key==='sources'){
   if(!first)yield ',';first=false;yield JSON.stringify(key)+':{';let firstRow=true;
   for(const [id,row]of Object.entries(child)){const text=JSON.stringify(row);if(text===undefined)continue;if(!firstRow)yield ',';firstRow=false;yield JSON.stringify(id)+':';yield text;}
   yield '}';
  }else {const text=JSON.stringify(child);if(text===undefined)continue;if(!first)yield ',';first=false;yield JSON.stringify(key)+':';yield text;}
 }
 yield '}\n';
}
export function serializeSourceMapJson(value){
 const parts=[];let length=0;for(const text of fragments(value)){const bytes=Buffer.from(text);parts.push(bytes);length+=bytes.length;}return Buffer.concat(parts,length);
}
export function digestSourceMapJson(value,expected=null){
 const digest=createHash('sha256');let length=0,matches=true;
 for(const text of fragments(value)){
  const bytes=Buffer.from(text);if(expected!==null&&!(length+bytes.length<=expected.length&&expected.subarray(length,length+bytes.length).equals(bytes)))matches=false;
  digest.update(bytes);length+=bytes.length;
 }
 return {bytes:length,sha256:digest.digest('hex'),matches:expected===null?null:matches&&length===expected.length};
}
