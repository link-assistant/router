// Full source/CST ancestry only; native receiving execution remains UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeOrderedScalarHelperNativeSources20261104} from '../ordered-scalar-helper-native-20261104-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('ordered helper cohort retains both original readers and all original API copies',{timeout:900000},()=>{
 const proposal=proposeOrderedScalarHelperNativeSources20261104();assert.equal(proposal.files.length,2);assert.equal(proposal.copies.length,5);assert.equal(proposal.newFiles.length,6);assert.equal(proposal.inputSources.length,6);assert.equal(proposal.nativeBindingQualified,false);
 for(const row of [...proposal.files,...proposal.copies]){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 for(const row of proposal.files){assert.match(row.after,/createOwnedCoreOrderedScalarHelperSourceContext/);assert.match(row.after,/state.orderedScalarHelperSyntax=true/);assert.match(row.after,/if\(orderedScalarCalls\)checked.body=lowerOrderedScalarHelperStatements20261103/);assert.match(row.after,/sourceNativeOperators.length>4096/);assert.match(row.after,/2097152/);assert.match(row.after,/withOwnedCopyHelperSourceOperation\(\(\)=>withOwnedOrderedScalarHelperSourceOperationBody/);}
 for(const row of proposal.newFiles)assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);
});
