// Deferred CI evidence collection. Importing this module performs no I/O.
// This is reporting only: it never unlocks Rust, modifies workflows or runs checks.
import {createHash} from 'node:crypto';

export const FEEDBACK_STAGES=Object.freeze(['lint','node-tests','bun-tests','typescript',
  'parity','translation','profile-matrix','reverse-translation']);
const SHA=/^[a-f0-9]{40}$/;
const TERMINAL=new Set(['success','failure','cancelled','skipped','timed_out','action_required',
  'neutral','stale','startup_failure']);
const MEMBERS=Object.freeze({translation:['tests','canonical','owned-definitions'],
  'profile-matrix':['canonical','owned-definitions']});
const LIMITS=Object.freeze({pages:100,runs:256,jobs:4096,artifacts:4096,
  bytes:128*1024*1024,blobBytes:64*1024*1024,deadlineMs:300000});
const REQUIREMENTS=Object.freeze({
  lint:['J01','J05','Q01'], 'node-tests':['P01','P02','P03','P04','T01','T02','T03'],
  'bun-tests':['P01','P02','P03','P04','T05'],typescript:['F04','V01','Q04','T05'],
  parity:['P01','P02','P03','P04','P05'],translation:['F01','F02','F03','F04','F05','Q01','Q03','Q04'],
  'profile-matrix':['B02','F04','O05','Q04'],'reverse-translation':['V01','V02','V03','V04','V05','S04','Q04'],
});
function requireValue(condition,message){if(!condition)throw new TypeError(message);}
function positive(value){return Number.isSafeInteger(value)&&value>0;}
function hash(bytes){return createHash('sha256').update(bytes).digest('hex');}
function textBytes(value){return Buffer.from(JSON.stringify(value)+'\n','utf8');}
function plain(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function same(left,right){return JSON.stringify(left)===JSON.stringify(right);}
function sortedRuns(rows){return rows.map(row=>[row.id,row.run_attempt,row.workflow_id,
  row.head_sha,row.status,row.conclusion,row.updated_at,row.path]).sort((a,b)=>a[0]-b[0]);}
function sortedJobs(rows){return rows.map(row=>[row.id,row.run_id,row.run_attempt,row.name,
  row.head_sha,row.status,row.conclusion,row.started_at,row.completed_at,row.steps])
  .sort((a,b)=>a[0]-b[0]);}
function sortedArtifacts(rows){return rows.map(row=>[row.id,row.name,row.expired,row.size_in_bytes,
  row.digest,row.updated_at,row.workflow_run]).sort((a,b)=>a[0]-b[0]);}

// Adapter contract: list methods return the unmodified GitHub REST JSON object;
// blobs return complete Uint8Array data. All calls receive one abort signal.
// The adapter must enforce streaming byte limits before materializing a blob.
export async function collectFeedbackCycle({repository,sha,workflowIds,api,signal,
  now=()=>Date.now(),onEvidence=()=>{}}={}){
  requireValue(typeof repository==='string'&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository),'Invalid repository');
  requireValue(SHA.test(sha),'An exact full SHA is required');
  requireValue(Array.isArray(workflowIds)&&workflowIds.length>0&&workflowIds.length<=64&&
    workflowIds.every(positive)&&new Set(workflowIds).size===workflowIds.length,'Explicit unique workflow IDs are required');
  for(const method of ['listRuns','listJobs','listArtifacts','jobLog','artifact','workflowSource','runAttempt'])
    requireValue(typeof api?.[method]==='function',`Missing adapter ${method}`);
  requireValue(typeof onEvidence==='function','Evidence writer must be callable');
  const started=now(),controller=new AbortController(),files=new Map(),missing=[],failures=[];
  let bytes=0;
  const abort=()=>controller.abort(signal?.reason);
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(new Error('CI capture deadline exceeded')),LIMITS.deadlineMs);
  function current(){
    controller.signal.throwIfAborted();
    requireValue(now()-started<=LIMITS.deadlineMs,'CI capture deadline exceeded');
  }
  function retain(name,data){
    current();requireValue(!files.has(name),'Duplicate evidence path');
    requireValue(data instanceof Uint8Array,'Evidence is not complete bytes');
    requireValue(data.byteLength<=LIMITS.blobBytes,'Individual evidence byte bound exceeded');
    requireValue(bytes+data.byteLength<=LIMITS.bytes,'Complete evidence byte bound exceeded');
    const copy=Buffer.from(data);
    const result=onEvidence(name,Buffer.from(copy));
    requireValue(result===undefined,'Evidence writer must complete synchronously');
    files.set(name,copy);bytes+=copy.length;
  }
  async function list(method,args,field,cap,label){
    const rows=[],ids=new Set();let expected;
    for(let page=1;page<=LIMITS.pages;page++){
      current();const raw=await api[method]({...args,page,per_page:100,signal:controller.signal});
      requireValue(plain(raw)&&Number.isSafeInteger(raw.total_count)&&raw.total_count>=0&&
        Array.isArray(raw[field])&&raw[field].length<=100,`Malformed ${label} page`);
      requireValue(raw.total_count<=cap,`${label} count bound exceeded`);
      expected??=raw.total_count;requireValue(raw.total_count===expected,`${label} changed during pagination`);
      retain(`${label}/page-${page}.json`,textBytes(raw));
      for(const row of raw[field]){
        requireValue(plain(row)&&positive(row.id)&&!ids.has(row.id),`Duplicate/malformed ${label} row`);
        ids.add(row.id);rows.push(row);
      }
      requireValue(rows.length<=expected,`${label} count differs`);
      if(rows.length===expected)return rows;
      requireValue(raw[field].length===100,`${label} truncated before total_count`);
    }
    throw new TypeError(`${label} pagination bound exceeded`);
  }
  async function runs(label){
    const rows=await list('listRuns',{repository,sha},'workflow_runs',LIMITS.runs,label);
    for(const row of rows)requireValue(row.head_sha===sha&&positive(row.workflow_id)&&
      positive(row.run_attempt)&&typeof row.path==='string'&&
      /^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(row.path),'Run SHA/workflow/attempt/path differs');
    // Retain every run for this SHA, even workflows outside the expected set.
    // Expected IDs prevent a quiet empty response from meaning a full cycle.
    for(const id of workflowIds)requireValue(rows.some(row=>row.workflow_id===id),`Missing workflow ${id}`);
    requireValue(rows.every(row=>row.status==='completed'&&TERMINAL.has(row.conclusion)),
      'Wait for every discovered workflow run to finish; never cancel unfinished work');
    return rows;
  }
  async function jobs(run,label){
    const rows=await list('listJobs',{repository,runId:run.id,attempt:run.run_attempt},
      'jobs',LIMITS.jobs,label);
    for(const row of rows)requireValue(row.run_id===run.id&&row.head_sha===sha&&
      (row.run_attempt===undefined||row.run_attempt===run.run_attempt)&&row.status==='completed'&&TERMINAL.has(row.conclusion)&&
      typeof row.name==='string'&&Array.isArray(row.steps),'Job identity/attempt/completion differs');
    return rows;
  }
  async function artifacts(run,label){
    const rows=await list('listArtifacts',{repository,runId:run.id},'artifacts',LIMITS.artifacts,label);
    for(const row of rows)requireValue(typeof row.name==='string'&&typeof row.expired==='boolean'&&
      Number.isSafeInteger(row.size_in_bytes)&&row.size_in_bytes>=0&&
      row.workflow_run?.id===run.id&&row.workflow_run?.head_sha===sha,'Artifact origin differs');
    return rows;
  }
  async function download(method,args,name){
    try{current();retain(name,await api[method]({...args,repository,signal:controller.signal,
      maxBytes:Math.min(LIMITS.blobBytes,LIMITS.bytes-bytes)}));}
    catch(error){
      // Access/expiry failures are evidence gaps, never successful captures.
      // Other failures propagate so bounds and local corruption are not hidden.
      if(![403,404,410].includes(error?.status))throw error;
      current();
      missing.push({path:name,status:error.status,reason:String(error.message)});
    }
  }
  try{
    const initial=await runs('opening/runs'),runReceipts=[];
    const sourcePaths=new Set(['.github/workflows/javascript-first.yml',...initial.map(run=>run.path)]);
    for(const sourcePath of sourcePaths)await download('workflowSource',{sha,sourcePath},`source/${sourcePath}`);
    let attempts=0;
    for(const run of initial){
      requireValue(run.run_attempt<=256&&attempts+run.run_attempt<=256,'Complete attempt count bound exceeded');
      attempts+=run.run_attempt;
      const artifactPrefix=`runs/${run.id}`;
      const firstArtifacts=await artifacts(run,`${artifactPrefix}/opening/artifacts`);
      for(const artifact of firstArtifacts){
        const target=`${artifactPrefix}/artifacts/${artifact.id}.zip`;
        if(artifact.expired){missing.push({path:target,reason:'Expired artifact'});continue;}
        requireValue(artifact.size_in_bytes<=LIMITS.blobBytes,'Advertised artifact exceeds bound');
        await download('artifact',{artifactId:artifact.id},target);
      }
      for(let attempt=1;attempt<=run.run_attempt;attempt++){
        const prefix=`runs/${run.id}/attempt-${attempt}`;
        async function attemptState(label){
          current();const raw=await api.runAttempt({repository,runId:run.id,attempt,signal:controller.signal});
          retain(`${prefix}/${label}/attempt.json`,textBytes(raw));
          requireValue(raw.id===run.id&&raw.head_sha===sha&&raw.workflow_id===run.workflow_id&&
            raw.run_attempt===attempt&&raw.path===run.path&&raw.status==='completed'&&
            TERMINAL.has(raw.conclusion),'Original workflow attempt identity/completion differs');return raw;
        }
        const openingAttempt=await attemptState('opening');
        const firstJobs=await jobs(openingAttempt,`${prefix}/opening/jobs`);
        for(const job of firstJobs){
          await download('jobLog',{jobId:job.id},`${prefix}/jobs/${job.id}.log`);
          if(job.conclusion!=='success')failures.push({runId:run.id,attempt,
            jobId:job.id,name:job.name,conclusion:job.conclusion,
            failedSteps:job.steps.filter(step=>step.conclusion&&step.conclusion!=='success').map(step=>({...step})),
            rawLog:`${prefix}/jobs/${job.id}.log`});
        }
        const lastJobs=await jobs(openingAttempt,`${prefix}/closing/jobs`);
        const closingAttempt=await attemptState('closing');
        requireValue(same(sortedJobs(firstJobs),sortedJobs(lastJobs)),'Jobs changed during capture');
        requireValue(same(sortedRuns([openingAttempt]),sortedRuns([closingAttempt])),'Attempt changed during capture');
        runReceipts.push({runId:run.id,attempt,workflowId:run.workflow_id,
          conclusion:openingAttempt.conclusion,jobs:firstJobs.map(job=>({id:job.id,name:job.name,conclusion:job.conclusion})),
          artifacts:firstArtifacts.map(artifact=>({id:artifact.id,name:artifact.name,expired:artifact.expired}))});
      }
      const lastArtifacts=await artifacts(run,`${artifactPrefix}/closing/artifacts`);
      requireValue(same(sortedArtifacts(firstArtifacts),sortedArtifacts(lastArtifacts)),'Artifacts changed during capture');
    }
    const closing=await runs('closing/runs');
    requireValue(same(sortedRuns(initial),sortedRuns(closing)),'Runs changed during capture');
    const manifest={schema:'router-ci-feedback-cycle-v1',repository,sha,
      expectedWorkflowIds:[...workflowIds],capturedAt:new Date(now()).toISOString(),
      observedWindowMs:now()-started,runs:runReceipts,failures,missing,
      completeEvidence:missing.length===0,allCapturedAttemptsSuccessful:runReceipts.every(row=>row.conclusion==='success'),
      allRunsSuccessful:initial.every(run=>run.conclusion==='success'),
      // Deliberately false: a generic reporter cannot authenticate stage jobs,
      // effective workflow source, receipts or actual mandatory command execution.
      rustAdmission:false,verificationQualified:false,
      files:[...files].map(([name,data])=>({name,bytes:data.length,sha256:hash(data)}))};
    retain('manifest.json',textBytes(manifest));
    return {manifest,files};
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}

// A caller supplies an explicit audited job-to-stage/member table. Job-name
// substring matching cannot turn a similarly named supplemental job into a gate.
export function classifyFeedbackCycle(manifest,bindings){
  requireValue(manifest?.schema==='router-ci-feedback-cycle-v1'&&SHA.test(manifest.sha)&&
    Array.isArray(manifest.runs)&&Array.isArray(manifest.failures),'Malformed cycle manifest');
  requireValue(Array.isArray(bindings),'Explicit gate bindings required');
  const keys=new Set(),boundJobs=new Set(),groups=[],reopen=new Set(),byId=new Map();
  for(const run of manifest.runs)for(const job of run.jobs){
    requireValue(!byId.has(job.id),'Duplicate captured job');byId.set(job.id,{...job,runId:run.runId,attempt:run.attempt});
  }
  for(const binding of bindings){
    requireValue(FEEDBACK_STAGES.includes(binding.stage),'Unknown stage');
    const member=binding.member??null,allowed=MEMBERS[binding.stage]??[null];
    requireValue(allowed.includes(member),'Unexpected matrix member');
    const key=`${binding.stage}/${member??'whole'}`;
    requireValue(!keys.has(key),'Duplicate stage/member');keys.add(key);
    requireValue(!boundJobs.has(binding.jobId),'One job cannot satisfy two stage members');
    boundJobs.add(binding.jobId);
    const job=byId.get(binding.jobId);
    requireValue(job&&job.runId===binding.runId&&job.attempt===binding.attempt,'Uncaptured gate job');
    if(job.conclusion!=='success'){
      const requirements=REQUIREMENTS[binding.stage];requirements.forEach(id=>reopen.add(id));
      groups.push({stage:binding.stage,member,jobId:job.id,runId:job.runId,
        conclusion:job.conclusion,requirements:[...requirements],
        // Broad conservative grouping is explicit; no unsupported diagnosis is
        // inferred from a truncated log snippet or a reassuring error name.
        cause:'unclassified: review complete retained raw evidence',
        evidence:manifest.failures.filter(row=>row.jobId===job.id)});
    }
  }
  const absent=[];
  for(const stage of FEEDBACK_STAGES)for(const member of MEMBERS[stage]??[null]){
    if(!keys.has(`${stage}/${member??'whole'}`)){
      absent.push({stage,member});REQUIREMENTS[stage].forEach(id=>reopen.add(id));
    }
  }
  const unassignedFailures=manifest.failures.filter(row=>!boundJobs.has(row.jobId));
  if(unassignedFailures.length||(manifest.missing??[]).length){
    ['J05','T05','Q05'].forEach(id=>reopen.add(id));
  }
  return {schema:'router-ci-repair-worklist-v1',sha:manifest.sha,groups,absent,unassignedFailures,
    evidenceGaps:manifest.missing??[],reopenRequirementIds:[...reopen].sort(),
    allExpectedMembersCaptured:absent.length===0,rustAdmission:false,
    verificationQualified:false};
}
