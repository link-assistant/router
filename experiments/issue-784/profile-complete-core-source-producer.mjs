// One finite complete original source-producer call; sampling is diagnostic.
import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {prepareWholeOwnerCoreProducerCandidate} from '../../tools/translation/prepare-whole-owner-core-producer-candidate.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const prefix='ci-logs/issue-784-restart-2/core-source-current-';
const hash=source=>createHash('sha256').update(source).digest('hex');
const paths=['prepare-whole-owner-core-producer-candidate.mjs',
 'prepare-whole-owner-resolver-candidate.mjs','prepare-whole-owner-derive-candidate.mjs',
 'source-copy-native-bindings.mjs','concrete-syntax-meta.mjs',
 'concrete-phased-equations.mjs','private-parser-execution.mjs',
 'private-parser-phased-equations.mjs','original-json-intrinsics.mjs'];
const sources=paths.map(name=>{
 const path='tools/translation/'+name,source=readFileSync(path,'utf8');
 return {path,source,sha256:hash(source)};
});
const session=new Session();session.connect();
const post=(method,parameters={})=>new Promise((resolve,reject)=>
 session.post(method,parameters,(error,value)=>error?reject(error):resolve(value)));
await post('Profiler.enable');
await post('Profiler.setSamplingInterval',{interval:1000});
await post('Profiler.start');
const started=performance.now();let plan,result;
try{
 plan=prepareWholeOwnerCoreProducerCandidate();
 result=await post('Profiler.stop');
}finally{session.disconnect();}
const elapsedMs=performance.now()-started;
for(const row of sources)assert.equal(readFileSync(row.path,'utf8'),row.source);
for(const group of [plan,plan.resolverProducer,plan.resolverProducer.wholeOwnerProducer])
 for(const row of group.files){
  assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);
  assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);
 }
const record={schema:'complete-Core-source-producer-finite-profile-v1',
 sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 completeDiagnosticSource:readFileSync(new URL(import.meta.url),'utf8'),
 engine:process.versions,elapsedMs,completeAuthorSources:sources,...result,
 originalLimitsChanged:false,receivingQualified:false,performanceGainProved:false,
 productionExecutableGain:0,rustExecuted:false};
const profile=writeCompleteEvidenceJson(prefix+'profile.json',Buffer.from(JSON.stringify(record)));
const proposal=Buffer.from(JSON.stringify(plan));
const output=writeCompleteEvidenceJson(prefix+'full-proposal.json',proposal);
console.log(JSON.stringify({profile,output,elapsedMs,completeProposalBytes:proposal.length,
 completeProposalSha256:hash(proposal),originalLimitsChanged:false,
 receivingQualified:false,performanceGainProved:false,productionExecutableGain:0}));
