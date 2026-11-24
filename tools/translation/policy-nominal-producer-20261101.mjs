// Actual complete-source producer adapter. All new execution remains UNRUN.
import {isDeepStrictEqual} from 'node:util';
import {withActualPolicySourceUniverse,policyOriginalEntry,policyOriginalPaths,policyOriginalSource} from './policy-nominal-producer-20261101-corpus.mjs';
import {proposeActualPolicyNominalCallers} from './policy-nominal-producer-20261101-callers.mjs';
import {compileActualPolicyNominalProject,inspectActualPolicyNominalProject} from './policy-nominal-producer-20261101-compiler.mjs';
import {visitPolicyProjectMeta,requireSamePolicyProjectMetaPacket} from './policy-nominal-producer-20261101-storage.mjs';
import {selectAuthoritativeAggregateFields} from './aggregate-copy-collection-20261101-syntax.mjs';
import {editAggregateField,emitAggregateNativeBody,aggregateNativeBodyRange,sameAggregateShape} from './aggregate-copy-collection-20261101-ir.mjs';
import {withPolicyNominalInstalledSources} from './policy-nominal-producer-20261101-profile.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {PROJECT_META_STORAGE_LIMITS} from './project-meta-consumed-storage.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=message=>{throw new TypeError('Actual policy nominal producer: '+message);};
const envelope=Object.freeze({maxValues:4096,inputEnvelopeChanged:true,resourceEnvelopeChanged:true,nativeCarrierBoundEnforced:false,targetCarrierBoundEnforced:true,originalUnboundedInputEquivalent:false,boundedReceivingDomainOnly:true,originalProducerMethodsExecuted:false,recordClonedSupported:false,originalPolicyMethodsAdmitted:false,newNominalNativeAbi:false,includesPredecessorOwnedLiteralAbi:true,runtimeExecuted:false,nativeExecuted:false,runtimeParity:false,sourceAuthority:false,semanticAuthority:false});
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function delivered(event,consume){accountData(event);freeze(event);withCompleteSourceClosingFence(()=>{const answer=consume(event);accountData({event,answer});},[]);}
function nativeStream(context,callers,librarySource,consume,phase,receipts){
 const entry=policyOriginalEntry(context);for(const path of policyOriginalPaths(context)){
  const original=policyOriginalSource(context,path),before=phase==='original-to-callers'?original:path===entry?callers.after:original,after=path===entry?librarySource:original,history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];
  if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after||history.trace.length!==2||history.trace[0].phase!=='language'||history.trace[1].phase!=='repository')fail('complete original/caller/native source CST inverse/trace differs');
  delivered({kind:'native-source-equation',phase,path,language:'Rust',history},consume);receipts.push({kind:'native-source-equation',phase,path,completeInverseDelivered:true,actualOrderedTraceDelivered:true});accountData(receipts);
 }
}
function targetStream(before,after,consume,receipts){for(const [language,key,path]of [['JavaScript','javascript',after.javascriptPath],['TypeScript','typescript',after.typescriptPath]]){
 const history=transportConcreteSourceEquations([{before:before[key],after:after[key],language}])[0];if(history.inverse!==before[key]||transportConcreteSyntaxMeta(history.beforeMeta).source!==before[key]||transportConcreteSyntaxMeta(history.afterMeta).source!==after[key]||history.trace.length!==2||history.trace[0].phase!=='language'||history.trace[1].phase!=='repository')fail('complete emitted target CST/source inverse differs');delivered({kind:'target-equation',path,language,history},consume);receipts.push({kind:'target-equation',path,language,completeInverseDelivered:true});accountData(receipts);
}}
function metaStream(packet,consume,receipts,phase){const received=visitPolicyProjectMeta(packet,event=>{
 const answer=consume(Object.freeze({kind:'complete-project-meta-field',phase,...event}));accountData(answer);return answer;
});receipts.push({kind:'complete-project-meta-fields',phase,allCompleteFieldsDelivered:received.allCompleteFieldsDelivered,visited:received.visited,bytes:received.bytes});accountData(receipts);}
function retained(result){
 // Complete field storage retains its ORIGINAL64MiB field/512MiB aggregate;
 // sourceCorpus's ORIGINAL64MiB input domain is separate, never old4MiB.
 const {metadata,javascript,typescript,...header}=result,{text,...metadataHeader}=metadata,metadataRows=metadataHeader.components.map(({text,...row})=>row),counts=accountData({header,metadata:{...metadataHeader,components:metadataRows}});let bytes=counts.utf8Bytes+Buffer.byteLength(javascript)+Buffer.byteLength(typescript)+Buffer.byteLength(metadata.text);for(const row of metadata.components)bytes+=Buffer.byteLength(row.text);if(bytes>PROJECT_META_STORAGE_LIMITS.totalBytes)fail('complete retained metadata/targets/header original aggregate budget');return freeze(result);
}
const callerImages=callers=>{const {history,...images}=callers;return images;};
function forward(context,consume){
 const entry=policyOriginalEntry(context),callers=proposeActualPolicyNominalCallers(entry,policyOriginalSource(context,entry)),fresh=compileActualPolicyNominalProject(context,callers,callers.after),receipts=[];
 nativeStream(context,callers,callers.after,consume,'original-to-callers',receipts);metaStream(fresh.metadata,consume,receipts,'checked-callers');targetStream(fresh,fresh,consume,receipts);
 return retained({...fresh,schema:'actual-whole-policy-nominal-producer-forward-v1',...envelope,sourceInstalled:true,nativeInstalled:false,callers:callerImages(callers),receipts,allCompleteOriginalNativeSourcesDelivered:true,allCompleteMetadataDelivered:true,fullEquationEventsRetained:false,completeProjectMetaRetained:true,nativeSourceChanged:true,nativeSemanticBodyChanged:false,exactOriginalRestorationOnly:true,productionCoverageQualified:false});
}
export function preparePolicyNominalProducer(configuration,consume){
 requireSynchronousSourceCallback(consume);return withPolicyNominalInstalledSources(()=>withActualPolicySourceUniverse(configuration,context=>forward(context,consume)));
}
export function invertExactPolicyNominalTarget(configuration,target,consume){
 requireSynchronousSourceCallback(consume);accountData(target);if(!target||Object.keys(target).sort().join(',')!=='language,source'||!['JavaScript','TypeScript'].includes(target.language)||typeof target.source!=='string')fail('one entire exact emitted target required');
 return withPolicyNominalInstalledSources(()=>withActualPolicySourceUniverse(configuration,context=>{
  const result=forward(context,consume),expected=target.language==='JavaScript'?result.javascript:result.typescript;if(target.source!==expected)fail('edited/stale target differs; exact inverse cannot become a semantic native claim');
  // Full ORIGINAL bytes are delivered, not just a digest or current entry.
  for(const path of policyOriginalPaths(context)){const source=policyOriginalSource(context,path),event={kind:'exact-original-native-restoration',path,source,sourceAuthority:false,semanticAuthority:false};delivered(event,consume);}
  return retained({...result,schema:'actual-policy-exact-original-native-restoration-v1',nativeRestorationOnly:true,canonicalNativeFromFreshCheckedIR:false,exactOriginalRestorationOnly:true});
 }));
}
export function translateEditedPolicyNominalTarget(configuration,target,consume){
 requireSynchronousSourceCallback(consume);accountData(target);if(!target||Object.keys(target).sort().join(',')!=='language,qualifiedName,source,sourcePath'||!['JavaScript','TypeScript'].includes(target.language)||typeof target.source!=='string'||typeof target.qualifiedName!=='string')fail('entire authoritative field-edited target/source selection required');
 return withPolicyNominalInstalledSources(()=>withActualPolicySourceUniverse(configuration,context=>{
  const entry=policyOriginalEntry(context),callers=proposeActualPolicyNominalCallers(entry,policyOriginalSource(context,entry)),before=compileActualPolicyNominalProject(context,callers,callers.after),selected=before.plans.filter(plan=>plan.qualifiedName===target.qualifiedName&&plan.kind==='field');if(selected.length!==1||target.sourcePath!==(target.language==='JavaScript'?before.javascriptPath:before.typescriptPath))fail('actual original owned field caller/path required');
  const prior=selected[0],syntax=selectAuthoritativeAggregateFields({...target,expected:target.language==='JavaScript'?before.javascript:before.typescript,plans:selected}),edited=editAggregateField(prior,syntax.functions[0].field);
  // Current actual SubscriptionOverride client/provider fields have DISTINCT
  // owners. That edit refuses above; no same-tag or equal-width shortcut.
  const span=aggregateNativeBodyRange(callers.after,prior),body=emitAggregateNativeBody(edited),candidate=callers.after.slice(0,span.start)+body+callers.after.slice(span.end);if(candidate.length>8*1024*1024||Buffer.byteLength(candidate)>8*1024*1024)fail('original complete library source bound');
  const checked=compileActualPolicyNominalProject(context,callers,candidate),plans=checked.plans.filter(plan=>plan.qualifiedName===prior.qualifiedName);if(plans.length!==1||!sameAggregateShape(edited,plans[0]))fail('fresh actual changed native owner/field/type/operation shape differs');
  const canonical=callers.after.slice(0,span.start)+emitAggregateNativeBody(plans[0])+callers.after.slice(span.end);if(canonical!==candidate||(target.language==='JavaScript'?checked.javascript:checked.typescript)!==target.source)fail('fresh native re-emission or ENTIRE authoritative target exact reproduction differs');
  const receipts=[];nativeStream(context,callers,callers.after,consume,'original-to-callers',receipts);nativeStream(context,callers,canonical,consume,'callers-to-edited-native',receipts);metaStream(before.metadata,consume,receipts,'before');metaStream(checked.metadata,consume,receipts,'after');targetStream(before,checked,consume,receipts);
  return retained({...checked,schema:'actual-policy-whole-field-edited-native-v1',...envelope,sourceInstalled:true,nativeInstalled:false,source:target.source,language:target.language,sourcePath:target.sourcePath,canonicalLibrarySource:canonical,callers:callerImages(callers),receipts,allCompleteOriginalNativeSourcesDelivered:true,allCompleteMetadataDelivered:true,fullEquationEventsRetained:false,completeProjectMetaRetained:true,nativeSourceChanged:true,nativeSemanticBodyChanged:true,canonicalNativeFromFreshCheckedIR:true,authoritativeTargetExactlyReproduced:true,exactOriginalRestorationOnly:false,productionCoverageQualified:false});
 }));
}
export function readPolicyNominalMeta(configuration,submitted,consume){
 requireSynchronousSourceCallback(consume);return withPolicyNominalInstalledSources(()=>withActualPolicySourceUniverse(configuration,context=>{const fresh=forward(context,consume);requireSamePolicyProjectMetaPacket(submitted,fresh.metadata);return fresh;}));
}
export function requireUnchangedPolicyProjection(left,right){accountData({left,right});if(!isDeepStrictEqual(left,right))fail('complete policy source/owner projection differs');return true;}

export function inspectPolicyNominalProducer(configuration,consume){
 requireSynchronousSourceCallback(consume);return withPolicyNominalInstalledSources(()=>withActualPolicySourceUniverse(configuration,context=>{const entry=policyOriginalEntry(context),callers=proposeActualPolicyNominalCallers(entry,policyOriginalSource(context,entry)),fresh=inspectActualPolicyNominalProject(context,callers,callers.after),receipts=[];nativeStream(context,callers,callers.after,consume,'original-to-callers',receipts);metaStream(fresh.metadata,consume,receipts,'complete-adoption-or-refusal');targetStream(fresh,fresh,consume,receipts);return retained({...fresh,schema:'complete-actual-policy-producer-adoption-or-refusal-v1',...envelope,sourceInstalled:true,nativeInstalled:false,callers:callerImages(callers),receipts,allCompleteOriginalNativeSourcesDelivered:true,allCompleteMetadataDelivered:true,fullEquationEventsRetained:false,completeProjectMetaRetained:true,productionCoverageQualified:false});}));
}
