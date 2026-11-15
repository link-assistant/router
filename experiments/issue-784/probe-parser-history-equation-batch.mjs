// Finite comparison of three complete, real parser-history source equations.
// This does not replace an original producer, install source, or qualify a test.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {substitutePrivateConcreteSourceBatches} from '../../tools/translation/private-concrete-substitution-batch-candidate.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../../tools/translation/concrete-syntax-meta.mjs';

const output=process.argv[2],hash=value=>createHash('sha256').update(value).digest('hex');
if(process.argv.length!==3||!/^ci-logs\/issue-784-restart-2\/[a-z0-9-]+\.json\.gz$/u.test(output??''))throw TypeError('One fresh task evidence path required');
const archivePath='tools/translation/source-profiles/private-parser-data-history/originals.json.gz';
const packedArchive=readFileSync(archivePath);
assert.equal(hash(packedArchive),'3a0bbeed8c49432f1df0b8366f890ac98fc73569a87100b36a8fad0f65d4bf5b');
const rawArchive=gunzipSync(packedArchive,{maxOutputLength:1048576});
assert.equal(hash(rawArchive),'8c6f7c90759e843647d052cb19dc0e9c58a9518d0178410ea6512243c243f8ad');
const archive=JSON.parse(rawArchive);
assert.equal(archive.schema,'private-parser-data-before-adoption-source-v1');
assert.equal(archive.files.length,9);
for(const row of archive.files)assert.equal(hash(row.source),row.sha256);
const paths=['private-parser-execution.mjs','private-parser-assignment-data-candidate.mjs','private-concrete-substitution-batch-candidate.mjs'].map(name=>'tools/translation/'+name);
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
const sources=paths.map(path=>{
 const matches=archive.files.filter(row=>row.path===path);assert.equal(matches.length,1);
 return {path,before:matches[0].source,after:readFileSync(path,'utf8')};
});
const requests=sources.map(({before,after})=>({source:before,language:'JavaScript',stages:[
 {phase:'language',expected:after,
  sequence:{languageRules:[rule(before,after,'javascript:compose-complete-original-DATA-adoption')],repositoryRules:[]},
  inverseSequence:{languageRules:[rule(after,before,'javascript:restore-entire-historical-private-source')],repositoryRules:[]}},
 {phase:'repository',expected:after,
  sequence:{languageRules:[],repositoryRules:[{id:'router:preserve-exact-existing-authentication-and-candidate-APIs',edits:[]}]},
  inverseSequence:{languageRules:[],repositoryRules:[]}},
]}));
function standalone(row){
 const first=transportConcreteSyntaxSource(row.source,{language:row.language}),stages=[];
 let document=first.document;
 for(const stage of row.stages){
  const before=document.source,beforeMeta=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(beforeMeta);
  const run=applyConcreteSyntaxSubstitutions(fresh.document,stage.sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);
  const inverse=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(last.document,stage.inverseSequence).value));
  assert.equal(last.source,stage.expected);assert.equal(inverse.source,before);assert.equal(inverse.meta,beforeMeta);
  stages.push({phase:stage.phase,before,after:last.source,beforeMeta,afterMeta,trace:run.trace,completeInverse:true});document=last.document;
 }
 return {beforeMeta:first.meta,afterMeta:serializeConcreteSyntaxMeta(document),inverse:row.source,stages,trace:stages.flatMap(stage=>stage.trace)};
}
const originalStart=performance.now(),original=requests.map(standalone),originalMilliseconds=performance.now()-originalStart;
const batchStart=performance.now(),batch=substitutePrivateConcreteSourceBatches(requests),batchMilliseconds=performance.now()-batchStart;
assert.equal(batch.schema,'private-concrete-source-substitution-batches-v1');
assert.equal(batch.sourceAuthority,false);assert.equal(batch.runtimeAuthority,false);
const actual=batch.rows.map(row=>JSON.parse(row));assert.deepEqual(actual,original);
assert.equal(readFileSync(archivePath).equals(packedArchive),true);
for(const row of sources)assert.equal(readFileSync(row.path,'utf8'),row.after);
const full={schema:'complete-parser-history-sequence-batch-diagnostic-v1',versions:process.versions,
 archive:{path:archivePath,packedSha256:hash(packedArchive),sha256:hash(rawArchive)},sources,requests,original,batch,
 actualRepresentation:'Each complete actual row is JSON.parse(batch.rows[index]); its entire value was deep-compared with original[index].',
 originalMilliseconds,batchMilliseconds,order:['standalone','batch'],sharedModuleInitialization:true,
 sameCompleteCanonicalStagesAndTraces:true,originalReceivingExecuted:false,sourceInstalled:false,
 performanceQualified:false,sourceAuthority:false,runtimeAuthority:false,runtimeParity:false};
console.log(JSON.stringify({originalMilliseconds,batchMilliseconds,sameCompleteCanonicalStagesAndTraces:true,sourceInstalled:false}));
const raw=Buffer.from(JSON.stringify(full));assert.ok(raw.length<=64*1024*1024);
const packed=gzipSync(raw);writeFileSync(output,packed,{flag:'wx'});
assert.equal(gunzipSync(readFileSync(output),{maxOutputLength:64*1024*1024}).equals(raw),true);
console.log(JSON.stringify({schema:full.schema,originalMilliseconds,batchMilliseconds,
 sameCompleteCanonicalStagesAndTraces:true,originalReceivingExecuted:false,sourceInstalled:false,
 completeEvidenceBytes:raw.length,packedBytes:packed.length,packedSha256:hash(packed),
 performanceQualified:false,runtimeParity:false}));
