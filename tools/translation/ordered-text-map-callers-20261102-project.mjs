// Additive receiving entry points. Physical custody can only restrict a source
// operation; the actual original Host issuers still establish every body/type.
import {lstatSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {translateProject,translateProjectWithFlatEnclosingSemanticMeta} from './project.mjs';
import {withCurrentStandardCopySourceOperation} from './current-standard-copy-source.mjs';
import {proposeOrderedTextMapCallerSourceSuccessors,ORDERED_TEXT_MAP_CALLER_PARENT_PATHS} from './ordered-text-map-callers-20261102-profile.mjs';
import {readCompactSparsePhysicalFile,sameCompactPhysicalSourceStamp} from './compact-sparse-git-io-20261102.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
const root=new URL('../../',import.meta.url),archive='tools/translation/ordered-text-map-callers-20261102-source-history.json.gz';
const selectedSourceRoot=fileURLToPath(new URL('./',import.meta.url)),stableDirectory=(left,right)=>['dev','ino','mode','uid','gid'].every(key=>left[key]===right[key]);
const sameDirectory=(row,next)=>(row.path===selectedSourceRoot.slice(0,-1)||row.path.startsWith(selectedSourceRoot))?sameCompactPhysicalSourceStamp(row.stat,next):stableDirectory(row.stat,next);
function capture(){
 const files=[],directories=[];let failed=false,primary,retained=0;
 const poison=run=>{if(failed)throw primary;try{return withSourceInputValidation(run);}catch(error){if(!failed){failed=true;primary=error;}throw error;}};
 const close=()=>{let closingFailed=false,closing;const check=run=>{try{run();}catch(error){if(!closingFailed){closingFailed=true;closing=error;}}};
  for(const row of files)check(()=>{if(!readCompactSparsePhysicalFile(row).equals(row.raw))throw TypeError('Complete installed map compiler source changed');});
  for(const row of directories)check(()=>{const now=lstatSync(row.path,{bigint:true});if(!now.isDirectory()||now.isSymbolicLink()||!sameDirectory(row,now))throw TypeError('Installed map compiler source ancestor changed');});
  if(closingFailed){if(!failed){failed=true;primary=closing;}throw closing;}if(failed)throw primary;
 };
 const read=relative=>poison(()=>withCompleteSourceClosingFence(()=>{
  const path=fileURLToPath(new URL(relative,root));let parent=dirname(path),depth=0;
  while(true){if(++depth>128)throw TypeError('Map compiler source ancestor bound');const stat=lstatSync(parent,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink())throw TypeError('Ordinary original compiler source ancestor required');const prior=directories.find(row=>row.path===parent);if(prior){if(!sameDirectory(prior,stat))throw TypeError('Original compiler source ancestor replaced');}else directories.push({path:parent,stat});const next=dirname(parent);if(next===parent)break;parent=next;}
  const stat=lstatSync(path,{bigint:true});if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8388608n)throw TypeError('Complete regular installed map compiler source required');const row={path,relative,stat},raw=readCompactSparsePhysicalFile(row);files.push({...row,raw});retained+=raw.length;if(retained>16777216)throw TypeError('Complete installed map compiler source byte budget');return raw;
 },[close]));
 return poison(()=>withCompleteSourceClosingFence(()=>{read(archive);for(const path of ORDERED_TEXT_MAP_CALLER_PARENT_PATHS)read(path);return {files,close:()=>poison(close),dispose(){for(const row of files)row.raw=null;files.length=0;directories.length=0;failed=true;}};},[close]));
}
export function withOrderedTextMapCallerSources(run){return withSourceFailureOperation(()=>{
 const captured=capture();
 try{return withCompleteSourceClosingFence(()=>{
  const proposal=withSourceInputValidation(()=>proposeOrderedTextMapCallerSourceSuccessors());captured.close();
  for(const row of proposal.files){const original=captured.files.find(value=>value.relative===row.path);if(!original||!original.raw.equals(Buffer.from(row.after)))throw TypeError('Complete map source successors must be independently reviewed, installed and freshly imported: '+row.path);}
  return withCurrentStandardCopySourceOperation(run);
 },[captured.close]);}finally{captured.dispose();}
});}
export function translateProjectOrderedTextMaps(options){return withOrderedTextMapCallerSources(()=>translateProject(options));}
export function translateProjectWithFlatEnclosingSemanticMetaOrderedTextMaps(options){return withOrderedTextMapCallerSources(()=>translateProjectWithFlatEnclosingSemanticMeta(options));}
