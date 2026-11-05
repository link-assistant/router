// Compiler-owned target helper, not a new native core ABI or source permit.
// Every carrier/scalar validation delegates to the existing actual vector core.
import * as vectors from './primitive-owned-vector-runtime.mjs';
import {types} from 'node:util';
const freeze=Object.freeze,define=Object.defineProperty,apply=Reflect.apply;
const domains=Object.freeze(['bool','u8','i8','u16','i16','u32','i32','u64','i64','u128','i128']);
function length(values,domain){
 if(typeof domain!=='string'||!domains.includes(domain))throw new TypeError('scalar linear kernel domain');
 return Number(apply(vectors['router_vec_'+domain+'_len'],undefined,[values]));
}
export function scalarLinearStage(values,inputDomain,operation,domain,callback){
 if(!['map','filter'].includes(operation)||operation==='filter'&&domain!==inputDomain)throw new TypeError('scalar linear kernel stage');
 if(typeof callback!=='function'||types.isProxy(callback)||types.isAsyncFunction(callback)||types.isGeneratorFunction(callback))throw new TypeError('scalar linear kernel synchronous callback');
 // One complete existing carrier validation, not one validation per get.
 const size=length(values,inputDomain),output=[];
 // Validate even an empty stage's output domain through the genuine core.
 length(freeze([]),domain);
 for(let index=0;index<size;index++){
  const item=values[index],result=apply(callback,undefined,[item]);let value;
  if(operation==='filter'){
   if(typeof result!=='boolean')throw new TypeError('scalar linear kernel Boolean predicate');
   if(!result)continue;value=item;
  }else{
   // The original complete scalar validator sees each result before the next
   // callback. Its singleton carrier is constant-size, retaining failure order.
   length(freeze([result]),domain);value=result;
  }
  if(output.length>=4096)throw new RangeError('primitive vector resource bound');
  define(output,String(output.length),{value,writable:true,enumerable:true,configurable:true});
 }
 const result=freeze(output);length(result,domain);return result;
}
