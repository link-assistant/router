// Independent complete source chronology/proposal cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeProtectedStagedEntrySources,knownProtectedStagedEntrySuccessor} from '../protected-staged-entries-20261102-history.mjs';
import {knownProtectedPreparerDirectPolicySuccessor} from '../protected-preparer-writers-20261102-direct-history.mjs';
import {knownProtectedUnitVariantSuccessor} from '../protected-unit-variants-20261102-history.mjs';
import {knownProtectedPreparerWriterSuccessor} from '../protected-preparer-writers-20261102-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url).pathname,base='tools/translation/source-profiles/protected-staged-entries-20261102/',read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
const parents=JSON.parse(read(base+'manifest.json')).parents;
test('all nine full exact predecessor/successor modules and cases retain complete source inverses',{timeout:60000},()=>{
 const inputs=parents.map(row=>({path:row.path,source:read(base+row.before)})),proposal=proposeProtectedStagedEntrySources(inputs,{root});assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.verification,'UNRUN');assert.equal(proposal.files.length,9);
 for(const [index,pin]of parents.entries()){const row=proposal.files[index];assert.equal(row.before,inputs[index].source);assert.equal(row.after,read(base+pin.after));assert.equal(row.inverse,row.before);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}const current=knownProtectedStagedEntrySuccessor({root,path:pin.path,before:row.before});assert.equal(current.after,read(pin.path));assert.equal(current.currentAfter,read(pin.path));assert.equal(knownProtectedStagedEntrySuccessor({root,path:pin.path,before:row.before+String.fromCharCode(10)}),null);}
 assert.throws(()=>proposeProtectedStagedEntrySources(inputs.slice(1),{root}),/all nine/u);assert.equal(knownProtectedStagedEntrySuccessor({root,path:'tools/translation/unassigned.mjs',before:''}),null);
});
test('direct policy ancestry preserves c35→ACA historical after and appends exact staged currentAfter',{timeout:60000},()=>{
 const pin=parents.find(row=>row.role==='unit'),older='tools/translation/source-profiles/protected-preparer-writers-20261102/direct-policy/',before=read(older+'unit.before.txt'),result=knownProtectedPreparerDirectPolicySuccessor({root,path:pin.path,before});assert.equal(result.before,before);assert.equal(result.after,read(base+pin.before));assert.equal(result.currentAfter,read(pin.path));assert.equal(result.inverse,before);assert.equal(result.laterHistories[0].before,result.after);assert.equal(result.laterHistories[0].after,result.currentAfter);
});
test('unit generic and finite preparer bridges retain historical51 after then append current generic intent fix',{timeout:60000},()=>{
 const pin=parents.find(row=>row.role==='unit-generic'),older='tools/translation/source-profiles/protected-unit-variants-20261102/',before=read(older+'owned-project-runtime-materialization.mjs.before.txt');
 for(const lookup of [knownProtectedUnitVariantSuccessor,knownProtectedPreparerWriterSuccessor]){const result=lookup({root,path:pin.path,before});assert.equal(result.before,before);assert.equal(result.after,read(base+pin.before));assert.equal(result.currentAfter,read(pin.path));assert.equal(result.inverse,before);assert.equal(result.laterHistories[0].before,result.after);assert.equal(result.laterHistories[0].after,result.currentAfter);}
});
test('original direct alias body and all historical archived unit images remain whole',{timeout:60000},()=>{const alias=parents.find(row=>row.role==='alias'),before=read(base+alias.before),after=read(alias.path);assert.equal(after.startsWith(before),true);assert.equal(read(base+'unit.before.txt'),read('tools/translation/source-profiles/protected-preparer-writers-20261102/direct-policy/unit.after.txt'));});
