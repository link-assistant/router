// An authored source equation; every emitted module still receives fresh checks.
import {derivePinnedRepositorySourceEvolution} from './pinned-repository-source-evolution.mjs';
export function proposeRuntimeImportBindingBatch(ts,path,source){
 return derivePinnedRepositorySourceEvolution(ts,{
  profile:new URL('./source-profiles/runtime-import-binding-batch/source-rules.json',import.meta.url),
  profileSha256:'7581642c96231d97fe62ab78643e08019c6a39b720d1d7b796ab46724fbd6c9d',
  path,source,
 });
}
