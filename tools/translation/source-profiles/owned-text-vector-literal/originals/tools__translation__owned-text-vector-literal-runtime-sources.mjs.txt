// Complete fresh paired package sources only, never execution/type permission.
import {withFreshOwnedTextVectorLiteralInputs} from './fresh-owned-text-vector-literal-inputs.mjs';
import {ownedTextVectorRuntimeSources} from './owned-text-vector-runtime-sources.mjs';
export function ownedTextVectorLiteralRuntimeSources(runtimeRoot,declarationRoot=runtimeRoot){
 const files=ownedTextVectorRuntimeSources(runtimeRoot,declarationRoot);return withFreshOwnedTextVectorLiteralInputs(frame=>{for(const row of frame.sources)for(const root of new Set([runtimeRoot,declarationRoot]))files.push({path:root+'/'+row.path,source:row.source});return files;});
}
export function ownedTextVectorLiteralRuntimeAssetPair(){return withFreshOwnedTextVectorLiteralInputs(frame=>new Map(frame.sources.map(row=>[row.path,row.source])));}
