// Complete source-operation closing protocol copied from the actual fresh
// standard input reader. Closures are checks, never source/owner permission.
import {types} from 'node:util';
const fail=message=>{throw new TypeError('Complete source closing fence: '+message);};
export function requireSynchronousSourceCallback(run){if(typeof run!=='function'||types.isProxy(run)||types.isAsyncFunction(run))fail('ordinary callback must finish synchronously');return run;}
function synchronous(value){if(types.isPromise(value)||types.isProxy(value)||value!==null&&(typeof value==='object'||typeof value==='function')&&Reflect.has(value,'then'))fail('ordinary callback/result must finish synchronously without then fields');return value;}
export function withCompleteSourceClosingFence(run,input){
 requireSynchronousSourceCallback(run);if(!Array.isArray(input)||types.isProxy(input)||Object.getPrototypeOf(input)!==Array.prototype)fail('ordinary dense closing callback array required');
 const fields=Object.getOwnPropertyDescriptors(input),length=fields.length?.value;if(!Number.isSafeInteger(length)||length<0||length>4096||Reflect.ownKeys(fields).length!==length+1)fail('bounded complete closing callback census required');const checks=[];
 for(let index=0;index<length;index++){const field=fields[index];if(!field||!Object.hasOwn(field,'value'))fail('own closing callback without accessors required');checks.push(requireSynchronousSourceCallback(field.value));}
 let primaryFailed=false;
 try{return synchronous(run());}catch(error){primaryFailed=true;throw error;}finally{
  let failed=false,closing;try{for(const check of checks)try{synchronous(check());}catch(error){if(!failed){failed=true;closing=error;}}}finally{checks.length=0;}
  if(!primaryFailed&&failed)throw closing;
 }
}
