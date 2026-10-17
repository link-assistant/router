// Immutable value layouts shared by the checked JSON contracts and adapters.
import {I64_MIN,I64_MAX,U64_MAX} from './json-numbers.mjs';
export const tagged=($,fields={})=>Object.freeze({$,...fields});
export const NONE=tagged('None'),JSON_NULL=tagged('Null');
export const some=value=>tagged('Some',{field0:value}),ok=value=>tagged('Ok',{field0:value}),err=value=>tagged('Err',{field0:value});
export function string(value) {
  if(typeof value !== 'string' || /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))throw new TypeError('JSON string is outside the Rust Unicode scalar domain');
  return value;
}
function fields(value,names) {
  if(!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== names.length || names.some(name=>!Object.hasOwn(value,name)))throw new TypeError('JSON algebraic value has an invalid field layout');
}
export function validateJsonNumber(value) {
  fields(value,['$','field0']);
  if(value.$ === 'PosInt' && typeof value.field0 === 'bigint' && value.field0 >= 0n && value.field0 <= U64_MAX)return value;
  if(value.$ === 'NegInt' && typeof value.field0 === 'bigint' && value.field0 >= I64_MIN && value.field0 < 0n)return value;
  if(value.$ === 'Float' && typeof value.field0 === 'number' && Number.isFinite(value.field0))return value;
  throw new TypeError('JSON Number is outside its checked i64/u64/finite-f64 domain');
}
export const compareJsonKeys=(left,right)=>Buffer.compare(Buffer.from(left,'utf8'),Buffer.from(right,'utf8'));
function mapLayout(value,visit) {
  fields(value,['$','entries']);if(value.$ !== 'Map' || !Array.isArray(value.entries))throw new TypeError('JSON object is outside the checked Map domain');
  let previous;
  for(const entry of value.entries) {
    fields(entry,['$','key','value']);if(entry.$ !== 'MapEntry')throw new TypeError('JSON map entry has an invalid constructor');
    string(entry.key);if(previous !== undefined && compareJsonKeys(previous,entry.key)>=0)throw new TypeError('JSON map keys must be unique and sorted by Rust UTF-8 byte order');
    previous=entry.key;visit(entry.value);
  }
  return value;
}
export function validateJsonValue(value) {
  const stack=new Set(),checked=new Set();
  const visit=current=>{
    if(checked.has(current))return;
    if(stack.has(current))throw new TypeError('JSON Value cannot contain a cyclic reference');
    fields(current,current?.$ === 'Null'?['$']:['$','field0']);stack.add(current);
    switch(current.$) {
      case 'Null':break;
      case 'Bool':if(typeof current.field0 !== 'boolean')throw new TypeError('JSON Bool is outside its checked domain');break;
      case 'String':string(current.field0);break;
      case 'Number':validateJsonNumber(current.field0);break;
      case 'Array':if(!Array.isArray(current.field0))throw new TypeError('JSON Array has no checked array');for(const item of current.field0)visit(item);break;
      case 'Object':mapLayout(current.field0,visit);break;
      default:throw new TypeError('JSON Value has an unknown constructor');
    }
    stack.delete(current);checked.add(current);
  };
  visit(value);return value;
}
export function validateJsonMap(value) {mapLayout(value,validateJsonValue);return value;}
export function jsonMap(entries) {
  const merged=new Map();for(const [key,value] of entries){string(key);merged.set(key,value);}
  return tagged('Map',{entries:Object.freeze([...merged].sort(([left],[right])=>compareJsonKeys(left,right)).map(([key,value])=>tagged('MapEntry',{key,value})))});
}
export function jsonError(message,line=0,column=0,category='Syntax') {
  return tagged('JsonError',{category:tagged(category),line:BigInt(line),column:BigInt(column),message:string(message)});
}
export function validateJsonError(value) {
  fields(value,['$','category','line','column','message']);fields(value.category,['$']);
  if(value.$ !== 'JsonError' || !['Io','Syntax','Data','Eof'].includes(value.category.$))throw new TypeError('JSON Error has an unknown constructor/category');
  if(typeof value.line !== 'bigint' || value.line < 0n || value.line > U64_MAX || typeof value.column !== 'bigint' || value.column < 0n || value.column > U64_MAX)throw new TypeError('JSON error location is outside the checked usize domain');
  string(value.message);return value;
}
export function unsigned(value) {if(typeof value !== 'bigint' || value < 0n || value > U64_MAX)throw new TypeError('JSON index is outside the checked usize/u64 domain');return value;}
export function signed(value) {if(typeof value !== 'bigint' || value < I64_MIN || value > I64_MAX)throw new TypeError('JSON integer is outside the checked i64 domain');return value;}
