// No new compiler rules: the original complete flat-enclosing producer is selected.
import * as project from './project.mjs';
import * as nominal from './nominal-copy-collection-20261101.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from './json-macro-inputs.mjs';
import {actualJsonCapabilityProfile} from './json-capabilities.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {policyOriginalEntry,policyOriginalPaths,policyOriginalSource,policyOriginalCargo,policyOriginalDescription} from './policy-nominal-producer-20261101-corpus.mjs';
import {storePolicyProjectMeta} from './policy-nominal-producer-20261101-storage.mjs';
import {withPolicyNominalInstalledSources,withPolicyNominalCompilerFrames} from './policy-nominal-producer-20261101-profile.mjs';
import {CLIENT_STATIC_OPERATIONS,proposeClientStaticCallers} from './client-static-producer-20261101-callers.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw TypeError('Whole ClientKind static compiler: '+message);};
export function inspectClientStaticProject(context,callers){
 accountData(callers);const entry=policyOriginalEntry(context),original=policyOriginalSource(context,entry),expected=proposeClientStaticCallers(entry,original,{commandCallee:callers?.selections?.find(row=>row.name==='command')?.callee});
 // Caller DATA is never a submitted checked declaration or an issuer permit.
 if(callers.path!==entry||callers.before!==original||callers.after!==expected.after||JSON.stringify(callers.selections)!==JSON.stringify(expected.selections))fail('complete regenerated original caller proposal differs');
 const paths=policyOriginalPaths(context),cargo=policyOriginalCargo(context),dependencies={manifest:cargo.manifest,lock:cargo.lock},wanted=new Set(CLIENT_STATIC_OPERATIONS.map(row=>row.qualifiedName));
 const options={entry,paths,readSource:path=>path===entry?callers.after:policyOriginalSource(context,path),cargoManifest:cargo.manifest,cargoManifestPath:cargo.manifestPath,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),jsonParserProfile:actualJsonCapabilityProfile({...dependencies,compilationProfile:PRODUCTION_PROFILE}),compilationProfile:PRODUCTION_PROFILE};
 return withPolicyNominalInstalledSources(()=>withPolicyNominalCompilerFrames(()=>{
  const snapshots=[];const fresh=nominal.withNominalCopyCollections(()=>{
   const result=project.translateProjectWithFlatEnclosingSemanticMeta(options);if(!Array.isArray(result.executableDeclarations))fail('original live checked declaration readers missing');
   for(const row of result.executableDeclarations)if(wanted.has(row.qualifiedName)){if(typeof row.checkedSource!=='function'||typeof row.targetBinding!=='function')fail('original selected private source readers missing');const snapshot={source:row.checkedSource(),target:row.targetBinding()};accountData(snapshot);snapshots.push(snapshot);accountData(snapshots);}
   return result;
  });
  const probeReports=expected.selections.map(selection=>{
   const found=snapshots.filter(row=>row.source.qualifiedName===selection.qualifiedName),refusalIndices=fresh.meta.refused.flatMap((row,index)=>row.name===selection.qualifiedName?[index]:[]);
   if(found.length!==1)return {qualifiedName:selection.qualifiedName,selectedCallerAdmitted:false,refusalIndices,reason:'original whole-project compiler did not issue exactly one checked caller',sourceAuthority:false,semanticAuthority:false};
   const {source,target}=found[0],fn=source.declaration;
   if(source.schema!=='original-checked-executable-source-v1'||target.schema!=='original-checked-project-target-binding-v1'||source.source!==entry||target.source!==entry||target.qualifiedName!==source.qualifiedName||fn?.k!=='fn'||fn.fullName!==selection.qualifiedName||fn.async||fn.generated||fn.params.length!==1||!Number.isSafeInteger(source.span?.start)||!Number.isSafeInteger(source.span?.end)||callers.after.slice(source.span.start,source.span.end)!==selection.body)fail('fresh original full caller source/signature/span/target identity differs');
   return {qualifiedName:selection.qualifiedName,selectedCallerAdmitted:true,refusalIndices,sourceSnapshot:source,targetBinding:target,sourceAuthority:false,semanticAuthority:false};
  });
  const originalMethods=CLIENT_STATIC_OPERATIONS.map(row=>{const name='clients.ClientKind.'+row.name;return {name,sourceChecked:fresh.meta.checkedMethods.some(item=>item.name===name),refusalIndices:fresh.meta.refused.flatMap((item,index)=>item.name===name?[index]:[]),receivingExecuted:false};});
  const javascriptPath=entry.slice(0,-3)+'.mjs',typescriptPath=entry.slice(0,-3)+'.mts',observation={probeReports,originalMethods,allSelectedCallersAdmitted:probeReports.every(row=>row.selectedCallerAdmitted),nominalCopyCollections:fresh.nominalCopyCollections};accountData(observation);
  const metadata=storePolicyProjectMeta(fresh.meta,{metaPath:'client-static/whole-project.json',javascriptPath,typescriptPath});
  return {schema:'whole-client-static-checked-project-v1',entry,javascript:fresh.javascript,typescript:fresh.typescript,javascriptPath,typescriptPath,metadata,...observation,sourceUniverse:policyOriginalDescription(context),originalAttributesAndImportsRetained:true,originalOwnersExtracted:false,pointerIdentityGuaranteed:false,ownedReferenceAbiWidened:false,sourceAuthority:false,semanticAuthority:false,productionCoverageQualified:false,runtimeExecuted:false,nativeExecuted:false};
 },options));
}
export function compileClientStaticProject(context,callers){const result=inspectClientStaticProject(context,callers);if(!result.allSelectedCallersAdmitted){const error=TypeError('Actual ClientKind static callers remain refused; all original residual/meta retained');error.adoptionReport=result;throw error;}return result;}
