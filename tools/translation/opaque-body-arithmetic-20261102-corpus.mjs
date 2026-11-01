import {collectOpaqueBodyArithmeticOriginData} from './opaque-body-arithmetic-origins-20261102.mjs';
// Complete scalar-corpus successor over frozen constant188. SOURCE / UNRUN.
import * as project from './project.mjs';
import * as nominal from './nominal-copy-collection-20261101.mjs';
import * as originalJson from './router-core-json-updates.mjs';
import {withGeneralizedPrimitiveOutput} from './generalized-primitive-output-20261101.mjs';
import {withLiteralArgumentsCore} from './literal-arguments-core-20261101.mjs';
import {withAggregateCopyCollectionOperation} from './aggregate-copy-collection-20261101-domain.mjs';
import {withNominalEditedOperation} from './nominal-edited-target-20261101-domain.mjs';
import {withConstantIndexProfileOperation,originalConstantIndexProjectOutputData} from './constant-index-profile-20261101-domain.mjs';
import {withConstantIndexProfileInstalledSources,noteConstantIndexProfileSourceFailure} from './constant-index-profile-20261101-profile.mjs';
import {withActualPolicySourceUniverse,policyOriginalEntry,policyOriginalPaths,policyOriginalSource,policyOriginalCargo,policyOriginalDescription} from './policy-nominal-producer-20261101-corpus.mjs';
import {storePolicyProjectMeta,visitPolicyProjectMeta} from './policy-nominal-producer-20261101-storage.mjs';
import {proposeJsonScalarReadersWholeOwners} from './json-scalar-readers-20261101-production.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from './json-macro-inputs.mjs';
import {actualJsonCapabilityProfile} from './json-capabilities.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {PROJECT_META_STORAGE_LIMITS} from './project-meta-consumed-storage.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withConstantIndexCorpusSourceCustody} from './constant-index-corpus-20261101-history.mjs';
const fail=message=>{throw TypeError('Constant-index complete corpus: '+message);};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function compilerFrames(run){
 return withConstantIndexProfileOperation(()=>
  originalJson.withOriginalJsonOutputClosureOperation(()=>
   withGeneralizedPrimitiveOutput(()=>
    withAggregateCopyCollectionOperation(()=>
     withNominalEditedOperation(()=>withLiteralArgumentsCore(run),noteConstantIndexProfileSourceFailure),
     noteConstantIndexProfileSourceFailure))));
}
// Lexical only: every caller below is already inside the actual188 fence.
function compileInsideInstalledScope(options,captureBodies=false){return compilerFrames(()=>{
 const fresh=nominal.withNominalCopyCollections(()=>project.translateProjectWithFlatEnclosingSemanticMeta(options));
 // Both actual targets were just produced by the genuine project emitter.
 // Read while the Host-private constant operation is live; DATA does not issue
 // a later source/type/emission capability and no live .lower facade escapes.
 const baseOrigins=originalConstantIndexProjectOutputData(fresh.javascript,fresh.typescript),bodyLiterals=captureBodies?collectOpaqueBodyArithmeticOriginData(fresh,options.readSource):[],constantIndexOrigins={...baseOrigins,bodyLiterals};
 accountData(constantIndexOrigins);return {...fresh,constantIndexOrigins};
});}
export function translateOpaqueBodyArithmeticFlatProject(options){return withConstantIndexCorpusSourceCustody(()=>withConstantIndexProfileInstalledSources(()=>compileInsideInstalledScope(options,true)));}
// Fixed sibling retains every semantic check and omits only unused body DATA.
export function translateOpaqueBodyArithmeticBaselineFlatProject(options){return withConstantIndexCorpusSourceCustody(()=>withConstantIndexProfileInstalledSources(()=>compileInsideInstalledScope(options,false)));}
function plusSmall(base,extra){const added=accountData(extra),next={...base,headerCells:base.headerCells+added.cells,headerUtf16Units:base.headerUtf16Units+added.utf16Units,headerUtf8Bytes:base.headerUtf8Bytes+added.utf8Bytes,utf16Units:base.utf16Units+added.utf16Units,utf8Bytes:base.utf8Bytes+added.utf8Bytes};if(next.headerCells>2000000||next.headerUtf16Units>16777216||next.headerUtf8Bytes>16777216||next.utf16Units>PROJECT_META_STORAGE_LIMITS.totalBytes||next.utf8Bytes>PROJECT_META_STORAGE_LIMITS.totalBytes)fail('retained plus transient complete occurrence bound');return next;}
function delivered(event,consume,budget){plusSmall(budget,event);freeze(event);return withCompleteSourceClosingFence(()=>{const answer=consume(event);plusSmall(budget,{event,answer});return null;},[]);}
function equation(before,after,language){const history=transportConcreteSourceEquations([{before,after,language}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after||history.trace.map(row=>row.phase).join(',')!=='language,repository')fail('complete source/CST/two-phase inverse differs');return history;}
// All returned occurrences are covered: headers/origins/proposals/receipts use
// the unchanged16MiB/2M-cell DATA accountant; only the explicit complete field
// and target strings use original64MiB-file/512MiB-aggregate storage. Aliases
// are charged per phase/field occurrence. Null replacements conservatively add
// their own header cost; no large stringify or cross-invocation cache is used.
function accountRetained(result){
 const large=[],phases=result.phases.map(row=>{const {metadata,javascript,typescript,...header}=row;large.push(javascript,typescript,metadata.text);for(const component of metadata.components)large.push(component.text);return {...header,javascript:null,typescript:null,metadata:{...metadata,text:null,components:metadata.components.map(component=>({...component,text:null}))}};});
 const count=accountData({...result,phases});let bytes=count.utf8Bytes,units=count.utf16Units;
 for(const text of large){if(typeof text!=='string'||text.length>PROJECT_META_STORAGE_LIMITS.fileBytes)fail('original complete field length bound');units+=text.length;if(units>PROJECT_META_STORAGE_LIMITS.totalBytes)fail('shared original/final retained UTF16 occurrence bound');const size=Buffer.byteLength(text);if(size>PROJECT_META_STORAGE_LIMITS.fileBytes||(bytes+=size)>PROJECT_META_STORAGE_LIMITS.totalBytes)fail('shared original/final retained UTF8 occurrence bound');}
 return {headerCells:count.cells,headerUtf16Units:count.utf16Units,headerUtf8Bytes:count.utf8Bytes,utf16Units:units,utf8Bytes:bytes,limits:PROJECT_META_STORAGE_LIMITS,aliasesCountedPerOccurrence:true,semanticAuthority:false};
}
export function inspectConstantIndexCorpus(configuration,consume){
 requireSynchronousSourceCallback(consume);return withConstantIndexCorpusSourceCustody(()=>withConstantIndexProfileInstalledSources(()=>withActualPolicySourceUniverse(configuration,context=>{
  const entry=policyOriginalEntry(context),prefix=entry.slice(0,-'lib.rs'.length),paths=policyOriginalPaths(context),cargo=policyOriginalCargo(context),dependencies={manifest:cargo.manifest,lock:cargo.lock},javascriptPath=entry.slice(0,-3)+'.mjs',typescriptPath=entry.slice(0,-3)+'.mts';
  const result={schema:'constant-index-complete-original-and-adopted-corpus-v1',entry,javascriptPath,typescriptPath,phases:[],receipts:[],sourceUniverse:policyOriginalDescription(context),proposal:null,allCompleteOriginalNativeSourcesDelivered:false,allCompleteMetadataDelivered:false,wholeOriginalModuleGraphRetained:true,originalOwnersExtracted:false,originalCoreLibraryAlreadyInstalled:true,originalBuiltinEquivalent:false,eagerFormattingMigration:true,stdArgumentsAbi:false,standardStringDropRequired:true,productionCoverageQualified:false,runtimeExecuted:false,nativeExecuted:false,persistentHostParity:false,wholeCorpusEditedTargetInverseSupported:false,sourceAuthority:false,semanticAuthority:false};
  const base={entry,paths,cargoManifest:cargo.manifest,cargoManifestPath:cargo.manifestPath,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),jsonParserProfile:actualJsonCapabilityProfile({...dependencies,compilationProfile:PRODUCTION_PROFILE}),compilationProfile:PRODUCTION_PROFILE};
  function pass(phase,changed){
   const fresh=compileInsideInstalledScope({...base,readSource:path=>changed.has(path)?changed.get(path):policyOriginalSource(context,path)}),metadata=storePolicyProjectMeta(fresh.meta,{metaPath:phase+'/whole-project.json',javascriptPath,typescriptPath}),row={phase,javascript:fresh.javascript,typescript:fresh.typescript,metadata,constantIndexOrigins:fresh.constantIndexOrigins};
   accountRetained({...result,phases:[...result.phases,row]});result.phases.push(row);
   const budget=accountRetained(result),visited=visitPolicyProjectMeta(metadata,event=>{const {source,...header}=event,extra=plusSmall(budget,{...header,kind:'complete-project-meta-field',phase,source:null}),size=Buffer.byteLength(source);if(extra.utf16Units+source.length>PROJECT_META_STORAGE_LIMITS.totalBytes||extra.utf8Bytes+size>PROJECT_META_STORAGE_LIMITS.totalBytes)fail('retained plus complete metadata callback occurrence bound');return withCompleteSourceClosingFence(()=>{const answer=consume(Object.freeze({...event,kind:'complete-project-meta-field',phase}));const complete=plusSmall(extra,answer);if(complete.utf16Units+source.length>PROJECT_META_STORAGE_LIMITS.totalBytes||complete.utf8Bytes+size>PROJECT_META_STORAGE_LIMITS.totalBytes)fail('retained plus metadata callback reply occurrence bound');return answer;},[]);});
   if(!visited.allCompleteFieldsDelivered)fail('complete original/refusal metadata absent');
   delivered({kind:'constant-index-origin-data',phase,origins:row.constantIndexOrigins,semanticAuthority:false},consume,budget);
   for(const [language,key,path]of [['JavaScript','javascript',javascriptPath],['TypeScript','typescript',typescriptPath]])delivered({kind:'target-equation',phase,path,language,history:equation(row[key],row[key],language)},consume,budget);
  }
  // Original semantic residuals remain in the complete original metadata.
  // A hard source/resource failure still aborts and poisons, never a report.
  pass('original',new Map());
  const proposal=proposeJsonScalarReadersWholeOwners(['token_report.rs','tokens_remote.rs','accounts_cli.rs'].map(name=>({path:prefix+name,source:policyOriginalSource(context,prefix+name)})));
  accountRetained({...result,proposal});result.proposal=proposal;const changed=new Map(proposal.equations.map(row=>[row.path,row.after]));
  // Invocation-local arithmetic accounting only, never a cached source verdict.
  // Charge extra object/length overhead conservatively per receipt instead of
  // rescanning every retained target/metadata string for every native path.
  let budget=accountRetained(result);
  for(const path of paths){const before=policyOriginalSource(context,path),after=changed.get(path)??before;delivered({kind:'native-source-equation',path,phase:'whole-original-to-explicit-eager-output-adoption',history:equation(before,after,'Rust')},consume,budget);const next={path,completeSourceInverseDelivered:true,changed:before!==after};budget=plusSmall(budget,{[String(result.receipts.length)]:next,length:result.receipts.length+1});result.receipts.push(next);}
  delivered({kind:'whole-owner-adoption-data',proposal,semanticAuthority:false},consume,budget);
  for(const input of result.sourceUniverse.cargo){const path=input.source,source=policyOriginalSource(context,path);if(input.available?typeof source!=='string':source!==null)fail('complete original Cargo availability/bytes differ');delivered({kind:'complete-untranslated-corpus-input',path,available:input.available,source,inverse:source,cstClaimed:false,semanticAuthority:false},consume,budget);}
  pass('adopted',changed);result.allCompleteOriginalNativeSourcesDelivered=true;result.allCompleteMetadataDelivered=true;
  const accounting=accountRetained(result);accountRetained({...result,accounting});return freeze({...result,accounting});
 })));
}
