// Complete original project entry points, no miniature/test-only compiler.
import {translateProject,translateProjectWithFlatEnclosingSemanticMeta} from './project.mjs';
import {proposeBorrowedStandardMapCompilerSourceSuccessors} from './borrowed-standard-map-20261103-compiler-profile.mjs';
import {knownBorrowedJsonToolPackagingInstalledSuccessor} from './borrowed-json-tool-packaging-installed-20261103-profile.mjs';
import {matchesExactSourceEpoch} from './exact-source-compiler-epochs-20261103.mjs';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
export function withBorrowedStandardMapCompilerSources(run){return withSourceFailureOperation(()=>{
 const custody=createOrderedMapCanonicalSourceCustody(root);
 return withCompleteSourceClosingFence(()=>{
  withSourceInputValidation(()=>{for(const row of proposeBorrowedStandardMapCompilerSourceSuccessors().files){const current=custody.read(root+row.path);if(current===row.after)continue;const later=row.path==='tools/translation/host-assets.mjs'?knownBorrowedJsonToolPackagingInstalledSuccessor({root,path:row.path,before:row.after}):null;if(later?later.currentAfter!==current:!matchesExactSourceEpoch(row,current,{root}))throw TypeError('Complete original standard-map compiler successor must be installed and freshly imported: '+row.path);}});
  return run();
 },[custody.close]);
});}
export function translateProjectBorrowedStandardMaps(options){return withBorrowedStandardMapCompilerSources(()=>translateProject(options));}
export function translateProjectFlatBorrowedStandardMaps(options){return withBorrowedStandardMapCompilerSources(()=>translateProjectWithFlatEnclosingSemanticMeta(options));}
