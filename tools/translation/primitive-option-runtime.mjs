// Finite immutable tagged Option values. No value/owner/verdict/result cache.
import {types} from 'node:util';
import {router_text_len_utf8 as textBytes} from './text-runtime.mjs';
const proxy=types.isProxy,prototype=Object.getPrototypeOf,descriptors=Object.getOwnPropertyDescriptors,keys=Reflect.ownKeys,own=Object.hasOwn,freeze=Object.freeze,apply=Reflect.apply;
const hostObject=Object,hostReflect=Reflect,hostRangeError=RangeError;
function host(){if(Object!==hostObject||Reflect!==hostReflect||RangeError!==hostRangeError||types.isProxy!==proxy||Object.getPrototypeOf!==prototype||Object.getOwnPropertyDescriptors!==descriptors||Reflect.ownKeys!==keys||Object.hasOwn!==own||Object.freeze!==freeze||Reflect.apply!==apply)throw new TypeError('Original primitive Option host operations required');}
function payload(value,domain){
 host();if(domain==='str'||domain==='text-owned'){textBytes(value);return value;}if(domain==='bool'){if(typeof value!=='boolean')throw new TypeError('Primitive Option bool required');return value;}
 if(own(ADDITIONAL_OPTION_BOUNDS,domain)){const bounds=ADDITIONAL_OPTION_BOUNDS[domain];if(typeof value!=='bigint'||value<bounds[0]||value>bounds[1])throw new TypeError('Primitive Option '+domain+' required');return value;}
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
 if(method==='ok_or'||method==='ok_or_text'){const error=payload(args[1],'text-owned');return value.some?freeze({$:'Ok',field0:value.value}):freeze({$:'Err',field0:error});}
 if(method==='filter_nonempty'){payload(args[1],'bool');return value.some&&(args[1]?filteredTextTrim(value.value).length>0:value.value.length>0)?some(value.value):none();}if(method==='unwrap_or_default')return value.some?value.value:'';
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

// Fixed ABI bounds, not a saved source/owner/checker/result cache.
const ADDITIONAL_OPTION_BOUNDS=freeze({__proto__:null,u8:freeze([0n,255n]),i8:freeze([-128n,127n]),u16:freeze([0n,65535n]),i16:freeze([-32768n,32767n]),u32:freeze([0n,4294967295n]),i32:freeze([-2147483648n,2147483647n]),u128:freeze([0n,340282366920938463463374607431768211455n]),i128:freeze([-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n])});
export const router_option_u8_some=(argument0)=>operate("u8","some",[argument0]);
export const router_option_u8_none=()=>operate("u8","none",[]);
export const router_option_u8_is_some=(argument0)=>operate("u8","is_some",[argument0]);
export const router_option_u8_is_none=(argument0)=>operate("u8","is_none",[argument0]);
export const router_option_u8_unwrap_or=(argument0,argument1)=>operate("u8","unwrap_or",[argument0,argument1]);
export const router_option_u8_unwrap=(argument0)=>operate("u8","unwrap",[argument0]);
export const router_option_u8_expect=(argument0,argument1)=>operate("u8","expect",[argument0,argument1]);
export const router_option_u8_and=(argument0,argument1)=>operate("u8","and",[argument0,argument1]);
export const router_option_u8_or=(argument0,argument1)=>operate("u8","or",[argument0,argument1]);
export const router_option_i8_some=(argument0)=>operate("i8","some",[argument0]);
export const router_option_i8_none=()=>operate("i8","none",[]);
export const router_option_i8_is_some=(argument0)=>operate("i8","is_some",[argument0]);
export const router_option_i8_is_none=(argument0)=>operate("i8","is_none",[argument0]);
export const router_option_i8_unwrap_or=(argument0,argument1)=>operate("i8","unwrap_or",[argument0,argument1]);
export const router_option_i8_unwrap=(argument0)=>operate("i8","unwrap",[argument0]);
export const router_option_i8_expect=(argument0,argument1)=>operate("i8","expect",[argument0,argument1]);
export const router_option_i8_and=(argument0,argument1)=>operate("i8","and",[argument0,argument1]);
export const router_option_i8_or=(argument0,argument1)=>operate("i8","or",[argument0,argument1]);
export const router_option_u16_some=(argument0)=>operate("u16","some",[argument0]);
export const router_option_u16_none=()=>operate("u16","none",[]);
export const router_option_u16_is_some=(argument0)=>operate("u16","is_some",[argument0]);
export const router_option_u16_is_none=(argument0)=>operate("u16","is_none",[argument0]);
export const router_option_u16_unwrap_or=(argument0,argument1)=>operate("u16","unwrap_or",[argument0,argument1]);
export const router_option_u16_unwrap=(argument0)=>operate("u16","unwrap",[argument0]);
export const router_option_u16_expect=(argument0,argument1)=>operate("u16","expect",[argument0,argument1]);
export const router_option_u16_and=(argument0,argument1)=>operate("u16","and",[argument0,argument1]);
export const router_option_u16_or=(argument0,argument1)=>operate("u16","or",[argument0,argument1]);
export const router_option_i16_some=(argument0)=>operate("i16","some",[argument0]);
export const router_option_i16_none=()=>operate("i16","none",[]);
export const router_option_i16_is_some=(argument0)=>operate("i16","is_some",[argument0]);
export const router_option_i16_is_none=(argument0)=>operate("i16","is_none",[argument0]);
export const router_option_i16_unwrap_or=(argument0,argument1)=>operate("i16","unwrap_or",[argument0,argument1]);
export const router_option_i16_unwrap=(argument0)=>operate("i16","unwrap",[argument0]);
export const router_option_i16_expect=(argument0,argument1)=>operate("i16","expect",[argument0,argument1]);
export const router_option_i16_and=(argument0,argument1)=>operate("i16","and",[argument0,argument1]);
export const router_option_i16_or=(argument0,argument1)=>operate("i16","or",[argument0,argument1]);
export const router_option_u32_some=(argument0)=>operate("u32","some",[argument0]);
export const router_option_u32_none=()=>operate("u32","none",[]);
export const router_option_u32_is_some=(argument0)=>operate("u32","is_some",[argument0]);
export const router_option_u32_is_none=(argument0)=>operate("u32","is_none",[argument0]);
export const router_option_u32_unwrap_or=(argument0,argument1)=>operate("u32","unwrap_or",[argument0,argument1]);
export const router_option_u32_unwrap=(argument0)=>operate("u32","unwrap",[argument0]);
export const router_option_u32_expect=(argument0,argument1)=>operate("u32","expect",[argument0,argument1]);
export const router_option_u32_and=(argument0,argument1)=>operate("u32","and",[argument0,argument1]);
export const router_option_u32_or=(argument0,argument1)=>operate("u32","or",[argument0,argument1]);
export const router_option_i32_some=(argument0)=>operate("i32","some",[argument0]);
export const router_option_i32_none=()=>operate("i32","none",[]);
export const router_option_i32_is_some=(argument0)=>operate("i32","is_some",[argument0]);
export const router_option_i32_is_none=(argument0)=>operate("i32","is_none",[argument0]);
export const router_option_i32_unwrap_or=(argument0,argument1)=>operate("i32","unwrap_or",[argument0,argument1]);
export const router_option_i32_unwrap=(argument0)=>operate("i32","unwrap",[argument0]);
export const router_option_i32_expect=(argument0,argument1)=>operate("i32","expect",[argument0,argument1]);
export const router_option_i32_and=(argument0,argument1)=>operate("i32","and",[argument0,argument1]);
export const router_option_i32_or=(argument0,argument1)=>operate("i32","or",[argument0,argument1]);
export const router_option_u128_some=(argument0)=>operate("u128","some",[argument0]);
export const router_option_u128_none=()=>operate("u128","none",[]);
export const router_option_u128_is_some=(argument0)=>operate("u128","is_some",[argument0]);
export const router_option_u128_is_none=(argument0)=>operate("u128","is_none",[argument0]);
export const router_option_u128_unwrap_or=(argument0,argument1)=>operate("u128","unwrap_or",[argument0,argument1]);
export const router_option_u128_unwrap=(argument0)=>operate("u128","unwrap",[argument0]);
export const router_option_u128_expect=(argument0,argument1)=>operate("u128","expect",[argument0,argument1]);
export const router_option_u128_and=(argument0,argument1)=>operate("u128","and",[argument0,argument1]);
export const router_option_u128_or=(argument0,argument1)=>operate("u128","or",[argument0,argument1]);
export const router_option_i128_some=(argument0)=>operate("i128","some",[argument0]);
export const router_option_i128_none=()=>operate("i128","none",[]);
export const router_option_i128_is_some=(argument0)=>operate("i128","is_some",[argument0]);
export const router_option_i128_is_none=(argument0)=>operate("i128","is_none",[argument0]);
export const router_option_i128_unwrap_or=(argument0,argument1)=>operate("i128","unwrap_or",[argument0,argument1]);
export const router_option_i128_unwrap=(argument0)=>operate("i128","unwrap",[argument0]);
export const router_option_i128_expect=(argument0,argument1)=>operate("i128","expect",[argument0,argument1]);
export const router_option_i128_and=(argument0,argument1)=>operate("i128","and",[argument0,argument1]);
export const router_option_i128_or=(argument0,argument1)=>operate("i128","or",[argument0,argument1]);

import {router_text_trim as filteredTextTrim} from './text-runtime.mjs';
export const router_option_text_owned_some=(argument0)=>operate("text-owned","some",[argument0]);
export const router_option_text_owned_none=()=>operate("text-owned","none",[]);
export const router_option_text_owned_unwrap_or=(argument0,argument1)=>operate("text-owned","unwrap_or",[argument0,argument1]);
export const router_option_text_owned_unwrap=(argument0)=>operate("text-owned","unwrap",[argument0]);
export const router_option_text_owned_expect=(argument0,argument1)=>operate("text-owned","expect",[argument0,argument1]);
export const router_option_text_owned_and=(argument0,argument1)=>operate("text-owned","and",[argument0,argument1]);
export const router_option_text_owned_or=(argument0,argument1)=>operate("text-owned","or",[argument0,argument1]);
export const router_option_text_owned_unwrap_or_default=(argument0)=>operate("text-owned","unwrap_or_default",[argument0]);
export const router_option_text_owned_filter_nonempty=(argument0,argument1)=>operate("text-owned","filter_nonempty",[argument0,argument1]);
export const router_option_str_filter_nonempty=(argument0,argument1)=>operate("str","filter_nonempty",[argument0,argument1]);
export const router_option_bool_ok_or=(argument0,argument1)=>operate("bool","ok_or",[argument0,argument1]);
export const router_option_bool_ok_or_text=(argument0,argument1)=>operate("bool","ok_or_text",[argument0,argument1]);
export const router_option_u64_ok_or=(argument0,argument1)=>operate("u64","ok_or",[argument0,argument1]);
export const router_option_u64_ok_or_text=(argument0,argument1)=>operate("u64","ok_or_text",[argument0,argument1]);
export const router_option_i64_ok_or=(argument0,argument1)=>operate("i64","ok_or",[argument0,argument1]);
export const router_option_i64_ok_or_text=(argument0,argument1)=>operate("i64","ok_or_text",[argument0,argument1]);
export const router_option_str_ok_or=(argument0,argument1)=>operate("str","ok_or",[argument0,argument1]);
export const router_option_str_ok_or_text=(argument0,argument1)=>operate("str","ok_or_text",[argument0,argument1]);
export const router_option_text_owned_ok_or=(argument0,argument1)=>operate("text-owned","ok_or",[argument0,argument1]);
export const router_option_text_owned_ok_or_text=(argument0,argument1)=>operate("text-owned","ok_or_text",[argument0,argument1]);
