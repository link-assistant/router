// Complete creation source/CST history. SOURCE ONLY, UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeCopyScalarSourceReconciliation20261103} from '../copy-scalar-source-reconciliation-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('source reconciliation retains its whole original-span implementation and independent receiving cases',{timeout:60000},()=>{
 const proposal=proposeCopyScalarSourceReconciliation20261103();assert.equal(proposal.nativeBindingQualified,false);assert.equal(proposal.plan.files.length,2);
 for(const file of proposal.plan.files){assert.equal(file.before,'');assert.equal(file.inverse,'');assert.equal(transportConcreteSyntaxMeta(file.history.afterMeta).source,file.after);}
 assert.deepEqual(proposal.plan.stages.map(stage=>stage.phase),['language','repository']);
 const implementation=proposal.plan.files.find(file=>file.path.endsWith('/copy-scalar-rust-source-reconciliation-20261103.mjs'));
 assert.match(implementation.after,/createConcreteSourceRuleRegistry/);assert.match(implementation.after,/ownedCoreContext\(inverse.program\[0\]\)/);
 assert.match(implementation.after,/sameRustSourceSyntax\(source,row.checked.rust\)/);
 assert.match(implementation.after,/translateOwnedCopyScalarHelperSource20261103/);
 assert.match(implementation.after,/requiresReconciliation:true/);
});
