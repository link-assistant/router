// Matching successful canonical domains of the native field-access boundary.
// Existing JSON readers retain canonical storage, numbers and refusal behavior.
import {serde_json_value_get_string as field,serde_json_value_get_usize as index,serde_json_value_as_str as string,serde_json_value_as_bool as boolean,serde_json_value_as_u64 as unsigned,serde_json_value_as_i64 as signed} from './extensions/json-runtime.mjs';
const none=Object.freeze({$:'None'});
const then=(value,reader)=>value.$==='Some'?reader(value.field0):none;
export const router_field_json_field=(value,key)=>field(value,key);
export const router_field_json_index=(value,key)=>index(value,key);
export const router_field_json_str_field=(value,key)=>then(field(value,key),string);
export const router_field_json_bool_field=(value,key)=>then(field(value,key),boolean);
export const router_field_json_u64_field=(value,key)=>then(field(value,key),unsigned);
export const router_field_json_i64_field=(value,key)=>then(field(value,key),signed);
