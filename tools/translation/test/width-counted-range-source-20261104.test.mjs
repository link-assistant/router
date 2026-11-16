// Whole six-reader/copy/native source/CST case source, all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeWidthCountedRangeSources20261104} from '../width-counted-ranges-20261104-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('width-aware range draft retains all original reader checks and complete independent Rust oracle history',{timeout:900000},()=>{
 const proposal=proposeWidthCountedRangeSources20261104();assert.equal(proposal.files.length,6);assert.equal(proposal.copies.length,1);assert.equal(proposal.newFiles.length,2);assert.equal(proposal.oracleFiles.length,1);assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.nativeBindingQualified,false);
 for(const row of [...proposal.files,...proposal.copies,...proposal.oracleFiles]){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 for(const row of proposal.files)assert.match(row.after,/checkOwnedWidthCountedFor20261104 as checkOwnedCountedFor/);
 for(const row of proposal.newFiles)assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);
});
