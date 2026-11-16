import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from './extensions/external-trait-sources.mjs';
export function requireSseLockedDependencies(proof){
 if(!proof)throw new TypeError('Actual locked SSE library dependency proof required');const actual=originalExternalTraitPackageInputs(captureOriginalExternalTraitPackage(proof,'base64'));if(actual.dependency.package!=='base64'||actual.dependency.version!=='0.23.1')throw new TypeError('SSE requires its actual complete pinned base64 dependency');return actual;
}
