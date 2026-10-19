import {types} from 'node:util';
import {requireScalarString} from './string-iterator-runtime.mjs';
const none=Object.freeze({$:'None'});
export function optionStringAsDeref(value){
  if(!value||typeof value!=='object'||types.isProxy(value))throw new TypeError('as_deref requires an ordinary immutable Option');
  const prototype=Object.getPrototypeOf(value),keys=Reflect.ownKeys(value),tag=Object.getOwnPropertyDescriptor(value,'$');
  if((prototype!==Object.prototype&&prototype!==null)||!Object.isFrozen(value)||!tag||!Object.hasOwn(tag,'value'))throw new TypeError('as_deref rejects mutable, inherited and accessor tags');
  if(tag.value==='None'&&keys.length===1)return none;
  if(tag.value!=='Some'||keys.length!==2||!keys.includes('field0'))throw new TypeError('as_deref rejects noncanonical Option variants');
  const payload=Object.getOwnPropertyDescriptor(value,'field0');
  if(!payload||!Object.hasOwn(payload,'value'))throw new TypeError('as_deref rejects accessor String payloads');
  return Object.freeze({$:'Some',field0:requireScalarString(payload.value)});
}
