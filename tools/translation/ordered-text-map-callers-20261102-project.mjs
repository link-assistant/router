// Additive receiving entry points for the complete reviewed source successors.
// Installation is a separate source review/apply task. Exact bytes here are an
// operational source join; the actual Host private issuers still do all checks.
import {readFileSync,lstatSync} from 'node:fs';
import {translateProject,translateProjectWithFlatEnclosingSemanticMeta} from './project.mjs';
import {withCurrentStandardCopySourceOperation} from './current-standard-copy-source.mjs';
import {proposeOrderedTextMapCallerSourceSuccessors} from './ordered-text-map-callers-20261102-profile.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const root=new URL('../../',import.meta.url);
function physical(path){const url=new URL(path,root),stat=lstatSync(url);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8388608)throw TypeError('Complete regular installed map caller source required');return readFileSync(url,'utf8');}
export function withOrderedTextMapCallerSources(run){
 const proposal=proposeOrderedTextMapCallerSourceSuccessors();
 const current=()=>{for(const row of proposal.files)if(physical(row.path)!==row.after)throw TypeError('Complete ordered map caller source successors must be independently reviewed and installed before receiving execution: '+row.path);};
 return withCompleteSourceClosingFence(()=>{current();return withCurrentStandardCopySourceOperation(run);},[current]);
}
export function translateProjectOrderedTextMaps(options){return withOrderedTextMapCallerSources(()=>translateProject(options));}
export function translateProjectWithFlatEnclosingSemanticMetaOrderedTextMaps(options){return withOrderedTextMapCallerSources(()=>translateProjectWithFlatEnclosingSemanticMeta(options));}
