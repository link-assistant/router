// Actual existing standard-effect ABI DATA. The separate original compiler
// independently rechecks every imported operation before caller flow admission.
import {FILESYSTEM_EFFECT_CONTRACTS} from '../extensions/filesystem-effects-contracts.mjs';
export function httpResourceFilesystemContracts(){
 return FILESYSTEM_EFFECT_CONTRACTS.filter(row=>row.rustPath[1]==='fs'&&row.rustPath.at(-1)!=='read').map(row=>{
  if(!row.params.every(type=>type.kind==='string'))throw new TypeError('Every original filesystem parameter needs its actual scalar string ABI');
  return {...row,javascriptName:row.id,rustName:row.rustPath.at(-1),rustPath:'::'+row.rustPath.join('::'),runtimeModule:'extensions/filesystem-effects-runtime.mjs',family:'filesystem',args:row.params.map(()=>'str'),ret:'io-result:'+(row.rustPath.at(-1)==='read_to_string'?'text-owned':'unit'),borrowedResult:false,rootArgument:null,release:null,sourceAuthority:false,semanticAuthority:false};
 });
}
