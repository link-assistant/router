// Actual opaque-source candidate and receiving case SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {withActualPolicySourceUniverse} from '../policy-nominal-producer-20261101-corpus.mjs';
import {createOpaqueAdoptionViewWithNativeCandidates,opaqueAdoptionSource,closeOpaqueAdoptionView,adoptOpaqueLiteralEditedOutputOwners,opaqueAdoptionViewSummary} from '../opaque-production-adoption-20261101-view.mjs';
import {receiveOpaqueNativeCandidates} from '../opaque-native-candidates-20261101-receiving.mjs';
import {applyLayeredCoreAdoptionSource} from '../opaque-production-adoption-20261101-layered.mjs';
import {copiedNative,ROOT} from './opaque-production-adoption-20261101-fixtures.mjs';
const limits={timeout:60000,concurrency:false};
function patch(source){const at=source.indexOf('"id"');assert.ok(at>=0);return {path:'rust/src/token_report.rs',span:[at,at+4],expected:'"id"',replacement:'"identifier"'};}
test('actual source candidates retain originals and cannot turn observer flags into executable admission',limits,t=>{
 const root=copiedNative(t),source=fs.readFileSync(join(root,'rust/src/token_report.rs'),'utf8'),edit=patch(source);withActualPolicySourceUniverse({root},original=>{const prepared=createOpaqueAdoptionViewWithNativeCandidates(original,[edit],()=>({sourceAuthority:true,semanticAuthority:true}));try{assert.ok(opaqueAdoptionSource(prepared.view,edit.path).includes('"identifier"'));assert.equal(opaqueAdoptionSource(prepared.view,edit.path,{original:true}),source);assert.equal(prepared.summary.executableAdmission,false);assert.equal(prepared.summary.changedFiles,1);const summary=adoptOpaqueLiteralEditedOutputOwners(prepared.view);assert.equal(summary.executableAdmission,false);assert.equal(opaqueAdoptionViewSummary(prepared.view).stages,1);assert.ok(opaqueAdoptionSource(prepared.view,edit.path).includes('"identifier"'));}finally{closeOpaqueAdoptionView(prepared.view);}});
});
test('overlapping or stale native candidates produce no source view or physical writes',limits,t=>{
 const root=copiedNative(t),source=fs.readFileSync(join(root,'rust/src/token_report.rs'),'utf8'),edit=patch(source);for(const edits of [[edit,{...edit,replacement:'"other"'}],[{...edit,expected:'"stale"'}]])assert.throws(()=>withActualPolicySourceUniverse({root},original=>createOpaqueAdoptionViewWithNativeCandidates(original,edits,()=>null)));assert.equal(fs.readFileSync(join(root,edit.path),'utf8'),source);
});
test('duplicate-helper repair preserves the complete standalone source splice API',limits,()=>{
 const source='pub fn f()->u64{0_u64}',result=applyLayeredCoreAdoptionSource(source,[],{languageRule:'language:independent-empty-source',repositoryRule:'repository:independent-empty-binding',bindings:[{native:'crate::translation_core::',neutral:'::translation_compatibility_format::'}]});assert.equal(result.before.source,source);assert.equal(result.after.source,source);assert.equal(result.executableAdmission,false);
});
test('complete receiving checks physical original, native candidate and adopted targets before actual changed header execution',limits,t=>{
 const source=fs.readFileSync(join(ROOT,'rust/src/token_report.rs'),'utf8'),edit=patch(source),labels=['identifier','issued_at','expires_at','revoked','requests','tokens','reserved','rpm','scope'],widths=[36,10,10,8,13,15,9,8,6],expected=labels.map((value,at)=>value+' '.repeat(Math.max(0,widths[at]-Array.from(value).length))+'  ').join('')+'label\n';
 const received=receiveOpaqueNativeCandidates(t,{operation:'inspect',nativeEdits:[edit],verifyTargets:[{name:'token_report.print_table',phase:'adopted-project',arguments:[[]],stdout:expected}]},{startedAt:performance.now()});assert.equal(received.report.cleanupSucceeded,true);assert.equal(received.packet.ok,true,JSON.stringify(received.packet.error));const result=received.packet.result;assert.equal(result.nativeCandidateAttempt.metadataProduced,true);assert.equal(result.nativeCandidateSource.changedFiles,1);assert.deepEqual(result.targetPhases.map(row=>row.phase),['original-project','native-candidate-project','adopted-project']);assert.equal(result.targetReceiving.strictTypeScriptExecuted,true);assert.equal(result.targetReceipts.filter(row=>row.stage==='actual-token-report-edge-vectors').length,2);assert.equal(result.targetReceipts.filter(row=>row.stage==='actual-target-case').length,2);assert.equal(result.productionCoverageQualified,false);
});
