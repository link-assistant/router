import {captureActiveNativeSourceVetoLease} from './protected-native-writers-20261102.mjs';
import {captureAbsoluteNativeMutationTargets} from './protected-external-mutations-20261102-addresses.mjs';
import {captureProtectedNativeDescriptorNumbers} from './protected-preparer-writers-20261102-alias.mjs';
// Async operational source veto for reviewed adoption. No native authority.
import {AsyncLocalStorage} from 'node:async_hooks';
import {realpathSync,openSync,closeSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {types} from 'node:util';
import {captureExplicitSourceMutationPolicy} from './unit-runtime-materialization.mjs';
const contexts=new AsyncLocalStorage();
const fail=message=>{throw new TypeError('Protected reviewed adoption: '+message);};
function secondary(){try{process.stderr.write('{"schema":"protected-reviewed-adoption-closing-20261102","closingFailed":true}\n');}catch{}}
function poison(frame,error){for(let current=frame;current;current=current.parent)if(!current.failed){current.failed=true;current.primary=error;}}
function checkPolicy(frame){let failed=frame.failed,primary=frame.primary;for(const check of [()=>{if(frame.closed)fail('expired source operation');},()=>frame.policy.verify()])try{check();}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;}
function verify(frame){try{checkPolicy(frame);}catch(error){poison(frame,error);throw error;}}
function admit(frame,operation){try{verify(frame);return operation();}catch(error){poison(frame,error);throw error;}}
function current(){const context=contexts.getStore();if(!context||!context.active)fail('expired or missing async reviewed source operation');verify(context.frame);return context.frame;}
function ordinaryTarget(frame,target){if(typeof target!=='string'||!isAbsolute(target))fail('captured primitive absolute destination required');const actual=resolve(target),name=relative(frame.root,actual);if(!name||isAbsolute(name)||name==='..'||name.startsWith('..'+sep))fail('source destination must remain inside original physical root');return name.split(sep).join('/');}
function around(frame,operation){let result,failed=false,primary;try{verify(frame);result=operation();if(types.isPromise(result))fail('primitive filesystem operation must be synchronous');}catch(error){failed=true;primary=error;}try{checkPolicy(frame);}catch(error){poison(frame,error);if(!failed){failed=true;primary=error;}else secondary();}if(failed)throw primary;return result;}
function externalTarget(frame,target){if(typeof target!=='string'||!isAbsolute(target))fail('captured primitive external destination required');const full=resolve(target),name=relative(frame.root,full);if(!name||!isAbsolute(name)&&name!=='..'&&!name.startsWith('..'+sep))fail('original external evidence must stay outside source root');return full;}
function staged(frame,targets,operation){return around(frame,()=>{const captured=admit(frame,()=>{const paths=targets.map(target=>externalTarget(frame,target));return frame.policy.allowNativeMutationPaths({root:frame.root,targets:paths});});return operation(...captured.map(row=>row.canonicalTarget));});}
function scope(context){const frame=context.frame,live=()=>{if(!context.active)fail('expired async reviewed writer object');};return Object.freeze({root:frame.root,retainedBytes:frame.policy.retainedBytes,verify:()=>{live();return verify(frame);},
 preflight(targets){live();return around(frame,()=>admit(frame,()=>{let batch=[],bytes=0;const flush=()=>{if(batch.length){frame.policy.allowNativeMutationPaths({root:frame.root,targets:batch});batch=[];bytes=0;}};for(const target of targets){ordinaryTarget(frame,target);const size=2*Buffer.byteLength(target)+Buffer.byteLength(relative(frame.root,target))+96;if(batch.length&&(batch.length===1024||bytes+size>1048576))flush();batch.push(target);bytes+=size;}flush();}));},
 replace(pending,target,operation){live();return around(frame,()=>{const captured=admit(frame,()=>{ordinaryTarget(frame,target);return frame.policy.allowNativeMutationPaths({root:frame.root,targets:[externalTarget(frame,pending),target]});});return operation(captured[0].canonicalTarget,captured[1].canonicalTarget);});},
 external(target,operation){live();return staged(frame,[target],operation);},
 });}
export function withReviewedAdoptionOutside(target,operation){const frame=current();return around(frame,()=>{const actual=admit(frame,()=>externalTarget(frame,target));return operation(actual);});}
export function guardReviewedAdoptionExternal(target,operation){return staged(current(),[target],operation);}
export function guardReviewedAdoptionStaged(targets,operation){return staged(current(),targets,operation);}
export function openReviewedAdoptionDescriptor(target,flags,mode){const frame=current(),captured=admit(frame,()=>{if(flags!=='wx'&&flags!=='a')fail('original fixed reviewed writer open flags required');return frame.policy.allowNativeDirectWrites({root:frame.root,targets:[externalTarget(frame,target)]})[0].canonicalTarget;});let fd,acquired=false;try{return around(frame,()=>{fd=mode===undefined?openSync(captured,flags):openSync(captured,flags,mode);acquired=true;admit(frame,()=>frame.policy.allowNativeDirectWrites({root:frame.root,targets:[],descriptors:[fd]}));return fd;});}catch(primary){if(acquired)try{closeSync(fd);}catch(error){secondary();}throw primary;}}
export function guardReviewedAdoptionDescriptor(target,fd,operation){const frame=current();return around(frame,()=>{admit(frame,()=>{externalTarget(frame,target);frame.policy.allowNativeDirectWrites({root:frame.root,targets:[],descriptors:[fd]});});return operation(fd);});}
export function withReviewedAdoptionClosing(operation,close){let result,failed=false,primary;try{result=operation();}catch(error){failed=true;primary=error;}try{close();}catch(error){if(failed)secondary();else{failed=true;primary=error;}}if(failed)throw primary;return result;}
export function reviewedAdoptionRetainedPolicyBytes(){return current().policy.retainedBytes;}
async function withReviewedSourceContext(root,operation,makeScope,poisonOperationFailure){
 const previous=contexts.getStore(),parent=previous?.active?previous.frame:null;let actual;try{actual=realpathSync(resolve(root));}catch(error){if(parent)poison(parent,error);throw error;}let count=0,shared=null;for(let prior=parent;prior;prior=prior.parent){count+=prior.depth;verify(prior);if(prior.root===actual&&!shared)shared=prior;}if(count>=64){const error=new TypeError('Protected reviewed adoption: bounded complete async operation nesting');if(parent)poison(parent,error);throw error;}
 const owner=shared===null;let frame;try{frame=shared??{root:actual,policy:captureExplicitSourceMutationPolicy(actual),parent,failed:false,primary:undefined,closed:false,depth:0,nativeDepth:0};}catch(error){if(parent)poison(parent,error);throw error;}let result,failed=false,primary;const context={frame,active:true,parentContext:previous?.active?previous:null,children:0};if(context.parentContext)context.parentContext.children++;frame.depth++;
 try{verify(frame);result=await contexts.run(context,()=>operation(makeScope(context)));verify(frame);if(context.children!==0)admit(frame,()=>fail('unjoined nested source context'));if(owner&&frame.depth!==1)admit(frame,()=>fail('unjoined nested source operation'));}catch(error){failed=true;primary=error;if(poisonOperationFailure)poison(frame,error);}
 // Every owner attempts both checks, even after an exact falsy/frozen primary.
 const checks=[()=>{context.active=false;},()=>verify(frame),...(owner?[()=>{try{frame.policy.close();}finally{frame.closed=true;}}]:[])];for(const check of checks)try{check();}catch(error){if(!failed){failed=true;primary=error;}else secondary();}
 frame.depth--;if(context.parentContext){context.parentContext.children--;context.parentContext=null;}if(failed)throw primary;return result;
}

// Existing exported operation always selects its original outside-only scope
// and original public-boundary failure behavior. No caller can select policy.
export async function withProtectedReviewedAdoption(root,operation){return withReviewedSourceContext(root,operation,scope,true);}

function nativeResult(value){
 if(types.isPromise(value))fail('native mutation callback must complete synchronously');
 if(value&&(typeof value==='object'||typeof value==='function')){let at=value,depth=0;for(;at!==null;at=Object.getPrototypeOf(at)){if(types.isProxy(at))fail('native mutation result/prototype proxy refused');if(++depth>64)fail('bounded native result prototype chain');const then=Object.getOwnPropertyDescriptor(at,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('native mutation thenable/accessor refused');}}
 return value;
}
function nativeCallback(operation){if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))fail('fixed synchronous native mutation callback required');}
function nativeFrames(frame){const rows=[],seen=new Set();const collect=start=>{for(let current=start;current;current=current.parent)if(!seen.has(current)){seen.add(current);rows.push(current);}};collect(frame);let present=contexts.getStore(),depth=0;for(;present&&present.active;present=present.parentContext){if(++depth>64)fail('bounded current async context ancestry');collect(present.frame);}if(rows.length>128)fail('bounded retained/current async root union');return rows;}
function observeNativeRoots(frame,borrowed,failed=false,primary){
 let sourceFailed=false,sourcePrimary;
 const note=error=>{if(!sourceFailed){sourceFailed=true;sourcePrimary=error;}if(!failed){failed=true;primary=error;}else secondary();};
 for(const current of nativeFrames(frame))for(const check of [()=>{if(current.failed)throw current.primary;if(current.closed)fail('closed native async source frame');},()=>current.policy.verify()])try{check();}catch(error){note(error);}
 try{borrowed.verify();}catch(error){note(error);}
 if(sourceFailed){for(const current of nativeFrames(frame))poison(current,sourcePrimary);try{borrowed.source(()=>{throw sourcePrimary;});}catch(error){if(!failed){failed=true;primary=error;}else secondary();}}return {failed,primary};
}
function nativeTargets(frame,borrowed,targets,descriptors,direct){
 let captured,stable,fds,failed=false,primary;
 try{captured=captureAbsoluteNativeMutationTargets({requestedRoot:frame.root,canonicalRoot:frame.root,targets});stable=Object.freeze(captured.map(row=>row.canonicalTarget));fds=direct?Object.freeze(captureProtectedNativeDescriptorNumbers(descriptors)):[];}catch(error){failed=true;primary=error;poison(frame,error);}
 if(!failed){for(const current of nativeFrames(frame))try{if(direct==='stream')current.policy.allowNativeStreamWrites({root:current.root,descriptors:fds});else if(direct)current.policy.allowNativeDirectWrites({root:current.root,targets:stable,descriptors:fds});else current.policy.allowNativeMutationPaths({root:current.root,targets:stable});}catch(error){if(!failed){failed=true;primary=error;}else secondary();}
  try{if(direct==='stream')borrowed.streams(frame.root,fds);else if(direct)borrowed.direct(frame.root,stable,fds);else borrowed.entries(frame.root,stable);}catch(error){if(!failed){failed=true;primary=error;}else secondary();}
  if(failed)for(const current of nativeFrames(frame))poison(current,primary);
 }
 const observed=observeNativeRoots(frame,borrowed,failed,primary);if(observed.failed)throw observed.primary;return captured;
}
function nativeMutation(frame,borrowed,targets,descriptors,direct,operation){
 let captured,value,failed=false,primary;
 try{admit(frame,()=>nativeCallback(operation));captured=nativeTargets(frame,borrowed,targets,descriptors,direct);}catch(error){const observed=observeNativeRoots(frame,borrowed,true,error);throw observed.primary;}
 try{value=operation(captured);}catch(error){failed=true;primary=error;}
 if(!failed)try{admit(frame,()=>nativeResult(value));}catch(error){failed=true;primary=error;}
 const observed=observeNativeRoots(frame,borrowed,failed,primary);if(observed.failed)throw observed.primary;return value;
}
function nativeScope(context,borrowed){
 let frame=context.frame,ownerContext=context,vetoLease=borrowed,live=true;
 const alive=()=>{if(!live||!ownerContext.active)fail('expired general native async lease');let current=contexts.getStore(),count=0,found=false;for(;current;current=current.parentContext){if(++count>64)fail('bounded native invocation ancestry');if(!current.active)fail('expired native ancestor invocation');if(current===ownerContext)found=true;}if(!found)fail('general native lease belongs to another async invocation');};
 const enter=()=>{alive();const count=nativeFrames(frame).reduce((sum,current)=>sum+(current.nativeDepth??0),0);try{admit(frame,()=>{if(count>=64)fail('bounded complete native async operation nesting');});}catch(error){const observed=observeNativeRoots(frame,vetoLease,true,error);throw observed.primary;}frame.nativeDepth=(frame.nativeDepth??0)+1;const retainedFrame=frame;return ()=>{retainedFrame.nativeDepth--;};};
 const act=operation=>{const leave=enter();try{return operation();}finally{leave();}};
 const verify=()=>act(()=>{const observed=observeNativeRoots(frame,vetoLease);if(observed.failed)throw observed.primary;});
 const lease=Object.freeze({root:frame.root,retainedBytes:frame.policy.retainedBytes,
  verify,
  source(operation){return act(()=>{verify();let value,failed=false,primary;try{value=admit(frame,()=>{nativeCallback(operation);return nativeResult(operation());});}catch(error){failed=true;primary=error;}const observed=observeNativeRoots(frame,vetoLease,failed,primary);if(observed.failed)throw observed.primary;return value;});},
  async sourceAsync(operation){const leave=enter(),sourceContext=ownerContext;sourceContext.children++;try{verify();let value,failed=false,primary;try{if(typeof operation!=='function'||types.isProxy(operation))fail('fixed async source operation required');value=await operation();}catch(error){failed=true;primary=error;}alive();if(failed)poison(frame,primary);const observed=observeNativeRoots(frame,vetoLease,failed,primary);if(observed.failed)throw observed.primary;return value;}finally{sourceContext.children--;leave();}},
  preflightDirect(targets){return act(()=>nativeTargets(frame,vetoLease,targets,[],true));},
  preflightEntries(targets){return act(()=>nativeTargets(frame,vetoLease,targets,[],false));},
  direct(targets,operation){return act(()=>nativeMutation(frame,vetoLease,targets,[],true,operation));},
  entries(targets,operation){return act(()=>nativeMutation(frame,vetoLease,targets,[],false,operation));},
  descriptor(fd,operation){return act(()=>{try{admit(frame,()=>nativeCallback(operation));}catch(error){const observed=observeNativeRoots(frame,vetoLease,true,error);throw observed.primary;}return nativeMutation(frame,vetoLease,[],[fd],true,()=>operation(fd));});},
  streamDescriptor(fd,operation){return act(()=>{try{admit(frame,()=>nativeCallback(operation));}catch(error){const observed=observeNativeRoots(frame,vetoLease,true,error);throw observed.primary;}return nativeMutation(frame,vetoLease,[],[fd],'stream',()=>operation(fd));});},
  withOpen(target,flags,mode,operation){return act(()=>{
   let fd,acquired=false,value,failed=false,primary;
   try{admit(frame,()=>nativeCallback(operation));const captured=nativeTargets(frame,vetoLease,[target],[],true);fd=mode===undefined?openSync(captured[0].canonicalTarget,flags):openSync(captured[0].canonicalTarget,flags,mode);acquired=true;
    // A successful open is owned immediately. Every post-open admission/check
    // happens before handing the primitive FD to the original fixed callback.
    nativeTargets(frame,vetoLease,[],[fd],true);verify();value=lease.descriptor(fd,operation);
   }catch(error){failed=true;primary=error;}
   // close never needs source permission. Always close the acquired FD once,
   // even after an exact falsy/frozen source/admission/callback failure.
   if(acquired)try{closeSync(fd);}catch(error){poison(frame,error);if(!failed){failed=true;primary=error;}else secondary();}
   const observed=observeNativeRoots(frame,vetoLease,failed,primary);if(observed.failed)throw observed.primary;return value;
  });},
 });
 const expire=()=>{live=false;frame=null;ownerContext=null;vetoLease=null;};
 return {lease,expire,close(failed,primary){try{return observeNativeRoots(frame,vetoLease,failed,primary);}catch(error){poison(frame,error);try{vetoLease.source(()=>{throw error;});}catch(closing){secondary();}if(!failed){failed=true;primary=error;}else secondary();return {failed,primary};}finally{expire();}}};
}
export async function withProtectedNativeAsyncWriter(root,operation){
 if(typeof operation!=='function'||types.isProxy(operation))fail('fixed general native async operation required');
 const borrowed=captureActiveNativeSourceVetoLease();let holder,result,failed=false,primary;
 try{const prior=contexts.getStore();if(prior?.active){const observed=observeNativeRoots(prior.frame,borrowed);if(observed.failed)throw observed.primary;}result=await withReviewedSourceContext(root,async value=>{let result,failed=false,primary;try{value.lease.verify();result=await operation(value.lease);}catch(error){failed=true;primary=error;}const observed=value.close(failed,primary);if(observed.failed)throw observed.primary;return result;},context=>{holder=nativeScope(context,borrowed);return holder;},false);}catch(error){failed=true;primary=error;if(!holder)try{borrowed.source(()=>{throw error;});}catch(closing){secondary();}}
 // The shared context attempts its owner policy close; independently attempt
 // borrowed synchronous roots even when the shared owner has already failed.
 if(holder)holder.expire();try{borrowed.close();}catch(error){if(!failed){failed=true;primary=error;}else secondary();}if(failed)throw primary;return result;
}
