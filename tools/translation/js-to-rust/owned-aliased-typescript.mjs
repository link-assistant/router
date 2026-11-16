// Alias expansion is source-only. Existing complete private owned checking,
// checked meta transport and emission remain the sole executable authority.
import {posix} from 'node:path';
import {expandOwnedTypeAliases} from './owned-type-aliases.mjs';
import {translateOwnedOutcomeTypeScript} from './owned-outcome.mjs';
import {ownedCoreSourceData,createOwnedCoreSourceContext,requireOwnedCoreSourceCurrent} from './owned-outcome-source.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
export function translateOwnedAliasedTypeScript(source,{context,sourcePath,typescriptOutputPath}={}){
 const data=ownedCoreSourceData(context);if(data.files.find(row=>row.path===sourcePath)?.source!==source)throw new TypeError('Owned alias complete actual original source/path differs');let expanded,derived;
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'typescript:expand-actual-local-alias-source-with-CST-inverses',apply:()=>{expanded=expandOwnedTypeAliases(source,{sourcePath,...(data.primitiveOperators===true?{nativeScalarContext:context}:{})});return expanded.source;}},{id:'meta:freshly-check-the-whole-expanded-owned-module-and-written-contracts',apply:value=>{const typedRoot=posix.dirname(data.declarationRoot),jsRoot=posix.dirname(data.runtimeRoot);if(typedRoot!=='.'&&!sourcePath.startsWith(typedRoot+'/'))throw new TypeError('Owned alias source stays inside its actual declared root');const suffix=(typedRoot==='.'?sourcePath:sourcePath.slice(typedRoot.length+1)).replace(/\.(mts|ts)$/u,'.mjs'),counterpart=(jsRoot==='.'?'':jsRoot+'/')+suffix,files=data.files.filter(row=>row.path!==sourcePath&&row.path!==counterpart).concat([{path:sourcePath,source:value}]);derived=createOwnedCoreSourceContext({...data,files});return translateOwnedOutcomeTypeScript(value,{context:derived,sourcePath,typescriptOutputPath});}}]},
  {phase:'repository',rules:[{id:'router:retain-complete-alias-original-and-independent-checked-output',apply:result=>({...result,originalTypeScript:source,ownedTypeAliasSourceHistory:expanded.history,runtimeParity:false,wholeRouterSynchronization:false,rustExecuted:false})}]},
 ]).run(null);requireOwnedCoreSourceCurrent(context);requireOwnedCoreSourceCurrent(derived);return {...run.value,ownedTypeAliasRuleTrace:run.trace};
}
