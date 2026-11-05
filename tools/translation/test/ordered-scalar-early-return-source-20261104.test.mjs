// Whole reader/copy/creation source/CST cases; all execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeOrderedScalarEarlyReturnSources20261104} from '../ordered-scalar-early-return-20261104-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('early-return readers retain original native scopes and complete normalizer copy',{timeout:900000},()=>{
 const proposal=proposeOrderedScalarEarlyReturnSources20261104();assert.equal(proposal.files.length,2);assert.equal(proposal.copies.length,1);assert.equal(proposal.newFiles.length,2);assert.equal(proposal.inputSources.length,8);assert.equal(proposal.nativeBindingQualified,false);
 for(const row of [...proposal.files,...proposal.copies]){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 for(const row of proposal.files){assert.match(row.after,/orderedScalarCalls\|\|orderedScalarFlow/);assert.match(row.after,/terminated=yes.terminated&&no.terminated/);assert.match(row.after,/mergeMoves\(scope,a,b\)/);assert.match(row.after,/lowerOrderedScalarEarlyReturnStatements20261104 as lowerOrderedScalarHelperStatements20261103/);assert.match(row.after,/input.rows.length!==8/);}
 for(const row of proposal.newFiles)assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);
});
