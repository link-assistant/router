// Independent whole-source composition and row receiving cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {receiveOpaqueConstantAdoption,opaqueConstantAdoptionReadSource} from '../opaque-constant-adoption-20261101-receiving.mjs';
import {visitOpaqueConstantAdoptionSourceEquations} from '../opaque-constant-adoption-20261101-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60000,concurrency:false};
function receive(t,payload){const value=receiveOpaqueConstantAdoption(t,payload,{startedAt:performance.now()});assert.equal(value.report.cleanupSucceeded,true);return value;}
function complete(value){assert.equal(value.packet.ok,true,JSON.stringify(value.packet.error));return value.packet.result;}
test('five complete original/combined copies and all case/vector sources retain full CST inverses',limits,()=>{
 const paths=new Set();let author=false;const result=visitOpaqueConstantAdoptionSourceEquations(event=>{assert.equal(event.history.inverse,event.before);assert.equal(transportConcreteSyntaxMeta(event.history.beforeMeta).source,event.before);assert.equal(transportConcreteSyntaxMeta(event.history.afterMeta).source,event.after);assert.deepEqual(event.history.trace.map(row=>row.phase),['language','repository']);paths.add(event.path);if(event.role==='complete-source-author')author=true;assert.equal(event.sourceAuthority,false);assert.equal(event.semanticAuthority,false);return null;});
 assert.equal(result.copyRows,5);assert.equal(result.visited,12);assert.equal(paths.size,12);assert.equal(author,true);assert.ok(paths.has('tools/translation/test/token-report-translation-edges-20261101-cases.mjs'));assert.equal(result.sourceInstalled,false);
});
test('combined complete corpus requires both fresh original/adopted targets and the actual nine source stages',limits,t=>{
 const received=receive(t,{operation:'inspect'}),result=complete(received);assert.equal(received.report.compilerSourceCohort.compilerAndProfilesTracked,true);assert.ok(received.report.compilerSourceCohort.records.some(row=>row.path==='tools/translation/opaque-constant-adoption-20261101.mjs'));assert.ok(received.report.compilerSourceCohort.records.some(row=>row.path==='tools/translation/test/token-report-translation-edges-20261101-cases.mjs'));assert.equal(result.compilerSourceVersions,188);assert.equal(result.originalOwnersExtracted,false);assert.equal(result.wholeOriginalModuleGraphRetained,true);assert.equal(result.allOriginalRawSourcesDelivered,true);assert.equal(result.productionCoverageQualified,false);assert.equal(result.runtimeExecuted,false);assert.deepEqual(result.targetPhases.map(row=>row.phase),['original-project','adopted-project']);
 assert.deepEqual(result.stages.map(row=>row.stage),['output-owners','local-language','canonical-readers','local-option','qualified-callback-bodies','json-fields','primitive-option','primitive-callback','text']);
 assert.equal(result.originalAttempt.metadataProduced,true);assert.equal(result.adoptedAttempt.metadataProduced,true);for(const phase of result.targetPhases){assert.equal(typeof phase.javascript,'string');assert.equal(typeof phase.typescript,'string');assert.ok(phase.javascript.length);assert.ok(phase.typescript.length);}
});
test('all nine independent actual token-row vectors execute JS and separately strict-compiled TS without extracted owners or skipped inputs',limits,t=>{
 const result=complete(receive(t,{operation:'inspect',verifyTargets:[]}));assert.equal(result.targetReceiving.javascriptExecuted,true);assert.equal(result.targetReceiving.strictTypeScriptExecuted,true);assert.equal(result.targetReceiving.version,'5.9.3');assert.equal(result.targetReceiving.runtimeParity,false);
 const rows=result.targetReceipts.filter(row=>row.stage==='actual-token-report-edge-vectors');assert.equal(rows.length,2);assert.deepEqual(new Set(rows.map(row=>row.language)),new Set(['JavaScript','TypeScript']));for(const row of rows){assert.equal(row.phase,'adopted-project');assert.equal(row.cases,9);assert.equal(row.caller,'token_report::row');assert.equal(row.assertionsCompleted,true);assert.equal(row.nativeParityQualified,false);assert.equal(row.coverageAuthority,false);}
 const strict=result.targetReceipts.filter(row=>row.stage==='strict-typescript');assert.equal(strict.length,2);assert.ok(strict.every(row=>row.passed));
});
for(const operation of ['source-caught','source-replace','source-primary'])test('complete copied source '+operation+' retains genuine source closing and original primary rules',limits,t=>{
 const value=receive(t,{operation});if(operation==='source-primary')assert.equal(value.packet.result.allExactPrimariesPreserved,true);else assert.equal(value.packet.ok,false);
});
test('untracked installed native leaf and whole-corpus edited inverse cannot masquerade as complete translation',limits,t=>{
 assert.equal(receive(t,{operation:'inspect',omitInstalledNativeLeaf:true}).packet.ok,false);
 const inverse=receive(t,{operation:'inverse-cell',language:'JavaScript'});assert.equal(inverse.packet.ok,false);assert.match(inverse.packet.error.message,/whole-corpus semantic edited inverse remains unsupported/);
});
test('source visitors preserve exact callback primaries and bounded input reads refuse before I/O',limits,()=>{
 for(const primary of [undefined,null,false,0,'',Object.freeze(Error('combined source primary'))]){let failed=false,actual;try{visitOpaqueConstantAdoptionSourceEquations(()=>{throw primary;});}catch(error){failed=true;actual=error;}assert.equal(failed,true);assert.strictEqual(actual,primary);}
 let calls=0;const invalid={get path(){calls++;return 'unused';}};assert.throws(()=>opaqueConstantAdoptionReadSource(invalid,1));assert.throws(()=>opaqueConstantAdoptionReadSource('unused',-1));assert.equal(calls,0);
});
