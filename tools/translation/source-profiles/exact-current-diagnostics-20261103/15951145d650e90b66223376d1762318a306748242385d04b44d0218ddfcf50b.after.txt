import {emitProtectedSourceDiagnostic,retainProtectedSourceDiagnostic} from './protected-source-diagnostics-20261103.mjs';
import {captureProtectedNativeDescriptorNumbers} from './protected-preparer-writers-20261102-alias.mjs';
import {captureAbsoluteNativeMutationTargets} from './protected-external-mutations-20261102-addresses.mjs';
// Operational source-mutation veto only. Never parser/compiler/type/owner proof.
import fs from 'node:fs';
import {resolve} from 'node:path';
import {types} from 'node:util';
import {captureExplicitSourceMutationPolicy} from './unit-runtime-materialization.mjs';
import {requireReconcile as need, RECONCILE_LIMITS} from './paired-sync-reconcile-20261101-support.mjs';
let active = null, operationDepth = 0;
function secondary(primary, error) {
  retainProtectedSourceDiagnostic('Native writer closing failure',{primary,secondary:error});
  if (primary !== null && (typeof primary === 'object' || typeof primary === 'function')) {
    try { Object.defineProperty(primary, 'protectedNativeWriterClosingFailure', {value: error, enumerable: true}); return; } catch {}
  }
  try { emitProtectedSourceDiagnostic('{"schema":"protected-native-writer-closing-20261102","closingFailed":true}\n',{primary,secondary:error}); } catch {}
}
function assertNativeSourceFramesHealthy(){for(let current=active;current;current=current.parent)if(current.sourceFailed)throw current.sourcePrimary;}
function healthyNativeSourceFrame(current){if(current.sourceFailed)throw current.sourcePrimary;current.policy.verify();}
function closeNativeSourceFrame(current,primaryFailed,primary){let failed=false,first;for(const check of [()=>healthyNativeSourceFrame(current),()=>current.policy.close()])try{check();}catch(error){if(primaryFailed)secondary(primary,error);else if(!failed){failed=true;first=error;}else secondary(first,error);}if(!primaryFailed&&failed)throw first;}
// Only revokes actual active frames; no source/native permission can be issued.
export function withProtectedNativeSourceAdmission(root,operation){
 let current,value,failed=false,primary;try{current=frame(root);healthyNativeSourceFrame(current);value=invoke(operation);}catch(error){failed=true;primary=error;}
 if(current)for(const check of [()=>healthyNativeSourceFrame(current),()=>current.policy.verify()])try{check();}catch(error){if(failed)secondary(primary,error);else{failed=true;primary=error;}}
 if(failed){for(let frame=active;frame;frame=frame.parent)if(!frame.sourceFailed){frame.sourceFailed=true;frame.sourcePrimary=primary;}throw primary;}return value;
}
function invoke(operation) {
  need(typeof operation === 'function' && !types.isProxy(operation) && !types.isAsyncFunction(operation), 'synchronous fixed writer operation required');
  const result = operation();
  need(!types.isPromise(result), 'writer operation must complete synchronously');
  if (result && (typeof result === 'object' || typeof result === 'function')) {
    need(!types.isProxy(result), 'writer result proxy refused');
    const then = Object.getOwnPropertyDescriptor(result, 'then');
    need(!then || Object.hasOwn(then, 'value') && typeof then.value !== 'function', 'writer thenable/accessor refused');
  }
  return result;
}
function frame(root) {
  assertNativeSourceFramesHealthy();const actual = fs.realpathSync(resolve(root));
  for (let current = active; current; current = current.parent) if (current.root === actual) return current;
  need(false, 'actual source mutation requires its active fixed policy operation');
}
function withProtectedNativeWriterBody(root, operation) {
  assertNativeSourceFramesHealthy();root = fs.realpathSync(resolve(root));
  for (let current = active; current; current = current.parent) if (current.root === root) {
    healthyNativeSourceFrame(current);need(current.depth<64,'protected native writer nesting bound');current.depth++;let failed = false, primary;
    try { return invoke(operation); } catch (error) { failed = true; primary = error; throw error; }
    finally { current.depth--;try { healthyNativeSourceFrame(current); } catch (error) { if (failed) secondary(primary, error); else throw error; } }
  }
  const policy = captureExplicitSourceMutationPolicy(root), parent = active;
  const current = {root, policy, parent,depth:0,sourceFailed:false,sourcePrimary:undefined}; active = current;
  let failed = false, primary;
  try {
    need(Number.isSafeInteger(policy.retainedBytes) && policy.retainedBytes >= 0 && policy.retainedBytes <= RECONCILE_LIMITS.raw,
      'complete policy retention exceeds original writer raw bound');
    return invoke(operation);
  } catch (error) { failed = true; primary = error; throw error; }
  finally {
    try { closeNativeSourceFrame(current,failed,primary); }
    finally { active = parent; }
  }
}
export function verifyProtectedNativeWriter(root) { healthyNativeSourceFrame(frame(root)); }
export function protectedNativeWriterRetainedBytes(root) { return frame(root).policy.retainedBytes; }
export function allowProtectedNativeWriter(root, outputs) { return withProtectedNativeSourceAdmission(root,()=>frame(root).policy.allow({root,outputs})); }
export function mutateProtectedNativeWriter(root, outputs, operation) {
  const current = frame(root); allowProtectedNativeWriter(root,outputs); healthyNativeSourceFrame(current);
  let failed = false, primary;
  try { return invoke(operation); } catch (error) { failed = true; primary = error; throw error; }
  finally { try { healthyNativeSourceFrame(current); } catch (error) { if (failed) secondary(primary, error); else throw error; } }
}

// Bound the complete synchronous call chain, including distinct project roots.
export function withProtectedNativeWriter(root,operation){
 need(operationDepth<64,'complete protected native writer nesting bound');operationDepth++;
 try{return withProtectedNativeWriterBody(root,operation);}finally{operationDepth--;}
}

// Actual in-place creation/truncation additionally checks physical aliases.
export function allowProtectedNativeDirectWrites(root,outputs){return withProtectedNativeSourceAdmission(root,()=>frame(root).policy.allowDirectWrites({root,outputs}));}
export function mutateProtectedNativeDirectWriter(root,outputs,operation){
 allowProtectedNativeDirectWrites(root,outputs);return mutateProtectedNativeWriter(root,outputs,operation);
}

// Captured native target DATA reaches the actual callback, never ordinary labels.
export function allowProtectedNativeContainedDirectWrites(root,targets){return withProtectedNativeSourceAdmission(root,()=>frame(root).policy.allowContainedDirectWrites({root,targets}));}
export function mutateProtectedNativeContainedDirectWriter(root,targets,operation){
 need(typeof operation==='function'&&!types.isProxy(operation)&&!types.isAsyncFunction(operation),'synchronous fixed native target operation required');
 const current=frame(root),captured=allowProtectedNativeContainedDirectWrites(root,targets);healthyNativeSourceFrame(current);let failed=false,primary;
 try{return invoke(()=>operation(captured));}catch(error){failed=true;primary=error;throw error;}
 finally{try{healthyNativeSourceFrame(current);}catch(error){if(failed)secondary(primary,error);else throw error;}}
}

// Additive synchronous bridge to the same fixed private policy. Ordinary and
// contained source APIs above keep their complete original value contracts.
function admitProtectedNativeAbsolute(root,targets,direct){return withProtectedNativeSourceAdmission(root,()=>{
 const selected=frame(root),addresses=captureAbsoluteNativeMutationTargets({requestedRoot:root,canonicalRoot:selected.root,targets}),stable=Object.freeze(addresses.map(row=>row.canonicalTarget));let result,failed=false,primary;
 // Native absolute targets can reach another active root. Every active policy
 // is an operational veto, including outer roots; none grants permission.
 for(let current=active;current;current=current.parent)try{const captured=direct?current.policy.allowNativeDirectWrites({root:current.root,targets:stable}):current.policy.allowNativeMutationPaths({root:current.root,targets:stable});if(current===selected)result=captured;}catch(error){if(!failed){failed=true;primary=error;}else secondary(primary,error);}
 if(failed)throw primary;return result;
});}
export function allowProtectedNativeAbsoluteDirectWrites(root,targets){return admitProtectedNativeAbsolute(root,targets,true);}
export function allowProtectedNativeAbsoluteMutationPaths(root,targets){return admitProtectedNativeAbsolute(root,targets,false);}
function observeProtectedNativeAbsoluteFrames(failed=false,primary){
 let sourceFailed=false,sourcePrimary;
 for(let current=active;current;current=current.parent)for(const check of [()=>{if(current.sourceFailed)throw current.sourcePrimary;},()=>current.policy.verify()])try{check();}catch(error){if(!sourceFailed){sourceFailed=true;sourcePrimary=error;}if(!failed){failed=true;primary=error;}else secondary(primary,error);}
 // The immediate callback primary and retained source-veto cause are distinct.
 // Catching an ordinary FS error cannot replace a later actual source failure.
 if(sourceFailed)for(let current=active;current;current=current.parent)if(!current.sourceFailed){current.sourceFailed=true;current.sourcePrimary=sourcePrimary;}
 return {failed,primary};
}
function mutateProtectedNativeAbsolute(root,targets,operation,admit){
 need(typeof operation==='function'&&!types.isProxy(operation)&&!types.isAsyncFunction(operation),'synchronous fixed absolute target operation required');
 const captured=admit(root,targets),before=observeProtectedNativeAbsoluteFrames();if(before.failed)throw before.primary;let result,failed=false,primary;
 try{result=invoke(()=>operation(captured));}catch(error){failed=true;primary=error;}
 const after=observeProtectedNativeAbsoluteFrames(failed,primary);if(after.failed)throw after.primary;return result;
}
export function mutateProtectedNativeAbsoluteDirectWriter(root,targets,operation){return mutateProtectedNativeAbsolute(root,targets,operation,allowProtectedNativeAbsoluteDirectWrites);}
export function mutateProtectedNativeAbsoluteEntries(root,targets,operation){return mutateProtectedNativeAbsolute(root,targets,operation,allowProtectedNativeAbsoluteMutationPaths);}

// Borrow actual active synchronous roots across an async lexical operation.
// Closed owners revoke the borrowed view; this never owns/closes their policies.
export function captureActiveNativeSourceVetoLease(){
 let retained=[];for(let current=active;current;current=current.parent)retained.push(current);
 let live=true,revoked=false,sourcePrimary;
 const alive=()=>need(live,'expired borrowed native source veto lease');
 const roots=()=>{const rows=[...retained],seen=new Set(rows);for(let current=active;current;current=current.parent)if(!seen.has(current)){seen.add(current);rows.push(current);}need(rows.length<=128,'bounded captured/current synchronous root union');return rows;};
 const record=(rows,error)=>{if(!revoked){revoked=true;sourcePrimary=error;}for(const current of rows)if(!current.sourceFailed){current.sourceFailed=true;current.sourcePrimary=sourcePrimary;}};
 const observe=rows=>{let failed=revoked,primary=sourcePrimary;for(const current of rows)for(const check of [()=>{if(current.sourceFailed)throw current.sourcePrimary;},()=>current.policy.verify()])try{check();}catch(error){if(!failed){failed=true;primary=error;}else secondary(primary,error);}if(failed){record(rows,primary);throw primary;}};
 const admission=(root,targets,descriptors,direct)=>{
  alive();const rows=roots();let result,failed=false,primary;
  try{const captured=captureAbsoluteNativeMutationTargets({requestedRoot:root,canonicalRoot:fs.realpathSync(resolve(root)),targets}),stable=Object.freeze(captured.map(row=>row.canonicalTarget)),fds=direct?Object.freeze(captureProtectedNativeDescriptorNumbers(descriptors)):[];result=captured;
   for(const current of rows)try{if(direct==='stream')current.policy.allowNativeStreamWrites({root:current.root,descriptors:fds});else if(direct)current.policy.allowNativeDirectWrites({root:current.root,targets:stable,descriptors:fds});else current.policy.allowNativeMutationPaths({root:current.root,targets:stable});}catch(error){if(!failed){failed=true;primary=error;}else secondary(primary,error);}
  }catch(error){failed=true;primary=error;}
  if(failed)record(rows,primary);try{observe(rows);}catch(error){if(!failed){failed=true;primary=error;}else secondary(primary,error);}if(failed)throw primary;return result;
 };
 try{observe(roots());}catch(error){live=false;retained.length=0;throw error;}
 return Object.freeze({
  verify(){alive();return observe(roots());},
  source(operation){alive();const rows=roots();let value,failed=false,primary;try{observe(rows);value=invoke(operation);}catch(error){failed=true;primary=error;record(rows,error);}try{observe(rows);}catch(error){if(!failed){failed=true;primary=error;}else secondary(primary,error);}if(failed)throw primary;return value;},
  direct(root,targets,descriptors=[]){return admission(root,targets,descriptors,true);},
  streams(root,descriptors){return admission(root,[],descriptors,'stream');},
  entries(root,targets){return admission(root,targets,[],false);},
  close(){alive();try{observe(roots());}finally{live=false;retained.length=0;}},
 });
}

export function guardProtectedSynchronousDiagnosticWrite(operation,requiredRoot){
 need(active,'no active synchronous source diagnostic route');if(requiredRoot!==undefined)need(hasProtectedSynchronousDiagnosticRoot(requiredRoot),'fixed diagnostic executable root is absent from synchronous source route');const root=active.root,borrowed=captureActiveNativeSourceVetoLease();let value,failed=false,primary;try{borrowed.streams(root,[2]);value=invoke(operation);}catch(error){failed=true;primary=error;}try{borrowed.close();}catch(error){if(!failed){failed=true;primary=error;}else secondary(primary,error);}if(failed)throw primary;return value;
}

export function hasProtectedSynchronousDiagnosticRoot(requiredRoot){const root=fs.realpathSync(resolve(requiredRoot));for(let current=active;current;current=current.parent)if(current.root===root)return true;return false;}
