// One finite complete project-source comparison; no production output installed.
import {writeFileSync,readFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareProjectFacadeRetention} from '../../tools/translation/prepare-project-facade-retention.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';

const output=process.argv[2];
if(process.argv.length!==3||!output?.startsWith('ci-logs/issue-784-restart-2/'))throw TypeError('One fresh task evidence path required');
const hash=value=>createHash('sha256').update(value).digest('hex');
const sourcePlan=prepareProjectFacadeRetention(),row=sourcePlan.files[0];
const originalStart=performance.now(),original=[];
let document=transportConcreteSyntaxSource(row.before,{language:'JavaScript'}).document;
for(const [phase,before,after]of [['language',row.before,row.language],['repository',row.language,row.after]]){
 const rule={id:'diagnostic:complete-'+phase,edits:[{span:[0,before.length],expected:before,replacement:after}]};
 const run=applyConcreteSyntaxSubstitutions(document,{languageRules:phase==='language'?[rule]:[],repositoryRules:phase==='repository'?[rule]:[]});
 const beforeMeta=serializeConcreteSyntaxMeta(document),afterMeta=serializeConcreteSyntaxMeta(run.value),received=transportConcreteSyntaxMeta(afterMeta);
 const reverse={id:'diagnostic:complete-inverse',edits:[{span:[0,after.length],expected:after,replacement:before}]};
 const restored=applyConcreteSyntaxSubstitutions(received.document,{languageRules:phase==='language'?[reverse]:[],repositoryRules:phase==='repository'?[reverse]:[]});
 const inverse=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(restored.value));
 if(received.source!==after||inverse.source!==before||inverse.meta!==beforeMeta)throw Error('Complete old phase or inverse differs');
 original.push({phase,before,after,beforeMeta,afterMeta,inverse:before});document=received.document;
}
const originalMilliseconds=performance.now()-originalStart;
const currentStart=performance.now(),[current]=transportConcreteSourcePhases([{before:row.before,middle:row.language,after:row.after,language:'JavaScript'}]);
const currentMilliseconds=performance.now()-currentStart;
for(let at=0;at<2;at++)for(const key of ['phase','before','after','beforeMeta','afterMeta','inverse']){
 if(current.stages[at][key]!==original[at][key])throw Error('Complete independent '+key+' differs');
}
const full={schema:'complete-concrete-phase-diagnostic-v1',node:process.versions,sourcePlan,original,current,
 originalMilliseconds,currentMilliseconds,sameCompleteCanonicalStages:true,traceIdsIntentionallyDistinct:true,
 sourceHashes:{before:hash(row.before),middle:hash(row.language),after:hash(row.after)},performanceQualified:false,runtimeParity:false};
const raw=Buffer.from(JSON.stringify(full));if(raw.length>64*1024*1024)throw Error('Finite complete evidence bound');
const packed=gzipSync(raw);writeFileSync(output,packed,{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:64*1024*1024}).equals(raw))throw Error('Full diagnostic readback differs');
console.log(JSON.stringify({schema:full.schema,node:process.version,originalMilliseconds,currentMilliseconds,sourceHashes:full.sourceHashes,
 sameCompleteCanonicalStages:true,traceIdsIntentionallyDistinct:true,completeEvidenceBytes:raw.length,packedBytes:packed.length,packedSha256:hash(packed),performanceQualified:false,runtimeParity:false}));
