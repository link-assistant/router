// Matching primitive sequence core. Canonical inputs are dense frozen slices.
// No source, input, owner, verdict or result cache survives an operation.
import {types} from 'node:util';
import {primitiveSliceInput} from './primitive-operator-runtime.mjs';
const fail=message=>{throw new TypeError('Primitive sequence: '+message);};
function input(value,domain){
 if(domain!=='bool')return primitiveSliceInput(value,domain);
 if(!value||typeof value!=='object'||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||!Object.isFrozen(value))fail('frozen ordinary Boolean slice required');
 const length=Object.getOwnPropertyDescriptor(value,'length');if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<0||length.writable||length.configurable)fail('immutable own slice length required');
 const keys=Reflect.ownKeys(value);if(keys.length!==length.value+1||keys[keys.length-1]!=='length')fail('exact dense Boolean slice fields required');
 for(let at=0;at<length.value;at++){if(keys[at]!==String(at))fail('exact dense Boolean slice indices required');const field=Object.getOwnPropertyDescriptor(value,String(at));if(!field||!Object.hasOwn(field,'value')||!field.enumerable||field.writable||field.configurable||typeof field.value!=='boolean')fail('immutable own Boolean value required');}return value;
}
function length(value,domain){return BigInt(input(value,domain).length);}
function empty(value,domain){return input(value,domain).length===0;}
function get(value,index,domain){
 const values=input(value,domain);if(typeof index!=='bigint'||index<0n||index>18446744073709551615n)fail('actual u64 index required');
 // Only a proven in-range JS array index reaches Number; no pointer-width guess.
 return index>=BigInt(values.length)?Object.freeze({$:'None'}):Object.freeze({$:'Some',field0:values[Number(index)]});
}
export function router_slice_bool_len(value){return length(value, "bool");}
export function router_slice_bool_is_empty(value){return empty(value, "bool");}
export function router_slice_bool_get(value, index){return get(value, index, "bool");}
export function router_slice_u8_len(value){return length(value, "u8");}
export function router_slice_u8_is_empty(value){return empty(value, "u8");}
export function router_slice_u8_get(value, index){return get(value, index, "u8");}
export function router_slice_i8_len(value){return length(value, "i8");}
export function router_slice_i8_is_empty(value){return empty(value, "i8");}
export function router_slice_i8_get(value, index){return get(value, index, "i8");}
export function router_slice_u16_len(value){return length(value, "u16");}
export function router_slice_u16_is_empty(value){return empty(value, "u16");}
export function router_slice_u16_get(value, index){return get(value, index, "u16");}
export function router_slice_i16_len(value){return length(value, "i16");}
export function router_slice_i16_is_empty(value){return empty(value, "i16");}
export function router_slice_i16_get(value, index){return get(value, index, "i16");}
export function router_slice_u32_len(value){return length(value, "u32");}
export function router_slice_u32_is_empty(value){return empty(value, "u32");}
export function router_slice_u32_get(value, index){return get(value, index, "u32");}
export function router_slice_i32_len(value){return length(value, "i32");}
export function router_slice_i32_is_empty(value){return empty(value, "i32");}
export function router_slice_i32_get(value, index){return get(value, index, "i32");}
export function router_slice_u64_len(value){return length(value, "u64");}
export function router_slice_u64_is_empty(value){return empty(value, "u64");}
export function router_slice_u64_get(value, index){return get(value, index, "u64");}
export function router_slice_i64_len(value){return length(value, "i64");}
export function router_slice_i64_is_empty(value){return empty(value, "i64");}
export function router_slice_i64_get(value, index){return get(value, index, "i64");}
export function router_slice_u128_len(value){return length(value, "u128");}
export function router_slice_u128_is_empty(value){return empty(value, "u128");}
export function router_slice_u128_get(value, index){return get(value, index, "u128");}
export function router_slice_i128_len(value){return length(value, "i128");}
export function router_slice_i128_is_empty(value){return empty(value, "i128");}
export function router_slice_i128_get(value, index){return get(value, index, "i128");}
