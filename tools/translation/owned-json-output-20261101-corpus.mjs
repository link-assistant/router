// Whole original source corpus/flat producer. The small fixture request API is
// NOT the complete repository input domain. All execution here remains UNRUN.
import * as project from './project.mjs';
import * as nominal from './nominal-copy-collection-20261101.mjs';
import * as originalJson from './router-core-json-updates.mjs';
import {withGeneralizedPrimitiveOutput} from './generalized-primitive-output-20261101.mjs';
import {withLiteralArgumentsCore} from './literal-arguments-core-20261101.mjs';
import {withAggregateCopyCollectionOperation} from './aggregate-copy-collection-20261101-domain.mjs';
import {withNominalEditedOperation} from './nominal-edited-target-20261101-domain.mjs';
import {withOwnedJsonOutputInstalledSources,noteOwnedJsonOutputSourceFailure} from './owned-json-output-20261101-profile.mjs';
import {withActualPolicySourceUniverse,policyOriginalEntry,policyOriginalPaths,policyOriginalSource,policyOriginalCargo,policyOriginalDescription} from './policy-nominal-producer-20261101-corpus.mjs';
import {storePolicyProjectMeta,visitPolicyProjectMeta} from './policy-nominal-producer-20261101-storage.mjs';
import {proposeOwnedJsonOutputWholeOwners} from './owned-json-output-20261101-production.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from './json-macro-inputs.mjs';
import {actualJsonCapabilityProfile} from './json-capabilities.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {PROJECT_META_STORAGE_LIMITS} from './project-meta-consumed-storage.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=message=>{throw TypeError('Whole original JSON output producer: '+message);};
export function withOwnedJsonOutputCompilerFrames(run,options){
 requireSynchronousSourceCallback(run);return withOwnedJsonOutputInstalledSources(()=>originalJson.withOriginalJsonOutputClosureOperation(()=>withGeneralizedPrimitiveOutput(()=>withAggregateCopyCollectionOperation(()=>withNominalEditedOperation(()=>withLiteralArgumentsCore(()=>nominal.withNominalCopyCollections(run)),noteOwnedJsonOutputSourceFailure),noteOwnedJsonOutputSourceFailure))));
}
export function translateOwnedJsonOutputFlatProject(options){return withOwnedJsonOutputCompilerFrames(()=>project.translateProjectWithFlatEnclosingSemanticMeta(options),options);}
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function delivered(event,consume){accountData(event);freeze(event);return withCompleteSourceClosingFence(()=>{const answer=consume(event);accountData({event,answer});return null;},[]);}
function retained(result){const {metadata,javascript,typescript,...header}=result,{text,...packet}=metadata,rows=packet.components.map(({text,...row})=>row),count=accountData({header,metadata:{...packet,components:rows}});let bytes=count.utf8Bytes+Buffer.byteLength(javascript)+Buffer.byteLength(typescript)+Buffer.byteLength(text);for(const row of metadata.components)bytes+=Buffer.byteLength(row.text);if(bytes>PROJECT_META_STORAGE_LIMITS.totalBytes)fail('original complete retained output/field aggregate bound');return freeze(result);}
export function inspectOwnedJsonOutputCorpus(configuration,consume){
 requireSynchronousSourceCallback(consume);return withOwnedJsonOutputInstalledSources(()=>withActualPolicySourceUniverse(configuration,context=>{
  const entry=policyOriginalEntry(context),prefix=entry.slice(0,-'lib.rs'.length),paths=policyOriginalPaths(context),cargo=policyOriginalCargo(context),dependencies={manifest:cargo.manifest,lock:cargo.lock};
  const proposal=proposeOwnedJsonOutputWholeOwners(['token_report.rs','tokens_remote.rs','accounts_cli.rs'].map(name=>({path:prefix+name,source:policyOriginalSource(context,prefix+name)}))),changed=new Map(proposal.equations.map(row=>[row.path,row.after]));
  const options={entry,paths,readSource:path=>changed.has(path)?changed.get(path):policyOriginalSource(context,path),cargoManifest:cargo.manifest,cargoManifestPath:cargo.manifestPath,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),jsonParserProfile:actualJsonCapabilityProfile({...dependencies,compilationProfile:PRODUCTION_PROFILE}),compilationProfile:PRODUCTION_PROFILE};
  // Original flat-enclosing issuers keep ALL derives/imports/modules and
  // residuals. No extracted fn/type, path whitelist or live lower closure.
  const fresh=translateOwnedJsonOutputFlatProject(options),javascriptPath=entry.slice(0,-3)+'.mjs',typescriptPath=entry.slice(0,-3)+'.mts',metadata=storePolicyProjectMeta(fresh.meta,{metaPath:'owned-json-output/whole-project.json',javascriptPath,typescriptPath}),receipts=[];
  for(const path of paths){const before=policyOriginalSource(context,path),after=changed.get(path)??before,history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after||history.trace.map(row=>row.phase).join(',')!=='language,repository')fail('complete actual native source/CST/inverse differs');delivered({kind:'native-source-equation',path,phase:'whole-original-to-explicit-eager-output-adoption',history},consume);receipts.push({path,completeSourceInverseDelivered:true});accountData(receipts);}
  const visited=visitPolicyProjectMeta(metadata,event=>{const answer=consume(Object.freeze({kind:'complete-project-meta-field',phase:'whole-adoption-or-refusal',...event}));accountData(answer);return answer;});
  for(const [language,key,path]of [['JavaScript','javascript',javascriptPath],['TypeScript','typescript',typescriptPath]]){const history=transportConcreteSourceEquations([{before:fresh[key],after:fresh[key],language}])[0];if(history.inverse!==fresh[key])fail('whole emitted target inverse differs');delivered({kind:'target-equation',path,language,history},consume);}
  return retained({schema:'whole-original-Json-output-adoption-or-refusal-v1',entry,javascript:fresh.javascript,typescript:fresh.typescript,javascriptPath,typescriptPath,metadata,receipts,sourceUniverse:policyOriginalDescription(context),proposal,allCompleteOriginalNativeSourcesDelivered:true,allCompleteMetadataDelivered:visited.allCompleteFieldsDelivered,completeProjectMetaRetained:true,originalOwnersExtracted:false,wholeOriginalModuleGraphRetained:true,originalCoreLibraryAlreadyInstalled:true,originalBuiltinEquivalent:false,eagerFormattingMigration:true,stdArgumentsAbi:false,standardStringDropRequired:true,productionCoverageQualified:false,runtimeExecuted:false,nativeExecuted:false,persistentHostParity:false});
 }));
}
