// Matching bounded owned Vec values. Frozen arrays are a target carrier;
// only the independent caller checker can prove moves/loans/native ownership.
import {types as nodeTypes} from 'node:util';
import {primitiveSliceInput} from './primitive-operator-runtime.mjs';
import {router_slice_bool_len} from './primitive-sequence-runtime.mjs';
const MAX=4096,MAX_U64=18446744073709551615n,freeze=Object.freeze,define=Object.defineProperty;
function input(values,domain){if(nodeTypes.isProxy(values)||!Array.isArray(values)||Object.getPrototypeOf(values)!==Array.prototype||!Object.isFrozen(values))throw new TypeError('primitive vector frozen dense carrier');const size=Object.getOwnPropertyDescriptor(values,'length');if(!size||!Object.hasOwn(size,'value'))throw new TypeError('primitive vector length descriptor');if(size.value>MAX)throw new RangeError('primitive vector resource bound');if(domain==='bool')router_slice_bool_len(values);else primitiveSliceInput(values,domain);return values;}
function scalar(value,domain){if(domain==='bool'){if(typeof value!=='boolean')throw new TypeError('primitive vector bool domain');}else primitiveSliceInput(freeze([value]),domain);return value;}
function index(value){if(typeof value!=='bigint'||value<0n||value>MAX_U64)throw new TypeError('primitive vector u64 index domain');return value;}
function put(values,at,value){define(values,String(at),{value,writable:true,enumerable:true,configurable:true});}
function copy(values,length=values.length){const result=[];for(let at=0;at<length;at++)put(result,at,values[at]);return result;}
function fresh(){return freeze([]);}
function from(values,domain){return freeze(copy(input(values,domain)));}
function push(values,value,domain){input(values,domain);scalar(value,domain);if(values.length===MAX)throw new RangeError('primitive vector resource bound');const result=copy(values);put(result,result.length,value);return freeze(result);}
function append(left,right,domain){input(left,domain);input(right,domain);if(right.length>MAX-left.length)throw new RangeError('primitive vector resource bound');const result=copy(left);for(let at=0;at<right.length;at++)put(result,left.length+at,right[at]);return freeze(result);}
function truncate(values,length,domain){input(values,domain);index(length);return length>=BigInt(values.length)?values:freeze(copy(values,Number(length)));}
function replace(values,at,value,domain){input(values,domain);index(at);scalar(value,domain);if(at>=BigInt(values.length))throw new RangeError('primitive vector replacement index');const result=copy(values);put(result,Number(at),value);return freeze(result);}
function length(values,domain){return BigInt(input(values,domain).length);}
function get(values,at,domain){input(values,domain);index(at);return at>=BigInt(values.length)?freeze({$:'None'}):freeze({$:'Some',field0:values[Number(at)]});}

export function router_vec_bool_new(){return fresh();}
export function router_vec_bool_from_slice(values){return from(values,"bool");}
export function router_vec_bool_push(values,value){return push(values,value,"bool");}
export function router_vec_bool_append(left,right){return append(left,right,"bool");}
export function router_vec_bool_truncate(values,length){return truncate(values,length,"bool");}
export function router_vec_bool_replace(values,index,value){return replace(values,index,value,"bool");}
export function router_vec_bool_len(values){return length(values,"bool");}
export function router_vec_bool_get(values,index){return get(values,index,"bool");}
export function router_vec_u8_new(){return fresh();}
export function router_vec_u8_from_slice(values){return from(values,"u8");}
export function router_vec_u8_push(values,value){return push(values,value,"u8");}
export function router_vec_u8_append(left,right){return append(left,right,"u8");}
export function router_vec_u8_truncate(values,length){return truncate(values,length,"u8");}
export function router_vec_u8_replace(values,index,value){return replace(values,index,value,"u8");}
export function router_vec_u8_len(values){return length(values,"u8");}
export function router_vec_u8_get(values,index){return get(values,index,"u8");}
export function router_vec_i8_new(){return fresh();}
export function router_vec_i8_from_slice(values){return from(values,"i8");}
export function router_vec_i8_push(values,value){return push(values,value,"i8");}
export function router_vec_i8_append(left,right){return append(left,right,"i8");}
export function router_vec_i8_truncate(values,length){return truncate(values,length,"i8");}
export function router_vec_i8_replace(values,index,value){return replace(values,index,value,"i8");}
export function router_vec_i8_len(values){return length(values,"i8");}
export function router_vec_i8_get(values,index){return get(values,index,"i8");}
export function router_vec_u16_new(){return fresh();}
export function router_vec_u16_from_slice(values){return from(values,"u16");}
export function router_vec_u16_push(values,value){return push(values,value,"u16");}
export function router_vec_u16_append(left,right){return append(left,right,"u16");}
export function router_vec_u16_truncate(values,length){return truncate(values,length,"u16");}
export function router_vec_u16_replace(values,index,value){return replace(values,index,value,"u16");}
export function router_vec_u16_len(values){return length(values,"u16");}
export function router_vec_u16_get(values,index){return get(values,index,"u16");}
export function router_vec_i16_new(){return fresh();}
export function router_vec_i16_from_slice(values){return from(values,"i16");}
export function router_vec_i16_push(values,value){return push(values,value,"i16");}
export function router_vec_i16_append(left,right){return append(left,right,"i16");}
export function router_vec_i16_truncate(values,length){return truncate(values,length,"i16");}
export function router_vec_i16_replace(values,index,value){return replace(values,index,value,"i16");}
export function router_vec_i16_len(values){return length(values,"i16");}
export function router_vec_i16_get(values,index){return get(values,index,"i16");}
export function router_vec_u32_new(){return fresh();}
export function router_vec_u32_from_slice(values){return from(values,"u32");}
export function router_vec_u32_push(values,value){return push(values,value,"u32");}
export function router_vec_u32_append(left,right){return append(left,right,"u32");}
export function router_vec_u32_truncate(values,length){return truncate(values,length,"u32");}
export function router_vec_u32_replace(values,index,value){return replace(values,index,value,"u32");}
export function router_vec_u32_len(values){return length(values,"u32");}
export function router_vec_u32_get(values,index){return get(values,index,"u32");}
export function router_vec_i32_new(){return fresh();}
export function router_vec_i32_from_slice(values){return from(values,"i32");}
export function router_vec_i32_push(values,value){return push(values,value,"i32");}
export function router_vec_i32_append(left,right){return append(left,right,"i32");}
export function router_vec_i32_truncate(values,length){return truncate(values,length,"i32");}
export function router_vec_i32_replace(values,index,value){return replace(values,index,value,"i32");}
export function router_vec_i32_len(values){return length(values,"i32");}
export function router_vec_i32_get(values,index){return get(values,index,"i32");}
export function router_vec_u64_new(){return fresh();}
export function router_vec_u64_from_slice(values){return from(values,"u64");}
export function router_vec_u64_push(values,value){return push(values,value,"u64");}
export function router_vec_u64_append(left,right){return append(left,right,"u64");}
export function router_vec_u64_truncate(values,length){return truncate(values,length,"u64");}
export function router_vec_u64_replace(values,index,value){return replace(values,index,value,"u64");}
export function router_vec_u64_len(values){return length(values,"u64");}
export function router_vec_u64_get(values,index){return get(values,index,"u64");}
export function router_vec_i64_new(){return fresh();}
export function router_vec_i64_from_slice(values){return from(values,"i64");}
export function router_vec_i64_push(values,value){return push(values,value,"i64");}
export function router_vec_i64_append(left,right){return append(left,right,"i64");}
export function router_vec_i64_truncate(values,length){return truncate(values,length,"i64");}
export function router_vec_i64_replace(values,index,value){return replace(values,index,value,"i64");}
export function router_vec_i64_len(values){return length(values,"i64");}
export function router_vec_i64_get(values,index){return get(values,index,"i64");}
export function router_vec_u128_new(){return fresh();}
export function router_vec_u128_from_slice(values){return from(values,"u128");}
export function router_vec_u128_push(values,value){return push(values,value,"u128");}
export function router_vec_u128_append(left,right){return append(left,right,"u128");}
export function router_vec_u128_truncate(values,length){return truncate(values,length,"u128");}
export function router_vec_u128_replace(values,index,value){return replace(values,index,value,"u128");}
export function router_vec_u128_len(values){return length(values,"u128");}
export function router_vec_u128_get(values,index){return get(values,index,"u128");}
export function router_vec_i128_new(){return fresh();}
export function router_vec_i128_from_slice(values){return from(values,"i128");}
export function router_vec_i128_push(values,value){return push(values,value,"i128");}
export function router_vec_i128_append(left,right){return append(left,right,"i128");}
export function router_vec_i128_truncate(values,length){return truncate(values,length,"i128");}
export function router_vec_i128_replace(values,index,value){return replace(values,index,value,"i128");}
export function router_vec_i128_len(values){return length(values,"i128");}
export function router_vec_i128_get(values,index){return get(values,index,"i128");}
