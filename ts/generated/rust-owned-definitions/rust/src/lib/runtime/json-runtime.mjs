// Generic checked serde_json adapters; see json-NOTICE.md for source provenance.
import {formatJsonFloat,I64_MAX} from './json-numbers.mjs';
import {parseJsonBytes} from './json-parser.mjs';
import {tagged,NONE,JSON_NULL,some,ok,string,validateJsonValue,validateJsonNumber,validateJsonMap,validateJsonError,unsigned,signed} from './json-values.mjs';

export function serde_json_from_str(text){string(text);return parseJsonBytes(Buffer.from(text,'utf8'));}
export function serde_json_from_slice(bytes) {
  if(!Array.isArray(bytes) || bytes.some(byte=>typeof byte !== 'bigint' || byte < 0n || byte > 255n))throw new TypeError('JSON input bytes are outside the checked Vec<u8> domain');
  return parseJsonBytes(Uint8Array.from(bytes,Number));
}
function serialize(value,pretty=false,depth=0) {
  switch(value.$) {
    case 'Null':return 'null';
    case 'Bool':return value.field0?'true':'false';
    case 'String':return JSON.stringify(value.field0);
    case 'Number':return value.field0.$ === 'Float'?formatJsonFloat(value.field0.field0):String(value.field0.field0);
    case 'Array':case 'Object': {
      const object=value.$ === 'Object',items=object?value.field0.entries:value.field0;
      if(!items.length)return object?'{}':'[]';
      const indent=pretty?'  '.repeat(depth+1):'',separator=pretty?',\n':',';
      const rendered=items.map(item=>indent+(object?JSON.stringify(item.key)+(pretty?': ':':')+serialize(item.value,pretty,depth+1):serialize(item,pretty,depth+1))).join(separator);
      return (object?'{':'[')+(pretty?'\n':'')+rendered+(pretty?'\n'+'  '.repeat(depth):'')+(object?'}':']');
    }
    default:throw new TypeError('Unknown JSON Value constructor');
  }
}
export function serde_json_to_string(value){validateJsonValue(value);return ok(serialize(value));}
export function serde_json_to_string_pretty(value){validateJsonValue(value);return ok(serialize(value,true));}
const encoded=result=>ok(Object.freeze(Array.from(Buffer.from(result.field0,'utf8'),byte=>BigInt(byte))));
export const serde_json_to_vec=value=>encoded(serde_json_to_string(value));
export const serde_json_to_vec_pretty=value=>encoded(serde_json_to_string_pretty(value));
function getMap(map,key) {
  // Keys are checked canonical Unicode scalars and already sorted UTF-8.
  return map.entries.find(entry=>entry.key === key)?.value;
}
export function serde_json_value_get_string(value,key){validateJsonValue(value);string(key);const found=value.$ === 'Object'?getMap(value.field0,key):undefined;return found === undefined?NONE:some(found);}
export function serde_json_value_get_usize(value,index){validateJsonValue(value);unsigned(index);return value.$ === 'Array' && index < BigInt(value.field0.length)?some(value.field0[Number(index)]):NONE;}
export const serde_json_value_index_string=(value,key)=>{const found=serde_json_value_get_string(value,key);return found.$ === 'Some'?found.field0:JSON_NULL;};
export const serde_json_value_index_usize=(value,index)=>{const found=serde_json_value_get_usize(value,index);return found.$ === 'Some'?found.field0:JSON_NULL;};
export function serde_json_value_pointer(value,pointer) {
  validateJsonValue(value);string(pointer);if(!pointer)return some(value);if(!pointer.startsWith('/'))return NONE;
  let target=value;
  for(const raw of pointer.slice(1).split('/')) {
    const token=raw.replace(/~1/gu,'/').replace(/~0/gu,'~');
    if(target.$ === 'Object'){target=getMap(target.field0,token);if(target === undefined)return NONE;}
    else if(target.$ === 'Array') {
      if(!/^(?:0|[1-9][0-9]*)$/u.test(token))return NONE;
      const index=BigInt(token);if(index >= BigInt(target.field0.length))return NONE;target=target.field0[Number(index)];
    } else return NONE;
  }
  return some(target);
}
export function serde_json_number_as_u64(value){validateJsonNumber(value);return value.$ === 'PosInt'?some(value.field0):NONE;}
export function serde_json_number_as_i64(value){validateJsonNumber(value);return value.$ === 'NegInt' || value.$ === 'PosInt' && value.field0 <= I64_MAX?some(value.field0):NONE;}
export function serde_json_number_as_f64(value){validateJsonNumber(value);return some(Number(value.field0));}
export const serde_json_number_is_u64=value=>serde_json_number_as_u64(value).$ === 'Some';
export const serde_json_number_is_i64=value=>serde_json_number_as_i64(value).$ === 'Some';
export const serde_json_number_is_f64=value=>{validateJsonNumber(value);return value.$ === 'Float';};
export const serde_json_number_from_u64=value=>tagged('PosInt',{field0:unsigned(value)});
export const serde_json_number_from_i64=value=>{signed(value);return tagged(value < 0n?'NegInt':'PosInt',{field0:value});};
export function serde_json_number_from_f64(value){if(typeof value !== 'number')throw new TypeError('Number::from_f64 requires a binary64');return Number.isFinite(value)?some(tagged('Float',{field0:value})):NONE;}
const variant=(value,kind)=>{validateJsonValue(value);return value.$ === kind?some(value.field0):NONE;};
export const serde_json_value_as_str=value=>variant(value,'String');
export const serde_json_value_as_bool=value=>variant(value,'Bool');
export const serde_json_value_as_number=value=>variant(value,'Number');
export const serde_json_value_as_array=value=>variant(value,'Array');
export const serde_json_value_as_object=value=>variant(value,'Object');
export const serde_json_value_as_null=value=>{validateJsonValue(value);return value.$ === 'Null'?some(null):NONE;};
export const serde_json_value_as_u64=value=>{validateJsonValue(value);return value.$ === 'Number'?serde_json_number_as_u64(value.field0):NONE;};
export const serde_json_value_as_i64=value=>{validateJsonValue(value);return value.$ === 'Number'?serde_json_number_as_i64(value.field0):NONE;};
export const serde_json_value_as_f64=value=>{validateJsonValue(value);return value.$ === 'Number'?serde_json_number_as_f64(value.field0):NONE;};
export const serde_json_value_is_u64=value=>serde_json_value_as_u64(value).$ === 'Some';
export const serde_json_value_is_i64=value=>serde_json_value_as_i64(value).$ === 'Some';
export const serde_json_value_is_f64=value=>{validateJsonValue(value);return value.$ === 'Number' && serde_json_number_is_f64(value.field0);};
export const serde_json_value_is_null=value=>{validateJsonValue(value);return value.$ === 'Null';};
export const serde_json_value_is_boolean=value=>{validateJsonValue(value);return value.$ === 'Bool';};
export const serde_json_value_is_number=value=>{validateJsonValue(value);return value.$ === 'Number';};
export const serde_json_value_is_string=value=>{validateJsonValue(value);return value.$ === 'String';};
export const serde_json_value_is_array=value=>{validateJsonValue(value);return value.$ === 'Array';};
export const serde_json_value_is_object=value=>{validateJsonValue(value);return value.$ === 'Object';};
export function serde_json_map_get(map,key){validateJsonMap(map);string(key);const found=getMap(map,key);return found === undefined?NONE:some(found);}
export const serde_json_map_values=map=>{validateJsonMap(map);return Object.freeze(map.entries.map(entry=>entry.value));};
export const serde_json_map_keys=map=>{validateJsonMap(map);return Object.freeze(map.entries.map(entry=>entry.key));};
export const serde_json_map_len=map=>{validateJsonMap(map);return BigInt(map.entries.length);};
export const serde_json_map_is_empty=map=>{validateJsonMap(map);return !map.entries.length;};
export const serde_json_error_classify=value=>{validateJsonError(value);return value.category;};
export const serde_json_error_line=value=>{validateJsonError(value);return value.line;};
export const serde_json_error_column=value=>{validateJsonError(value);return value.column;};
export const serde_json_error_to_string=value=>{validateJsonError(value);return value.message+(value.line?` at line ${value.line} column ${value.column}`:'');};
export const serde_json_error_is_io=value=>serde_json_error_classify(value).$ === 'Io';
export const serde_json_error_is_syntax=value=>serde_json_error_classify(value).$ === 'Syntax';
export const serde_json_error_is_data=value=>serde_json_error_classify(value).$ === 'Data';
export const serde_json_error_is_eof=value=>serde_json_error_classify(value).$ === 'Eof';
