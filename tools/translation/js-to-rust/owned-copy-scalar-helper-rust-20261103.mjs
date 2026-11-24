// Canonical Copy scalar Rust inverse. Projections remain DATA until the original
// source checker/meta reader and complete Rust reproduction have all passed.
import {posix} from 'node:path';
import {PRIMITIVE_BITWISE_TYPES,primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
const rustScalar=type=>type==='bool'||PRIMITIVE_BITWISE_TYPES.some(row=>row.rust===type||row.name===type);
import * as coreSource from './owned-core-source.mjs';
import * as vectorSource from './owned-vector-candidate-source.mjs';
import * as coreOperations from './owned-core-operations.mjs';
import * as vectorOperations from './owned-vector-candidate-operations.mjs';
import {translateOwnedCopyScalarHelperSource20261103} from './owned-copy-scalar-helper-profile-20261103.mjs';
import {ownedCorePairedTypePath} from './owned-core-paired-types.mjs';
import {withOwnedNativeProjectOperation} from './owned-native-project-operation.mjs';
import {UnsupportedOwnedRustSource,readOwnedRustFunction} from './owned-outcome-rust-syntax.mjs';
import {projectOwnedRustFunctions,ownedRustNameProposals} from './owned-outcome-rust-projection.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {crateRelativeRustSourcePath} from '../repository-layout.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {withCompleteSourceClosingFence} from '../complete-source-closing-fence.mjs';
const fail=message=>{throw new UnsupportedOwnedRustSource(message);};
function sourcePath(path){
 coreSource.ownedSourcePath(path);const logical=crateRelativeRustSourcePath(path);
 if(!path.endsWith('.rs')||logical==='src/lib.rs'||logical==='src/sse.rs'||logical==='src/translation_ordered_text_map_core.rs'||['src/translation_core','src/translation_collections_core','src/translation_state_core','src/translation_json_fields_core','src/translation_carriers_core','src/translation_integer_core','src/translation_stream_core'].some(prefix=>logical.startsWith(prefix)))fail('canonical caller inverse cannot rewrite its native library');
}
function functions(source,support){
 const items=sourceItems(source).filter(row=>row.term!=='comment'),original=sourceItems(support).filter(row=>row.term!=='comment');
 if(items.length<=original.length||items.length>original.length+4096)fail('complete fixed support and bounded nonempty functions required');
 for(let at=0;at<original.length;at++)if(items[at].term!==original[at].term||items[at].name!==original[at].name||!sameRustSourceSyntax(source.slice(items[at].start,items[at].end),support.slice(original[at].start,original[at].end)))fail('complete original Rust support differs');
 return items.slice(original.length).map(row=>{
  if(row.term!=='fn')fail('unknown complete Rust root declaration');
  const fn=readOwnedRustFunction(source.slice(row.start,row.end),{primitiveOperators:true});
  if(!rustScalar(fn.returns)||fn.parameters.some(param=>!rustScalar(param.type)))fail('this inverse family requires actual Copy scalar signatures');return {...fn,span:[row.start,row.end]};
 });
}
function pairPaths(path,data){
 const sourceRoot=posix.dirname(data.runtimeRoot),typedRoot=posix.dirname(data.declarationRoot);
 if(sourceRoot!=='.'&&!path.startsWith(sourceRoot+'/'))fail('JavaScript output must stay inside its actual source root');
 const suffix=sourceRoot==='.'?path:path.slice(sourceRoot.length+1),stem=suffix.slice(0,-4);
 return ['.mts','.ts'].map(extension=>(typedRoot==='.'?'':typedRoot+'/')+stem+extension);
}
function primitiveCopyScalarInput(data,javascriptPath,javascript,pairs){
 if(data.vectorBindings?.length)fail('rewriting a source-bound vector application requires its separate adoption profile');
 const files=new Map(data.files.filter(row=>row.path!==javascriptPath&&!pairs.includes(row.path)).map(row=>[row.path,row]));
 for(const row of [...vectorSource.ownedCoreRuntimeSources(data.runtimeRoot,data.declarationRoot),...vectorSource.ownedPrimitiveOperatorRuntimeSources(data.runtimeRoot,data.declarationRoot)]){
  const previous=files.get(row.path);if(previous&&previous.source!==row.source)fail('a conflicting original runtime source cannot be overwritten');files.set(row.path,row);
 }
 files.set(javascriptPath,{path:javascriptPath,source:javascript});
 return {...data,files:[...files.values()],vectorBindings:[],primitiveOperators:true,primitiveDefinitions:true};
}
function copyScalarProgram(program){
 if(!program.length||program.some(fn=>fn.returns!=='bool'&&!primitiveBitwiseType(fn.returns)||fn.params.some(param=>param.type!=='bool'&&!primitiveBitwiseType(param.type))||fn.hostCalls.length))fail('whole fresh program must remain in the copied scalar family');
}
export function translateOwnedCopyScalarHelperRust20261103(source,options){
 const data=coreSource.ownedPlainData(options),keys=['variant','sourcePath','javascriptPath','input',...(Object.hasOwn(data,'typescriptOutputPath')?['typescriptOutputPath']:[])];
 if(Object.keys(data).sort().join('\0')!==keys.sort().join('\0')||!['core','vector'].includes(data.variant))fail('exact canonical inverse options and explicit lane required');
 sourcePath(data.sourcePath);coreSource.ownedSourcePath(data.javascriptPath);if(!data.javascriptPath.endsWith('.mjs'))fail('explicit JavaScript output path required');
 if(typeof source!=='string'||source.length>2097152)fail('original complete Rust source bound');
 const syntax=data.variant==='core'?coreSource:vectorSource,operations=data.variant==='core'?coreOperations:vectorOperations;
 return syntax.withOwnedCopyHelperSourceOperation(()=>withOwnedNativeProjectOperation(()=>{
  const context=syntax.createOwnedCoreCopyHelperSourceContext(data.input),inputs=syntax.ownedCoreSourceData(context);
  if(inputs.files.find(row=>row.path===data.sourcePath)?.source!==source)fail('complete original Rust input/path differs');
  const previous=inputs.files.find(row=>row.path===data.javascriptPath)?.source??null,pairs=pairPaths(data.javascriptPath,inputs),previousPairs=inputs.files.filter(row=>pairs.includes(row.path));
  let rustConcrete,parsed,projection=null,restored=false;
  return withCompleteSourceClosingFence(()=>{
   const result=createRulePipeline([
    {phase:'language',rules:[
     {id:'language:complete-Rust-CST-and-original-canonical-function-reader',apply:()=>{
      rustConcrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(rustConcrete.meta).source!==source)fail('complete original Rust CST differs');parsed=functions(rustConcrete.source,operations.RUST_SUPPORT);return parsed;
     }},
     {id:'language:restore-original-helper-network-or-project-edited-Boolean-Rust',apply:()=>{
      if(previous!==null){
       const original=translateOwnedCopyScalarHelperSource20261103(previous,{variant:data.variant,sourcePath:data.javascriptPath,input:inputs,...(Object.hasOwn(data,'typescriptOutputPath')?{typescriptOutputPath:data.typescriptOutputPath}:{})});
       copyScalarProgram(original.program);
       if(sameRustSourceSyntax(source,original.rust)){restored=true;return {...original,javascript:previous};}
      }
      projection=projectOwnedRustFunctions(parsed,{javascriptPath:data.javascriptPath,runtimeRoot:inputs.runtimeRoot,primitiveOperators:true,nameProposals:ownedRustNameProposals(previous,data.javascriptPath)});
      const derived=primitiveCopyScalarInput(inputs,data.javascriptPath,projection.javascript,pairs);
      const checked=translateOwnedCopyScalarHelperSource20261103(projection.javascript,{variant:'vector',sourcePath:data.javascriptPath,input:derived,...(Object.hasOwn(data,'typescriptOutputPath')?{typescriptOutputPath:data.typescriptOutputPath}:{})});
      copyScalarProgram(checked.program);return {...checked,javascript:projection.javascript};
     }},
     {id:'language:require-whole-fresh-Rust-reproduction-after-independent-meta-reissuance',apply:row=>{
      if(!sameRustSourceSyntax(source,row.rust))fail('fresh checked JavaScript does not reproduce the complete authoritative Rust');return row;
     }},
    ]},
    {phase:'repository',rules:[{id:'repository:retain-whole-Rust-and-source-inverses-with-explicit-helper-conflicts',apply:row=>{
     const equation=transportConcreteSourceEquations([{before:source,after:row.rust,language:'Rust'}])[0];if(equation.inverse!==source)fail('whole original Rust inverse differs');
     const paths=new Set([data.javascriptPath]);
     if(restored)for(const fn of row.program){if(fn.pairedSource)paths.add(fn.pairedSource.path);for(const call of [...(fn.booleanHelperCalls??[]),...(fn.copyHelperCalls??[])]){paths.add(call.declaration.path);if(call.pairedDeclaration)paths.add(call.pairedDeclaration.path);for(const link of call.links)paths.add(link.path);}}
     if(restored){const files=new Map(inputs.files.map(row=>[row.path,row.source]));for(const path of [...paths]){const pair=ownedCorePairedTypePath(path,files,inputs.runtimeRoot,inputs.declarationRoot);if(pair!==null)paths.add(pair);}}
     const restoredSources=restored?[...paths].map(path=>{const file=inputs.files.find(file=>file.path===path);if(!file)fail('complete original helper-network source missing');const language=/\.(?:mts|ts)$/u.test(path)?'TypeScript':'JavaScript',concrete=transportConcreteSyntaxSource(file.source,{language});if(transportConcreteSyntaxMeta(concrete.meta).source!==file.source)fail('complete restored source CST differs');return {...file,concreteSyntax:concrete.meta};}):[];
     const sourceEquation=previous===null?null:transportConcreteSourceEquations([{before:previous,after:row.javascript,language:'JavaScript'}])[0];
     return {...row,originalRust:source,restoredSources,helperNetworkRestored:restored,sourceConflicts:restored?[]:[{kind:'canonical-Copy-scalar-reprojection',path:data.javascriptPath,reason:'Edited Rust has no unique inverse helper decomposition; the checked proposal changes only this caller and retains original helper files.',requiresReconciliation:true}],ownedRustRuleHistory:{sourcePath:data.sourcePath,javascriptPath:data.javascriptPath,rustConcrete:rustConcrete.meta,equation,sourceEquation,previousJavaScript:previous,previousPairs,projection,sourceAuthority:false,semanticAuthority:false},runtimeParity:false,rustExecuted:false,wholeRouterSynchronization:false};
    }}]},
   ]).run(null);return {...result.value,ownedRustRuleTrace:result.trace};
  },[()=>syntax.requireOwnedCoreSourceCurrent(context)]);
 }));
}
