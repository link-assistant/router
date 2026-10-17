// This boolean operation observes dense own data fields only. It never calls
// user equality, getters, iterator methods or proxy traps.
import {types} from 'node:util';
const scalar=value=>typeof value==='string'&&!/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value);
const fail=()=>{throw new TypeError('Borrowed string membership requires a dense ordinary array of Unicode scalar strings and a scalar needle');};
const own=(value,key)=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor||!Object.hasOwn(descriptor,'value'))fail();return descriptor.value;};
export function assertBorrowedStringSlice(value,length=null){
  if(!value||typeof value!=='object'||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail();
  const actual=own(value,'length');
  if(length!==null&&(!Number.isSafeInteger(length)||length<0||length>4096||actual!==length))fail();
  const keys=Reflect.ownKeys(value);
  if(keys.length!==actual+1)fail();
  for(const key of keys)if(key!=='length'&&(typeof key!=='string'||!/^(?:0|[1-9][0-9]*)$/u.test(key)||Number(key)>=actual))fail();
  for(let index=0;index<actual;index++)if(!scalar(own(value,String(index))))fail();
  return true;
}
export function borrowedStringSliceContains(values,needle,length=null){
  assertBorrowedStringSlice(values,length);if(!scalar(needle))fail();
  const size=own(values,'length');
  for(let index=0;index<size;index++)if(own(values,String(index))===needle)return true;
  return false;
}
