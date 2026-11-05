// Fixed actual lease callbacks. No caller-provided scope can grant mutation.
import fs from 'node:fs';
import {resolve,join} from 'node:path';
import {types} from 'node:util';
import {withProtectedNativeAsyncWriter} from './protected-reviewed-adoption-20261102.mjs';
import {captureProtectedRecursiveParentSnapshot,inspectProtectedRecursiveParents} from './protected-recursive-cli-writers-20261103.mjs';
function preflight(lease,targets){let batch=[],bytes=0;const flush=()=>{if(batch.length){lease.preflightDirect(batch);batch=[];bytes=0;}};for(const target of targets){const absolute=resolve(target),size=3*Buffer.byteLength(absolute)+96;if(batch.length&&(batch.length===1024||bytes+size>1048576))flush();batch.push(absolute);bytes+=size;}flush();}
function write(lease,target,value,options){const absolute=resolve(target);return lease.direct([absolute],captured=>options===undefined?fs.writeFileSync(captured[0].canonicalTarget,value):fs.writeFileSync(captured[0].canonicalTarget,value,options));}
function mkdir(lease,directory,options){
 const absolute=resolve(directory),snapshot=lease.source(()=>captureProtectedRecursiveParentSnapshot(lease.root,join(absolute,'__fixed_directory_observation__'))),targets=options?.recursive?snapshot.missing:[snapshot.parent];
 return lease.entries(targets,()=>{
  lease.source(()=>inspectProtectedRecursiveParents(snapshot,false));let result,failed=false,primary;
  try{result=fs.mkdirSync(snapshot.parent,options);}catch(error){failed=true;primary=error;}
  try{lease.source(()=>inspectProtectedRecursiveParents(snapshot,true));}catch(error){if(!failed){failed=true;primary=error;}else try{process.stderr.write('{"schema":"protected-trial-vector-parent-closing-20261103","closingFailed":true}\n');}catch{}}
  if(failed)throw primary;return result;
 });
}
export function withProtectedTrialVectorWriter(root,operation){
 if(typeof operation!=='function'||types.isProxy(operation))throw new TypeError('Fixed trial/vector source writer operation required');
 return withProtectedNativeAsyncWriter(root,async lease=>{
  const scope=Object.freeze({root:lease.root,retainedBytes:lease.retainedBytes,verify:()=>lease.verify(),
   preflightFiles:targets=>preflight(lease,targets),preflightEntries:targets=>lease.preflightEntries(targets),
   direct:(targets,callback)=>lease.direct(targets,callback),entries:(targets,callback)=>lease.entries(targets,callback),
   descriptor:(fd,callback)=>lease.descriptor(fd,callback),withOpen:(target,flags,mode,callback)=>lease.withOpen(target,flags,mode,callback),
   write:(target,value,options)=>write(lease,target,value,options),mkdir:(directory,options)=>mkdir(lease,directory,options),
  });
  return operation(scope);
 });
}
