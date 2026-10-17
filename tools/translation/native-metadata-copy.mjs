// Successful default-root data copies only. This returns no source/proof token.
// The existing native-only gate intentionally retains Node's JS byteLength
// fallback; no function-text recognition or additional bootstrap is used here.
import {types} from 'node:util';
import {originalFlatTokenIntrinsicsUnchanged} from './original-json-intrinsics.mjs';

export function tryCopyDigestMetadata(value) {
  if(!originalFlatTokenIntrinsicsUnchanged())return null;
  const miss={__proto__:null},active=new Set();let cells=200000,bytes=4194304;
  const ordinal=(left,right)=>left<right?-1:left>right?1:0;
  function visit(value,depth,preserveKeyOrder) {
    if(--cells<0||depth>160)throw miss;
    if(value===null||value===undefined||typeof value==='boolean'||typeof value==='bigint')return value;
    if(typeof value==='number'){if(!Number.isSafeInteger(value))throw miss;return value;}
    if(typeof value==='string'){bytes-=Buffer.byteLength(value);if(bytes<0)throw miss;return value;}
    if(!value||typeof value!=='object'||types.isProxy(value)||active.has(value))throw miss;
    const prototype=Object.getPrototypeOf(value);
    if(prototype!==Object.prototype&&prototype!==null&&prototype!==Array.prototype)throw miss;
    // Native Errors can materialize stack via prepareStackTrace even after a
    // prototype change. Retry the old copier before touching that descriptor.
    const ownKeys=Reflect.ownKeys(value);
    for(let index=0;index<ownKeys.length;index++)if(typeof ownKeys[index]!=='string'||ownKeys[index]==='stack')throw miss;
    const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors),array=Array.isArray(value),ownIndexes=array?{__proto__:null}:null;
    for(let index=0;index<keys.length;index++){
      const key=keys[index],field=descriptors[key];
      if(typeof key!=='string'||!Object.hasOwn(field,'value')||(!field.enumerable&&!(array&&key==='length')))throw miss;
      if(array)ownIndexes[key]=true;
    }
    active.add(value);let result;
    if(array){
      const length=descriptors.length.value;
      if(!Number.isSafeInteger(length)||length<0||length>cells||keys.length!==length+1)throw miss;
      result=[];
      for(let index=0;index<length;index++){
        const key=String(index);
        if(ownIndexes[index]!==true)throw miss;
        const field=descriptors[key];if(!field)throw miss;
        result[index]=visit(field.value,depth+1,preserveKeyOrder);
      }
    }else{
      result={__proto__:null};
      const ordered=preserveKeyOrder?keys:keys.sort(ordinal);
      for(let index=0;index<ordered.length;index++){
        const key=ordered[index];
        result[key]=visit(descriptors[key].value,depth+1,preserveKeyOrder||key==='copyCertificate');
      }
    }
    active.delete(value);return result;
  }
  try{return {value:visit(value,0,false)};}
  catch(error){if(error!==miss)throw error;return null;}
}
