// Source creation/CST ancestry only. No native permission or observed pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeOrderedScalarHelperStatementSources20261103} from '../ordered-scalar-helper-statements-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('ordered helper rule, independent cases and native oracle retain full source inverses',{timeout:900000},()=>{
 const proposal=proposeOrderedScalarHelperStatementSources20261103();assert.equal(proposal.plan.files.length,3);assert.equal(proposal.nativeBindingQualified,false);assert.equal(proposal.sourceInstalled,false);
 for(const file of proposal.plan.files){assert.equal(file.before,'');assert.equal(file.inverse,'');assert.equal(transportConcreteSyntaxMeta(file.history.afterMeta).source,file.after);}
 assert.deepEqual(proposal.plan.stages.map(stage=>stage.phase),['language','repository']);
 assert.equal(proposal.plan.files.filter(file=>file.path.endsWith('.rs')).length,1);
});
