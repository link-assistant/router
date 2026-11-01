// Source-only draft: these cases have not been executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {collectFeedbackCycle,classifyFeedbackCycle,FEEDBACK_STAGES} from '../ci-feedback-cycle.mjs';
import {createGitHubFeedbackAdapter} from '../collect-ci-feedback-cycle.mjs';
const sha='1234567890abcdef1234567890abcdef12345678';
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
  const run={id:17,workflow_id:3,run_attempt:1,path:'.github/workflows/ci.yml',head_sha:sha,status:'completed',
    conclusion:'failure',updated_at:'2026-11-01T00:00:00Z'};
  const job={id:51,run_id:17,run_attempt:1,head_sha:sha,name:'javascript / translation (tests)',
    status:'completed',conclusion:'failure',started_at:'2026-11-01T00:00:00Z',
    completed_at:'2026-11-01T00:01:00Z',steps:[{name:'Complete forward suite',number:3,
      status:'completed',conclusion:'failure'}]};
  const artifact={id:93,name:`node-case-deadlines-translation-${sha}`,expired:false,
    size_in_bytes:3,workflow_run:{id:17,head_sha:sha}};
  const calls=[],api={
    async runAttempt(args){calls.push(['attempt',args]);return {...clone(run),run_attempt:args.attempt};},
    async workflowSource(args){calls.push(['source',args]);return Buffer.from('jobs: complete-original-workload\n');},
    async listRuns(args){calls.push(['runs',args]);return {total_count:1,workflow_runs:[clone(run)]};},
    async listJobs(args){calls.push(['jobs',args]);return {total_count:1,jobs:[clone(job)]};},
    async listArtifacts(args){calls.push(['artifacts',args]);return {total_count:1,artifacts:[clone(artifact)]};},
    async jobLog(args){calls.push(['log',args]);return Buffer.from('FULL RAW\nnot just last lines\n');},
    async artifact(args){calls.push(['zip',args]);return Buffer.from([80,75,3]);},
  };
  return {run,job,artifact,api,calls,options:{repository:'link-assistant/router',sha,workflowIds:[3],api}};
}
test('retains complete raw bytes, both metadata fences, actual attempt and all failed steps',async()=>{
  const f=fixture(),retained=new Map();
  const result=await collectFeedbackCycle({...f.options,onEvidence(name,bytes){retained.set(name,bytes);}});
  assert.equal(result.manifest.completeEvidence,true);
  assert.equal(result.manifest.allRunsSuccessful,false);
  assert.equal(result.manifest.rustAdmission,false);
  assert.equal(result.manifest.verificationQualified,false);
  assert.equal(result.manifest.runs[0].attempt,1);
  assert.deepEqual(result.manifest.failures[0].failedSteps,[f.job.steps[0]]);
  assert.equal(result.files.get('runs/17/attempt-1/jobs/51.log').toString(),'FULL RAW\nnot just last lines\n');
  assert.deepEqual(result.files.get('runs/17/artifacts/93.zip'),Buffer.from([80,75,3]));
  assert.ok(result.files.has('closing/runs/page-1.json'));
  assert.ok(result.files.has('runs/17/attempt-1/closing/jobs/page-1.json'));
  assert.deepEqual([...retained.keys()],[...result.files.keys()]);
  for(const [,args]of f.calls)assert.ok(args.signal instanceof AbortSignal);
});
test('attempt-scoped jobs need no undocumented run_attempt response field',async()=>{
  const f=fixture();delete f.job.run_attempt;
  const {manifest}=await collectFeedbackCycle(f.options);assert.equal(manifest.runs[0].attempt,1);
});
test('all old attempts and failed streams remain captured after a successful rerun',async()=>{
  const f=fixture();f.run.run_attempt=2;f.run.conclusion='success';
  f.api.runAttempt=async args=>({...clone(f.run),run_attempt:args.attempt,conclusion:args.attempt===1?'failure':'success'});
  f.api.listJobs=async args=>({total_count:1,jobs:[{...clone(f.job),id:50+args.attempt,run_attempt:args.attempt,conclusion:args.attempt===1?'failure':'success'}]});
  const {manifest,files}=await collectFeedbackCycle(f.options);assert.equal(manifest.runs.length,2);
  assert.equal(manifest.allRunsSuccessful,true);assert.equal(manifest.allCapturedAttemptsSuccessful,false);
  assert.ok(files.has('runs/17/attempt-1/jobs/51.log'));assert.ok(files.has('runs/17/attempt-2/jobs/52.log'));
  assert.equal(manifest.failures[0].attempt,1);
});
test('failed, cancelled and skipped jobs are retained instead of silently successful',async()=>{
  for(const conclusion of ['failure','cancelled','skipped','timed_out','action_required','neutral']){
    const f=fixture();f.job.conclusion=conclusion;
    const {manifest}=await collectFeedbackCycle(f.options);
    assert.equal(manifest.failures[0].conclusion,conclusion);
  }
});
test('unfinished or missing expected workflows refuse without cancelling anything',async()=>{
  const f=fixture();f.run.status='in_progress';f.run.conclusion=null;
  await assert.rejects(collectFeedbackCycle(f.options),/every discovered workflow/);
  const g=fixture();g.options.workflowIds=[999];
  await assert.rejects(collectFeedbackCycle(g.options),/Missing workflow 999/);
});
test('SHA and attempt drift refuse before an apparently green job can qualify',async()=>{
  const f=fixture();f.job.head_sha='0'.repeat(40);
  await assert.rejects(collectFeedbackCycle(f.options),/Job identity/);
  const g=fixture();g.job.run_attempt=2;
  await assert.rejects(collectFeedbackCycle(g.options),/Job identity/);
});
test('closing rerun, job or artifact changes refuse and already retained evidence survives',async()=>{
  for(const kind of ['runs','jobs','artifacts']){
    const f=fixture(),seen=[];let count=0;
    const method={runs:'listRuns',jobs:'listJobs',artifacts:'listArtifacts'}[kind];
    const original=f.api[method];
    f.api[method]=async args=>{const result=await original(args);if(++count===2){
      if(kind==='runs')result.workflow_runs[0].run_attempt=3;
      if(kind==='jobs')result.jobs[0].conclusion='success';
      if(kind==='artifacts')result.artifacts[0].expired=true;
    }return result;};
    await assert.rejects(collectFeedbackCycle({...f.options,onEvidence(name){seen.push(name);}}),/changed during capture/);
    assert.ok(seen.includes('runs/17/attempt-1/jobs/51.log'));
  }
});
test('expired and inaccessible evidence is explicitly missing and does not abort remaining downloads',async()=>{
  const f=fixture();f.artifact.expired=true;
  f.api.jobLog=async()=>{const error=new Error('Access denied');error.status=403;throw error;};
  const {manifest}=await collectFeedbackCycle(f.options);
  assert.equal(manifest.completeEvidence,false);assert.equal(manifest.missing.length,2);
  assert.ok(manifest.missing.some(row=>row.status===403));
  assert.ok(manifest.missing.some(row=>row.reason==='Expired artifact'));
});
test('byte bounds and unexpected download errors stay fatal, preserving exact primary object',async()=>{
  const f=fixture(),primary={message:'transport failed'};f.api.jobLog=async()=>{throw primary;};
  await assert.rejects(collectFeedbackCycle(f.options),error=>error===primary);
  const g=fixture();g.artifact.size_in_bytes=64*1024*1024+1;
  await assert.rejects(collectFeedbackCycle(g.options),/Advertised artifact exceeds/);
});
test('pagination refuses inconsistent counts, duplicates and short incomplete pages',async()=>{
  for(const shape of ['duplicate','short','count']){
    const f=fixture();
    f.api.listJobs=async()=>({total_count:shape==='count'?-1:2,
      jobs:shape==='duplicate'?[clone(f.job),clone(f.job)]:[clone(f.job)]});
    await assert.rejects(collectFeedbackCycle(f.options),/Duplicate|truncated|Malformed/);
  }
});
test('external abort and synchronous evidence-write errors preserve their primary reason',async()=>{
  const f=fixture(),controller=new AbortController(),reason=new Error('Operator interruption');controller.abort(reason);
  await assert.rejects(collectFeedbackCycle({...f.options,signal:controller.signal}),error=>error===reason);
  const primary=Object.freeze({why:'disk unavailable'});
  await assert.rejects(collectFeedbackCycle({...f.options,onEvidence(){throw primary;}}),error=>error===primary);
});
function completeManifest(){
  const jobs=[],bindings=[];let next=100;
  for(const stage of FEEDBACK_STAGES){
    const members=stage==='translation'?['tests','canonical','owned-definitions']:
      stage==='profile-matrix'?['canonical','owned-definitions']:[null];
    for(const member of members){const job={id:next++,name:`untrusted display ${stage}`,conclusion:'success'};
      jobs.push(job);bindings.push({stage,member,jobId:job.id,runId:17,attempt:2});}
  }
  return {bindings,manifest:{schema:'router-ci-feedback-cycle-v1',sha,
    runs:[{runId:17,attempt:2,jobs}],failures:[],missing:[]}};
}
test('all eleven fixed stage members are needed and a report never grants Rust admission',()=>{
  const f=completeManifest();assert.equal(f.bindings.length,11);
  const report=classifyFeedbackCycle(f.manifest,f.bindings);
  assert.deepEqual(report.absent,[]);assert.equal(report.allExpectedMembersCaptured,true);
  assert.equal(report.rustAdmission,false);assert.equal(report.verificationQualified,false);
  const incomplete=classifyFeedbackCycle(f.manifest,f.bindings.slice(1));
  assert.deepEqual(incomplete.absent,[{stage:'lint',member:null}]);
  assert.ok(incomplete.reopenRequirementIds.includes('J01'));
});
test('explicit failed-member grouping reopens affected requirements and preserves raw references',()=>{
  const f=completeManifest(),binding=f.bindings.find(row=>row.stage==='translation'&&row.member==='tests');
  f.manifest.runs[0].jobs.find(row=>row.id===binding.jobId).conclusion='cancelled';
  const failure={jobId:binding.jobId,rawLog:'runs/17/attempt-1/jobs/123.log'};f.manifest.failures.push(failure);
  const report=classifyFeedbackCycle(f.manifest,f.bindings);
  assert.equal(report.groups[0].conclusion,'cancelled');assert.deepEqual(report.groups[0].evidence,[failure]);
  assert.ok(report.reopenRequirementIds.includes('F01'));
  assert.match(report.groups[0].cause,/unclassified/);
});
test('unbound failures and missing logs remain visible, even with otherwise green gate bindings',()=>{
  const f=completeManifest();f.manifest.failures.push({jobId:999,conclusion:'failure'});
  f.manifest.missing.push({path:'missing.zip'});
  const report=classifyFeedbackCycle(f.manifest,f.bindings);
  assert.equal(report.unassignedFailures.length,1);assert.equal(report.evidenceGaps.length,1);
  assert.ok(report.reopenRequirementIds.includes('T05'));
});
test('duplicated job, matrix member and mismatched attempt bindings refuse',()=>{
  const f=completeManifest();
  assert.throws(()=>classifyFeedbackCycle(f.manifest,[...f.bindings,f.bindings[0]]),/Duplicate stage/);
  const reused=clone(f.bindings);reused[1].jobId=reused[0].jobId;
  assert.throws(()=>classifyFeedbackCycle(f.manifest,reused),/two stage members/);
  const drift=clone(f.bindings);drift[0].attempt=1;
  assert.throws(()=>classifyFeedbackCycle(f.manifest,drift),/Uncaptured gate job/);
});
test('download redirect strips credentials and preserves bytes, refusing unreviewed hosts',async()=>{
  const calls=[],adapter=createGitHubFeedbackAdapter({token:'private-test-token',fetchImpl:async(url,options)=>{
    calls.push({url:String(url),options});return calls.length===1?
      new Response(null,{status:302,headers:{location:'https://example.blob.core.windows.net/logs/signature'}}):
      new Response('complete raw stream');}});
  const bytes=await adapter.jobLog({repository:'link-assistant/router',jobId:51,maxBytes:1024});
  assert.equal(bytes.toString(),'complete raw stream');
  assert.equal(calls[0].options.headers.Authorization,'Bearer private-test-token');
  assert.equal(calls[1].options.headers,undefined);assert.equal(calls[1].options.redirect,'error');
  const forbidden=createGitHubFeedbackAdapter({token:'x',fetchImpl:async()=>new Response(null,
    {status:302,headers:{location:'https://unreviewed.invalid/logs'}})});
  await assert.rejects(forbidden.jobLog({repository:'owner/repo',jobId:1,maxBytes:1024}),/Unrecognized/);
});
test('stream byte bounds are enforced even if content length is absent',async()=>{
  const adapter=createGitHubFeedbackAdapter({token:'x',fetchImpl:async()=>new Response('12345')});
  await assert.rejects(adapter.jobLog({repository:'owner/repo',jobId:1,maxBytes:4}),/Response byte bound/);
});
