// Complete original source/CST ancestry. All execution deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeCopyScalarHelperLocalSources20261103} from '../copy-scalar-helper-locals-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('local normalization retains both whole native readers and original source restrictions',{timeout:900000},()=>{
 const proposal=proposeCopyScalarHelperLocalSources20261103();assert.equal(proposal.files.length,2);assert.equal(proposal.newFiles.length,2);assert.equal(proposal.nativeBindingQualified,false);
 for(const row of proposal.files){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}assert.match(row.after,/substituteCopyScalarHelperLocalExpression20261103 as substituteCopyScalarHelperExpression20261103/);assert.match(row.after,/input.rows.length!==7/);assert.match(row.after,/withOwnedBooleanHelperSourceOperation\(\(\)=>withOwnedCopyHelperSourceOperationBody/);}
 for(const row of proposal.newFiles)assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);
});
