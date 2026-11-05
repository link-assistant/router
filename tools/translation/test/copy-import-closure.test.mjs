// Source-only regression draft. These cases have not been executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings,verifyNativeCopiedSourceBindingBatch} from '../source-copy-native-bindings.mjs';
import {prepareCopyImportClosureSources} from '../prepare-copy-import-closure-sources.mjs';
const limits={timeout:60000};
test('both complete native binding APIs reject copied duplicate declarations',limits,()=>{
 const ts=ownershipCompiler();for(const source of ['const value=1;const value=2;export {value};',"import {readFileSync as value} from 'node:fs';import {writeFileSync as value} from 'node:fs';export {value};"]){assert.throws(()=>verifyNativeCopiedSourceBindings(ts,'draft-duplicate.mjs',source),/duplicate declaration/u);assert.throws(()=>verifyNativeCopiedSourceBindingBatch(ts,[{path:'draft-duplicate.mjs',source}]),/duplicate declaration/u);}
});
test('separate native import declarations with distinct bindings keep their original module and initialization checks',limits,()=>{
 const ts=ownershipCompiler(),source="import {readFileSync as reader} from 'node:fs';import {writeFileSync as writer} from 'node:fs';export const pair=[reader,writer];";assert.deepEqual(verifyNativeCopiedSourceBindings(ts,'draft-distinct.mjs',source).unboundIdentifiers,[]);assert.equal(verifyNativeCopiedSourceBindingBatch(ts,[{path:'draft-distinct.mjs',source}]).length,1);assert.throws(()=>verifyNativeCopiedSourceBindings(ts,'draft-missing.mjs','export const value=unknownSource;'),/unbound identifier/u);assert.throws(()=>verifyNativeCopiedSourceBindingBatch(ts,[{path:'draft-order.mjs',source:'export const value=later;const later=1;'}]),/initialization/u);
});
test('the source repair retains all four complete inverses and exact native spans for all repeated import removals',limits,()=>{
 const plan=prepareCopyImportClosureSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const row=plan.files.find(row=>row.path.endsWith('/tracked-local-declarative-source.mjs'));assert.ok(row);assert.equal((row.after.match(/^import \{types\} from 'node:util';$/gmu)??[]).length,1);assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
