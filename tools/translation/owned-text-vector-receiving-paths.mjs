// Receiving labels only. A path or literal module edge grants no owner proof.
import {types} from 'node:util';
export function ownedTextVectorReceivingConfiguration(input={}){
 const fail=()=>{throw new TypeError('Owned text vector receiving paths require ordinary bounded own DATA');};
 if(!input||typeof input!=='object'||types.isProxy(input)||Object.getPrototypeOf(input)!==Object.prototype)fail();
 const fields=Object.getOwnPropertyDescriptors(input),keys=Reflect.ownKeys(fields),allowed=['entry','runtimeRoot','declarationRoot'];
 if(keys.some(key=>typeof key!=='string'||!allowed.includes(key)||!Object.hasOwn(fields[key],'value')||!fields[key].enumerable))fail();
 const entry=Object.hasOwn(fields,'entry')?fields.entry.value:'src/lib.rs',runtimeRoot=Object.hasOwn(fields,'runtimeRoot')?fields.runtimeRoot.value:'runtime',declarationRoot=Object.hasOwn(fields,'declarationRoot')?fields.declarationRoot.value:runtimeRoot;
 for(const value of [entry,runtimeRoot,declarationRoot])if(typeof value!=='string'||!value||value.length>4096||value.startsWith('/')||/[\\:\x00-\x1f\x7f]/u.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail();
 if(!['src/lib.rs','src/main.rs','rust/src/lib.rs','rust/src/main.rs'].includes(entry))fail();return {entry,runtimeRoot,declarationRoot};
}
