// Candidate scalar/Value adapters for the existing immutable JSON ABI. These
// exports do not authorize a macro owner or an arbitrary Serialize impl.
import {types} from 'node:util';
import {JSON_NULL,tagged,string,jsonMap,validateJsonValue,compareJsonKeys} from './json-values.mjs';
import {I64_MIN,I64_MAX,U64_MAX} from './json-numbers.mjs';
export const JSON_MACRO_RUNTIME_AUTHORITY=Object.freeze({namespaceAuthority:false,expansionAuthority:false,runtimeParity:false,generatedTraitBehavior:false});
const invalid=()=>{throw new TypeError('JSON macro candidate requires an immutable canonical scalar/Value layout');};
function descriptors(value,array=false) {
  if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)!==array)invalid();
  const prototype=Object.getPrototypeOf(value);
  if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)invalid();
  const fields=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(fields).some(key=>typeof key!=='string'||!Object.hasOwn(fields[key],'value')))invalid();
  return fields;
}
function record(value,names) {
  const fields=descriptors(value);
  if(Object.keys(fields).length!==names.length||names.some(name=>!Object.hasOwn(fields,name)))invalid();
  return fields;
}
function dense(value) {
  const fields=descriptors(value,true),length=fields.length?.value;
  if(!Number.isSafeInteger(length)||length<0||length>4096||Object.keys(fields).length!==length+1)invalid();
  const items=[];
  for(let at=0;at<length;at++){if(!Object.hasOwn(fields,String(at)))invalid();items.push(fields[String(at)].value);}
  return items;
}
export const json_macro_null=()=>JSON_NULL;
export function json_macro_bool(value){if(typeof value!=='boolean')invalid();return tagged('Bool',{field0:value});}
export const json_macro_string=value=>tagged('String',{field0:string(value)});
export function json_macro_i64(value) {
  if(typeof value!=='bigint'||value<I64_MIN||value>I64_MAX)invalid();
  return tagged('Number',{field0:tagged(value<0n?'NegInt':'PosInt',{field0:value})});
}
export function json_macro_u64(value) {
  if(typeof value!=='bigint'||value<0n||value>U64_MAX)invalid();
  return tagged('Number',{field0:tagged('PosInt',{field0:value})});
}
export function json_macro_value(value) {
  let nodes=0;const active=new Set();
  function clone(current,depth) {
    if(++nodes>4096||depth>32||active.has(current))invalid();
    const first=descriptors(current),name=first.$?.value;
    const fields=record(current,name==='Null'?['$']:['$','field0']);active.add(current);
    let result;
    switch(name) {
      case 'Null':result=JSON_NULL;break;
      case 'Bool':result=json_macro_bool(fields.field0.value);break;
      case 'String':result=json_macro_string(fields.field0.value);break;
      case 'Number':{
        const number=record(fields.field0.value,['$','field0']),kind=number.$.value,item=number.field0.value;
        if(kind==='PosInt')result=json_macro_u64(item);
        else if(kind==='NegInt'&&typeof item==='bigint'&&item<0n)result=json_macro_i64(item);
        else if(kind==='Float'&&typeof item==='number'&&Number.isFinite(item))result=tagged('Number',{field0:tagged('Float',{field0:item})});
        else invalid();break;
      }
      case 'Array':result=tagged('Array',{field0:Object.freeze(dense(fields.field0.value).map(item=>clone(item,depth+1)))});break;
      case 'Object':{
        const map=record(fields.field0.value,['$','entries']);if(map.$.value!=='Map')invalid();
        let previous;const entries=dense(map.entries.value).map(entry=>{
          const item=record(entry,['$','key','value']);if(item.$.value!=='MapEntry')invalid();
          const key=string(item.key.value);if(previous!==undefined&&compareJsonKeys(previous,key)>=0)invalid();previous=key;
          return [key,clone(item.value.value,depth+1)];
        });result=tagged('Object',{field0:jsonMap(entries)});break;
      }
      default:invalid();
    }
    active.delete(current);return result;
  }
  const copy=clone(value,0);validateJsonValue(copy);return copy;
}
export function json_macro_array(values) {
  return json_macro_value(tagged('Array',{field0:Object.freeze(dense(values).map(json_macro_value))}));
}
export function json_macro_object(entries) {
  const keys=new Set(),checked=dense(entries).map(pair=>{
    const items=dense(pair);if(items.length!==2)invalid();
    const key=string(items[0]);if(keys.has(key))throw new TypeError('Duplicate literal JSON macro keys remain outside the candidate profile');keys.add(key);
    return [key,json_macro_value(items[1])];
  });
  return json_macro_value(tagged('Object',{field0:jsonMap(checked)}));
}
