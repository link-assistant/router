// Whole real ClientKind producer, source-only draft. No owner extraction or new rule.
import {isDeepStrictEqual} from 'node:util';
import {withActualPolicySourceUniverse,policyOriginalEntry,policyOriginalPaths,policyOriginalSource} from './policy-nominal-producer-20261101-corpus.mjs';
import {proposeClientStaticCallers} from './client-static-producer-20261101-callers.mjs';
import {inspectClientStaticProject} from './client-static-producer-20261101-compiler.mjs';
import {visitPolicyProjectMeta,requireSamePolicyProjectMetaPacket} from './policy-nominal-producer-20261101-storage.mjs';
import {withPolicyNominalInstalledSources} from './policy-nominal-producer-20261101-profile.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {PROJECT_META_STORAGE_LIMITS} from './project-meta-consumed-storage.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=message=>{throw TypeError('Actual ClientKind static producer: '+message);};
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

const images=callers=>{const {history,...rest}=callers;return rest;};
function forward(context,consume){
 const entry=policyOriginalEntry(context),callers=proposeClientStaticCallers(entry,policyOriginalSource(context,entry)),fresh=inspectClientStaticProject(context,callers),receipts=[];
 nativeStream(context,callers,callers.after,consume,'original-to-callers',receipts);metaStream(fresh.metadata,consume,receipts,'checked-callers');targetStream(fresh,fresh,consume,receipts);
 return retained({...fresh,schema:'whole-client-static-forward-or-refusal-v1',callers:images(callers),receipts,allCompleteOriginalNativeSourcesDelivered:true,allCompleteMetadataDelivered:true,fullEquationEventsRetained:false,completeProjectMetaRetained:true,exactOriginalRestorationOnly:true,nativeSemanticBodyChanged:false,nativeInstalled:false,sourceInstalled:true,originalBuiltinEquivalent:false});
}
function requireAdmitted(result){if(!result.allSelectedCallersAdmitted){const error=TypeError('Actual ClientKind static producer remains refused; complete original source/meta report retained');error.adoptionReport=result;throw error;}return result;}
export function inspectClientStaticProducer(configuration,consume){requireSynchronousSourceCallback(consume);return withPolicyNominalInstalledSources(()=>withActualPolicySourceUniverse(configuration,context=>forward(context,consume)));}
export function prepareClientStaticProducer(configuration,consume){return requireAdmitted(inspectClientStaticProducer(configuration,consume));}
function targetData(target,edited=false){accountData(target);const keys=edited?'language,source,sourcePath':'language,source';if(!target||Object.keys(target).sort().join(',')!==keys||!['JavaScript','TypeScript'].includes(target.language)||typeof target.source!=='string')fail('whole authoritative paired target DATA required');}
export function invertExactClientStaticTarget(configuration,target,consume){
 requireSynchronousSourceCallback(consume);targetData(target);return withPolicyNominalInstalledSources(()=>withActualPolicySourceUniverse(configuration,context=>{
  const fresh=requireAdmitted(forward(context,consume)),key=target.language==='JavaScript'?'javascript':'typescript';if(fresh[key]!==target.source)fail('stale or changed whole target differs; restoration is not semantic emission');
  for(const path of policyOriginalPaths(context))delivered({kind:'exact-original-native-restoration',path,source:policyOriginalSource(context,path),sourceAuthority:false,semanticAuthority:false},consume);
  return retained({...fresh,schema:'whole-client-static-exact-restoration-v1',nativeRestorationOnly:true,canonicalNativeFromFreshCheckedIR:false});
 }));
}
export function translateEditedClientStaticTarget(configuration,target,consume){
 requireSynchronousSourceCallback(consume);targetData(target,true);return withPolicyNominalInstalledSources(()=>withActualPolicySourceUniverse(configuration,context=>{
  const entry=policyOriginalEntry(context),original=policyOriginalSource(context,entry),callers=proposeClientStaticCallers(entry,original),before=requireAdmitted(inspectClientStaticProject(context,callers)),edited=proposeClientStaticCallers(entry,original,{commandCallee:'display_name'}),after=requireAdmitted(inspectClientStaticProject(context,edited)),key=target.language==='JavaScript'?'javascript':'typescript';
  if(target.sourcePath!==(key==='javascript'?after.javascriptPath:after.typescriptPath)||target.source!==after[key]||before[key]===after[key])fail('closed command-to-display_name edit must reproduce EXACT entire changed target bytes');
  // A fresh second WHOLE original-project candidate recheck is the canonical
  // reproduction. Neither supplied target text nor prior snapshot grants proof.
  const replay=requireAdmitted(inspectClientStaticProject(context,proposeClientStaticCallers(entry,original,{commandCallee:'display_name'})));
  if(replay.javascript!==after.javascript||replay.typescript!==after.typescript||replay[key]!==target.source||!isDeepStrictEqual(replay.probeReports,after.probeReports))fail('full native candidate/fresh paired reproduction differs');
  const receipts=[];nativeStream(context,callers,callers.after,consume,'original-to-callers',receipts);nativeStream(context,callers,edited.after,consume,'callers-to-edited-native',receipts);metaStream(before.metadata,consume,receipts,'before');metaStream(after.metadata,consume,receipts,'after');targetStream(before,after,consume,receipts);
  return retained({...after,schema:'whole-client-static-edited-callee-native-v1',callers:images(edited),canonicalLibrarySource:edited.after,receipts,nativeSemanticBodyChanged:true,authoritativeTargetExactlyReproduced:true,canonicalNativeFromFreshCheckedIR:false,closedSourceCalleeRegeneration:true,exactOriginalRestorationOnly:false,allCompleteOriginalNativeSourcesDelivered:true,allCompleteMetadataDelivered:true,fullEquationEventsRetained:false,completeProjectMetaRetained:true,nativeInstalled:false,sourceInstalled:true});
 }));
}
export function readClientStaticMeta(configuration,submitted,consume){requireSynchronousSourceCallback(consume);return withPolicyNominalInstalledSources(()=>withActualPolicySourceUniverse(configuration,context=>{const fresh=forward(context,consume);requireSamePolicyProjectMetaPacket(submitted,fresh.metadata);return fresh;}));}
