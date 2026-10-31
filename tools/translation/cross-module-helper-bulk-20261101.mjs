// Explicit opt-in project composition; all original default domains remain.
import {translateProject} from './project.mjs';
import {withOriginalCrossModuleVectorHelperSourceOperation} from './router-core-json-updates.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
export {withOriginalCrossModuleVectorHelperSourceOperation as withCrossModuleHelperBulkSourceOperation};
export function translateCrossModuleHelperBulkProject(options){
 return withOriginalCrossModuleVectorHelperSourceOperation(()=>createRulePipeline([
  {phase:'language',rules:[{id:'language:translate-complete-project-with-fresh-source-bound-cross-module-Vec-helper-closure',apply:()=>translateProject(options)}]},
  {phase:'repository',rules:[{id:'repository:retain-original-project-result-and-private-emission-identities',apply:result=>result}]},
 ]).run(null).value);
}
