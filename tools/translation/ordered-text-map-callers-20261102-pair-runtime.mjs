// Representation adapter for the original checked Tuple emitter. Compiler
// ownership still requires original Vec/tuple/String nodes and private calls.
// These exports are value operations, never type or source proof issuers.
import {types} from 'node:util';
import {router_text_map_from_pairs,router_text_map_pairs} from './ordered-text-map-20261102-runtime.mjs';
const fail=()=>{throw TypeError('Ordered text map tuple bridge requires bounded original tuple representation');};
function own(value,key){const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail();return field.value;}
function vector(value){
 if(!value||typeof value!=='object'||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail();
 const length=Object.getOwnPropertyDescriptor(value,'length');
 if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<0||length.value>4096||Reflect.ownKeys(value).length!==length.value+1)fail();
 const result=[];for(let index=0;index<length.value;index++)result.push(own(value,String(index)));return result;
}
function tuple(value){
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail();
 const keys=Reflect.ownKeys(value);if(keys.length!==3||!keys.includes('$')||!keys.includes('field0')||!keys.includes('field1')||own(value,'$')!=='Tuple')fail();
 // The unchanged raw boundary validates scalar text, individual/aggregate
 // UTF-8 bounds, duplicate-input accounting and last-value-wins ordering.
 return [own(value,'field0'),own(value,'field1')];
}
export function router_text_map_from_tuple_pairs(value){
 const pairs=vector(value).map(tuple);return router_text_map_from_pairs(pairs);
}
export function router_text_map_tuple_pairs(value){
 // No generic tuple/JSON decoder runs here. Only already validated raw output
 // is changed into the original emitter's exact owned product representation.
 return Object.freeze(router_text_map_pairs(value).map(([field0,field1])=>Object.freeze({$:'Tuple',field0,field1})));
}
