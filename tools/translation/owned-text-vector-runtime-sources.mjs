// Complete freshly read paired assets, never native caller or type authority.
import {withFreshOwnedTextVectorInputs} from './fresh-owned-text-vector-inputs.mjs';
const fail=message=>{throw new TypeError('Owned text vector assets: '+message);};
function root(value){if(typeof value!=='string'||!value||value.length>4096||value.startsWith('/')||/[\\:\x00-\x1f\x7f]/u.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('safe bounded relative receiving root required');return value;}
export function ownedTextVectorRuntimeSources(runtimeRoot,declarationRoot=runtimeRoot){
 root(runtimeRoot);root(declarationRoot);return withFreshOwnedTextVectorInputs(frame=>{const files=[],seen=new Set();for(const row of frame.sources){if(row.language==='Rust'||row.path==='owned-text-vector-contracts.mjs')continue;for(const directory of new Set([runtimeRoot,declarationRoot])){const path=directory+'/'+row.path;if(seen.has(path))fail('duplicate complete paired asset path');seen.add(path);files.push({path,source:row.source});}}return files;});
}
