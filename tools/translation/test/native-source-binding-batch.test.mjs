import test from 'node:test';
import assert from 'node:assert/strict';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings,verifyNativeCopiedSourceBindingBatch} from '../source-copy-native-bindings.mjs';
import {prepareNativeSourceBindingBatch} from '../prepare-native-source-binding-batch.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ts=ownershipCompiler(),root=new URL('./fixtures/',import.meta.url).pathname;

test('one native module batch returns the same complete checks as independent original programs',{timeout:60000},()=>{
 const rows=[{path:root+'first.mjs',source:'export const value=1; export function first(){return value+process.pid;}'},{path:root+'second.mjs',source:'import {external} from "./unresolved.mjs"; export const value=2; export function second(){return value+external+Buffer.byteLength("🦀");}'}];assert.deepEqual(verifyNativeCopiedSourceBindingBatch(ts,rows),rows.map(row=>verifyNativeCopiedSourceBindings(ts,row.path,row.source)));
});

test('another module or script cannot supply a missing binding or bless use before initialization',{timeout:60000},()=>{
 const missing=[{path:root+'a.mjs',source:'export const secret=1;'},{path:root+'b.mjs',source:'export const value=secret;'}];assert.throws(()=>verifyNativeCopiedSourceBindingBatch(ts,missing),/unbound identifier/);assert.throws(()=>verifyNativeCopiedSourceBindings(ts,missing[1].path,missing[1].source),/unbound identifier/);
 const script=[{path:root+'script.mjs',source:'const secret=1;'},{path:root+'consumer.mjs',source:'export const value=secret;'}];assert.throws(()=>verifyNativeCopiedSourceBindingBatch(ts,script),/unbound identifier/);
 const early=[{path:root+'early.mjs',source:'export const value=later;const later=2;'}];assert.throws(()=>verifyNativeCopiedSourceBindingBatch(ts,early),/initialization/);assert.throws(()=>verifyNativeCopiedSourceBindings(ts,early[0].path,early[0].source),/initialization/);
 const duplicates=[missing[0],missing[0]];assert.throws(()=>verifyNativeCopiedSourceBindingBatch(ts,duplicates),/unique original filenames/);
});

test('the original checker stays byte exact and both complete source changes have serialized CST inverses',{timeout:60000},()=>{
 const plan=prepareNativeSourceBindingBatch();assert.equal(plan.originalStandaloneCheckerUnchanged,true);assert.equal(plan.newAcrossInvocationCache,false);
 for(const row of plan.files){assert.equal(row.current,row.installedAfter);if(row.sourceHistory){assert.equal(row.sourceHistory.before,row.after);assert.equal(row.sourceHistory.after,row.installedAfter);}assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.completeInverse,true);}}
 const checker=plan.files.find(row=>row.path.endsWith('/source-copy-native-bindings.mjs'));assert.ok(checker.after.startsWith(checker.before));assert.ok(checker.after.includes(checker.nativeSelections.options));assert.ok(checker.after.includes(checker.nativeSelections.diagnosticsTail));
});
