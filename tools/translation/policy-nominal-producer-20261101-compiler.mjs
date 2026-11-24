// Actual existing flat-enclosing entry, entire original source universe and
// selective original reader snapshots. No eager all-executable reader copy.
import * as project from './project.mjs';
import * as nominal from './nominal-copy-collection-20261101.mjs';
import {aggregateCopyCollectionReceipts} from './aggregate-copy-collection-20261101-domain.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from './json-macro-inputs.mjs';
import {actualJsonCapabilityProfile} from './json-capabilities.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {policyOriginalEntry,policyOriginalPaths,policyOriginalSource,policyOriginalCargo,policyOriginalDescription} from './policy-nominal-producer-20261101-corpus.mjs';
import {inspectActualPolicyNominalCallers} from './policy-nominal-producer-20261101-callers.mjs';
import {storePolicyProjectMeta} from './policy-nominal-producer-20261101-storage.mjs';
import {withPolicyNominalInstalledSources,withPolicyNominalCompilerFrames} from './policy-nominal-producer-20261101-profile.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw new TypeError('Whole actual policy producer compiler: '+message);};
export function inspectActualPolicyNominalProject(context,callers,librarySource){
 accountData(callers);if(typeof librarySource!=='string'||librarySource.length>8*1024*1024||Buffer.byteLength(librarySource)>8*1024*1024)fail('bounded complete actual candidate library source required');
 const entry=policyOriginalEntry(context),before=policyOriginalSource(context,entry);if(callers?.path!==entry||callers.before!==before||!librarySource.startsWith(before))fail('candidate must retain the COMPLETE original actual library declaration/source prefix');
 const paths=policyOriginalPaths(context),cargo=policyOriginalCargo(context),dependencies={manifest:cargo.manifest,lock:cargo.lock},wanted=new Set(callers.selections.map(row=>row.qualifiedName));if(wanted.size!==5)fail('all five fixed actual callers required');
 const options={entry,paths,readSource:path=>path===entry?librarySource:policyOriginalSource(context,path),cargoManifest:cargo.manifest,cargoManifestPath:cargo.manifestPath,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),jsonParserProfile:actualJsonCapabilityProfile({...dependencies,compilationProfile:PRODUCTION_PROFILE}),compilationProfile:PRODUCTION_PROFILE};
 return withPolicyNominalInstalledSources(()=>withPolicyNominalCompilerFrames(()=>{
  const snapshots=[];const fresh=nominal.withNominalCopyCollections(()=>{
   // This existing entry selects actual tool-aware derive/enclosing/Clone/
   // Default/serde/ValueEnum/JsonSchema/reexport issuers. No stripped owner.
   const result=project.translateProjectWithFlatEnclosingSemanticMeta(options);if(!Array.isArray(result.executableDeclarations))fail('actual original declaration readers missing');
   for(const row of result.executableDeclarations)if(wanted.has(row.qualifiedName)){
    if(typeof row.checkedSource!=='function'||typeof row.targetBinding!=='function')fail('actual original selected declaration readers missing');const snapshot={source:row.checkedSource(),target:row.targetBinding()};accountData(snapshot);snapshots.push(snapshot);accountData(snapshots);
   }
   // Only the requested DATA snapshots survive this original callback. The
   // original nominal wrapper strips every live lower/parser/checker facade.
   return result;
  });
  const aggregate=aggregateCopyCollectionReceipts(),probeReports=inspectActualPolicyNominalCallers(snapshots,fresh.nominalCopyCollections,aggregate,callers.selections),plans=probeReports.filter(row=>row.selectedCallerAdmitted).map(row=>row.plan),javascriptPath=entry.slice(0,-3)+'.mjs',typescriptPath=entry.slice(0,-3)+'.mts';
  const originalPolicyMethods=['client_policy.SubscriptionEntitlementPolicy.overrides','client_policy.SubscriptionEntitlementPolicy.proxied_clients','client_policy.SubscriptionEntitlementPolicy.decide','client_policy.SubscriptionEntitlementPolicy.request_evidence'].map(name=>({name,sourceChecked:fresh.meta.checkedMethods.some(row=>row.name===name),refusalIndices:fresh.meta.refused.flatMap((row,index)=>row.name===name?[index]:[]),originalMethodReceivingQualified:false,sourceAuthority:false,semanticAuthority:false}));for(const report of probeReports)report.refusalIndices=fresh.meta.refused.flatMap((row,index)=>row.name===report.qualifiedName?[index]:[]);
  const observation={plans,probeReports,originalPolicyMethods,allSelectedCallersAdmitted:probeReports.every(row=>row.selectedCallerAdmitted),nominalCopyCollections:fresh.nominalCopyCollections,aggregateCopyCollections:aggregate};accountData(observation);
  // Preserve ALL original metadata, residuals, source/checked/target programs
  // using the existing canonical/retained field-storage limits and serializer.
  const metadata=storePolicyProjectMeta(fresh.meta,{metaPath:'policy/whole-project.json',javascriptPath,typescriptPath});
  return {schema:'actual-policy-flat-enclosing-checked-source-v1',entry,javascript:fresh.javascript,typescript:fresh.typescript,javascriptPath,typescriptPath,metadata,...observation,sourceUniverse:policyOriginalDescription(context),originalAttributesAndImportsRetained:true,originalProducerMethodsExecuted:false,sourceAuthority:false,semanticAuthority:false,productionPolicyMethodsAdmitted:false,recordClonedSupported:false,runtimeExecuted:false,nativeExecuted:false,runtimeParity:false};
 },options));
}

// Required-positive API may refuse, while the inspection API above ALWAYS
// retains every actual residual/meta field if the whole compiler returned.
export function compileActualPolicyNominalProject(context,callers,librarySource){
 const result=inspectActualPolicyNominalProject(context,callers,librarySource);if(!result.allSelectedCallersAdmitted){const error=new TypeError('Actual policy selected callers remain refused; complete adoption report retained');error.adoptionReport=result;throw error;}return result;
}
