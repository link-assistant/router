// Exact previous copier, retained as an independent byte/error oracle.
import {types} from 'node:util';
const fail=reason=>{throw new TypeError('source links: '+reason);};
const ordinal=(a,b)=>a<b?-1:a>b?1:0;
export function copyMetadata(value,{cells=200000,bytes=4194304,preserveKeyOrder=false}={},depth=0,active=new Set(),budget=null) {
  budget??={cells,bytes};if(--budget.cells<0||depth>160)fail('metadata budget exhausted');
  if(value===null||value===undefined||typeof value==='boolean'||typeof value==='bigint')return value;
  if(typeof value==='number'){if(!Number.isSafeInteger(value))fail('non-integer metadata number');return value;}
  if(typeof value==='string'){budget.bytes-=Buffer.byteLength(value);if(budget.bytes<0)fail('metadata byte budget exhausted');return value;}
  if(!value||typeof value!=='object'||types.isProxy(value)||active.has(value))fail('metadata must be acyclic data');
  const prototype=Object.getPrototypeOf(value);
  if(prototype!==Object.prototype&&prototype!==null&&prototype!==Array.prototype)fail('unexpected metadata prototype');
  const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors),array=Array.isArray(value);
  for(const key of keys){const descriptor=descriptors[key];if(typeof key!=='string'||!('value'in descriptor)||(!descriptor.enumerable&&!(array&&key==='length')))fail('accessor, symbol or hidden metadata');}
  active.add(value);let result;
  if(array){
    const length=descriptors.length.value;if(!Number.isSafeInteger(length)||length<0||length>budget.cells)fail('array metadata budget exhausted');
    if(keys.length!==length+1)fail('array metadata holes or extra properties');
    result=[];for(let index=0;index<length;index++){const descriptor=descriptors[String(index)];if(!descriptor)fail('array metadata hole');result.push(copyMetadata(descriptor.value,{preserveKeyOrder},depth+1,active,budget));}
  }else {
    // Copy certificates hash their original JSON property order. Canonical
    // metadata cloning must retain every signed byte inside those envelopes.
    result=Object.create(null);for(const key of preserveKeyOrder?keys:keys.sort(ordinal))Object.defineProperty(result,key,{value:copyMetadata(descriptors[key].value,{preserveKeyOrder:preserveKeyOrder||key==='copyCertificate'},depth+1,active,budget),enumerable:true,writable:true,configurable:true});
  }
  active.delete(value);return result;
}
