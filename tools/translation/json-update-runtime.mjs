// Bounded owned JSON updates. This is not generic IndexMut/Clone/Serialize.
import {json_macro_value,json_macro_object} from './json-macro-runtime.mjs';
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
