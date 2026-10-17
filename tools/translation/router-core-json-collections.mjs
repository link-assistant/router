// Fixed owned eager collection contract. Private caller/call issuance stays in
// router-core-json-updates; public IR tags and array shapes grant no admission.
import {sameType} from './checked-types.mjs';
import {originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {sourceShared,sourceVector} from './extensions/source-contract-types.mjs';
import {JSON_TYPES} from './extensions/json-contracts.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SHA256} from './router-core-source-data.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';
export const isRouterCoreJsonCollection=operation=>operation==='json_map'||operation==='json_filter_map';
export const routerCoreJsonCollectionSourceHash=ROUTER_CORE_JSON_COLLECTIONS_SHA256;
const qualified=originalDataFreezeIntrinsicsUnchanged();
const fail=()=>{throw new TypeError('Owned JSON collection requires its actual complete leaf and facade');};
function leaf(state){
 const rows=state.facts.modules.filter(module=>module.path.join('::')==='translation_core::json_collections');
 if(rows.length!==1||rows[0].file!=='src/translation_core/json_collections.rs'||rows[0].source!==ROUTER_CORE_JSON_COLLECTIONS_SOURCE||rows[0].configurationCondition!=='active'||!rows[0].sourceView)fail();
 originalSourceModuleItems(rows[0]);return rows[0];
}
export function parseRouterCoreJsonCollection(parser,path){
 const c=parser.cursor;if(!['crate','::','translation_core','::'].every((word,at)=>c.is(word,at))||[0,2,4].some(at=>c.peek(at).kind!=='identifier')||!isRouterCoreJsonCollection(c.peek(4).value))return null;
 if(!qualified||!originalDataFreezeIntrinsicsUnchanged())fail();
 const state=matchesParserFacts(parser),facade=requireRouterCoreFacade(parser),original=leaf(state),view=original.sourceView,tokens=c.tokens,start=c.index,first=c.peek(),operation=c.peek(4).value;
 const stage=createRulePipeline([{phase:'language',rules:[{id:'owned-json-collections:complete-leaf-CST',apply:()=>{const value=transportConcreteSyntaxSource(original.source,{language:'Rust'});if(value.source!==ROUTER_CORE_JSON_COLLECTIONS_SOURCE)fail();return value;}}]},{phase:'repository',rules:[{id:'router-core:bind-eager-json-collection',apply:value=>value}]}]).run(null);
 const current=index=>{if(!qualified||!originalDataFreezeIntrinsicsUnchanged())fail();requireRouterCoreFacadeCurrent(parser,facade);if(matchesParserFacts(parser)!==state||leaf(state)!==original||original.sourceView!==view||parser.cursor!==c||c.tokens!==tokens||c.index!==index)fail();};
 current(start);c.index+=5;c.expect('(','owned JSON collection');const args=[];while(!c.is(')')){args.push(parser.expr(path));if(!c.eat(','))break;}const last=c.expect(')','owned JSON collection');current(c.index);
 return {node:{k:'routerCoreJsonUpdateCall',operation,args,span:{start:first.start,end:last.end}},trace:stage.trace};
}
function canonical(checker,type,path,span){
 const expected=checker.hostType(JSON_TYPES.value,path,span),entry=type?.kind==='data'?checker.items.get(type.name):null;
 if(!sameType(type,expected)||entry?.hostTypePath?.join('::')!=='serde_json::Value'||entry.generated!=='router-json-contract'||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw unsupported('owned JSON collection item','requires actual by-value canonical Json',span);
 checker.expectedOwnership(type,expected,path,span);return expected;
}
// Only this fixed source-bound library callback supplies the missing contextual
// Option metadata. The actual current declaration and every written payload
// must still agree with its independently checked canonical Json signature.
function requireCallbackOption(checker,type,expected,json,path,span){
 const owner=type?.kind==='data'?checker.items.get(type.name):null,source=type?.rustStandardGeneric,wanted=expected.rustStandardGeneric;
 if(type?.rustReference||type?.rustOwnership||type?.patternOwnershipRefusal||type?.rustGenericIdentityUnresolved||type?.rustBorrowingUnresolved||!sameType(type,expected)||owner?.k!=='data'||owner.fullName!==type.name||owner.standardGeneric?.kind!=='Option'||owner.standardGeneric.arguments?.length!==1||owner.ctors?.length!==2||wanted?.kind!=='Option'||wanted.arguments?.length!==1||source&&(source.kind!=='Option'||source.arguments?.length!==1))throw unsupported('owned JSON collection Option','requires the actual fixed by-value Option<Json> result',span);
 const some=owner.ctors.filter(ctor=>ctor.name==='Some'),none=owner.ctors.filter(ctor=>ctor.name==='None');
 if(some.length!==1||none.length!==1||some[0].fields?.length!==1||some[0].fields[0].name!=='field0'||none[0].fields?.length!==0)throw typeError('owned JSON collection Option constructor layout changed',span);
 for(const written of [wanted.arguments[0],owner.standardGeneric.arguments[0],some[0].fields[0].type,...(source?source.arguments:[])]){
  const actual=checker.resolveType(written,owner.modulePath,span);canonical(checker,actual,path,span);if(!sameType(actual,json))throw typeError('owned JSON collection Option payload changed',span);checker.expectedOwnership(actual,json,path,span);checker.expectedPrimitiveIdentity(actual,json,path,span);
 }
 checker.expectedOwnership(type,expected,path,span);checker.expectedPrimitiveIdentity(type,expected,path,span);
}
export function checkRouterCoreJsonCollection(checker,node,env,path,expected){
 const checked=()=>{requireOriginalPrimitiveTryFromChecker(checker);if(!qualified||!originalDataFreezeIntrinsicsUnchanged())fail();};checked();
 if(node.args.length!==2||node.args[1].k!=='routerLambda'||node.args[1].params.length!==1||node.args[1].params[0].pattern)throw unsupported('owned JSON collection callback','requires one actual inline immutable parameter',node.span);
 const receiver=checker.expr(node.args[0],env,path);checked();const type=receiver.type,pointee=type?.rustReference?.pointee;
 const reference=type.rustReference,sourceSlice=value=>value?.kind==='array'&&value.rustSourceType===true&&value.rustOwnership?.kind==='borrowed'&&value.rustOwnership.source==='slice'&&!value.rustFixedArray&&!value.rustGenericIdentityUnresolved&&!value.rustBorrowingUnresolved;
 if(reference?.kind!=='shared'||!sourceSlice(type)||!sourceSlice(pointee)||pointee.rustReference||pointee.patternOwnershipRefusal||type.patternOwnershipRefusal!=='shared source reference'||reference.tokens?.[0]?.value!=='&'||!Number.isInteger(reference.span?.start)||!Number.isInteger(reference.span?.end)||reference.span.start<0||reference.span.end<reference.span.start||!sameType(type.element,pointee.element))throw unsupported('owned JSON collection input','requires one actual checked shared Json slice',node.span);
 canonical(checker,type.element,path,node.span);checker.expectedOwnership(type.element,pointee.element,path,node.span);
 const json=canonical(checker,pointee.element,path,node.span),item=sourceShared(json),result=node.operation==='json_filter_map'?checker.instantiations.option(json,node.span):json;
 // Fresh boundary for EVERY callback, including an ordinary tail body. The
 // existing lambda checker still handles parameter identities and local returns.
 let callback=checker.hostLambda(node.args[1],[item],checker.callbackEnvironment(new Map(env),result),path,result,{source:'owned-json-collection',receiverType:type});checked();
 if(!sameType(callback.type.result,result))throw typeError('owned JSON collection callback result differs',node.span);
 checker.expectedOwnership(callback.type.result,result,path,node.span);
 if(node.operation==='json_filter_map'){requireCallbackOption(checker,callback.type.result,result,json,path,node.span);requireCallbackOption(checker,callback.binding.type,result,json,path,node.span);callback={...callback,type:{...callback.type,result}};}
 const output={...sourceVector(json),rustSourceType:true};
 if(expected){if(!sameType(output,expected))throw typeError('owned JSON collection result differs',node.span);checker.expectedOwnership(output,expected,path,node.span);}
 checked();return {k:'routerCoreJsonCollection',id:'router_core_'+node.operation,args:[receiver,callback],type:output,constEligible:false,span:node.span};
}
