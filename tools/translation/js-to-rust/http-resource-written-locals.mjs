// Written native source hints are proposal DATA. The complete fresh consumer
// must recheck every original annotation against its actual checked local value.
import {types} from 'node:util';
const fail=message=>{throw new TypeError('Resource original written local proposal: '+message);};
function dense(value,bound){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>bound||Reflect.ownKeys(value).length!==value.length+1)fail('bounded dense own original source rows required');const result=[];for(let at=0;at<value.length;at++){const field=Object.getOwnPropertyDescriptor(value,String(at));if(!field||!Object.hasOwn(field,'value'))fail('source row holes/accessors refused');result.push(field.value);}return result;
}
export function indexHttpResourceWrittenLocalHints(functions,annotations){
 const names=new Set(),result=new Map();for(const fn of dense(functions,4096)){if(!fn||typeof fn!=='object'||types.isProxy(fn))fail('actual original function row required');const field=Object.getOwnPropertyDescriptor(fn,'name');if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='string'||!field.value.length||names.has(field.value))fail('unique own original function names required');names.add(field.value);}
 for(const row of dense(annotations,100000)){
  if(!row||typeof row!=='object'||types.isProxy(row)||![Object.prototype,null].includes(Object.getPrototypeOf(row)))fail('ordinary original annotation data required');const actual={};for(const key of ['function','target','type']){const field=Object.getOwnPropertyDescriptor(row,key);if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='string'||!field.value.length||field.value.length>4096)fail('complete own original annotation fields required');actual[key]=field.value;}
  if(!names.has(actual.function)||!/^[_A-Za-z][_A-Za-z0-9]*$/u.test(actual.target))fail('the actual original function and renamed local are required');if(!result.has(actual.function))result.set(actual.function,new Map());const locals=result.get(actual.function);if(locals.has(actual.target))fail('one actual written source obligation per original local required');locals.set(actual.target,{type:actual.type,target:actual.target,sourceAuthority:false,semanticAuthority:false});
 }
 return result;
}
