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
function around(frame,operation){let result,failed=false,primary;try{verify(frame);result=operation();if(types.isPromise(result))fail('primitive filesystem operation must be synchronous');}catch(error){failed=true;primary=error;}try{checkPolicy(frame);}catch(error){poison(frame,failed?primary:error);if(!failed){failed=true;primary=error;}else secondary();}if(failed)throw primary;return result;}
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
export async function withProtectedReviewedAdoption(root,operation){
 const previous=contexts.getStore(),parent=previous?.active?previous.frame:null;let actual;try{actual=realpathSync(resolve(root));}catch(error){if(parent)poison(parent,error);throw error;}let count=0,shared=null;for(let prior=parent;prior;prior=prior.parent){count+=prior.depth;verify(prior);if(prior.root===actual&&!shared)shared=prior;}if(count>=64){const error=new TypeError('Protected reviewed adoption: bounded complete async operation nesting');if(parent)poison(parent,error);throw error;}
 const owner=shared===null;let frame;try{frame=shared??{root:actual,policy:captureExplicitSourceMutationPolicy(actual),parent,failed:false,primary:undefined,closed:false,depth:0};}catch(error){if(parent)poison(parent,error);throw error;}let result,failed=false,primary;const context={frame,active:true};frame.depth++;
 try{verify(frame);result=await contexts.run(context,()=>operation(scope(context)));verify(frame);if(owner&&frame.depth!==1)fail('unjoined nested source operation');}catch(error){failed=true;primary=error;poison(frame,error);}
 // Every owner attempts both checks, even after an exact falsy/frozen primary.
 const checks=[()=>{context.active=false;},()=>verify(frame),...(owner?[()=>{try{frame.policy.close();}finally{frame.closed=true;}}]:[])];for(const check of checks)try{check();}catch(error){if(!failed){failed=true;primary=error;}else secondary();}
 frame.depth--;if(failed)throw primary;return result;
}
