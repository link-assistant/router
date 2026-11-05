// Actual source/creation histories only; all execution remains UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposePhysicalLanguageOutputSources20261104} from '../physical-language-output-layout-20261104-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('physical planner preserves original producer sources, transaction copy and nonauthoritative declarations',{timeout:900000},()=>{
 const proposal=proposePhysicalLanguageOutputSources20261104();assert.equal(proposal.files.length,2);assert.equal(proposal.copies.length,1);assert.equal(proposal.newFiles.length,2);assert.equal(proposal.declarations.length,1);assert.equal(proposal.installationAuthority,false);
 for(const row of [...proposal.files,...proposal.copies]){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 for(const row of proposal.newFiles)assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);
 const data=proposal.declarations[0].data;assert.equal(data.sourceAuthority,false);assert.equal(data.installationAuthority,false);for(const root of ['js/src/','rust/src/'])assert.ok(data.authoredInputs.includes(root));assert.ok(data.mixedTrees.some(row=>row.root==='ts/src/'));
});
