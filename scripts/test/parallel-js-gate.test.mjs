import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {prepareParallelJavaScriptGate} from '../prepare-parallel-js-gate.mjs';
import {auditWorkflows} from '../check-js-first-workflows.mjs';
import {readCurrentFixedNineDraftWorkflowSources} from '../fixed-nine-draft-policy.mjs';
const require=createRequire(new URL('../ci/package.json',import.meta.url)),{parse,stringify}=require('yaml'),directory=new URL('../../.github/workflows/',import.meta.url);
const baseline=Object.fromEntries(fs.readdirSync(directory).filter(name=>/\.ya?ml$/.test(name)).map(name=>[name,fs.readFileSync(new URL(name,directory),'utf8')]));
const source=baseline['javascript-first.yml'];
function modified(change){const data=parse(source);change(data);return {...baseline,'javascript-first.yml':stringify(data)};}
function fails(change){assert.ok(auditWorkflows(modified(change)).length,'invalid partition must keep the JavaScript gate red');}

test('each complete original command runs in exactly one fixed noncancelling matrix member',{timeout:60000},()=>{
 const jobs=parse(source).jobs,expected={translation:[['tests','node scripts/run-node-tests.mjs --outer-timeout-ms=3600000 --test-concurrency=2 tools/translation/test/*.test.mjs tools/translation/serialization-schema/*.test.mjs'],['canonical','node scripts/translate-router-flat-native-owned-field-meta.mjs --retain-output-text --check'],['owned-definitions','node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --check']],'profile-matrix':[['canonical','node scripts/translate-router-flat-native-owned-field-meta.mjs --retain-output-text --profile-matrix --check'],['owned-definitions','node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --profile-matrix --check']]};
 assert.deepEqual(auditWorkflows(baseline),[]);assert.equal(jobs.complete.needs.length,8);
 for(const [id,commands]of Object.entries(expected)){
  const job=jobs[id];assert.equal(job['timeout-minutes'],60);assert.equal(job.strategy['fail-fast'],false);assert.deepEqual(job.strategy.matrix.part,commands.map(row=>row[0]));
  for(const [part,command]of commands){const steps=job.steps.filter(step=>step.run===command);assert.equal(steps.length,1);assert.equal(steps[0].if,"${{ matrix.part == '"+part+"' }}");assert.equal(job.strategy.matrix.part.filter(member=>member===part).length,1);}
 }
 const upload=jobs.translation.steps.at(-1);assert.equal(upload.if,"${{ always() && matrix.part == 'tests' }}");assert.equal(upload.with['if-no-files-found'],'error');assert.equal(upload.with.path,'js/node_modules/.node-case-deadlines/');
});
test('missing duplicate dynamic cancelled and extra matrix selections cannot waive any full command',{timeout:60000},()=>{
 for(const id of ['translation','profile-matrix'])for(const change of [
  job=>{delete job.strategy;},job=>{job.strategy['fail-fast']=true;},job=>{delete job.strategy['fail-fast'];},job=>{job.strategy.matrix.part.pop();},job=>{job.strategy.matrix.part.push(job.strategy.matrix.part[0]);},job=>{job.strategy.matrix.part=[];},job=>{job.strategy.matrix.part='${{ inputs.parts }}';},job=>{job.strategy.matrix.include=[{part:'other'}];},job=>{job.strategy.matrix.exclude=[{part:'canonical'}];},job=>{job['continue-on-error']='${{ matrix.experimental }}';},
 ])fails(workflow=>change(workflow.jobs[id]));
 fails(workflow=>{workflow.jobs.parity.strategy={'fail-fast':false,matrix:{part:[]}};});
});
test('wrong command partitions and lost failed-test evidence remain fatal',{timeout:60000},()=>{
 for(const id of ['translation','profile-matrix']){
  const job=parse(source).jobs[id];for(const original of job.steps.filter(step=>step.if&&step.run))for(const condition of ['${{ false }}','${{ always() }}',"${{ matrix.part == 'missing' }}",false,null])fails(workflow=>{workflow.jobs[id].steps.find(step=>step.run===original.run).if=condition;});
 }
 for(const condition of ['${{ always() }}',"${{ always() && matrix.part == 'canonical' }}",'${{ false }}'])fails(workflow=>{workflow.jobs.translation.steps.at(-1).if=condition;});
});
test('complete native YAML source history retains both original command edits and every parallelism inverse',{timeout:60000},()=>{
 const packet=readCurrentFixedNineDraftWorkflowSources(),evolution=packet.currentWorkflowSourceEvolution,layer=evolution.parallelismSourceLayer;
 assert.equal(evolution.after,source);assert.equal(evolution.completeInverse,true);assert.equal(JSON.parse(evolution.beforeMeta).source,evolution.before);assert.equal(JSON.parse(evolution.afterMeta).source,source);assert.equal(evolution.nativeSelections.length,2);assert.equal(layer.edits.length,8);assert.equal(layer.inverse,source);assert.equal(JSON.parse(layer.beforeMeta).source,source);assert.equal(JSON.parse(layer.afterMeta).source,layer.source);
 for(const edit of layer.edits)assert.equal(source.slice(...edit.span),edit.expected);for(const edit of evolution.nativeSelections)assert.equal(layer.source.slice(...edit.span),edit.expected);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'router-parallel-source-'));try{
  fs.mkdirSync(path.join(root,'scripts/ci'),{recursive:true});fs.mkdirSync(path.join(root,'.github/workflows'),{recursive:true});fs.copyFileSync(new URL('../ci/fixed-nine-draft-workflow-sources.json.gz',import.meta.url),path.join(root,'scripts/ci/fixed-nine-draft-workflow-sources.json.gz'));
  const target=path.join(root,'.github/workflows/javascript-first.yml');fs.writeFileSync(target,source);assert.equal(readCurrentFixedNineDraftWorkflowSources({root}).currentWorkflowSourceEvolution.after,source);
  for(const changed of [source+'\n# unreviewed extra source\n',source.replace("part: [tests, canonical, owned-definitions]","part: [tests, canonical]"),source.replace("always() && matrix.part == 'tests'","always() && matrix.part == 'canonical'")]){assert.notEqual(changed,source);fs.writeFileSync(target,changed);assert.throws(()=>readCurrentFixedNineDraftWorkflowSources({root}));}
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('the actual source producer reproduces the installed complete workflow without writes or cached checks',{timeout:60000},async()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url)),first=await prepareParallelJavaScriptGate({root}),second=await prepareParallelJavaScriptGate({root});assert.deepEqual(second,first);assert.equal(first.current,source);assert.equal(first.after,source);assert.equal(first.inverse,first.before);assert.equal(first.selection.length,5);assert.equal(first.languageEdits.length,2);assert.equal(first.repositoryEdits.length,6);assert.equal(first.allOriginalCommandsRequired,true);assert.equal(first.allEightStagesRetained,true);assert.equal(first.originalTimeoutsUnchanged,true);assert.equal(first.cancelSiblingJobs,false);assert.equal(first.rustAuthority,false);assert.equal(first.defaultWritesAllowed,false);assert.deepEqual(first.trace.map(row=>row.phase),['language','repository']);for(const stage of first.stages){assert.equal(JSON.parse(stage.beforeMeta).source,stage.before);assert.equal(JSON.parse(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}
});
