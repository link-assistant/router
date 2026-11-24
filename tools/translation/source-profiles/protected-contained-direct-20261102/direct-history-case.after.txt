// Independent complete common-policy proposal/ancestry case SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeProtectedPreparerDirectPolicyCopies,knownProtectedPreparerDirectPolicySuccessor} from '../protected-preparer-writers-20261102-direct-history.mjs';
import {DIRECT_POLICY_SOURCE_PINS} from '../protected-preparer-writers-20261102-direct-pins.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {captureProtectedNativeWriterSourceHistories} from '../protected-native-writers-20261102-history.mjs';
const root=new URL('../../../',import.meta.url).pathname,read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8'),base='tools/translation/source-profiles/protected-preparer-writers-20261102/direct-policy/';
const inputs=()=>DIRECT_POLICY_SOURCE_PINS.map(pin=>({path:pin.path,source:read(base+pin.role+'.before.txt')}));
test('all three complete predecessor modules receive exact ordered source equations and full inverses',{timeout:60000},()=>{
 const original=inputs(),proposal=proposeProtectedPreparerDirectPolicyCopies(original,{root});assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.verification,'UNRUN');assert.equal(proposal.sourceAuthority,false);
 for(let index=0;index<original.length;index++){const row=proposal.rows[index],pin=DIRECT_POLICY_SOURCE_PINS[index];assert.equal(row.before,original[index].source);assert.equal(row.after,read(base+pin.role+'.after.txt'));assert.equal(row.inverse,row.before);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}}
 assert.throws(()=>proposeProtectedPreparerDirectPolicyCopies(original.slice(1),{root}),/all complete/u);const changed=inputs();changed[0].source+='\n';assert.throws(()=>proposeProtectedPreparerDirectPolicyCopies(changed,{root}),/complete exact/u);
});
for(const pin of DIRECT_POLICY_SOURCE_PINS)test('named current physical direct-policy source joins full predecessor '+pin.role,{timeout:60000},()=>{
 const before=read(base+pin.role+'.before.txt'),result=knownProtectedPreparerDirectPolicySuccessor({root,path:pin.path,before});assert.equal(result.before,before);assert.equal(result.after,read(base+pin.role+'.after.txt'));assert.equal(result.currentAfter,read(pin.path));assert.equal(result.inverse,before);assert.equal(result.sourceAuthority,false);assert.equal(knownProtectedPreparerDirectPolicySuccessor({root,path:pin.path,before:before+'\n'}),null);
});
test('344 original native writer packets remain whole while its actual helper composes a separate named successor',{timeout:60000},()=>{
 const original=captureProtectedNativeWriterSourceHistories({root});assert.equal(original.files.length,4);for(const row of original.files){assert.equal(row.after,read(row.path));assert.equal(row.inverse,row.before);}
 const pin=DIRECT_POLICY_SOURCE_PINS.find(row=>row.role==='scope-adapter'),step=knownProtectedPreparerDirectPolicySuccessor({root,path:pin.path,before:read(base+'scope-adapter.before.txt')});assert.equal(step.after,read(base+'scope-adapter.after.txt'));assert.equal(step.currentAfter,read(pin.path));assert.equal(step.laterHistories[0].before,step.after);assert.equal(step.laterHistories[0].after,step.currentAfter);assert.equal(step.laterHistories[0].inverse,step.after);assert.equal(step.history.inverse,read(base+'scope-adapter.before.txt'));
});
test('e039 unit predecessor retains historical safe-error after followed by exact direct-policy currentAfter',{timeout:60000},()=>{
 const pin=DIRECT_POLICY_SOURCE_PINS.find(row=>row.role==='unit'),before=read('tools/translation/source-profiles/protected-source-errors-20261102/unit-before.mjs.txt'),result=knownProtectedPreparerDirectPolicySuccessor({root,path:pin.path,before});assert.equal(result.before,before);assert.equal(result.after,read(base+'unit.before.txt'));assert.equal(result.currentAfter,read(pin.path));assert.equal(result.laterHistories[0].before,result.after);assert.equal(result.laterHistories[0].after,read(base+'unit.after.txt'));assert.equal(result.laterHistories[0].currentAfter,result.currentAfter);assert.equal(result.laterHistories[0].laterHistories[0].before,result.laterHistories[0].after);assert.equal(result.laterHistories[0].laterHistories[0].after,read('tools/translation/source-profiles/protected-staged-entries-20261102/unit.after.txt'));assert.equal(result.laterHistories[0].laterHistories[0].currentAfter,result.currentAfter);assert.equal(result.laterHistories[0].laterHistories[0].laterHistories[0].before,result.laterHistories[0].laterHistories[0].after);assert.equal(result.laterHistories[0].laterHistories[0].laterHistories[0].after,result.currentAfter);
});
