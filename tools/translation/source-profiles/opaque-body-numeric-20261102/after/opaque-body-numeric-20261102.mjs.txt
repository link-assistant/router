// Complete source successor composing the existing nine-stage lane with constant188. UNRUN.
import {fileURLToPath} from 'node:url';
import {repositoryRustLayout} from './repository-layout.mjs';
// Complete original opaque source adoption lane. SOURCE ONLY / UNRUN.
import {withActualPolicySourceUniverse,policyOriginalPaths,policyOriginalSource,policyOriginalCargo} from './policy-nominal-producer-20261101-corpus.mjs';
import {visitCapturedOptionSourceHistory} from './local-closure-option-captured-20261101-source-history.mjs';
import {createOpaqueAdoptionViewWithNativeCandidates,adoptOpaqueLiteralEditedOutputOwners as adoptOpaqueOriginalOutputOwners,opaqueAdoptionPaths,opaqueAdoptionSource,advanceOpaqueAdoptionView,skipOpaqueAdoptionStage,assertOpaqueAdoptionView,opaqueAdoptionViewSummary,closeOpaqueAdoptionView,emitOpaqueAdoptionEvent} from './opaque-production-adoption-20261101-view.mjs';
import {emitOpaqueSourcePair,emitOpaqueText,emitOpaqueStructuredData,opaqueFailureData,isOpaqueCandidateRefusal} from './opaque-production-adoption-20261101-source-events.mjs';
import {produceOpaqueJsonFieldStage} from './opaque-production-adoption-20261101-json-fields.mjs';
import {produceOpaquePrimitiveOptionStage} from './opaque-production-adoption-20261101-primitive-option.mjs';
import {produceOpaquePrimitiveCallbackStage} from './opaque-production-adoption-20261101-primitive-callback.mjs';
import {produceOpaqueTextStage} from './opaque-production-adoption-20261101-text.mjs';
import {produceOpaqueLocalStage} from './opaque-production-adoption-20261101-local-closure.mjs';
import {produceOpaqueCanonicalReaderStage} from './scoped-carrier-adoption-20261101-canonical-readers.mjs';
import {produceOpaqueQualifiedCallbackBodyStage} from './scoped-carrier-adoption-20261101-callback-bodies.mjs';
import {inspectOpaqueAdoptionProject} from './opaque-body-numeric-20261102-corpus-result.mjs';
import {withOpaqueBodyNumericSources as withOpaqueAdoptionSources} from './opaque-body-numeric-20261102-history.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const stages=Object.freeze([['local-language',view=>produceOpaqueLocalStage(view,'local-language')],['canonical-readers',produceOpaqueCanonicalReaderStage],['local-option',view=>produceOpaqueLocalStage(view,'local-option')],['qualified-callback-bodies',produceOpaqueQualifiedCallbackBodyStage],['json-fields',produceOpaqueJsonFieldStage],['primitive-option',produceOpaquePrimitiveOptionStage],['primitive-callback',produceOpaquePrimitiveCallbackStage],['text',produceOpaqueTextStage]]);
export function inspectOpaqueBodyNumeric(configuration,nativeEdits,consume){
 requireSynchronousSourceCallback(consume);return withActualPolicySourceUniverse(configuration,original=>inspectOpaqueBodyNumericWithContext(original,configuration,nativeEdits,consume));
}
export function inspectOpaqueBodyNumericWithContext(original,configuration,nativeEdits,consume){
 requireSynchronousSourceCallback(consume);return withOpaqueAdoptionSources(()=>{
  const layout=repositoryRustLayout(Object.hasOwn(configuration,'root')?configuration.root:fileURLToPath(new URL('../../',import.meta.url))),prepared=createOpaqueAdoptionViewWithNativeCandidates(original,nativeEdits,consume),view=prepared.view;return withCompleteSourceClosingFence(()=>{
   // All captured physical originals, including unreachable files, are delivered
   // before checking. Oversized CST inputs retain full raw chunks + refusal.
   for(const path of policyOriginalPaths(original)){const source=policyOriginalSource(original,path);emitOpaqueSourcePair(view,{path,phase:'complete-original-corpus',before:source,after:source});}
   const cargo=policyOriginalCargo(original);if(cargo.manifestPath!==layout.manifest)throw TypeError('Actual captured Cargo/layout coordinate differs');for(const path of layout.cargoInputs){const source=policyOriginalSource(original,path);if(source===null)emitOpaqueAdoptionEvent(view,{kind:'complete-original-cargo-absence',phase:'complete-original-cargo',path,available:false,cstClaimed:false});else emitOpaqueText(view,{phase:'complete-original-cargo',role:path===layout.manifest?'manifest':path===layout.lock?'lock':'workspace-manifest',path,cstClaimed:false},source);}
   visitCapturedOptionSourceHistory(event=>{emitOpaqueStructuredData(view,{phase:'complete-local-selector-parent-successor',role:'all-six-original-and-captured-source-fields'},event);return null;});
   const before=inspectOpaqueAdoptionProject(view,'original-project'),native=inspectOpaqueAdoptionProject(view,'native-candidate-project'),reports=[];try{const output=adoptOpaqueOriginalOutputOwners(view);emitOpaqueAdoptionEvent(view,{kind:'actual-whole-candidate-stage-complete',...output});reports.push(output);}catch(error){assertOpaqueAdoptionView(view);if(!isOpaqueCandidateRefusal(error))return withCompleteSourceClosingFence(()=>{throw error;},[()=>emitOpaqueStructuredData(view,{phase:'output-owners',role:'fatal-source-candidate-failure'},opaqueFailureData(error))]);skipOpaqueAdoptionStage(view,'output-owners');emitOpaqueStructuredData(view,{phase:'output-owners',role:'actual-whole-candidate-stage-refusal'},opaqueFailureData(error));reports.push(Object.freeze({stage:'output-owners',status:'source-candidate-hard-refusal',sourceAuthority:false,executableAdmission:false}));}
   for(const [stage,produce]of stages){let token;try{token=produce(view);}catch(error){assertOpaqueAdoptionView(view);if(!isOpaqueCandidateRefusal(error))return withCompleteSourceClosingFence(()=>{throw error;},[()=>emitOpaqueStructuredData(view,{phase:stage,role:'fatal-source-candidate-failure'},opaqueFailureData(error))]);skipOpaqueAdoptionStage(view,stage);emitOpaqueStructuredData(view,{phase:stage,role:'actual-whole-candidate-stage-refusal'},opaqueFailureData(error));reports.push(Object.freeze({stage,status:'source-candidate-hard-refusal',sourceAuthority:false,executableAdmission:false}));continue;}const summary=advanceOpaqueAdoptionView(view,token);emitOpaqueAdoptionEvent(view,{kind:'actual-whole-candidate-stage-complete',...summary});reports.push(summary);}
   for(const path of opaqueAdoptionPaths(view))emitOpaqueSourcePair(view,{path,phase:'complete-original-to-final-adopted-corpus',before:opaqueAdoptionSource(view,path,{original:true}),after:opaqueAdoptionSource(view,path)});
   const after=inspectOpaqueAdoptionProject(view,'adopted-project'),summary=opaqueAdoptionViewSummary(view);
   return Object.freeze({schema:'whole-original-native-candidate-and-adopted-corpus-20261101',compilerSourceVersions:188,...summary,originalAttempt:before,nativeCandidateAttempt:native,nativeCandidateSource:prepared.summary,adoptedAttempt:after,stages:Object.freeze(reports),allOriginalRawSourcesDelivered:true,wholeOriginalModuleGraphRetained:true,originalOwnersExtracted:false,originalTraitDispatchProved:false,originalBuiltinEquivalent:false,originalClosureEquivalence:false,eagerFormattingMigration:reports[0]?.eagerFormattingMigration===true,stdArgumentsAbi:false,standardStringDropRequired:true,sourceCandidateAuthorizesAdmission:false,productionCoverageQualified:false,runtimeExecuted:false,nativeExecuted:false,sourceInstalled:false,wholeCstDomain:'original2Mi-unit/8Mi-byte/200k-node guards retained; raw wider inputs explicitly refuse',persistentVerdictCache:false});
  },[()=>closeOpaqueAdoptionView(view)]);
 });
}
