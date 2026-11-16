// Fixed independent per-process capture. No caller can replace executable root.
import fs from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {withProtectedNativeAsyncWriter} from './protected-reviewed-adoption-20261102.mjs';
import {captureExplicitSourceMutationPolicy} from './unit-runtime-materialization.mjs';
import {captureProtectedRecursiveParentSnapshot,inspectProtectedRecursiveParents} from './protected-recursive-cli-writers-20261103.mjs';
const EXECUTABLE_ROOT=fileURLToPath(new URL('../../',import.meta.url));
function diagnostic(){try{process.stderr.write('{"schema":"protected-node-evidence-closing-20261103","closingFailed":true}\n');}catch{}}
function choosePrimary(state,error){if(!state.failed){state.failed=true;state.primary=error;}else diagnostic();}
function preflight(lease,targets){let batch=[];for(const target of targets){batch.push(resolve(target));if(batch.length===256){lease.preflightDirect(batch);batch=[];}}if(batch.length)lease.preflightDirect(batch);}
function mkdir(lease,directory,options){const absolute=resolve(directory),snapshot=lease.source(()=>captureProtectedRecursiveParentSnapshot(lease.root,join(absolute,'__fixed_node_directory_observation__'))),targets=options?.recursive?snapshot.missing:[snapshot.parent];return lease.entries(targets,()=>{lease.source(()=>inspectProtectedRecursiveParents(snapshot,false));const state={failed:false};let value;try{value=fs.mkdirSync(snapshot.parent,options);}catch(error){choosePrimary(state,error);}try{lease.source(()=>inspectProtectedRecursiveParents(snapshot,true));}catch(error){choosePrimary(state,error);}if(state.failed)throw state.primary;return value;});}
async function runner(lease,operation){
 let active=true;const owned=new Map(),live=()=>{if(!active)throw Error('Node evidence writer expired');},required=fd=>{live();if(!owned.has(fd))throw Error('Node evidence descriptor is not owned');};
 const close=fd=>{required(fd);owned.delete(fd);const result={failed:false};try{lease.verify();}catch(error){choosePrimary(result,error);}try{fs.closeSync(fd);}catch(error){choosePrimary(result,error);try{lease.source(()=>{throw error;});}catch{}}try{lease.verify();}catch(error){choosePrimary(result,error);}if(result.failed)throw result.primary;};
 const open=(target,flags,mode)=>{live();const absolute=resolve(target);let fd,acquired=false;try{lease.direct([absolute],rows=>{fd=fs.openSync(rows[0].canonicalTarget,flags,mode);acquired=true;owned.set(fd,rows[0].canonicalTarget);lease.descriptor(fd,()=>{});});return fd;}catch(primary){if(acquired&&owned.has(fd))try{close(fd);}catch{diagnostic();}throw primary;}};
 const scope=Object.freeze({root:lease.root,retainedBytes:lease.retainedBytes,
  verify(){live();return lease.verify();},source(operation){live();return lease.source(operation);},sourceAsync(operation){live();return lease.sourceAsync(operation);},
  preflightFiles(targets){live();return preflight(lease,targets);},entries(targets,operation){live();return lease.entries(targets,operation);},
  mkdir(directory,options){live();return mkdir(lease,directory,options);},
  open,close,descriptor(fd,operation){required(fd);return lease.descriptor(fd,operation);},
  write(target,value,options){live();const absolute=resolve(target);return lease.withOpen(absolute,options?.flag??'w',options?.mode,fd=>fs.writeFileSync(fd,value));},
 });
 const state={failed:false};let value;
 try{value=await operation(scope);}catch(error){choosePrimary(state,error);}
 finally{for(const fd of [...owned.keys()])try{close(fd);}catch(error){choosePrimary(state,error);}active=false;owned.clear();}
 if(state.failed)throw state.primary;return value;
}
export function withProtectedNodeRunnerWriter(requestRoot,operation){
 const executable=fs.realpathSync(EXECUTABLE_ROOT),selected=fs.realpathSync(resolve(requestRoot));
 return withProtectedNativeAsyncWriter(executable,async first=>selected===executable?runner(first,operation):withProtectedNativeAsyncWriter(selected,second=>runner(Object.freeze({...second,retainedBytes:first.retainedBytes+second.retainedBytes}),operation)));
}
// Reporter generator owns this independent snapshot across its original yields.
// It does not inherit a parent's ALS frame or accept a supplied policy object.
export function captureProtectedNodeReporterWriter(requestRoot){
 const roots=[fs.realpathSync(EXECUTABLE_ROOT),fs.realpathSync(resolve(requestRoot))],policies=[],state={failed:false};let active=true,sourceFailed=false,sourcePrimary;
 const poison=error=>{if(!sourceFailed){sourceFailed=true;sourcePrimary=error;}};
 const verifyAll=()=>{const result={failed:false};if(!active)throw Error('Node reporter writer expired');if(sourceFailed)choosePrimary(result,sourcePrimary);for(const item of policies)try{item.policy.verify();}catch(error){poison(error);choosePrimary(result,error);}if(result.failed)throw result.primary;};
 try{for(const root of new Set(roots))policies.push({root,policy:captureExplicitSourceMutationPolicy(root)});}catch(error){choosePrimary(state,error);}
 if(state.failed){for(const item of policies)try{item.policy.close();}catch{diagnostic();}active=false;throw state.primary;}
 const around=operation=>{const result={failed:false};let value;try{verifyAll();value=operation();}catch(error){choosePrimary(result,error);}try{verifyAll();}catch(error){choosePrimary(result,error);}if(result.failed)throw result.primary;return value;};
 const admit=(target,descriptors=[])=>{const result={failed:false};for(const item of policies)try{item.policy.allowNativeDirectWrites({root:item.root,targets:target===null?[]:[target],descriptors});}catch(error){poison(error);choosePrimary(result,error);}if(result.failed)throw result.primary;};
 return Object.freeze({verify:verifyAll,retainedBytes:policies.reduce((sum,item)=>sum+item.policy.retainedBytes,0),
  write(target,value){const absolute=resolve(target);return around(()=>{admit(absolute);let fd,opened=false;const result={failed:false};try{fd=fs.openSync(absolute,'wx',0o600);opened=true;admit(absolute,[fd]);fs.writeFileSync(fd,value);}catch(error){choosePrimary(result,error);}finally{if(opened)try{fs.closeSync(fd);}catch(error){poison(error);choosePrimary(result,error);}}if(result.failed)throw result.primary;});},
  close(){if(!active)throw Error('Node reporter writer expired');const result={failed:false};try{verifyAll();}catch(error){choosePrimary(result,error);}for(const item of policies)try{item.policy.close();}catch(error){poison(error);choosePrimary(result,error);}active=false;policies.length=0;if(result.failed)throw result.primary;},
 });
}
