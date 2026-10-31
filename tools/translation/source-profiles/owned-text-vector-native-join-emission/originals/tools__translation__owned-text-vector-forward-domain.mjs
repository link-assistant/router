// Original active source/type/caller checks remain mandatory. Paired sources
// and shape catalogs are DATA, never standalone native ownership permission.
import {compilationProfile as normalizeProfile} from './cfg-profile.mjs';
import {crateModuleSourcePath} from './repository-layout.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalSourceModuleItems,isSourceModuleView} from './source-module-views.mjs';
import {isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {withOriginalOwnedTextVectorSourceOperation,requireCurrentOwnedTextVectorNativeOperationSource,requireCurrentOwnedTextVectorOriginalOperationSource} from './current-owned-text-vector-source.mjs';
import {ownedTextVectorOperationShape} from './owned-text-vector-call-shape.mjs';
import {actualOwnedTextVector,actualSharedTextVector,actualOwnedTextSlice} from './owned-text-vector-native-types.mjs';
import {sameType,rustFixedType} from './checked-types.mjs';
import {forwardOwnedCarrier,forwardOwnedString} from './owned-forward-domain.mjs';
import {sourceVector,SOURCE_STRING} from './extensions/source-contract-types.mjs';
import {ownedTextVectorRuntimeSources} from './owned-text-vector-runtime-sources.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';
const fail=()=>{throw new TypeError('Owned text vector requires the actual active original module and resolved source binding');};
function sourceBinding(state,name){
 const {modules,compilationProfile}=state.facts,sourceScopes=state.facts.evidence.scopes,roots=modules.filter(row=>row.path.length===0),leaves=modules.filter(row=>row.path.join('::')==='translation_owned_text_vectors_core');if(roots.length!==1||leaves.length!==1)fail();const root=roots[0],leaf=leaves[0],items=originalSourceModuleItems(root),edges=items.filter(item=>item.term==='mod'&&item.name==='translation_owned_text_vectors_core');
 if(edges.length!==1||root.source.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_owned_text_vectors_core;'||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_owned_text_vectors_core'))||leaf.file!==crateModuleSourcePath(modules,'src/translation_owned_text_vectors_core.rs'))fail();
 if(!isResolvedSourceScopeSet(sourceScopes))fail();assertResolvedSourceScopeOrigin(sourceScopes,{modules,compilationProfile});const scope=sourceScopes.find(row=>row.file===root.file&&row.path.length===0),bindings=scope?.bindings.filter(row=>row.namespace==='type'&&row.name==='translation_owned_text_vectors_core');if(bindings?.length!==1)fail();const binding=bindings[0],edge=edges[0];if(binding.status!=='resolved'||binding.kind!=='mod'||binding.via!=='declaration'||binding.source!==root.file||binding.target?.join('::')!=='crate::translation_owned_text_vectors_core'||binding.span.start!==edge.start||binding.span.end!==edge.end||binding.declaration?.source!==root.file||binding.declaration.span?.start!==edge.start||binding.declaration.span?.end!==edge.end)fail();
 for(const module of [root,leaf]){if(module.configurationCondition!=='active'||!isSourceModuleView(module.sourceView)||module.sourceView.configurationCondition!=='active'||JSON.stringify(module.sourceView.compilationProfile)!==JSON.stringify(normalizeProfile(compilationProfile)))fail();originalSourceModuleItems(module);} const operation=requireCurrentOwnedTextVectorNativeOperationSource(root.source,leaf.source,name);return {root,leaf,operation};
}
export function parseForwardOwnedTextVector(parser,path){
 const c=parser.cursor;if(!['crate','::','translation_owned_text_vectors_core','::'].every((word,at)=>c.is(word,at))||[0,2,4].some(at=>c.peek(at).kind!=='identifier'))return null;const shape=ownedTextVectorOperationShape(c.peek(4).value);if(!shape||shape.rustName!==c.peek(4).value)return null;
 return withOriginalOwnedTextVectorSourceOperation(()=>{if(!originalDataFreezeIntrinsicsUnchanged())fail();const state=matchesParserFacts(parser),facade=requireRouterCoreFacade(parser),selected=sourceBinding(state,shape.rustName),rootView=selected.root.sourceView,leafView=selected.leaf.sourceView,tokens=c.tokens,start=c.index,first=c.peek();
 const current=index=>{if(!originalDataFreezeIntrinsicsUnchanged()||matchesParserFacts(parser)!==state||parser.cursor!==c||c.tokens!==tokens||c.index!==index)fail();requireRouterCoreFacadeCurrent(parser,facade);const next=sourceBinding(state,shape.rustName);if(next.root!==selected.root||next.leaf!==selected.leaf||next.root.sourceView!==rootView||next.leaf.sourceView!==leafView)fail();};
 const stage=createRulePipeline([{phase:'language',rules:[{id:'owned-text-vector:join-current-paired-core-and-original-active-source-scopes',apply:()=>{current(start);return selected.operation;}}]},{phase:'repository',rules:[{id:'router:select-the-fixed-qualified-owned-text-vector-core',apply:value=>value}]}]).run(null);c.index+=5;c.expect('(','owned text vector call');const args=[];while(!c.is(')')){args.push(parser.expr(path));if(!c.eat(','))break;}const last=c.expect(')','owned text vector call');current(c.index);return {node:{k:'routerCoreJsonUpdateCall',operation:shape.javascriptName,args,span:{start:first.start,end:last.end}},trace:stage.trace};});
}
const indexType=()=>({...rustFixedType('u64'),rustPrimitiveName:'u64',rustSourceType:true});
function ownedString(checker,type,path,span){if(!forwardOwnedString(type))throw unsupported('owned text vector element','requires the actual by-value standard String',span);checker.expectedOwnership(type,SOURCE_STRING,path,span);}
export function checkForwardOwnedTextVector(checker,node,env,path,expected,{current}){return withOriginalOwnedTextVectorSourceOperation(()=>{
 requireOriginalPrimitiveTryFromChecker(checker);current();const row=ownedTextVectorOperationShape(node.operation);if(!row||node.args.length!==row.parameters.length)throw typeError('Actual owned text vector arity differs',node.span);requireCurrentOwnedTextVectorOriginalOperationSource(row.javascriptName);if(row.operation==='from_slice'&&node.args[0]?.k==='routerSharedArrayLiteral')return checkForwardOwnedTextVectorLiteral(checker,node,env,path,expected,{current});const args=[];
 for(let at=0;at<row.parameters.length;at++){
  const role=row.parameters[at],surface=node.args[at];let value;
  if(role==='vec:text-owned-ref'){
   if(surface?.k==='routerTextReference'){const token=surface.sourceBorrowToken;if(token?.value!=='&'||token.span?.end-token.span?.start!==1||surface.value?.k==='routerTextReference')throw unsupported('owned text vector borrow','requires its actual single shared borrow',surface.span);value=checker.expr(surface.value,env,path);current();if(!actualOwnedTextVector(checker,value.type,surface,path))throw unsupported('owned text vector borrow','requires its actual owned String vector pointee',surface.span);}
   else{value=checker.expr(surface,env,path);current();if(!actualSharedTextVector(checker,value.type,surface,path))throw unsupported('shared text vector input','requires its actual complete shared Vec reference',surface.span);}
  }else if(role==='vec:text-owned'){value=checker.expr(surface,env,path);current();if(!actualOwnedTextVector(checker,value.type,surface,path))throw unsupported('owned text vector move','requires its actual owned Vec of standard String',surface.span);}
  else if(role==='text-owned-list-ref'){value=checker.expr(surface,env,path);current();if(!actualOwnedTextSlice(checker,value.type,surface,path))throw unsupported('owned String slice input','requires its actual standard shared slice reference',surface.span);}
  else if(role==='text-owned'){value=checker.expr(surface,env,path,SOURCE_STRING);current();ownedString(checker,value.type,path,surface.span);}
  else{const wanted=indexType();value=checker.expr(surface,env,path,wanted);current();const type=value.type;if(!sameType(type,wanted)||type.rustPrimitiveName!=='u64'||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw unsupported('owned text vector index','requires the actual by-value native u64',surface.span);checker.expectedOwnership(type,wanted,path,surface.span);checker.expectedPrimitiveIdentity(type,wanted,path,surface.span);}
  args.push(value);
 }
 const text={...SOURCE_STRING,rustSourceType:true},type=row.operation==='len'?indexType():row.operation==='get'?checker.instantiations.option(text,node.span):{...sourceVector(text),rustSourceType:true};
 if(row.operation==='get')forwardOwnedCarrier(checker,type,'Option',path,node.span,(_checker,payload,span)=>ownedString(checker,payload,path,span));
 if(expected){if(!sameType(type,expected))throw typeError('Actual owned text vector result differs',node.span);checker.expectedOwnership(type,expected,path,node.span);checker.expectedPrimitiveIdentity(type,expected,path,node.span);}requireOriginalPrimitiveTryFromChecker(checker);current();return {k:'routerHostCall',id:row.javascriptName,args,type,span:node.span,constEligible:false};
});}
export function emitForwardOwnedTextVector(emitter,node){if(ownedTextVectorLiteralOperationShape(node.id,node.args?.length))return emitForwardOwnedTextVectorLiteral(emitter,node);return withOriginalOwnedTextVectorSourceOperation(()=>{const row=ownedTextVectorOperationShape(node.id);if(node.k!=='routerHostCall'||!row||node.args.length!==row.parameters.length)fail();requireCurrentOwnedTextVectorOriginalOperationSource(row.javascriptName);(emitter.ownedTextVectors??=new Set()).add(row.javascriptName);return 'ml_host_'+row.javascriptName+'('+node.args.map(argument=>emitter.expr(argument)).join(', ')+')';});}
export function ownedTextVectorForwardImports(names,runtimeModule='./runtime/effects.mjs'){if(!names?.size)return [];const imports=[...names].sort();for(const name of imports)if(ownedTextVectorOperationShape(name)?.javascriptName!==name)fail();return ['import { '+imports.map(name=>name+' as ml_host_'+name).join(', ')+' } from '+JSON.stringify(runtimeModule.replace(/effects\.mjs$/u,'owned-text-vector-runtime.mjs'))+';'];}
export function ownedTextVectorForwardRuntimeAssets(){const files=new Map(ownedTextVectorRuntimeSources('runtime').map(row=>[row.path.slice('runtime/'.length),row.source]));for(const [name,source]of ownedTextVectorLiteralRuntimeAssetPair())files.set(name,source);return files;}

import {ownedTextVectorLiteralOperationShape} from './owned-text-vector-literal-call-shape.mjs';import {checkForwardOwnedTextVectorLiteral,emitForwardOwnedTextVectorLiteral} from './owned-text-vector-literal-forward.mjs';import {ownedTextVectorLiteralRuntimeAssetPair} from './owned-text-vector-literal-runtime-sources.mjs';
