// Complete immutable source-history case source only; all execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareBulkRuleTraceSourceEquations,findBulkRuleTraceSourceSuccessor} from '../bulk-rule-trace-20261101-source-equations.mjs';
import {proposeScalarChainCallbackSourceRepair} from '../scalar-chain-bulk-20261101-source-equations.mjs';
const limits={timeout:60000};
test('all complete trace corrections retain original cases and exact physical successors',limits,()=>{
 const proposal=prepareBulkRuleTraceSourceEquations();assert.equal(proposal.files.length,4);
 for(const row of proposal.files){
  assert.equal(row.inverse,row.before);assert.equal(row.history.inverse,row.before);
  assert.equal(row.history.before,row.before);assert.equal(row.history.after,row.after);
  assert.equal(readFileSync(new URL('../../../'+row.path,import.meta.url),'utf8'),row.after);
  assert.equal(findBulkRuleTraceSourceSuccessor(row.path,row.before).after,row.after);
  assert.equal(findBulkRuleTraceSourceSuccessor(row.path,row.before+'\n'),null);
  if(row.path.includes('/test/')){
   const old=".ruleTrace.map(row=>row.phase),['language','repository']";
   assert.ok(row.before.includes(old));assert.ok(!row.after.includes(old));
   assert.ok(row.after.includes('.ruleTrace.map(row=>[row.phase,row.id])'));
   assert.ok(row.after.includes('["language","primitive-vector-iterator-bulk:')||row.after.includes('["language","collection-callback:')||row.after.includes('["language","scalar-chain:'));
  }
 }
 assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);
 assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.sourceAuthority,false);
 assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.freshnessQualified,false);
 assert.throws(()=>findBulkRuleTraceSourceSuccessor({},''));
});
test('older complete callback arithmetic history composes exact correction without editing its frozen rows',limits,()=>{
 const proposal=proposeScalarChainCallbackSourceRepair();
 const row=proposal.files.find(file=>file.path==='tools/translation/test/collection-callback-bulk-20261101.test.mjs');
 assert.ok(row);assert.equal(row.equation.inverse,row.before);assert.equal(row.sourceSuccessor.before,row.after);
 assert.equal(row.currentSource,row.sourceSuccessor.after);
 assert.equal(readFileSync(new URL('../../../'+row.path,import.meta.url),'utf8'),row.currentSource);
 assert.notEqual(row.after,row.currentSource);
 assert.equal(row.sourceSuccessor.history.inverse,row.after);
});
