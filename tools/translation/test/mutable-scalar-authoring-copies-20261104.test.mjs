// Independent complete copy/source/CST case source. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeExactMutableScalarAuthoringCopies20261104} from '../exact-source-mutable-scalar-copies-20261104.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('all original collector, control and source-lifetime case bodies are retained with complete copied-source inverses',{timeout:900000},()=>{
 const proposal=proposeExactMutableScalarAuthoringCopies20261104();assert.equal(proposal.copies.length,3);assert.equal(proposal.nativeBindingQualified,false);for(const row of proposal.copies){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
});
