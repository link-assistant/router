// Explicit owned canonical storage; no general JS mutation/IndexMut permit.
import {types} from 'node:util';
import {assertImmutableIterator} from './extensions/iterator-runtime.mjs';
import {json_macro_value,json_macro_array,json_macro_object,json_macro_string} from './json-macro-runtime.mjs';
const fail=message=>{throw new TypeError(message);};
const canonical=value=>json_macro_value(value);
const text=value=>{json_macro_string(value);return value;};
function array(value,message){const result=canonical(value);if(result.$!=='Array')fail(message);return result.field0;}
function entries(value,message,nullable=false){const result=canonical(value);if(nullable&&result.$==='Null')return null;if(result.$!=='Object')fail(message);return result.field0.entries;}
const object=rows=>json_macro_object(rows.map(row=>[row.key,row.value]));
function u64Index(value){if(typeof value!=='bigint'||value<0n||value>18446744073709551615n)fail('JSON replacement requires a u64 index');return value;}
function valuesCopy(values){if(types.isProxy(values)||!Array.isArray(values))fail('JSON state requires an immutable JSON list');assertImmutableIterator(values);if(values.length>4096)fail('Original JSON list bound exceeded');return values.map(value=>canonical(value));}
export function router_state_json_with_index(base,index,value){
 const values=[...array(base,'JSON replacement requires an array')],at=u64Index(index);if(at>=BigInt(values.length))fail('JSON replacement index is out of bounds');
 values[Number(at)]=canonical(value);return json_macro_array(Object.freeze(values));
}
export function router_state_json_append(base,value){
 const values=[...array(base,'JSON append requires an array')];values.push(canonical(value));return json_macro_array(Object.freeze(values));
}
export function router_state_json_extend(base,values){
 const output=[...array(base,'JSON extend requires an array')];if(types.isProxy(values)||!Array.isArray(values))fail('JSON extend requires an immutable JSON list');assertImmutableIterator(values);if(values.length>4096)fail('Original JSON list bound exceeded');
 for(let index=0;index<values.length;index++)output.push(canonical(values[index]));return json_macro_array(Object.freeze(output));
}
export function router_state_json_extend_owned(base,values){const output=[...array(base,'JSON extend requires an array'),...valuesCopy(values)];return json_macro_array(Object.freeze(output));}
export function router_state_json_from_values(values){return json_macro_array(Object.freeze(valuesCopy(values)));}
export function router_state_json_values_copy(values){return json_macro_array(Object.freeze(valuesCopy(values))).field0;}
export function router_state_json_into_values(value){return array(value,'JSON extraction requires an array');}
export function router_state_json_without_field(base,key){
 const rows=entries(base,'JSON removal requires an object or null',true),name=text(key);if(rows===null)return canonical(base);return object(rows.filter(row=>row.key!==name));
}
export function router_state_json_merge(base,patch){
 // The native operation selects its patch before checking/promoting the base.
 const changes=entries(patch,'JSON merge patch requires an object'),prior=entries(base,'JSON merge base requires an object or null',true)??[],merged=new Map(prior.map(row=>[row.key,row.value]));
 for(const row of changes)merged.set(row.key,row.value);return json_macro_object([...merged.entries()]);
}
export function router_state_json_object_keys(value){return json_macro_array(Object.freeze(entries(value,'JSON keys require an object').map(row=>json_macro_string(row.key))));}
export function router_state_json_array_len(value){return BigInt(array(value,'JSON length requires an array').length);}
export function router_state_json_object_has(value,key){const observed=canonical(value),name=text(key);return observed.$==='Object'&&observed.field0.entries.some(row=>row.key===name);}
