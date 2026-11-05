// Bounded functional carriers for actual owned String Vec operations.
// Frozen JS strings do not prove native Copy, ownership, moves or shared loans.
import {types} from 'node:util';
import {requireScalarString} from './string-iterator-runtime.mjs';
const MAX=4096,MAX_U64=18446744073709551615n,freeze=Object.freeze,define=Object.defineProperty;
function input(values){
 if(types.isProxy(values)||!Array.isArray(values)||Object.getPrototypeOf(values)!==Array.prototype||!Object.isFrozen(values))throw new TypeError('owned text vector frozen dense carrier');
 const size=Object.getOwnPropertyDescriptor(values,'length');if(!size||!Object.hasOwn(size,'value')||!Number.isSafeInteger(size.value)||size.value<0)throw new TypeError('owned text vector length descriptor');if(size.value>MAX)throw new RangeError('owned text vector resource bound');
 if(Reflect.ownKeys(values).length!==size.value+1)throw new TypeError('owned text vector exact dense fields');
 for(let at=0;at<size.value;at++){const field=Object.getOwnPropertyDescriptor(values,String(at));if(!field||!Object.hasOwn(field,'value')||!field.enumerable)throw new TypeError('owned text vector element descriptor');requireScalarString(field.value);}return values;
}
function index(value){if(typeof value!=='bigint'||value<0n||value>MAX_U64)throw new TypeError('owned text vector u64 index domain');return value;}
function put(values,at,value){define(values,String(at),{value,writable:true,enumerable:true,configurable:true});}
function copy(values,length=values.length){const result=[];for(let at=0;at<length;at++)put(result,at,values[at]);return result;}
export function router_owned_text_vec_new(){return freeze([]);}
export function router_owned_text_vec_from_slice(values){return freeze(copy(input(values)));}
export function router_owned_text_vec_push(values,value){input(values);requireScalarString(value);if(values.length===MAX)throw new RangeError('owned text vector resource bound');const result=copy(values);put(result,result.length,value);return freeze(result);}
export function router_owned_text_vec_append(left,right){input(left);input(right);if(right.length>MAX-left.length)throw new RangeError('owned text vector resource bound');const result=copy(left);for(let at=0;at<right.length;at++)put(result,left.length+at,right[at]);return freeze(result);}
export function router_owned_text_vec_truncate(values,length){input(values);index(length);return length>=BigInt(values.length)?values:freeze(copy(values,Number(length)));}
export function router_owned_text_vec_replace(values,at,value){input(values);index(at);requireScalarString(value);if(at>=BigInt(values.length))throw new RangeError('owned text vector replacement index');const result=copy(values);put(result,Number(at),value);return freeze(result);}
export function router_owned_text_vec_len(values){return BigInt(input(values).length);}
export function router_owned_text_vec_get(values,at){input(values);index(at);return at>=BigInt(values.length)?freeze({$:'None'}):freeze({$:'Some',field0:values[Number(at)]});}
