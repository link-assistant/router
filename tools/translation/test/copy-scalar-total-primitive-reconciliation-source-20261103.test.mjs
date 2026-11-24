// Complete actual copy/creation ancestry SOURCE only; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeCopyScalarTotalPrimitiveReconciliation20261103} from '../copy-scalar-total-primitive-reconciliation-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('complete additive reconciliation retains both original copies and all CST stages',{timeout:900000},()=>{
 const proposal=proposeCopyScalarTotalPrimitiveReconciliation20261103();assert.equal(proposal.plan.files.length,2);assert.equal(proposal.copies.length,2);assert.equal(proposal.nativeBindingQualified,false);
 for(const row of proposal.copies){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 for(const row of proposal.plan.files){assert.equal(row.before,'');assert.equal(row.inverse,'');assert.equal(row.after,proposal.copies.find(copy=>copy.path===row.path).after);}
});
