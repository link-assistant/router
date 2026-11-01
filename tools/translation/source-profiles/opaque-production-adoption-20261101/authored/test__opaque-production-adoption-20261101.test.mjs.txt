// Complete actual whole-corpus/source chronology integration case SOURCE.
// All implementation/checker/receiving commands below remain UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {inspectOpaqueProductionAdoption} from '../opaque-production-adoption-20261101.mjs';
import {visitOpaqueAdoptionSourceHistory} from '../opaque-production-adoption-20261101-source-history.mjs';
import {withActualPolicySourceUniverse} from '../policy-nominal-producer-20261101-corpus.mjs';
import {createOpaqueAdoptionView,opaqueAdoptionSource,skipOpaqueAdoptionStage,advanceOpaqueAdoptionView,closeOpaqueAdoptionView} from '../opaque-production-adoption-20261101-view.mjs';
import {produceOpaqueJsonFieldStage} from '../opaque-production-adoption-20261101-json-fields.mjs';
import {produceOpaquePrimitiveOptionStage} from '../opaque-production-adoption-20261101-primitive-option.mjs';
import {produceOpaquePrimitiveCallbackStage} from '../opaque-production-adoption-20261101-primitive-callback.mjs';
import {produceOpaqueTextStage} from '../opaque-production-adoption-20261101-text.mjs';
import {produceOpaqueLocalStage} from '../opaque-production-adoption-20261101-local-closure.mjs';
import {exportPartitionedTranslatorBundle} from '../partitioned-export-bundle.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from '../primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {copiedNative,copiedInstalledCompiler,inspectInstalledChild,ROOT,git,exactThrown} from './opaque-production-adoption-20261101-fixtures.mjs';
const options={timeout:60000};
test('real opaque original/adopted attempts retain whole sources/meta and complete original scalar170 receiving parent',options,async t=>{
 const root=await copiedInstalledCompiler(t),received=inspectInstalledChild(root),response=received.result;assert.ok(received.events>0);assert.equal(response.originalOwnersExtracted,false);assert.equal(response.sourceCandidateAuthorizesAdmission,false);assert.equal(response.sourceInstalled,false);assert.equal(response.sourceFiles,received.sourceFiles);assert.equal(response.stages.length,9);assert.equal(response.originalAttempt.phase,'original-project');assert.equal(response.adoptedAttempt.phase,'adopted-project');assert.equal(response.productionCoverageQualified,false);if(response.originalAttempt.metadataProduced)assert.ok(received.attempts.includes('original-project'));if(response.adoptedAttempt.metadataProduced)assert.ok(received.attempts.includes('adopted-project'));assert.ok(received.metadataFields||!response.originalAttempt.metadataProduced&&!response.adoptedAttempt.metadataProduced);assert.ok(response.callbackUtf8OccurrencePeak<=16777216);assert.equal(response.persistentVerdictCache,false);
});
test('all six actual captured/parent source fields and complete adapter originals have full two-phase inverses',options,()=>{
 let count=0;const report=visitOpaqueAdoptionSourceHistory(event=>{assert.equal(event.history.inverse,event.before);assert.equal(transportConcreteSyntaxMeta(event.history.beforeMeta).source,event.before);assert.equal(transportConcreteSyntaxMeta(event.history.afterMeta).source,event.after);assert.deepEqual(event.history.trace.map(row=>row.phase),['language','repository']);count++;return null;});assert.equal(report.sourceRows,count);assert.equal(report.capturedParentRows,3);assert.equal(report.capturedParentRawSourceFields,6);assert.equal(report.originalPhysicalModulesModified,false);assert.equal(report.executionEvidence,'UNRUN');
});
test('independent edited helpers/leaves are never admitted from public matching metadata',options,t=>{
 const root=copiedNative(t),path='rust/src/translation_json_fields_core.rs',original=fs.readFileSync(join(root,path),'utf8');fs.appendFileSync(join(root,path),'\n// independently changed complete native leaf\n');withActualPolicySourceUniverse({root},context=>{const view=createOpaqueAdoptionView(context,()=>null);try{skipOpaqueAdoptionStage(view,'output-owners');skipOpaqueAdoptionStage(view,'local-language');skipOpaqueAdoptionStage(view,'canonical-readers');skipOpaqueAdoptionStage(view,'local-option');skipOpaqueAdoptionStage(view,'qualified-callback-bodies');assert.throws(()=>produceOpaqueJsonFieldStage(view),/complete current owned/);assert.equal(opaqueAdoptionSource(view,path),original+'\n// independently changed complete native leaf\n');assert.throws(()=>advanceOpaqueAdoptionView(view,{semanticAuthority:true,sourceAuthority:true,updates:[],metadata:{unchanged:true}}));}finally{closeOpaqueAdoptionView(view);}});
});
test('original standalone map and local fixture limits remain separate from opaque ingress',options,async()=>{
 const paths=Array.from({length:1025},(_,i)=>['src/independent_'+i+'.rs','']),files=Object.fromEntries(paths);for(const name of ['json-fields','primitive-option','primitive-callback','text']){const api=await import('../opaque-production-adoption-20261101-'+name+'.mjs'),fn=api.proposeCoreJsonFieldCorpus??api.proposeCorePrimitiveOptionMethodCorpus??api.proposeCorePrimitiveOptionCallbackMethodCorpus??api.proposeCoreTextMethodCorpus;assert.throws(()=>fn({entry:paths[0][0],files}),/fields differ/);}const api=await import('../opaque-production-adoption-20261101-local-closure.mjs');assert.throws(()=>api.proposeLocalClosureOptionCandidates({entry:paths[0][0],files:paths.map(([path,source])=>({path,source})),manifest:'',lock:''}),/fixture request/);
});
test('copied compiler child refuses a preloaded shared TS module rather than minting native origin',options,async t=>{
 const root=await copiedInstalledCompiler(t);assert.throws(()=>inspectInstalledChild(root,true),error=>error.status!==0&&/actual private|origin|fresh/i.test(String(error.stderr)));
});
test('actual whole token_report local candidates use the captured selectors without owner extraction',options,t=>{
 const root=copiedNative(t);withActualPolicySourceUniverse({root},context=>{const view=createOpaqueAdoptionView(context,()=>null);try{skipOpaqueAdoptionStage(view,'output-owners');const path='rust/src/token_report.rs',before=opaqueAdoptionSource(view,path),result=produceOpaqueLocalStage(view,'local-language'),summary=advanceOpaqueAdoptionView(view,result),after=opaqueAdoptionSource(view,path);assert.ok(summary.selections>=3);assert.ok(summary.changedFiles>=1);assert.notEqual(after,before);assert.equal(summary.executableAdmission,false);assert.equal(summary.originalClosureEquivalence,false);assert.equal(opaqueAdoptionSource(view,path,{original:true}),before);}finally{closeOpaqueAdoptionView(view);}});
});
