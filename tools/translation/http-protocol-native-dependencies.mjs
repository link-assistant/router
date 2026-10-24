import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from './extensions/external-trait-sources.mjs';
export function requireHttpProtocolLockedDependencies(proof){
 if(!proof)throw new TypeError('Actual complete locked HTTP protocol dependency proof required');const result=[];
 for(const [name,version]of [['reqwest','0.13.5'],['base64','0.23.1']]){const actual=originalExternalTraitPackageInputs(captureOriginalExternalTraitPackage(proof,name));if(actual.dependency.package!==name||actual.dependency.version!==version)throw new TypeError('HTTP protocol requires its actual complete pinned '+name+' dependency');result.push(actual);}return result;
}
