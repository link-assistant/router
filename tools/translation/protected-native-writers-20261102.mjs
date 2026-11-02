// Operational source-mutation veto only. Never parser/compiler/type/owner proof.
import fs from 'node:fs';
import {resolve} from 'node:path';
import {types} from 'node:util';
import {captureExplicitSourceMutationPolicy} from './unit-runtime-materialization.mjs';
import {requireReconcile as need, RECONCILE_LIMITS} from './paired-sync-reconcile-20261101-support.mjs';
let active = null, operationDepth = 0;
function secondary(primary, error) {
  if (primary !== null && (typeof primary === 'object' || typeof primary === 'function')) {
    try { Object.defineProperty(primary, 'protectedNativeWriterClosingFailure', {value: error, enumerable: true}); return; } catch {}
  }
  try { process.stderr.write('{"schema":"protected-native-writer-closing-20261102","closingFailed":true}\n'); } catch {}
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
  const actual = fs.realpathSync(resolve(root));
  for (let current = active; current; current = current.parent) if (current.root === actual) return current;
  need(false, 'actual source mutation requires its active fixed policy operation');
}
function withProtectedNativeWriterBody(root, operation) {
  root = fs.realpathSync(resolve(root));
  for (let current = active; current; current = current.parent) if (current.root === root) {
    current.policy.verify();need(current.depth<64,'protected native writer nesting bound');current.depth++;let failed = false, primary;
    try { return invoke(operation); } catch (error) { failed = true; primary = error; throw error; }
    finally { current.depth--;try { current.policy.verify(); } catch (error) { if (failed) secondary(primary, error); else throw error; } }
  }
  const policy = captureExplicitSourceMutationPolicy(root), parent = active;
  const current = {root, policy, parent,depth:0}; active = current;
  let failed = false, primary;
  try {
    need(Number.isSafeInteger(policy.retainedBytes) && policy.retainedBytes >= 0 && policy.retainedBytes <= RECONCILE_LIMITS.raw,
      'complete policy retention exceeds original writer raw bound');
    return invoke(operation);
  } catch (error) { failed = true; primary = error; throw error; }
  finally {
    try { policy.close(); } catch (error) { if (failed) secondary(primary, error); else throw error; }
    finally { active = parent; }
  }
}
export function verifyProtectedNativeWriter(root) { frame(root).policy.verify(); }
export function protectedNativeWriterRetainedBytes(root) { return frame(root).policy.retainedBytes; }
export function allowProtectedNativeWriter(root, outputs) { frame(root).policy.allow({root, outputs}); }
export function mutateProtectedNativeWriter(root, outputs, operation) {
  const current = frame(root); current.policy.allow({root, outputs}); current.policy.verify();
  let failed = false, primary;
  try { return invoke(operation); } catch (error) { failed = true; primary = error; throw error; }
  finally { try { current.policy.verify(); } catch (error) { if (failed) secondary(primary, error); else throw error; } }
}

// Bound the complete synchronous call chain, including distinct project roots.
export function withProtectedNativeWriter(root,operation){
 need(operationDepth<64,'complete protected native writer nesting bound');operationDepth++;
 try{return withProtectedNativeWriterBody(root,operation);}finally{operationDepth--;}
}

// Actual in-place creation/truncation additionally checks physical aliases.
export function allowProtectedNativeDirectWrites(root,outputs){return frame(root).policy.allowDirectWrites({root,outputs});}
export function mutateProtectedNativeDirectWriter(root,outputs,operation){
 allowProtectedNativeDirectWrites(root,outputs);return mutateProtectedNativeWriter(root,outputs,operation);
}
