// Complete source successor composing the existing nine-stage lane with constant188. UNRUN.
import {types} from 'node:util';
import {TranslationError} from './vendor/meta-language/translation/diagnostics.js';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {accountForwardSourceProposalData} from './forward-output-ownership-20261101-source-accounting.mjs';
// Original/final real flat checking. Candidate source never issues admission.
import {opaqueAdoptionEntry,opaqueAdoptionPaths,opaqueAdoptionSource,opaqueAdoptionCargo,emitOpaqueAdoptionEvent} from './opaque-production-adoption-20261101-view.mjs';
import {translateConstantIndexCorpusFlatProject as translateJsonScalarReadersFlatProject} from './constant-index-corpus-20261101.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from './json-macro-inputs.mjs';
import {actualJsonCapabilityProfile} from './json-capabilities.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {storePolicyProjectMeta,visitPolicyProjectMeta} from './policy-nominal-producer-20261101-storage.mjs';
import {PROJECT_META_STORAGE_LIMITS} from './project-meta-consumed-storage.mjs';
import {emitOpaqueSourcePair,emitOpaqueStructuredData,opaqueFailureData} from './opaque-production-adoption-20261101-source-events.mjs';
const originalPrototype=Object.getPrototypeOf,translationPrototype=TranslationError.prototype;
function translationRefusal(value){const seen=new Set();while(value!==null&&(typeof value==='object'||typeof value==='function')){if(types.isProxy(value)||seen.has(value))return false;if(value===translationPrototype)return true;seen.add(value);value=originalPrototype(value);}return false;}
export function inspectOpaqueAdoptionProject(view,phase){
 const entry=opaqueAdoptionEntry(view),paths=opaqueAdoptionPaths(view),cargo=opaqueAdoptionCargo(view),dependencies={manifest:cargo.manifest,lock:cargo.lock};let fresh;
 try{fresh=translateJsonScalarReadersFlatProject({entry,paths,readSource:path=>opaqueAdoptionSource(view,path,{original:phase==='original-project'}),cargoManifest:cargo.manifest,cargoManifestPath:cargo.manifestPath,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),jsonParserProfile:actualJsonCapabilityProfile({...dependencies,compilationProfile:PRODUCTION_PROFILE}),compilationProfile:PRODUCTION_PROFILE});}
 catch(error){if(!translationRefusal(error))return withCompleteSourceClosingFence(()=>{throw error;},[()=>emitOpaqueStructuredData(view,{phase,role:'actual-whole-project-hard-refusal'},opaqueFailureData(error))]);emitOpaqueStructuredData(view,{phase,role:'actual-whole-project-hard-refusal'},opaqueFailureData(error));return Object.freeze({phase,status:'whole-project-hard-refusal',metadataProduced:false,sourceCandidateAuthorizesAdmission:false});}
 emitOpaqueStructuredData(view,{phase,role:'complete-genuine-constant-index-origin-data'},fresh.constantIndexOrigins);
 const javascriptPath=entry.slice(0,-3)+'.mjs',typescriptPath=entry.slice(0,-3)+'.mts',javascript=fresh.javascript,typescript=fresh.typescript;
 // Preserve actual full refusals before consuming large metadata into original
 // field packets; no selected owner or success-only metadata projection.
 const refusals=fresh.meta.refused?.length??0,unloweredItems=fresh.meta.unloweredItems?.length??0;
 const metadata=storePolicyProjectMeta(fresh.meta,{metaPath:'opaque-adoption/'+phase+'.json',javascriptPath,typescriptPath});let bytes=Buffer.byteLength(javascript)+Buffer.byteLength(typescript)+Buffer.byteLength(metadata.text);for(const row of metadata.components)bytes+=Buffer.byteLength(row.text);if(bytes>PROJECT_META_STORAGE_LIMITS.totalBytes)throw TypeError('Original complete retained project output/field aggregate bound');
 const packetJsonAccounting=accountForwardSourceProposalData(metadata),remainingMetaJsonAccounting=accountForwardSourceProposalData(fresh.meta),targetAliasesUtf8Bytes=2*(Buffer.byteLength(javascript)+Buffer.byteLength(typescript));
 const visited=visitPolicyProjectMeta(metadata,event=>{emitOpaqueStructuredData(view,{phase,path:event.path,role:'complete-original-project-metadata-field'},event);return null;});
 emitOpaqueSourcePair(view,{path:javascriptPath,phase,before:javascript,after:javascript,language:'JavaScript'});emitOpaqueSourcePair(view,{path:typescriptPath,phase,before:typescript,after:typescript,language:'TypeScript'});
 const summary=Object.freeze({phase,status:'whole-project-meta',metadataProduced:true,refusals,unloweredItems,completeMetadataFields:visited.visited,completeRetainedOutputUtf8Bytes:bytes,packetJsonUtf8Occurrences:packetJsonAccounting.jsonUtf8Bytes,remainingMetaJsonUtf8Occurrences:remainingMetaJsonAccounting.jsonUtf8Bytes,targetLocalAliasUtf8Occurrences:targetAliasesUtf8Bytes,accountedPublicDataUtf8Occurrences:packetJsonAccounting.jsonUtf8Bytes+remainingMetaJsonAccounting.jsonUtf8Bytes+targetAliasesUtf8Bytes,privateCheckerAndCstRssQualified:false,completeMetadataDelivered:visited.allCompleteFieldsDelivered,sourceCandidateAuthorizesAdmission:false});emitOpaqueAdoptionEvent(view,{kind:'actual-whole-project-attempt',...summary});return summary;
}
