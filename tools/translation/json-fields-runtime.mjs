// Matching successful canonical domains of the native field-access boundary.
// Existing JSON readers retain canonical storage, numbers and refusal behavior.
import {serde_json_value_get_string as field,serde_json_value_get_usize as index,serde_json_value_as_str as string,serde_json_value_as_bool as boolean,serde_json_value_as_u64 as unsigned,serde_json_value_as_i64 as signed} from './extensions/json-runtime.mjs';
import {string as keyString,validateJsonValue,some} from './extensions/json-values.mjs';
import {router_option_bool_unwrap_or as option_bool_or,router_option_u64_unwrap_or as option_u64_or,router_option_i64_unwrap_or as option_i64_or} from './primitive-option-runtime.mjs';
const none=Object.freeze({$:'None'});
const then=(value,reader)=>value.$==='Some'?reader(value.field0):none;
export const router_field_json_field=(value,key)=>field(value,key);
export const router_field_json_index=(value,key)=>index(value,key);
export const router_field_json_str_field=(value,key)=>then(field(value,key),string);
export const router_field_json_bool_field=(value,key)=>then(field(value,key),boolean);
export const router_field_json_u64_field=(value,key)=>then(field(value,key),unsigned);
export const router_field_json_i64_field=(value,key)=>then(field(value,key),signed);

export const router_field_json_str_field_or_empty=(value,key)=>{const selected=then(field(value,key),string);return selected.$==='Some'?selected.field0:'';};

export const router_field_json_bool_field_or=(value,key,other)=>option_bool_or(then(field(value,key),boolean),other);
export const router_field_json_u64_field_or=(value,key,other)=>option_u64_or(then(field(value,key),unsigned),other);
export const router_field_json_i64_field_or=(value,key,other)=>option_i64_or(then(field(value,key),signed),other);

function getMap(map,key) {
  // Keys are checked canonical Unicode scalars and already sorted UTF-8.
  return map.entries.find(entry=>entry.key === key)?.value;
}

// One complete root validation belongs to this call only. Original scalar
// readers retain their own checks; no source, value or verdict cache survives.
function nestedFields(value,keys){
 validateJsonValue(value);for(const key of keys)keyString(key);let current=value;
 for(const key of keys){const found=current.$==='Object'?getMap(current.field0,key):undefined;if(found===undefined)return none;current=found;}return some(current);
}

export const router_field_json_field2=(value,key,second)=>nestedFields(value,[key,second]);
export const router_field_json_str_field2=(value,key,second)=>then(nestedFields(value,[key,second]),string);
export const router_field_json_str_field2_or_empty=(value,key,second)=>{const selected=then(nestedFields(value,[key,second]),string);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_bool_field2=(value,key,second)=>then(nestedFields(value,[key,second]),boolean);
export const router_field_json_bool_field2_or=(value,key,second,other)=>option_bool_or(then(nestedFields(value,[key,second]),boolean),other);
export const router_field_json_u64_field2=(value,key,second)=>then(nestedFields(value,[key,second]),unsigned);
export const router_field_json_u64_field2_or=(value,key,second,other)=>option_u64_or(then(nestedFields(value,[key,second]),unsigned),other);
export const router_field_json_i64_field2=(value,key,second)=>then(nestedFields(value,[key,second]),signed);
export const router_field_json_i64_field2_or=(value,key,second,other)=>option_i64_or(then(nestedFields(value,[key,second]),signed),other);
export const router_field_json_field3=(value,key,second,third)=>nestedFields(value,[key,second,third]);
export const router_field_json_str_field3=(value,key,second,third)=>then(nestedFields(value,[key,second,third]),string);
export const router_field_json_str_field3_or_empty=(value,key,second,third)=>{const selected=then(nestedFields(value,[key,second,third]),string);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_bool_field3=(value,key,second,third)=>then(nestedFields(value,[key,second,third]),boolean);
export const router_field_json_bool_field3_or=(value,key,second,third,other)=>option_bool_or(then(nestedFields(value,[key,second,third]),boolean),other);
export const router_field_json_u64_field3=(value,key,second,third)=>then(nestedFields(value,[key,second,third]),unsigned);
export const router_field_json_u64_field3_or=(value,key,second,third,other)=>option_u64_or(then(nestedFields(value,[key,second,third]),unsigned),other);
export const router_field_json_i64_field3=(value,key,second,third)=>then(nestedFields(value,[key,second,third]),signed);
export const router_field_json_i64_field3_or=(value,key,second,third,other)=>option_i64_or(then(nestedFields(value,[key,second,third]),signed),other);
export const router_field_json_field4=(value,key,second,third,fourth)=>nestedFields(value,[key,second,third,fourth]);
export const router_field_json_str_field4=(value,key,second,third,fourth)=>then(nestedFields(value,[key,second,third,fourth]),string);
export const router_field_json_str_field4_or_empty=(value,key,second,third,fourth)=>{const selected=then(nestedFields(value,[key,second,third,fourth]),string);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_bool_field4=(value,key,second,third,fourth)=>then(nestedFields(value,[key,second,third,fourth]),boolean);
export const router_field_json_bool_field4_or=(value,key,second,third,fourth,other)=>option_bool_or(then(nestedFields(value,[key,second,third,fourth]),boolean),other);
export const router_field_json_u64_field4=(value,key,second,third,fourth)=>then(nestedFields(value,[key,second,third,fourth]),unsigned);
export const router_field_json_u64_field4_or=(value,key,second,third,fourth,other)=>option_u64_or(then(nestedFields(value,[key,second,third,fourth]),unsigned),other);
export const router_field_json_i64_field4=(value,key,second,third,fourth)=>then(nestedFields(value,[key,second,third,fourth]),signed);
export const router_field_json_i64_field4_or=(value,key,second,third,fourth,other)=>option_i64_or(then(nestedFields(value,[key,second,third,fourth]),signed),other);

// Same immutable string ABI; native ownership comes from checked actual calls.
export const router_field_json_text_field=(value,key)=>then(field(value,key),string);
export const router_field_json_text_field_or_empty=(value,key)=>{const selected=then(field(value,key),string);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_text_field2=(value,key,second)=>then(nestedFields(value,[key,second]),string);
export const router_field_json_text_field2_or_empty=(value,key,second)=>{const selected=then(nestedFields(value,[key,second]),string);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_text_field3=(value,key,second,third)=>then(nestedFields(value,[key,second,third]),string);
export const router_field_json_text_field3_or_empty=(value,key,second,third)=>{const selected=then(nestedFields(value,[key,second,third]),string);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_text_field4=(value,key,second,third,fourth)=>then(nestedFields(value,[key,second,third,fourth]),string);
export const router_field_json_text_field4_or_empty=(value,key,second,third,fourth)=>{const selected=then(nestedFields(value,[key,second,third,fourth]),string);return selected.$==='Some'?selected.field0:'';};

const whitespace=code=>code>=9&&code<=13||code===32||code===0x85||code===0xa0||code===0x1680||code>=0x2000&&code<=0x200a||code===0x2028||code===0x2029||code===0x202f||code===0x205f||code===0x3000;
// Match native str::is_empty/trim predicates without trimming returned storage.
function nonemptyTextField(value,trimWhitespace){
 if(typeof trimWhitespace!=='boolean')throw new TypeError('Actual bool whitespace filter mode required');if(value.$==='None')return value;const text=value.field0;if(!trimWhitespace)return text.length?value:none;for(let at=0;at<text.length;at++)if(!whitespace(text.charCodeAt(at)))return value;return none;
}

export const router_field_json_str_field_nonempty=(value,key,trimWhitespace)=>nonemptyTextField(then(field(value,key),string),trimWhitespace);
export const router_field_json_str_field_nonempty_or_empty=(value,key,trimWhitespace)=>{const selected=nonemptyTextField(then(field(value,key),string),trimWhitespace);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_text_field_nonempty=(value,key,trimWhitespace)=>nonemptyTextField(then(field(value,key),string),trimWhitespace);
export const router_field_json_text_field_nonempty_or_empty=(value,key,trimWhitespace)=>{const selected=nonemptyTextField(then(field(value,key),string),trimWhitespace);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_str_field2_nonempty=(value,key,second,trimWhitespace)=>nonemptyTextField(then(nestedFields(value,[key,second]),string),trimWhitespace);
export const router_field_json_str_field2_nonempty_or_empty=(value,key,second,trimWhitespace)=>{const selected=nonemptyTextField(then(nestedFields(value,[key,second]),string),trimWhitespace);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_text_field2_nonempty=(value,key,second,trimWhitespace)=>nonemptyTextField(then(nestedFields(value,[key,second]),string),trimWhitespace);
export const router_field_json_text_field2_nonempty_or_empty=(value,key,second,trimWhitespace)=>{const selected=nonemptyTextField(then(nestedFields(value,[key,second]),string),trimWhitespace);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_str_field3_nonempty=(value,key,second,third,trimWhitespace)=>nonemptyTextField(then(nestedFields(value,[key,second,third]),string),trimWhitespace);
export const router_field_json_str_field3_nonempty_or_empty=(value,key,second,third,trimWhitespace)=>{const selected=nonemptyTextField(then(nestedFields(value,[key,second,third]),string),trimWhitespace);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_text_field3_nonempty=(value,key,second,third,trimWhitespace)=>nonemptyTextField(then(nestedFields(value,[key,second,third]),string),trimWhitespace);
export const router_field_json_text_field3_nonempty_or_empty=(value,key,second,third,trimWhitespace)=>{const selected=nonemptyTextField(then(nestedFields(value,[key,second,third]),string),trimWhitespace);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_str_field4_nonempty=(value,key,second,third,fourth,trimWhitespace)=>nonemptyTextField(then(nestedFields(value,[key,second,third,fourth]),string),trimWhitespace);
export const router_field_json_str_field4_nonempty_or_empty=(value,key,second,third,fourth,trimWhitespace)=>{const selected=nonemptyTextField(then(nestedFields(value,[key,second,third,fourth]),string),trimWhitespace);return selected.$==='Some'?selected.field0:'';};
export const router_field_json_text_field4_nonempty=(value,key,second,third,fourth,trimWhitespace)=>nonemptyTextField(then(nestedFields(value,[key,second,third,fourth]),string),trimWhitespace);
export const router_field_json_text_field4_nonempty_or_empty=(value,key,second,third,fourth,trimWhitespace)=>{const selected=nonemptyTextField(then(nestedFields(value,[key,second,third,fourth]),string),trimWhitespace);return selected.$==='Some'?selected.field0:'';};

import {json_macro_value as copyJsonFieldValue,json_macro_null as nullJsonFieldValue} from './json-macro-runtime.mjs';
export const router_field_json_index_or_null=(value,key)=>{const selected=index(value,key);return selected.$==='Some'?selected.field0:nullJsonFieldValue();};
export const router_field_json_owned_index=(value,key)=>{const selected=index(value,key);return selected.$==='Some'?some(copyJsonFieldValue(selected.field0)):none;};
export const router_field_json_owned_index_or_null=(value,key)=>{const selected=index(value,key);return selected.$==='Some'?copyJsonFieldValue(selected.field0):nullJsonFieldValue();};
export const router_field_json_field_or_null=(value,key)=>{const selected=field(value,key);return selected.$==='Some'?selected.field0:nullJsonFieldValue();};
export const router_field_json_owned_field=(value,key)=>{const selected=field(value,key);return selected.$==='Some'?some(copyJsonFieldValue(selected.field0)):none;};
export const router_field_json_owned_field_or_null=(value,key)=>{const selected=field(value,key);return selected.$==='Some'?copyJsonFieldValue(selected.field0):nullJsonFieldValue();};
export const router_field_json_field2_or_null=(value,key,second)=>{const selected=nestedFields(value,[key,second]);return selected.$==='Some'?selected.field0:nullJsonFieldValue();};
export const router_field_json_owned_field2=(value,key,second)=>{const selected=nestedFields(value,[key,second]);return selected.$==='Some'?some(copyJsonFieldValue(selected.field0)):none;};
export const router_field_json_owned_field2_or_null=(value,key,second)=>{const selected=nestedFields(value,[key,second]);return selected.$==='Some'?copyJsonFieldValue(selected.field0):nullJsonFieldValue();};
export const router_field_json_field3_or_null=(value,key,second,third)=>{const selected=nestedFields(value,[key,second,third]);return selected.$==='Some'?selected.field0:nullJsonFieldValue();};
export const router_field_json_owned_field3=(value,key,second,third)=>{const selected=nestedFields(value,[key,second,third]);return selected.$==='Some'?some(copyJsonFieldValue(selected.field0)):none;};
export const router_field_json_owned_field3_or_null=(value,key,second,third)=>{const selected=nestedFields(value,[key,second,third]);return selected.$==='Some'?copyJsonFieldValue(selected.field0):nullJsonFieldValue();};
export const router_field_json_field4_or_null=(value,key,second,third,fourth)=>{const selected=nestedFields(value,[key,second,third,fourth]);return selected.$==='Some'?selected.field0:nullJsonFieldValue();};
export const router_field_json_owned_field4=(value,key,second,third,fourth)=>{const selected=nestedFields(value,[key,second,third,fourth]);return selected.$==='Some'?some(copyJsonFieldValue(selected.field0)):none;};
export const router_field_json_owned_field4_or_null=(value,key,second,third,fourth)=>{const selected=nestedFields(value,[key,second,third,fourth]);return selected.$==='Some'?copyJsonFieldValue(selected.field0):nullJsonFieldValue();};
