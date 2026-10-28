// Bounded owned JSON updates. This is not generic IndexMut/Clone/Serialize.
import {json_macro_value,json_macro_object,json_macro_null,json_macro_bool,json_macro_string,json_macro_u64,json_macro_i64,json_macro_array} from './json-macro-runtime.mjs';
import {string,validateJsonMap,some,NONE} from './extensions/json-values.mjs';
import {serde_json_roundtrip_from_str,serde_json_roundtrip_from_slice} from './extensions/json-roundtrip-runtime.mjs';
import {serde_json_value_index_string,serde_json_value_index_usize,serde_json_map_get} from './extensions/json-runtime.mjs';
export const router_core_json_copy=value=>json_macro_value(value);
export function router_core_json_with_field(base,key,value){
  const copied=json_macro_value(base),name=string(key),item=json_macro_value(value);
  if(copied.$!=='Object'&&copied.$!=='Null')throw new TypeError('Owned JSON string-key update requires an object or null');
  const entries=copied.$==='Object'?copied.field0.entries.map(entry=>[entry.key,entry.value]):[];
  // Constructing through the same runtime rechecks the whole result budget,
  // UTF-8 key order and independent recursive storage, including replacement.
  return json_macro_object([...entries.filter(([key])=>key!==name),[name,item]]);
}

// Value indexing returns the actual existing node (or canonical Null); it is
// not an owned copy. Map indexing has the distinct missing-entry panic.
export const router_core_json_index_str=serde_json_value_index_string;
export const router_core_json_index_usize=serde_json_value_index_usize;
export function router_core_json_map_index(value,key){
  validateJsonMap(value);string(key);
  const found=serde_json_map_get(value,key);
  if(found.$!=='Some')throw new TypeError('no entry found for key');
  return found.field0;
}

// The existing parser reports JSON/UTF8 syntax as Err. No exception handler is
// used here: malformed adapter values and all resource bounds still throw.
const optional=result=>result.$==='Ok'?some(result.field0):NONE;
export const router_core_json_parse=value=>optional(serde_json_roundtrip_from_str(value));
export const router_core_json_parse_bytes=value=>optional(serde_json_roundtrip_from_slice(value));

// Paired with the separate bounded native JSON library. Old exports keep their
// existing contracts. Validation shares the same defensive canonical decoder.
export const router_vector_json_copy=value=>json_macro_value(value);
export function router_vector_json_validate(value){json_macro_value(value);}
export const router_vector_json_with_field=router_core_json_with_field;

// Canonical constructors paired with the same complete native library source.
export const router_vector_json_build_null=()=>json_macro_null();
export const router_vector_json_build_bool=value=>json_macro_bool(value);
export const router_vector_json_build_string=value=>json_macro_string(value);
export const router_vector_json_build_u64=value=>json_macro_u64(value);
export const router_vector_json_build_i64=value=>json_macro_i64(value);
export const router_vector_json_build_array=value=>json_macro_array(value);
export const router_vector_json_build_object=()=>json_macro_object([]);

// Bulk construction validates both complete inputs before checking field layout.
export function router_vector_json_build_fields(keys,values){
 const names=json_macro_value(keys),items=json_macro_array(values);
 if(names.$!=='Array'||names.field0.length!==items.field0.length)throw new TypeError('Canonical object field arity differs');
 const entries=[],seen=new Set();for(let index=0;index<names.field0.length;index++){
  const key=names.field0[index];if(key.$!=='String'||seen.has(key.field0))throw new TypeError('Canonical object keys must be distinct strings');seen.add(key.field0);entries.push([key.field0,items.field0[index]]);
 }
 return json_macro_object(entries);
}

export function router_vector_json_build_i64_unsigned(value){
 json_macro_u64(value);return json_macro_i64(value);
}
