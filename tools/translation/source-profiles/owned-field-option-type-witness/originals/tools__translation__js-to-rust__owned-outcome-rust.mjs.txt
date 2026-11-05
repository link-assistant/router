// Complete canonical Rust inverse. Syntax/projection data grants no permission:
// fresh private source checking and complete Rust reproduction are mandatory.
import {posix} from 'node:path';
import {sourceItems} from '../rust-structure.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {crateRelativeRustSourcePath} from '../repository-layout.mjs';
import {RUST_SUPPORT} from './owned-outcome-operations.mjs';
import {ownedCoreSourceData,requireOwnedCoreSourceCurrent,ownedSourcePath} from './owned-outcome-source.mjs';
import {createOwnedStateContext,translateOwnedStateJavaScript} from './owned-outcome.mjs';
import {UnsupportedOwnedRustSource} from './owned-outcome-rust-syntax.mjs';
import {readOwnedRustFunction} from './owned-primitive-vector-rust-syntax.mjs';
import {projectOwnedRustFunctions,ownedRustNameProposals} from './owned-outcome-rust-projection.mjs';
import {requireOwnedResultSources} from './owned-result-source-contracts.mjs';
export {UnsupportedOwnedRustSource};
const fail=message=>{throw new UnsupportedOwnedRustSource(message);};
function originalFunctions(source,{primitiveOperators=false}={}){
 const items=sourceItems(source).filter(item=>item.term!=='comment'),helpers=sourceItems(RUST_SUPPORT).filter(item=>item.term!=='comment');
 if(items.length<=helpers.length||items.length>4099)fail('complete canonical support and bounded nonempty caller items required');
 for(let index=0;index<helpers.length;index++){
  const item=items[index],original=helpers[index];
  if(item.term!==original.term||item.name!==original.name||!sameRustSourceSyntax(source.slice(item.start,item.end),RUST_SUPPORT.slice(original.start,original.end)))fail('complete original canonical support differs');
 }
 const functions=items.slice(helpers.length);if(functions.some(item=>item.term!=='fn'))fail('unknown complete Rust root declaration');
 return functions.map(item=>({...readOwnedRustFunction(source.slice(item.start,item.end),{primitiveOperators}),span:[item.start,item.end]}));
}
function pairPaths(path,data){
 const root=posix.dirname(data.runtimeRoot),typed=posix.dirname(data.declarationRoot);if(root!=='.'&&!path.startsWith(root+'/'))fail('JavaScript proposal must stay inside its actual declared source root');
 const suffix=root==='.'?path:path.slice(root.length+1),stem=suffix.replace(/\.mjs$/u,'');return ['.ts','.mts'].map(extension=>(typed==='.'?'':typed+'/')+stem+extension);
}
export function translateOwnedStateRust(source,{context,sourcePath,javascriptPath,typescriptOutputPath}={}){
 ownedSourcePath(sourcePath);ownedSourcePath(javascriptPath);if(!sourcePath.endsWith('.rs')||!javascriptPath.endsWith('.mjs'))fail('actual Rust and JavaScript source paths required');
 const nativeLibraryPath=crateRelativeRustSourcePath(sourcePath);
 if(nativeLibraryPath==='src/lib.rs'||nativeLibraryPath.startsWith('src/translation_core')||nativeLibraryPath.startsWith('src/translation_collections_core')||nativeLibraryPath.startsWith('src/translation_state_core')||nativeLibraryPath.startsWith('src/translation_json_fields_core')||nativeLibraryPath.startsWith('src/translation_carriers_core')||['translation_primitive_vectors_core','translation_primitive_sequences_core','translation_integer_core','translation_stream_core','translation_text_core','translation_primitive_option_core','translation_primitive_option_callbacks_core','translation_primitive_results_core','translation_owned_results_core','translation_async_control_core'].some(name=>nativeLibraryPath==='src/'+name+'.rs'))fail('canonical caller inverse cannot rewrite its native library');
 if(typeof source!=='string'||source.length>2097152)fail('bounded complete Rust source required');
 const data=ownedCoreSourceData(context);if(data.files.find(row=>row.path===sourcePath)?.source!==source)fail('complete authoritative Rust source/path differs');
 let resultTypeLibrary='primitive-result';try{requireOwnedResultSources(new Map(data.files.map(row=>[row.path,row.source])),data);resultTypeLibrary='owned-result';}catch{}
 const previousJavaScript=data.files.find(row=>row.path===javascriptPath)?.source??null,pairs=pairPaths(javascriptPath,data),previousPairs=data.files.filter(row=>pairs.includes(row.path));let originalConcrete,projection,derivedContext;
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'rust:serialize-reparse-complete-original-owned-source-CST',apply:()=>{originalConcrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(originalConcrete.meta).source!==source)fail('whole original Rust CST differs');return originalFunctions(originalConcrete.source,{primitiveOperators:data.primitiveOperators===true});}},
   {id:'rust:substitute-canonical-owned-calls-types-and-control-into-JavaScript-proposals',apply:functions=>{projection=projectOwnedRustFunctions(functions,{javascriptPath,runtimeRoot:data.runtimeRoot,primitiveOperators:data.primitiveOperators===true,resultTypeLibrary,nameProposals:ownedRustNameProposals(previousJavaScript,javascriptPath)});return projection.javascript;}},
   {id:'meta:fresh-private-owned-source-check-serialize-reparse-and-reissue',apply:javascript=>{
    const files=data.files.filter(row=>row.path!==javascriptPath&&!pairs.includes(row.path)).concat([{path:javascriptPath,source:javascript}]);
    derivedContext=createOwnedStateContext({...data,files});return translateOwnedStateJavaScript(javascript,{context:derivedContext,sourcePath:javascriptPath,typescriptOutputPath});
   }},
   {id:'rust:require-complete-fresh-checked-emission-to-reproduce-authoritative-input',apply:result=>{if(!sameRustSourceSyntax(source,result.rust))fail('fresh checked JavaScript does not reproduce the complete authoritative Rust syntax');return result;}},
  ]},
  {phase:'repository',rules:[{id:'router:retain-full-owned-source-inverses-and-runtime-obligations',apply:result=>{
   const equation=transportConcreteSourceEquations([{before:source,after:result.rust,language:'Rust'}])[0];if(equation.inverse!==source)fail('complete canonical Rust source inverse differs');
   return {...result,originalRust:source,ownedRustSourceHistory:{schema:'router-canonical-owned-rust-source-history-v1',sourcePath,javascriptPath,source,concreteSyntax:originalConcrete.meta,equation,projection,previousJavaScript,previousPairs,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false},runtimeParity:false,wholeRouterSynchronization:false,rustExecuted:false};
  }}]},
 ]).run(null);
 requireOwnedCoreSourceCurrent(context);requireOwnedCoreSourceCurrent(derivedContext);return {...run.value,ownedRustRuleTrace:run.trace};
}

export {translateOwnedStateRust as translateOwnedOutcomeRust};
