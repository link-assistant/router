// Finite literal equations are DATA; only the actual source checker issues IR.
// A written domain is supplied only after its real imported-operation binding.
const fail=message=>{throw new TypeError('Owned numeric literal: '+message);};
const bounds=Object.freeze({usize:[0n,18446744073709551615n],...Object.fromEntries(PRIMITIVE_BITWISE_TYPES.map(row=>[row.name,[row.signed?-BigInt(row.minimumAbs):0n,BigInt(row.maximum)]]))});
export function ownedIntegerLiteral(text,{negative=false,domain=null}={}){
 if(typeof text!=='string')fail('primitive native literal text required');
 const digits=text.replace(/n$/u,'').replaceAll('_','');if(!digits.length||digits.length>66)fail('bounded native integer literal required');
 let value;try{value=BigInt(digits);}catch{fail('invalid native integer literal');}
 const row=domain===null?null:primitiveBitwiseType(domain);if(domain!==null&&!row)fail('registered actual native literal domain required');const actual=negative?-value:value;if(row){const [minimum,maximum]=bounds[row.name];if(value<0n||actual<minimum||actual>maximum)fail('literal exceeds actual written '+row.name+' domain');}else if(value<0n||value>(negative?9223372036854775808n:18446744073709551615n))fail(negative?'i64 negative literal bound':'u64 literal bound');
 return {kind:'integer',value:actual.toString(),type:row?.name??(negative?'i64':'usize'),root:null};
}
export function narrowOwnedNumericLiteral(value,domain){
 if(!Object.hasOwn(bounds,domain))return value;
 if(value.kind==='choose'){
  narrowOwnedNumericLiteral(value.then,domain);narrowOwnedNumericLiteral(value.else,domain);
  if(value.then.type!==domain||value.else.type!==domain)fail('conditional operands differ from actual written numeric domain');value.type=domain;return value;
 }
 if(value.kind!=='integer')return value;
 if(typeof value.value!=='string'||! /^-?(0|[1-9][0-9]{0,38})$/u.test(value.value))fail('canonical bounded literal value required');
 const number=BigInt(value.value),[min,max]=bounds[domain];if(number<min||number>max)fail('literal exceeds actual written '+domain+' domain');value.type=domain;return value;
}

import {PRIMITIVE_BITWISE_TYPES,primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
