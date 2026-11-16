// Explicit opt-in composition. Original project APIs/issuers remain unchanged.
import {translateProjectOwnedDefinitions,translateProjectOwnedCoreReaderDefinitions} from './project.mjs';
import {withCrossModuleHelperBulkSourceOperation} from './cross-module-helper-bulk-20261101.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
function project(options,translate,identity){
 return withCrossModuleHelperBulkSourceOperation(()=>createRulePipeline([
  {phase:'language',rules:[{id:'language:'+identity+':original-whole-project-and-private-owned-projection',apply:()=>translate(options)}]},
  {phase:'repository',rules:[{id:'repository:'+identity+':retain-exact-original-results-facades-and-unsupported-definitions',apply:result=>result}]},
 ]).run(null).value);
}
export function translateCrossModuleOwnedProjectionProject(options){
 return project(options,translateProjectOwnedDefinitions,'cross-module-owned-definitions');
}
export function translateCrossModuleOwnedCoreReaderProjectionProject(options){
 return project(options,translateProjectOwnedCoreReaderDefinitions,'cross-module-owned-core-readers');
}
