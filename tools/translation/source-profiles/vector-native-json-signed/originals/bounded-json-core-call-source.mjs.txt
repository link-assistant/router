import {crateModuleSourcePath} from './repository-layout.mjs';
// Reserved explicit owned interface selection, not global namespace closure.
// Both callers supply their freshly reconstructed genuine original source scope.
import {originalSourceModuleItems,isSourceModuleView} from './source-module-views.mjs';
import {isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {compilationProfile} from './cfg-profile.mjs';
import {BOUNDED_JSON_CORE_SOURCE} from './bounded-json-core-source-data.mjs';
const fail=()=>{throw new TypeError('Router bounded canonical JSON requires its actual owned facade and qualified source binding');};
export function selectOriginalBoundedJsonCore({modules,sourceScopes,compilationProfile:inputProfile=null}){
  // These are the original forward comparisons, in their original order.
  const roots=modules.filter(module=>module.path.length===0),cores=modules.filter(module=>module.path.length===1&&module.path[0]==='translation_json_core');
  if(roots.length!==1||cores.length!==1)fail();
  const root=roots[0],core=cores[0];
  // The actual tracked edge must select this complete external source. No alias,
  // cfg, attribute macro, caller flag or copied source-view can supply the API.
  const declarations=originalSourceModuleItems(root).filter(item=>item.term==='mod'&&item.name==='translation_json_core');
  if(declarations.length!==1||root.source.slice(declarations[0].start,declarations[0].end).trim()!=='pub mod translation_json_core;'||core.file!==crateModuleSourcePath(modules,'src/translation_json_core.rs')||core.source!==BOUNDED_JSON_CORE_SOURCE||core.configurationCondition!=='active')fail();
  const scope=sourceScopes.find(scope=>scope.file===root.file&&scope.path.length===0),bindings=scope?.bindings.filter(binding=>binding.namespace==='type'&&binding.name==='translation_json_core');
  if(bindings?.length!==1||bindings[0].status!=='resolved'||bindings[0].kind!=='mod'||bindings[0].via!=='declaration'||bindings[0].source!==root.file||bindings[0].target?.join('::')!=='crate::translation_json_core'||bindings[0].span.start!==declarations[0].start||bindings[0].span.end!==declarations[0].end)fail();
  if(originalSourceModuleItems(root).some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_json_core')))fail();
  originalSourceModuleItems(core);
  // Additional source/view/profile joins follow the complete old comparison.
  // The result cannot be supplied by copied scope flags or public metadata.
  if(!isResolvedSourceScopeSet(sourceScopes))fail();
  assertResolvedSourceScopeOrigin(sourceScopes,{modules,compilationProfile:inputProfile});
  const profile=compilationProfile(inputProfile);
  for(const module of [root,core]){
    if(!Object.hasOwn(module,'sourceView')||!isSourceModuleView(module.sourceView)||module.configurationCondition!=='active'||module.sourceView.configurationCondition!=='active'||JSON.stringify(module.sourceView.compilationProfile)!==JSON.stringify(profile))fail();
    originalSourceModuleItems(module);
  }
  const declaration=bindings[0].declaration;
  if(declaration?.source!==root.file||declaration.span?.start!==declarations[0].start||declaration.span?.end!==declarations[0].end)fail();
  // Detached data only: no parser, live source scope, private issuer or checker.
  // Unrelated unresolved scope diagnostics are intentionally left untouched.
  return Object.freeze({source:core.source,file:core.file,rootFile:root.file,span:Object.freeze([declarations[0].start,declarations[0].end])});
}
// Actual source-bound registration for the separate bounded native library.
// The copied selector above keeps native module/view/scope/configuration joins.
import {JSON_TYPES} from './extensions/json-contracts.mjs';
import {sourceShared,sourceVector,SOURCE_STR} from './extensions/source-contract-types.mjs';
import {UNIT,BOOL,fixed} from './checked-types.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {BOUNDED_JSON_CORE_SHA256} from './bounded-json-core-source-data.mjs';
import {jsonMacroParserOriginal,isJsonMacroContext} from './json-macro-context.mjs';
import {isJsonMacroFeatureProof} from './json-macro-features.mjs';
import {createHash} from 'node:crypto';
const freezeBoundedJsonCore=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freezeBoundedJsonCore(child);Object.freeze(value);}return value;};
const operations=freezeBoundedJsonCore([
 Object.freeze({name:'json_validate',id:'router_vector_json_validate',params:[sourceShared(JSON_TYPES.value)],ret:UNIT}),
 Object.freeze({name:'json_build_null',id:'router_vector_json_build_null',params:[],ret:JSON_TYPES.value}),
 Object.freeze({name:'json_build_bool',id:'router_vector_json_build_bool',params:[BOOL],ret:JSON_TYPES.value}),
 Object.freeze({name:'json_build_string',id:'router_vector_json_build_string',params:[SOURCE_STR],ret:JSON_TYPES.value}),
 Object.freeze({name:'json_build_u64',id:'router_vector_json_build_u64',params:[{...fixed(64,false),rustPrimitiveName:'u64',rustSourceType:true}],ret:JSON_TYPES.value}),
 Object.freeze({name:'json_build_i64',id:'router_vector_json_build_i64',params:[{...fixed(64,true),rustPrimitiveName:'i64',rustSourceType:true}],ret:JSON_TYPES.value}),
 Object.freeze({name:'json_build_array',id:'router_vector_json_build_array',params:[sourceVector(JSON_TYPES.value)],ret:JSON_TYPES.value}),
 Object.freeze({name:'json_build_object',id:'router_vector_json_build_object',params:[],ret:JSON_TYPES.value}),
 Object.freeze({name:'json_build_fields',id:'router_vector_json_build_fields',params:[sourceShared(JSON_TYPES.value),sourceVector(JSON_TYPES.value)],ret:JSON_TYPES.value}),
 Object.freeze({name:'json_checked_copy',id:'router_vector_json_copy',params:[sourceShared(JSON_TYPES.value)],ret:JSON_TYPES.value}),
 Object.freeze({name:'json_checked_with_field',id:'router_vector_json_with_field',params:[sourceShared(JSON_TYPES.value),SOURCE_STR,sourceShared(JSON_TYPES.value)],ret:JSON_TYPES.value}),
]);
export const BOUNDED_JSON_CORE_CONTRACTS=freezeBoundedJsonCore(operations.map(row=>Object.freeze({id:row.id,jsExport:row.id,rustPath:['crate','translation_json_core',row.name],kind:'function',family:'json-update',params:row.params,ret:row.ret,async:false,pure:true,constEligible:false,requiresRefinement:'genuine-router-owned-json-update',assumptions:['Complete actual bounded native library module and canonical source layout must be joined.','Both languages enforce the root-inclusive node/depth/dense envelope before returning.','Library internals remain native; no custom Clone/Serialize or mutable-reference admission.']})));
export const boundedJsonCoreOperation=name=>operations.find(row=>row.name===name)??null;
export {BOUNDED_JSON_CORE_SHA256};
export function parseBoundedJsonCoreCall(parser,path){
 const c=parser.cursor;if(!['crate','::','translation_json_core','::'].every((word,at)=>c.is(word,at))||[0,2,4].some(at=>c.peek(at).kind!=='identifier'))return null;const row=boundedJsonCoreOperation(c.peek(4).value);if(!row)return null;
 const state=matchesParserFacts(parser),tokens=c.tokens,start=c.index,first=c.peek(),options={modules:state.facts.modules,sourceScopes:state.facts.evidence.scopes,compilationProfile:state.facts.compilationProfile},selected=selectOriginalBoundedJsonCore(options);
 const dependency=jsonMacroParserOriginal(parser),profile=dependency?.context;if(!dependency||!isJsonMacroContext(profile)||!isJsonMacroFeatureProof(profile.features)||dependency.file!==state.module.file||dependency.offset!==state.offset||JSON.stringify(dependency.modulePath)!==JSON.stringify(state.module.path))fail();const original=profile.originalModules.filter(row=>row.file===state.module.file&&JSON.stringify(row.path)===JSON.stringify(state.module.path));if(original.length!==1||original[0].sha256!==createHash('sha256').update(state.module.source).digest('hex')||original[0].sourceViewDigest!==state.module.sourceView.digest)fail();
 const stages=createRulePipeline([
  {phase:'language',rules:[{id:'bounded-json-core:complete-actual-native-library-CST-roundtrip',apply:()=>{const concrete=transportConcreteSyntaxSource(selected.source,{language:'Rust'});if(concrete.source!==BOUNDED_JSON_CORE_SOURCE||transportConcreteSyntaxMeta(concrete.meta).source!==selected.source)fail();return concrete;}}]},
  {phase:'repository',rules:[{id:'router:bind-exact-qualified-bounded-json-library',apply:value=>value}]},
 ]).run(null);
 const current=()=>{const now=selectOriginalBoundedJsonCore(options),latest=jsonMacroParserOriginal(parser);if(!latest||latest.context!==profile||latest.file!==dependency.file||latest.offset!==dependency.offset||latest.source!==dependency.source||!isJsonMacroFeatureProof(profile.features))fail();if(matchesParserFacts(parser)!==state||parser.cursor!==c||c.tokens!==tokens||now.source!==selected.source||now.file!==selected.file||now.rootFile!==selected.rootFile||JSON.stringify(now.span)!==JSON.stringify(selected.span))fail();};current();c.index+=5;c.expect('(','bounded JSON core');const args=[];while(!c.is(')')){if(args.length>=3)fail();let group=0;while(c.is('(',group)){if(++group>64)fail();}if(c.is('&&',group)||c.is('&',group)&&c.is('mut',group+1))fail();args.push(parser.expr(path));if(!c.eat(','))break;}const last=c.expect(')','bounded JSON core');current();if(c.index<=start+5)fail();return {node:{k:'routerCoreJsonUpdateCall',operation:row.name,args,span:{start:first.start,end:last.end}},trace:stages.trace};
}
