// Full external namespace DATA association, never an owner or verdict cache.
// Read descriptors without invoking input getters, iterators or toJSON hooks.
import {types} from 'node:util';
const nativeEntries=Map.prototype.entries,nativeNext=Object.getPrototypeOf(new Map().entries()).next,nativeApply=Reflect.apply,nativeOwn=Reflect.ownKeys,nativeDescriptor=Object.getOwnPropertyDescriptor,nativePrototype=Object.getPrototypeOf,nativeProxy=types.isProxy,nativeStringify=JSON.stringify;
export function captureToolExternalNamespaceInputs(external){
 const fail=()=>{throw new TypeError('Tool external namespaces require bounded plain original DATA');};
 if(!external||typeof external!=='object'||nativeProxy(external)||nativePrototype(external)!==Map.prototype||nativeOwn(external).length)fail();
 const active=new WeakSet();let cells=0,textBytes=0;
 const text=value=>{textBytes+=Buffer.byteLength(value);if(textBytes>8388608)fail();return nativeStringify(value);};
 function encode(value,depth=0){
  if(++cells>200000||depth>64)fail();if(value===null)return 'null';if(value===undefined)return 'undefined';
  if(typeof value==='string')return 's'+text(value);if(typeof value==='boolean')return value?'true':'false';if(typeof value==='number'){if(!Number.isFinite(value))fail();return Object.is(value,-0)?'n-0':'n'+String(value);}
  if(typeof value!=='object'||nativeProxy(value)||active.has(value))fail();const prototype=nativePrototype(value),array=Array.isArray(value);if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)fail();const keys=nativeOwn(value);if(keys.length>8192||keys.some(key=>typeof key!=='string'||key==='toJSON'))fail();active.add(value);
  let result;if(array){const length=nativeDescriptor(value,'length');if(!length||!Object.hasOwn(length,'value')||keys.length!==length.value+1)fail();const items=[];for(let at=0;at<length.value;at++){const field=nativeDescriptor(value,''+at);if(!field||!Object.hasOwn(field,'value'))fail();items.push(encode(field.value,depth+1));}result='a['+items.join(',')+']';}
  else{const fields=[];for(const key of keys.sort()){const field=nativeDescriptor(value,key);if(!field||!Object.hasOwn(field,'value'))fail();fields.push(text(key)+':'+encode(field.value,depth+1));}result=(prototype===null?'z{':'o{')+fields.join(',')+'}';}
  active.delete(value);return result;
 }
 const rows=[],iterator=nativeApply(nativeEntries,external,[]);for(;;){const step=nativeApply(nativeNext,iterator,[]);if(step.done)break;if(rows.length>=8192||typeof step.value[0]!=='string')fail();rows.push([step.value[0],encode(step.value[1])]);}rows.sort(([left],[right])=>left<right?-1:left>right?1:0);const result=rows.map(([key,value])=>text(key)+':'+value).join('\n');if(Buffer.byteLength(result)>8388608)fail();return result;
}
