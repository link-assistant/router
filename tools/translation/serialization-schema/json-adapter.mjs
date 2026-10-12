// Bounded algebraic Value/Map serialization. Numeric decode and finite-f64
// formatting remain separate, refused source obligations on this profile.
import { types } from 'node:util';
import { validateJsonValue, validateJsonMap, tagged } from '../extensions/json-values.mjs';
import { serde_json_to_string } from '../extensions/json-runtime.mjs';
const domain=Object.freeze({maxDepth:128,maxCells:50000,maxBytes:1048576});

function inspect(value) {
  const active=new Set();let cells=0,bytes=0;
  function visit(current,depth) {
    if(++cells>domain.maxCells||depth>=domain.maxDepth)throw new TypeError('JSON algebraic value exceeds its bounded cells/depth');
    if(typeof current==='string'){bytes+=Buffer.byteLength(current,'utf8');if(bytes>domain.maxBytes)throw new TypeError('JSON strings exceed their bounded byte domain');return;}
    if(current===null||['boolean','bigint','number'].includes(typeof current))return;
    if(!current||typeof current!=='object'||types.isProxy(current)||active.has(current))throw new TypeError('JSON requires acyclic ordinary data, without proxies');
    const prototype=Object.getPrototypeOf(current),array=Array.isArray(current);
    if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)throw new TypeError('JSON algebraic value has an unsupported prototype');
    const descriptors=Object.getOwnPropertyDescriptors(current),keys=Reflect.ownKeys(descriptors);
    for(const key of keys)if(typeof key!=='string'||!Object.hasOwn(descriptors[key],'value')||!descriptors[key].enumerable&&!(array&&key==='length'))throw new TypeError('JSON requires data properties without getters or hidden fields');
    if(array){const length=descriptors.length.value;if(!Number.isSafeInteger(length)||length<0||length>domain.maxCells-cells||keys.length!==length+1||Array.from({length},(_,index)=>index).some(index=>!Object.hasOwn(descriptors,String(index))))throw new TypeError('JSON requires bounded dense ordinary arrays');}
    // Even finite Float constructors need a separate pinned formatter proof.
    if(descriptors.$?.value==='Float') {
      if(typeof descriptors.field0?.value!=='number'||!Number.isFinite(descriptors.field0.value))throw new TypeError('JSON Float is outside the finite binary64 domain');
      throw new TypeError('Finite f64 JSON formatting has no admitted source-equivalence proof');
    }
    active.add(current);
    for(const key of keys)if(!(array&&key==='length'))visit(descriptors[key].value,depth+1);
    active.delete(current);
  }
  visit(value,0);
}
export function serializeBoundedJson(value,kind) {
  if(!['json-value','json-map'].includes(kind))throw new TypeError('Unsupported algebraic JSON value kind');
  inspect(value);
  if(kind==='json-map')validateJsonMap(value);else validateJsonValue(value);
  const result=serde_json_to_string(kind==='json-map'?tagged('Object',{field0:value}):value);
  if(result.$!=='Ok'||typeof result.field0!=='string'||Buffer.byteLength(result.field0)>domain.maxBytes)throw new TypeError('JSON serialization exceeds its bounded source contract');
  return result.field0;
}
