// No stored project history is accepted here. Baseline bindings are rebuilt
// from actual current module bytes for every restoration proposal.
import {translateOwnedModuleProject} from './owned-module-project.mjs';
import {translateOwnedModuleProject as translateReceivingProject} from './owned-module-receiving-project.mjs';
import {translateOwnedModuleRust} from './owned-module-rust.mjs';
import {distributeOwnedModuleSource} from './owned-module-distribution.mjs';
import {ownedCoreSourceData,createOwnedCoreSourceContext,requireOwnedCoreSourceCurrent} from './owned-outcome-source.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Owned module restoration: '+message);};
export function recheckOwnedModuleDistribution(distribution,{context,rust,bundlePath}={}){
 const data=ownedCoreSourceData(context),paths=new Set(distribution.modules.map(row=>row.path)),files=data.files.filter(row=>!paths.has(row.path)&&row.path!==bundlePath).concat(distribution.modules.map(row=>({path:row.path,source:row.source}))),derived=createOwnedCoreSourceContext({...data,files}),result=translateReceivingProject({entry:distribution.entry,language:distribution.language,modules:distribution.modules.map(row=>({path:row.path,source:row.source}))},{context:derived,bundlePath,functionNames:distribution.functionNames});
 if(!sameRustSourceSyntax(rust,result.rust))fail('complete reconstructed source tree does not reproduce the authoritative packaged Rust');requireOwnedCoreSourceCurrent(context);requireOwnedCoreSourceCurrent(derived);return result;
}
export function restoreOwnedModuleProject(source,{project,context,sourcePath}={}){
 const data=ownedCoreSourceData(context);if(data.files.find(row=>row.path===sourcePath)?.source!==source)fail('complete actual authoritative Rust source differs');let baseline,reverse,distribution,receiving;
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'esm:rebuild-original-module-bindings-from-current-complete-sources',apply:()=>{baseline=translateOwnedModuleProject(project,{context});return baseline;}},
   {id:'rust:check-and-reproduce-the-complete-authoritative-module-envelope',apply:()=>{
    const files=data.files.filter(row=>row.path!==baseline.ownedProjectBundlePath&&row.path!==baseline.ownedProjectTypeScriptBundlePath).concat([{path:baseline.ownedProjectBundlePath,source:baseline.javascript}]);receiving=createOwnedCoreSourceContext({...data,files});reverse=translateOwnedModuleRust(source,{context:receiving,sourcePath,javascriptPath:baseline.ownedProjectBundlePath,typescriptOutputPath:baseline.ownedProjectTypeScriptBundlePath});return reverse;
   }},
   {id:'esm:substitute-native-checked-function-and-runtime-bindings-back-into-source-modules',apply:()=>{
    distribution=distributeOwnedModuleSource({baseline,result:reverse,language:project.language,bundlePath:project.language==='TypeScript'?baseline.ownedProjectTypeScriptBundlePath:baseline.ownedProjectBundlePath,entry:project.entry,modulePaths:project.modules.map(row=>row.path),runtimePaths:new Set(data.files.map(row=>row.path).filter(path=>[data.runtimeRoot,data.declarationRoot].some(root=>path.startsWith(root+'/'))))});return distribution;
   }},
   {id:'meta:freshly-recheck-the-entire-reconstructed-module-tree-and-Rust-root',apply:()=>recheckOwnedModuleDistribution(distribution,{context,rust:source,bundlePath:project.language==='TypeScript'?baseline.ownedProjectTypeScriptBundlePath:baseline.ownedProjectBundlePath})},
  ]},
  {phase:'repository',rules:[{id:'router:retain-complete-module-source-inverses-and-unverified-parity-obligations',apply:result=>({...result,restoredModules:distribution.modules,moduleRestorationHistory:{schema:'router-owned-module-restoration-v1',sourcePath,originalRust:source,originalModuleHistory:baseline.moduleSourceHistory,reverseHistory:reverse.ownedRustSourceHistory,distribution,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false},runtimeParity:false,wholeRouterSynchronization:false,rustExecuted:false})}]},
 ]).run(null);requireOwnedCoreSourceCurrent(context);requireOwnedCoreSourceCurrent(receiving);return {...run.value,moduleRestorationRuleTrace:run.trace};
}
