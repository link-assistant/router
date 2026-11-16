// Fresh whole-project checks are distinct from source candidate construction.
import {translateJsonScalarReadersProject} from './json-scalar-readers-20261101-project.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from './json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
export function checkLocalClosureOptionWholeProject(request,files){
 const dependencies={manifest:request.manifest,lock:request.lock};
 try{
  const checked=translateJsonScalarReadersProject({entry:request.entry,paths:Object.keys(files),readSource:path=>{if(!Object.hasOwn(files,path))throw TypeError('Complete original source universe required');return files[path];},cargoManifest:request.manifest,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),compilationProfile:PRODUCTION_PROFILE});
  const result={status:'whole-project-meta',meta:checked.meta,javascript:checked.javascript,typescript:checked.typescript,sourceCandidateAuthorizesAdmission:false};accountData(result);return result;
 }catch(error){const result={status:'whole-project-hard-refusal',diagnostic:{name:error?.name??typeof error,message:String(error?.message??error)},metadataProduced:false,sourceCandidateAuthorizesAdmission:false};accountData(result);return result;}
}
