// DEFERRED original collectors; do not execute in the source-drafting phase.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeSync} from 'node:fs';
import {readSelectedGitSizeRecords} from '../tools/translation/selected-git-size-records.mjs';
import {collectDraftScopeRustObservations} from '../tools/translation/draft-scope-20261102-collector.mjs';
import {collectDraftScopeTargetObservations} from '../tools/translation/draft-scope-20261102-target-collector.mjs';
import {collectedScopeEvidencePaths,reconcileCollectedScopeBatch} from '../tools/translation/collected-scope-reconciliation-20261103.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from '../tools/translation/primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from '../tools/translation/complete-source-closing-fence.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from '../tools/translation/source-failure-operations.mjs';
import {createDiscoveredRulePipeline} from '../tools/translation/rule-registry.mjs';
import {draftInventoryPath} from '../tools/translation/draft-inventory-reconciliation.mjs';
import {withProtectedNativeWriter,captureActiveNativeSourceVetoLease} from '../tools/translation/protected-native-writers-20261102.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..'),fail=message=>{throw TypeError('Collected Router draft scope: '+message);};
function originalGit(args,options){
 const nil=process.platform==='win32'?'NUL':'/dev/null',env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:nil,GIT_CONFIG_SYSTEM:nil,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_PAGER:'cat'};
 return execFileSync('git',['-c','core.hooksPath='+nil,'-c','gc.auto=0','-c','maintenance.auto=false',...args],{cwd:ROOT,env,maxBuffer:40*1024*1024,timeout:20000,...options});
}
const physical=path=>path.startsWith('rust/')||path.startsWith('js/')||path.startsWith('ts/')||['Cargo.toml','Cargo.lock','package.json'].includes(path);
const language=path=>path.startsWith('rust/')&&path.endsWith('.rs')?'Rust':(path.startsWith('js/')||path.startsWith('ts/'))&&/\.(?:[cm]?[jt]s|[jt]sx)$/u.test(path)?'Target':null;
const sha1=(body,bytes)=>createHash('sha1').update('blob '+bytes+'\0').update(body).digest('hex');
function freeze(value,seen=new Set()){
 if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const child of Object.values(value))freeze(child,seen);Object.freeze(value);}return value;
}
/** One complete immutable revision; streamed DATA events, no report file writer,
 * no worktree reads, no new native/parser/owner/verdict cache across operations. */
export function collectRouterDraftScope({revision,assignments=[],run=originalGit}={},consume){
 requireSynchronousSourceCallback(run);requireSynchronousSourceCallback(consume);accountData(assignments);assignments=structuredClone(assignments);
 if(typeof revision!=='string'||!/^[a-f0-9]{40}$/u.test(revision))fail('one explicit immutable full revision required');
 const metadataRun=(args,options)=>{const raw=run(args,options);if(!Buffer.isBuffer(raw)||!Buffer.from(raw.toString('utf8')).equals(raw))fail('complete immutable Git metadata UTF8 required');if(args[0]==='ls-tree'&&raw.length&&raw[raw.length-1]!==0)fail('complete NUL-terminated tree census required');return raw;};
 const extra=new Set(collectedScopeEvidencePaths(assignments)),selection={run:metadataRun,revision,select:path=>physical(path)||extra.has(path),maxPaths:100000,maxFileBytes:8*1024*1024,maxTotalBytes:512*1024*1024};
 return withSourceFailureOperation(()=>{
  const selected=withSourceInputValidation(()=>readSelectedGitSizeRecords(selection));
  const paths=new Set(),sources=selected.map(row=>{const at=row.indexOf('\t'),[mode,,blob,bytes]=row.slice(0,at).split(' '),path=draftInventoryPath(row.slice(at+1));if(paths.has(path)||!['100644','100755','120000'].includes(mode))fail('unique ordinary physical source records required');paths.add(path);return {revision,path,mode,blob,bytes:Number(bytes)};});
  const seenIds=new Set();let observationIdBytes=0,delivered=0,observations=0,assigned=0,stale=0,unresolved=0,refusedBatches=0;
  function emit(event){accountData(event);freeze(event);return withCompleteSourceClosingFence(()=>{const answer=consume(event);accountData(answer);delivered++;return null;},[]);}
  const current=()=>withSourceInputValidation(()=>{const after=readSelectedGitSizeRecords(selection);if(after.length!==selected.length||after.some((row,at)=>row!==selected[at]))fail('complete immutable source census changed');});
  function read(origin){return withSourceInputValidation(()=>{
   const raw=run(['cat-file','blob',origin.blob]);if(!Buffer.isBuffer(raw)||raw.length!==origin.bytes||sha1(raw,raw.length)!==origin.blob)fail('complete immutable source body differs');
   const source=raw.toString('utf8');if(!Buffer.from(source).equals(raw))fail('complete original source UTF8 required');return {source,origin};
  });}
  function processBatch(kind,origins){
   const files=origins.map(read),close=()=>withSourceInputValidation(()=>{for(const file of files)if(read(file.origin).source!==file.source)fail('closing complete original source body differs');});
   return withCompleteSourceClosingFence(()=>{
    const pipeline=createDiscoveredRulePipeline([
     {phase:'language',id:'language:complete-original-CST-and-native-scope-observations',apply:()=>kind==='Rust'?collectDraftScopeRustObservations({files}):collectDraftScopeTargetObservations({files})},
     {phase:'repository',id:'repository:numbered-actual-adoptions-and-all-evidence-source-joins',requires:['language:complete-original-CST-and-native-scope-observations'],apply:native=>{
      const reconciliation=reconcileCollectedScopeBatch({sources,observations:native.observations,assignments});return {native,reconciliation};
     }},
    ],['repository:numbered-actual-adoptions-and-all-evidence-source-joins']),result=pipeline.run(null),value=result.value,trace=result.trace;
    try{accountData(value);}
    catch(error){
     // Only the new complete DATA-output domain may refuse this batch here.
     // Original native/input/source failures propagate through all closing
     // checks; do not retry them for every remaining batch or hide a veto.
     refusedBatches++;emit({kind:'refused-observation-batch',revision,language:kind,sources:origins,refusal:error instanceof Error?{name:error.name,message:error.message}:{name:'ThrownValue',message:'non-Error primary'},productionFunctionDenominator:null,semanticAuthority:false});return;
    }
    for(const row of value.reconciliation.rows){if(seenIds.has(row.id))fail('observation repeated across complete batches');seenIds.add(row.id);observationIdBytes+=row.id.length;if(seenIds.size>200000||observationIdBytes>16*1024*1024)fail('aggregate observation locator retention bound');}
    observations+=value.reconciliation.observations;assigned+=value.reconciliation.assignedObservations;stale+=value.reconciliation.staleObservations;unresolved+=value.reconciliation.unresolvedObservations;
    emit({kind:'native-observation-batch',revision,language:kind,trace,ruleDiscovery:pipeline.discovery,...value,sourceAuthority:false,semanticAuthority:false});
   },[close,()=>{files.length=0;}]);
  }
  return withCompleteSourceClosingFence(()=>{
   // The complete physical census includes non-code/package/build/generated
   // assets. Every source retains explicit role/configuration/producer review.
   for(let at=0;at<sources.length;at+=128)emit({kind:'physical-source-census',revision,sources:sources.slice(at,at+128),roleReview:'OPEN',configurationAndProducerReview:'OPEN',semanticAuthority:false});
   for(const kind of ['Rust','Target']){
    let batch=[],bytes=0;
    for(const origin of sources)if(language(origin.path)===kind){
     // Whole oversized files remain whole. Each original collector preserves
     // its own file domain/refusal rather than truncating or raising a bound.
     if(batch.length&&(batch.length>=16||bytes+origin.bytes>524288)){processBatch(kind,batch);batch=[];bytes=0;}
     batch.push(origin);bytes+=origin.bytes;
    }if(batch.length)processBatch(kind,batch);
   }
   const unmatched=assignments.filter(row=>!seenIds.has(row.observation)).map(row=>row.observation);
   for(let at=0;at<unmatched.length;at+=128)emit({kind:'unmatched-adoption-evidence',revision,observations:unmatched.slice(at,at+128),gap:'original-observation-removed-changed-refused-or-not-collected',semanticAuthority:false});
   current();return {schema:'router-complete-collected-draft-scope-20261103-v1',revision,collectionCompleted:true,physicalSources:sources.length,observations,assignedObservations:assigned,unassignedObservations:observations-assigned,staleObservations:stale,unresolvedObservations:unresolved,unmatchedAssignments:unmatched.length,refusedBatches,deliveredEvents:delivered,sourceRoleReview:'OPEN',configurationAndProducerReview:'OPEN',completeProductionScope:false,productionFunctionDenominator:null,translationCoverage:null,draftedRequirements:null,semanticAuthority:false,verification:'UNRUN'};
  },[current,()=>{seenIds.clear();paths.clear();sources.length=0;selected.length=0;}]);
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length<1||args.length>2)fail('Use FULL_SHA [SOURCE_REVIEWED_ADOPTION_JSON]');
 let assignments=[];if(args[1]){const raw=readFileSync(args[1]);if(raw.length>16*1024*1024)fail('adoption registry byte bound');const text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('adoption UTF8 required');assignments=JSON.parse(text);}
 function write(event){
  const budget=accountData(event);if(budget.utf8Bytes*6+budget.cells*4>32*1024*1024)fail('complete worst-case escaped event wire reservation bound');
  const bytes=Buffer.from(JSON.stringify(event)+'\n');if(bytes.length>32*1024*1024)fail('complete event wire bound');
  // Synchronous bounded writes avoid Node stdout's unbounded queued buffers.
  // A stalled/erroring consumer fails; this loop never polls EAGAIN or sleeps.
  const lease=captureActiveNativeSourceVetoLease();return withCompleteSourceClosingFence(()=>{
   lease.streams(ROOT,[1]);let offset=0,calls=0;while(offset<bytes.length){if(++calls>4096)fail('complete event write-progress bound');const count=writeSync(1,bytes,offset,Math.min(bytes.length-offset,1048576));if(!Number.isSafeInteger(count)||count<1)fail('complete event writer made no progress');offset+=count;}
  },[()=>lease.close()]);
 }
 withProtectedNativeWriter(ROOT,()=>{
  const summary=collectRouterDraftScope({revision:args[0],assignments},event=>write(event));
  write({kind:'scope-summary',...summary});process.exitCode=2;
 });
}
