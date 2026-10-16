// Bounded owned JSON updates. This is not generic IndexMut/Clone/Serialize.
import {json_macro_value,json_macro_object} from './json-macro-runtime.mjs';
import {string} from './extensions/json-values.mjs';
export const router_core_json_copy=value=>json_macro_value(value);
export function router_core_json_with_field(base,key,value){
  const copied=json_macro_value(base),name=string(key),item=json_macro_value(value);
  if(copied.$!=='Object'&&copied.$!=='Null')throw new TypeError('Owned JSON string-key update requires an object or null');
  const entries=copied.$==='Object'?copied.field0.entries.map(entry=>[entry.key,entry.value]):[];
  // Constructing through the same runtime rechecks the whole result budget,
  // UTF-8 key order and independent recursive storage, including replacement.
  return json_macro_object([...entries.filter(([key])=>key!==name),[name,item]]);
}
