// Finite immutable tagged Option values. No value/owner/verdict/result cache.
import {types} from 'node:util';
import {router_text_len_utf8 as textBytes} from './text-runtime.mjs';
const proxy=types.isProxy,prototype=Object.getPrototypeOf,descriptors=Object.getOwnPropertyDescriptors,keys=Reflect.ownKeys,own=Object.hasOwn,freeze=Object.freeze,apply=Reflect.apply;
const hostObject=Object,hostReflect=Reflect,hostRangeError=RangeError;
function host(){if(Object!==hostObject||Reflect!==hostReflect||RangeError!==hostRangeError||types.isProxy!==proxy||Object.getPrototypeOf!==prototype||Object.getOwnPropertyDescriptors!==descriptors||Reflect.ownKeys!==keys||Object.hasOwn!==own||Object.freeze!==freeze||Reflect.apply!==apply)throw new TypeError('Original primitive Option host operations required');}
function payload(value,domain){
 host();if(domain==='str'){textBytes(value);return value;}if(domain==='bool'){if(typeof value!=='boolean')throw new TypeError('Primitive Option bool required');return value;}
 if(typeof value!=='bigint'||value<(domain==='i64'?-9223372036854775808n:0n)||value>(domain==='i64'?9223372036854775807n:18446744073709551615n))throw new TypeError('Primitive Option '+domain+' required');return value;
}
function option(value,domain){
 host();if(!value||typeof value!=='object'||apply(proxy,types,[value]))throw new TypeError('Ordinary primitive Option required');const parent=prototype(value);if(parent!==Object.prototype&&parent!==null)throw new TypeError('Ordinary primitive Option prototype required');const fields=descriptors(value),names=keys(fields),tag=own(fields,'$')?fields.$:null;
 if(!tag||!own(tag,'value')||tag.enumerable!==true||tag.value!=='Some'&&tag.value!=='None')throw new TypeError('Actual primitive Option tag required');for(let index=0;index<names.length;index++)if(typeof names[index]!=='string')throw new TypeError('Actual primitive Option fields required');
 if(tag.value==='None'){if(names.length!==1)throw new TypeError('Exact None fields required');return {some:false};}
 const field=own(fields,'field0')?fields.field0:null;if(names.length!==2||!field||!own(field,'value')||field.enumerable!==true)throw new TypeError('Exact Some fields required');return {some:true,value:payload(field.value,domain)};
}
const none=()=>freeze({$:'None'}),some=value=>freeze({$:'Some',field0:value});
function operate(domain,method,args){
 host();if(method==='some')return some(payload(args[0],domain));if(method==='none')return none();const value=option(args[0],domain);
 if(method==='is_some')return value.some;if(method==='is_none')return !value.some;
 if(method==='unwrap_or'){const other=payload(args[1],domain);return value.some?value.value:other;}
 if(method==='and'||method==='or'){const other=option(args[1],domain),selected=method==='and'?(value.some?other:value):(value.some?value:other);return selected.some?some(selected.value):none();}
 if(method==='expect')textBytes(args[1]);if(value.some)return value.value;
 throw new hostRangeError(method==='expect'?args[1]:'called `Option::unwrap()` on a `None` value');
}
export const router_option_bool_some=(argument0)=>operate("bool","some",[argument0]);
export const router_option_bool_none=()=>operate("bool","none",[]);
export const router_option_bool_is_some=(argument0)=>operate("bool","is_some",[argument0]);
export const router_option_bool_is_none=(argument0)=>operate("bool","is_none",[argument0]);
export const router_option_bool_unwrap_or=(argument0,argument1)=>operate("bool","unwrap_or",[argument0,argument1]);
export const router_option_bool_unwrap=(argument0)=>operate("bool","unwrap",[argument0]);
export const router_option_bool_expect=(argument0,argument1)=>operate("bool","expect",[argument0,argument1]);
export const router_option_bool_and=(argument0,argument1)=>operate("bool","and",[argument0,argument1]);
export const router_option_bool_or=(argument0,argument1)=>operate("bool","or",[argument0,argument1]);
export const router_option_u64_some=(argument0)=>operate("u64","some",[argument0]);
export const router_option_u64_none=()=>operate("u64","none",[]);
export const router_option_u64_is_some=(argument0)=>operate("u64","is_some",[argument0]);
export const router_option_u64_is_none=(argument0)=>operate("u64","is_none",[argument0]);
export const router_option_u64_unwrap_or=(argument0,argument1)=>operate("u64","unwrap_or",[argument0,argument1]);
export const router_option_u64_unwrap=(argument0)=>operate("u64","unwrap",[argument0]);
export const router_option_u64_expect=(argument0,argument1)=>operate("u64","expect",[argument0,argument1]);
export const router_option_u64_and=(argument0,argument1)=>operate("u64","and",[argument0,argument1]);
export const router_option_u64_or=(argument0,argument1)=>operate("u64","or",[argument0,argument1]);
export const router_option_i64_some=(argument0)=>operate("i64","some",[argument0]);
export const router_option_i64_none=()=>operate("i64","none",[]);
export const router_option_i64_is_some=(argument0)=>operate("i64","is_some",[argument0]);
export const router_option_i64_is_none=(argument0)=>operate("i64","is_none",[argument0]);
export const router_option_i64_unwrap_or=(argument0,argument1)=>operate("i64","unwrap_or",[argument0,argument1]);
export const router_option_i64_unwrap=(argument0)=>operate("i64","unwrap",[argument0]);
export const router_option_i64_expect=(argument0,argument1)=>operate("i64","expect",[argument0,argument1]);
export const router_option_i64_and=(argument0,argument1)=>operate("i64","and",[argument0,argument1]);
export const router_option_i64_or=(argument0,argument1)=>operate("i64","or",[argument0,argument1]);
export const router_option_str_some=(argument0)=>operate("str","some",[argument0]);
export const router_option_str_none=()=>operate("str","none",[]);
export const router_option_str_is_some=(argument0)=>operate("str","is_some",[argument0]);
export const router_option_str_is_none=(argument0)=>operate("str","is_none",[argument0]);
export const router_option_str_unwrap_or=(argument0,argument1)=>operate("str","unwrap_or",[argument0,argument1]);
export const router_option_str_unwrap=(argument0)=>operate("str","unwrap",[argument0]);
export const router_option_str_expect=(argument0,argument1)=>operate("str","expect",[argument0,argument1]);

// The carrier and payload remain opaque to this shared identity operation.
export function router_option_identity(value) { return value; }
