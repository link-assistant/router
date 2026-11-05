// Complete source proposal/CST cases; not executed during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeCopyScalarHelperTotalPrimitiveSources20261103} from '../copy-scalar-helper-total-primitives-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('both original readers preserve complete private checks and scalar/runtime source closing',{timeout:900000},()=>{
 const proposal=proposeCopyScalarHelperTotalPrimitiveSources20261103();assert.equal(proposal.files.length,2);assert.equal(proposal.newFiles.length,4);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.nativeBindingQualified,false);
 for(const row of proposal.files){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}assert.match(row.after,/input.rows.length!==14/);assert.match(row.after,/substituteCopyScalarHelperTotalPrimitives20261103 as substituteCopyScalarHelperExpression20261103/);assert.match(row.after,/originalOwnedCoreImport\(handle,target,spec.name,typed\)/);assert.match(row.after,/source:\{path:binding.target,span:\[\.\.\.call.span\]\}/);assert.match(row.after,/withOwnedBooleanHelperSourceOperation\(\(\)=>withOwnedCopyHelperSourceOperationBody/);}
 for(const row of proposal.newFiles)assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);
 const inverse=proposal.newFiles.find(row=>row.path.endsWith('owned-copy-scalar-total-primitive-rust-20261103.mjs'));assert.ok(inverse);assert.match(inverse.source,/fresh checked JavaScript does not reproduce the complete authoritative Rust/);assert.match(inverse.source,/substituteCopyScalarHelperTotalPrimitives20261103\(fn/);
});
