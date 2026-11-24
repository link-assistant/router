// Eager successful-resource projection of the two explicit owned Rust APIs.
// This is not a permission to translate arbitrary Iterator/FnMut/Drop behavior.
import {types} from 'node:util';
import {assertImmutableIterator} from './extensions/iterator-runtime.mjs';
import {json_macro_array,json_macro_value} from './json-macro-runtime.mjs';
const invalid=()=>{throw new TypeError('Owned JSON collection exceeds its canonical immutable domain');};
function collect(values,callback,optional){
 if(typeof callback!=='function'||types.isProxy(callback)||types.isProxy(values)||!Array.isArray(values))invalid();
 // The original registered guard precedes all ordinary reads. Each Json is
 // separately checked against the existing 4096-node/depth32 JSON domain.
 assertImmutableIterator(values);
 if(values.length>4096)invalid();
 for(let at=0;at<values.length;at++)json_macro_value(values[at]);
 const output=[];
 for(let at=0;at<values.length;at++){
  const result=callback(values[at]);
  if(!optional){output.push(result);continue;}
  if(!result||typeof result!=='object'||types.isProxy(result)||Array.isArray(result))invalid();
  const parent=Object.getPrototypeOf(result),names=Reflect.ownKeys(result);
  if(parent!==Object.prototype&&parent!==null)invalid();
  if(names.some(name=>typeof name!=='string'||name==='stack'))invalid();
  const fields=Object.getOwnPropertyDescriptors(result);
  if(names.some(name=>!Object.hasOwn(fields[name],'value')))invalid();
  const tag=fields.$?.value;
  if(tag==='None'&&names.length===1)continue;
  if(tag!=='Some'||names.length!==2||!fields.field0)invalid();
  output.push(fields.field0.value);
 }
 // One aggregate validation, including the Array root, preserves the current
 // 4096-node/depth32 bound and independent recursively frozen owned storage.
 return json_macro_array(Object.freeze(output)).field0;
}
export const router_core_json_map=(values,callback)=>collect(values,callback,false);
export const router_core_json_filter_map=(values,callback)=>collect(values,callback,true);
