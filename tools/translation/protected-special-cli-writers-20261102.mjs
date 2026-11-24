// Original special CLI loops, payload timing and missing-output domains. UNRUN.
import {writeFileSync,realpathSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {withProtectedPreparerWriter} from './protected-preparer-writers-20261102.mjs';
import {withProtectedNativeSourceAdmission,allowProtectedNativeContainedDirectWrites,mutateProtectedNativeContainedDirectWriter} from './protected-native-writers-20261102.mjs';
// The invocation-local set is fixed mutation-intent DATA, never a cached verdict.
// Every actual write re-admits the captured target through the original policy.
export function withProtectedSpecialCliWriter(root,operation){return withProtectedPreparerWriter(root,()=>{
 const declared=new Set(),canonical=realpathSync(resolve(root));let active=true;const live=()=>{if(!active)throw new TypeError('Expired special CLI writer object');};
 const scope=Object.freeze({
  preflight(paths){live();return withProtectedNativeSourceAdmission(root,()=>{let batch=[],bytes=0;const flush=()=>{if(batch.length){allowProtectedNativeContainedDirectWrites(root,batch);for(const target of batch)declared.add(target);batch=[];bytes=0;}};for(const path of paths){const target=resolve(root,path),size=Buffer.byteLength(target)+Buffer.byteLength(resolve(canonical,relative(resolve(root),target)))+Buffer.byteLength(relative(resolve(root),target))+96;if(batch.length&&(batch.length===1024||bytes+size>1048576))flush();batch.push(target);bytes+=size;}flush();});},
  write(path,after){live();const target=withProtectedNativeSourceAdmission(root,()=>{const target=resolve(root,path);if(!declared.has(target))throw new TypeError('Actual special CLI write must be in complete preflight intents');return target;});return mutateProtectedNativeContainedDirectWriter(root,[target],captured=>writeFileSync(captured[0].canonicalTarget,after));},
 });
 try{return withProtectedNativeSourceAdmission(root,()=>operation(scope));}finally{active=false;declared.clear();}
 });}
