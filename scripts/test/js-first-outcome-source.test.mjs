// Actual checked-in gate programs; independent outcome expectations. SOURCE / UNRUN.
// Imported by the original complete workflow-policy case file, preserving its CI command.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync,execFileSync} from 'node:child_process';
const require=createRequire(new URL('../ci/package.json',import.meta.url));
const {parseDocument}=require('yaml');
// Independent expected IDs: do not derive these from the audited implementation.
const stages=['lint','node-tests','bun-tests','typescript','parity','translation','profile-matrix','reverse-translation'];
const limits={timeout:60000,concurrency:false};
function workflow(){const document=parseDocument(readFileSync(new URL('../../.github/workflows/javascript-first.yml',import.meta.url),'utf8'),{uniqueKeys:true,version:'1.2'});assert.deepEqual(document.errors,[]);return document.toJS();}
function program(step){
 const source=step.run.trim(),prefix='node --input-type=module -e "';
 assert.ok(source.startsWith(prefix)&&source.endsWith('"'),'whole reviewed Node program shape required');
 return source.slice(prefix.length,-1);
}
function execute(source,environment,cwd){
 const child=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd,env:{...process.env,...environment},encoding:'utf8',timeout:2000,maxBuffer:1048576});
 assert.equal(child.error,undefined,JSON.stringify({error:child.error,stdout:child.stdout,stderr:child.stderr}));
 assert.equal(child.signal,null,JSON.stringify({signal:child.signal,stdout:child.stdout,stderr:child.stderr}));
 assert.ok(Number.isInteger(child.status));return child;
}
const success=()=>Object.fromEntries(stages.map(name=>[name,{result:'success'}]));

test('actual aggregate accepts exactly eight successful stages and rejects every incomplete outcome',limits,()=>{
 const gate=workflow(),job=gate.jobs.complete;assert.deepEqual(job.needs,stages);assert.equal(job.if,'${{ always() }}');assert.equal(job.steps.length,1);
 const step=job.steps[0];assert.equal(step.env.STAGE_RESULTS,'${{ toJSON(needs) }}');const source=program(step);
 const run=value=>execute(source,{STAGE_RESULTS:typeof value==='string'?value:JSON.stringify(value)});
 assert.equal(run(success()).status,0);
 for(const name of stages){
  for(const status of ['failure','cancelled','skipped','timed_out','queued','in_progress',null,false,'']){
   const value=success();value[name]={result:status};const child=run(value);assert.notEqual(child.status,0,JSON.stringify({name,status,stdout:child.stdout,stderr:child.stderr}));
  }
  const missing=success();delete missing[name];assert.notEqual(run(missing).status,0);
  const missingResult=success();missingResult[name]={};assert.notEqual(run(missingResult).status,0);
 }
 for(const value of [{},null,[],{...success(),unexpected:{result:'success'}},'{malformed'])assert.notEqual(run(value).status,0);
});

test('every actual stage verifier rejects missing malformed or mismatched immutable SHA',limits,()=>{
 const root=mkdtempSync(join(tmpdir(),'router-immutable-gate-source-'));
 const git=args=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','commit.gpgSign=false','-c','gc.auto=0','-c','maintenance.auto=false',...args],{cwd:root,encoding:'utf8',timeout:2000,maxBuffer:1048576});
 try{
  git(['init','--template=']);writeFileSync(join(root,'original.txt'),'independent immutable gate input\n');git(['add','--','original.txt']);
  git(['-c','user.name=Router gate source case','-c','user.email=gate@example.invalid','commit','-m','independent immutable input']);
  const sha=git(['rev-parse','HEAD']).trim();assert.match(sha,/^[a-f0-9]{40}$/u);const other=(sha==='a'.repeat(40)?'b':'a').repeat(40),gate=workflow();
  for(const id of stages){
   const steps=gate.jobs[id].steps,checkout=steps.find(step=>step.uses?.startsWith('actions/checkout@'));assert.equal(checkout.with.ref,'${{ inputs.sha }}');
   const verifiers=steps.filter(step=>step.env?.EXPECTED_SHA);assert.equal(verifiers.length,1);assert.equal(verifiers[0].env.EXPECTED_SHA,'${{ inputs.sha }}');const source=program(verifiers[0]);
   assert.equal(execute(source,{EXPECTED_SHA:sha},root).status,0,id);
   for(const expected of ['',other,'main','A'.repeat(40),sha+'\n'])assert.notEqual(execute(source,{EXPECTED_SHA:expected},root).status,0,JSON.stringify({id,expected}));
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});
