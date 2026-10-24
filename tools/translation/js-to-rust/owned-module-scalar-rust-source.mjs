// Complete canonical Rust inverse. Syntax/projection data grants no permission:
// fresh private source checking and complete Rust reproduction are mandatory.
import {posix} from 'node:path';
import {sourceItems} from '../rust-structure.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {RUST_SUPPORT} from './owned-outcome-operations.mjs';
import {ownedCoreSourceData,requireOwnedCoreSourceCurrent,ownedSourcePath} from './owned-outcome-source.mjs';
import {createOwnedStateContext,translateOwnedStateJavaScript} from './owned-outcome.mjs';
import {UnsupportedOwnedRustSource,readOwnedRustFunction} from './owned-outcome-rust-syntax.mjs';
import {projectOwnedRustFunctions,ownedRustNameProposals} from './owned-outcome-rust-projection.mjs';
import {readOwnedModuleRustEnvelope,ownedRustModulePublicExports} from './owned-module-scalar-rust-envelope.mjs';
import {ownedRootScalarTypeSource} from './owned-root-scalar-types.mjs';
import {packageOwnedModuleAPI} from './owned-module-scalar-public-api.mjs';
export {UnsupportedOwnedRustSource};
const fail=message=>{throw new UnsupportedOwnedRustSource(message);};
function originalFunctions(source){
 const items=sourceItems(source).filter(item=>item.term!=='comment'),helpers=sourceItems(RUST_SUPPORT).filter(item=>item.term!=='comment');
 if(!items.length)return [];
 if(items.length<=helpers.length||items.length>4099)fail('complete canonical support and bounded nonempty caller items required');
 for(let index=0;index<helpers.length;index++){
  const item=items[index],original=helpers[index];
  if(item.term!==original.term||item.name!==original.name||!sameRustSourceSyntax(source.slice(item.start,item.end),RUST_SUPPORT.slice(original.start,original.end)))fail('complete original canonical support differs');
 }
 const functions=items.slice(helpers.length);if(functions.some(item=>item.term!=='fn'))fail('unknown complete Rust root declaration');
 return functions.map(item=>({...readOwnedRustFunction(source.slice(item.start,item.end)),span:[item.start,item.end]}));
}
function pairPaths(path,data){
 const root=posix.dirname(data.runtimeRoot),typed=posix.dirname(data.declarationRoot);if(root!=='.'&&!path.startsWith(root+'/'))fail('JavaScript proposal must stay inside its actual declared source root');
 const suffix=root==='.'?path:path.slice(root.length+1),stem=suffix.replace(/\.mjs$/u,'');return ['.ts','.mts'].map(extension=>(typed==='.'?'':typed+'/')+stem+extension);
}
export function translateOwnedStateRust(source,{context,sourcePath,javascriptPath,typescriptOutputPath}={}){
 ownedSourcePath(sourcePath);ownedSourcePath(javascriptPath);if(!sourcePath.endsWith('.rs')||!javascriptPath.endsWith('.mjs'))fail('actual Rust and JavaScript source paths required');
 if(sourcePath==='src/lib.rs'||sourcePath.startsWith('src/translation_core')||sourcePath.startsWith('src/translation_collections_core')||sourcePath.startsWith('src/translation_state_core')||sourcePath.startsWith('src/translation_json_fields_core')||sourcePath.startsWith('src/translation_carriers_core')||sourcePath.startsWith('src/translation_integer_core')||sourcePath.startsWith('src/translation_stream_core')||sourcePath==='src/sse.rs')fail('canonical caller inverse cannot rewrite its native library');
 if(typeof source!=='string'||source.length>2097152)fail('bounded complete Rust source required');
 const data=ownedCoreSourceData(context);if(data.files.find(row=>row.path===sourcePath)?.source!==source)fail('complete authoritative Rust source/path differs');
 const previousJavaScript=data.files.find(row=>row.path===javascriptPath)?.source??null,pairs=pairPaths(javascriptPath,data),previousPairs=data.files.filter(row=>pairs.includes(row.path));let originalConcrete,projection,derivedContext,envelope;
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'rust:serialize-reparse-complete-original-owned-source-CST',apply:()=>{originalConcrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(originalConcrete.meta).source!==source)fail('whole original Rust CST differs');envelope=readOwnedModuleRustEnvelope(originalConcrete.source);return originalFunctions(envelope.inner);}},
   {id:'rust:substitute-canonical-owned-calls-types-and-control-into-JavaScript-proposals',apply:functions=>{projection=projectOwnedRustFunctions(functions,{javascriptPath,runtimeRoot:data.runtimeRoot,nameProposals:ownedRustNameProposals(previousJavaScript,javascriptPath)});return projection.javascript;}},
   {id:'meta:fresh-private-owned-source-check-serialize-reparse-and-reissue',apply:javascript=>{
    const files=data.files.filter(row=>row.path!==javascriptPath&&!pairs.includes(row.path)).concat([{path:javascriptPath,source:javascript}]);
    derivedContext=createOwnedStateContext({...data,files});return translateOwnedStateJavaScript(javascript,{context:derivedContext,sourcePath:javascriptPath,typescriptOutputPath});
   }},
   {id:'rust:require-complete-fresh-checked-emission-to-reproduce-authoritative-input',apply:result=>{if(!sameRustSourceSyntax(envelope.inner,result.rust))fail('fresh checked JavaScript does not reproduce the complete authoritative Rust syntax');return result;}},
  ]},
  {phase:'repository',rules:[{id:'router:restore-actual-public-module-aliases-and-reproduce-the-whole-authoritative-root',apply:result=>{
   const publicExports=ownedRustModulePublicExports(envelope,result.program,previousJavaScript,javascriptPath),packaged=packageOwnedModuleAPI(result,{publicExports,linkedSource:ownedRootScalarTypeSource(envelope,projection.javascript),language:'TypeScript'});if(!sameRustSourceSyntax(source,packaged.rust))fail('fresh checked project does not reproduce the complete authoritative Rust root');return packaged;
  }},{id:'router:retain-full-owned-source-inverses-and-runtime-obligations',apply:result=>{
   const equation=transportConcreteSourceEquations([{before:source,after:result.rust,language:'Rust'}])[0];if(equation.inverse!==source)fail('complete canonical Rust source inverse differs');
   return {...result,originalRust:source,ownedRustSourceHistory:{schema:'router-canonical-owned-module-rust-source-history-v1',moduleEnvelope:envelope,sourcePath,javascriptPath,source,concreteSyntax:originalConcrete.meta,equation,projection,previousJavaScript,previousPairs,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false},runtimeParity:false,wholeRouterSynchronization:false,rustExecuted:false};
  }}]},
 ]).run(null);
 requireOwnedCoreSourceCurrent(context);requireOwnedCoreSourceCurrent(derivedContext);return {...run.value,ownedRustRuleTrace:run.trace};
}

export {translateOwnedStateRust as translateOwnedOutcomeRust};
