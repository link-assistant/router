import {types} from 'node:util';
function parts(value){
  if(!value||typeof value!=='object'||types.isProxy(value))throw new TypeError('Result pipeline requires an ordinary checked Result');
  const prototype=Object.getPrototypeOf(value),keys=Reflect.ownKeys(value);
  if((prototype!==Object.prototype&&prototype!==null)||!Object.isFrozen(value)||keys.length!==2||!keys.includes('$')||!keys.includes('field0'))throw new TypeError('Result pipeline requires immutable canonical fields');
  const tag=Object.getOwnPropertyDescriptor(value,'$'),payload=Object.getOwnPropertyDescriptor(value,'field0');
  if(!tag||!payload||!Object.hasOwn(tag,'value')||!Object.hasOwn(payload,'value')||!['Ok','Err'].includes(tag.value))throw new TypeError('Result pipeline rejects noncanonical tags/accessors');
  return {tag:tag.value,payload:payload.value};
}
export function mapResultError(value,callback){const result=parts(value);return result.tag==='Ok'?value:Object.freeze({$:'Err',field0:callback(result.payload)});}
export function collectResult(values){
  const success=[];
  // Return without pulling any later element. All partial successful payloads
  // belong to the checked standard destruction domain, never custom Drop.
  for(const value of values){const result=parts(value);if(result.tag==='Err')return value;success.push(result.payload);}
  return Object.freeze({$:'Ok',field0:Object.freeze(success)});
}
