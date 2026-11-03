// Full native reader/creation source ancestry only. Every execution is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeOrderedScalarHelperGraphSources20261104} from '../ordered-scalar-helper-graph-20261104-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('both original readers keep real native pointer checks and seven-source closing',{timeout:900000},()=>{
 const proposal=proposeOrderedScalarHelperGraphSources20261104();assert.equal(proposal.files.length,2);assert.equal(proposal.newFiles.length,2);assert.equal(proposal.inputSources.length,7);assert.equal(proposal.nativeBindingQualified,false);
 for(const row of proposal.files){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}assert.match(row.after,/originalOwnedCoreImport\(handle,job.path,job.spec.name,typed\)/);assert.match(row.after,/actual\[0\]!==selected/);assert.match(row.after,/selected.getSourceFile\(\)!==file/);assert.match(row.after,/active.has\(selected.declaration\)/);assert.match(row.after,/active.delete\(selected.declaration\)/);assert.match(row.after,/input.rows.length!==7/);assert.match(row.after,/call.source\?\?/);assert.match(row.after,/operation.helperSource\?\?/);assert.match(row.after,/nested.caller\?\?/);}
 for(const row of proposal.newFiles)assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);
});
