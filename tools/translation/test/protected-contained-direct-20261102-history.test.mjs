// Independent whole source epoch cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeProtectedContainedDirectSources,knownProtectedContainedDirectSuccessor} from '../protected-contained-direct-20261102-history.mjs';
import {knownProtectedPreparerWriterSuccessor} from '../protected-preparer-writers-20261102-history.mjs';
import {knownProtectedCopyVariantSuccessor} from '../protected-copy-variants-20261102-history.mjs';
import {knownProtectedStagedEntrySuccessor} from '../protected-staged-entries-20261102-history.mjs';
import {knownProtectedPreparerDirectPolicySuccessor} from '../protected-preparer-writers-20261102-direct-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url).pathname,base='tools/translation/source-profiles/protected-contained-direct-20261102/',read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8'),parents=JSON.parse(read(base+'manifest.json')).parents;
test('seventeen complete original modules and whole cases retain ordered source equations and inverses',{timeout:60000},()=>{
 const input=parents.map(row=>({path:row.path,source:read(base+row.before)})),proposal=proposeProtectedContainedDirectSources(input,{root});assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.verification,'UNRUN');assert.equal(proposal.files.length,17);
 for(const [index,pin]of parents.entries()){const row=proposal.files[index];assert.equal(row.before,input[index].source);assert.equal(row.after,read(base+pin.after));assert.equal(row.inverse,row.before);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}const current=knownProtectedContainedDirectSuccessor({root,path:pin.path,before:row.before});assert.equal(current.currentAfter,read(pin.path));assert.equal(current.inverse,row.before);assert.equal(knownProtectedContainedDirectSuccessor({root,path:pin.path,before:row.before+String.fromCharCode(10)}),null);}
 assert.throws(()=>proposeProtectedContainedDirectSources(input.slice(1),{root}),/all seventeen/u);assert.equal(knownProtectedContainedDirectSuccessor({root,path:'tools/translation/unassigned-native-path.mjs',before:''}),null);
});
test('native/mixed original preparer histories retain c122 after and append only exact contained successors',{timeout:60000},()=>{
 const earlier='tools/translation/source-profiles/protected-preparer-writers-20261102/';for(const role of ['preparer-native','preparer-mixed']){const pin=parents.find(row=>row.role===role),before=read(earlier+pin.path.replaceAll('/','__')+'.before.txt'),result=knownProtectedPreparerWriterSuccessor({root,path:pin.path,before});assert.equal(result.after,read(base+pin.before));assert.equal(result.currentAfter,read(pin.path));assert.equal(result.inverse,before);assert.equal(result.laterHistories[0].before,result.after);assert.equal(result.laterHistories[0].after,result.currentAfter);}
});
test('failure-aware and typed source histories retain144 after and complete appended inverses',{timeout:60000},()=>{
 const earlier='tools/translation/source-profiles/protected-copy-variants-20261102/';for(const role of ['variant-native','variant-mixed','variant-typed']){const pin=parents.find(row=>row.role===role),name=pin.path.slice(pin.path.lastIndexOf('/')+1),before=read(earlier+name+'.before.txt'),result=knownProtectedCopyVariantSuccessor({root,path:pin.path,before});assert.equal(result.after,read(base+pin.before));assert.equal(result.currentAfter,read(pin.path));assert.equal(result.inverse,before);assert.equal(result.laterHistories[0].before,result.after);assert.equal(result.laterHistories[0].inverse,result.after);}
});
test('d01 staged unit and ACA native adapter epochs preserve historical after/currentAfter joins',{timeout:60000},()=>{
 const unit=parents.find(row=>row.role==='unit'),staged='tools/translation/source-profiles/protected-staged-entries-20261102/',stage=knownProtectedStagedEntrySuccessor({root,path:unit.path,before:read(staged+'unit.before.txt')});assert.equal(stage.after,read(base+unit.before));assert.equal(stage.currentAfter,read(unit.path));assert.equal(stage.laterHistories[0].before,stage.after);assert.equal(stage.laterHistories[0].inverse,stage.after);
 const adapter=parents.find(row=>row.role==='scope-adapter'),direct='tools/translation/source-profiles/protected-preparer-writers-20261102/direct-policy/',step=knownProtectedPreparerDirectPolicySuccessor({root,path:adapter.path,before:read(direct+'scope-adapter.before.txt')});assert.equal(step.after,read(base+adapter.before));assert.equal(step.currentAfter,read(adapter.path));assert.equal(step.laterHistories[0].before,step.after);assert.equal(step.laterHistories[0].inverse,step.after);
});
