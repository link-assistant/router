import {crateModuleSourcePath} from './repository-layout.mjs';
import {forwardJsonIterationContract} from './json-iteration-forward-domain.mjs';
// Only source-bound owned JSON operations enter this language rule. The Rust
// library bodies remain untranslated; no general Clone/IndexMut is admitted.
import {types} from 'node:util';
import {parseRouterCoreJsonParse,checkRouterCoreJsonParse,isRouterCoreJsonParse,ROUTER_CORE_JSON_PARSE_CONTRACTS} from './router-core-json-parse.mjs';
import {parseRouterCoreJsonCollection,checkRouterCoreJsonCollection,isRouterCoreJsonCollection,routerCoreJsonCollectionSourceHash} from './router-core-json-collections.mjs';
import {requireOriginalPrimitiveTryFromChecker,originalJsonCaptureCheckerEligible} from './extensions/host-contracts.mjs';
import {originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {copyMetadata,metadataDigest,originalParsedDeclarationEvidence,originalParsedSyntaxNode} from './extensions/source-links.mjs';
import {JSON_TYPES,JSON_DATA} from './extensions/json-contracts.mjs';
import {BOOL,UNIT,sameType} from './checked-types.mjs';
import {planPattern} from './pattern-bindings.mjs';
import {canonicalResult} from './extensions/result-iterators.mjs';
import {planStandardMethod,completeStandardMethod} from './extensions/standard-method-plans.mjs';
import {CSV_STRING_PROFILE,checkedAllocatingStringItem,requireCsvEmitterProof} from './extensions/csv-strings.mjs';
import {originalStandardCallContext,hasOriginalStandardCall} from './extensions/original-standard-calls.mjs';
import {requirePinnedOptionCallbackBody} from './extensions/standard-option-callback-body.mjs';
import {requireOriginalMappedBody} from './extensions/standard-mapped-body.mjs';
import {alphaTree,retargetCheckedCallback,requirePinnedStandardBody,nonlocal} from './extensions/standard-body-checker.mjs';
import {captureBorrowedLayouts,requireBorrowedLayouts} from './extensions/standard-borrowed-body.mjs';
import {renameFunction,renameExpr,Scope} from './vendor/meta-language/translation/ir.js';
import {coerce} from './checked-coercions.mjs';
import {validateOwnedJsonFlow,describeOwnedJsonDifference} from './owned-json-flow.mjs';
import {SOURCE_STR,sourceShared} from './extensions/source-contract-types.mjs';
import {requireBorrowedString} from './extensions/string-iterators.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_PRIMITIVES_SHA256} from './router-core-source-data.mjs';
import {unsupported,typeError,TranslationError} from './vendor/meta-language/translation/diagnostics.js';
const qualified=originalDataFreezeIntrinsicsUnchanged(),calls=new WeakMap(),rawArgumentCalls=new WeakMap(),checkedCalls=new WeakMap(),functions=new WeakMap(),activeFunctions=new WeakMap(),issued=new WeakMap(),completedFunctions=new WeakMap();
const own=Object.hasOwn,descriptor=Object.getOwnPropertyDescriptor,keys=Reflect.ownKeys,prototype=Object.getPrototypeOf,isArray=Array.isArray,isProxy=types.isProxy,plainPrototype=Object.prototype,arrayPrototype=Array.prototype;
const freeze=value=>{if(value&&typeof value==='object'){for(const value_ of Object.values(value))freeze(value_);Object.freeze(value);}return value;};
const updateContracts=['json_copy','json_with_field'].map(name=>({
 id:'router_core_'+name,jsExport:'router_core_'+name,rustPath:['crate','translation_core',name],kind:'function',family:'json-update',
 params:name==='json_copy'?[sourceShared(JSON_TYPES.value)]:[JSON_TYPES.value,SOURCE_STR,JSON_TYPES.value],ret:JSON_TYPES.value,
 async:false,pure:true,constEligible:false,requiresRefinement:'genuine-router-owned-json-update',
 assumptions:['Actual complete owned facade and primitive leaf bind this exact operation.',
  'Canonical immutable JSON only; no custom Clone, IndexMut, Serialize or mutable-reference admission.',
  'Arguments evaluate once, left to right; an adopted assignment evaluates its RHS in a prior hygienic local.',
  'Deep copies and final results retain existing 4096-node/depth32/dense4096 bounds and Unicode/UTF8 map ordering.',
  'Null promotes to an object; other non-object bases panic. Allocation/OOM/allocator and payload Drop internals remain outside the bounded successful-resource projection.'],
}));
export const ROUTER_CORE_JSON_UPDATE_CONTRACTS=freeze([...ROUTER_CORE_JSON_PARSE_CONTRACTS,...updateContracts,...['json_index_str','json_index_usize','json_map_index'].map(name=>({id:'router_core_'+name,jsExport:'router_core_'+name,rustPath:['crate','translation_core',name],kind:'function',family:'json-update',params:[sourceShared(name==='json_map_index'?JSON_TYPES.map:JSON_TYPES.value),name==='json_index_usize'?{kind:'fixed',bits:64,signed:false,rustSourceType:true,rustPrimitiveName:'usize'}:SOURCE_STR],ret:sourceShared(JSON_TYPES.value),async:false,pure:true,constEligible:false,requiresRefinement:'genuine-router-owned-json-projection',assumptions:['Actual complete facade/primitive sources bind this shared projection.','Result borrows only argument zero; the key grants no lifetime.','Value missing/wrong-kind returns canonical Null; Map missing entry panics.','Existing canonical JSON bounds apply; no Index/IndexMut/Copy/Drop or arbitrary borrowing authority.']}))]);
const projectionNames=new Set(['json_index_str','json_index_usize','json_map_index']),projectionContexts=new Map(),emissionFrames=new WeakMap();
const projectionDefinitions={"json_index_str":"pub fn json_index_str<'a>(value: &'a Json, key: &Str) -> &'a Json {\n    &value[key]\n}","json_index_usize":"pub fn json_index_usize<'a>(value: &'a Json, index: usize) -> &'a Json {\n    &value[index]\n}","json_map_index":"pub fn json_map_index<'a>(\n    value: &'a ::serde_json::Map<::std::string::String, Json>,\n    key: &Str,\n) -> &'a Json {\n    &value[key]\n}"};
const projectionId=id=>typeof id==='string'&&id.startsWith('router_core_')&&(projectionNames.has(id.replace(/^router_core_/u,''))||isRouterCoreJsonCollection(id.replace(/^router_core_/u,'')));
const fail=()=>{throw new TypeError('Owned JSON update requires its actual complete source binding');};
function sourceContract(run,span){try{return run();}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('Router owned JSON update source',error.message,span);}}
function leaf(state){const rows=state.facts.modules.filter(module=>module.path.join('::')==='translation_core::primitives');if(rows.length!==1||rows[0].file!==crateModuleSourcePath(state.facts.modules,'src/translation_core/primitives.rs')||rows[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||rows[0].configurationCondition!=='active'||!rows[0].sourceView)fail();originalSourceModuleItems(rows[0]);return rows[0];}
function same(a,b,budget={cells:200000},depth=0){
 if(--budget.cells<0||depth>160)return false;if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||isProxy(a)||isProxy(b))return false;
 if(isArray(a)!==isArray(b)||(prototype(a)!==plainPrototype&&prototype(a)!==null&&prototype(a)!==arrayPrototype))return false;
 const names=keys(a),wanted=keys(b);if(names.length!==wanted.length)return false;
 for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack'||!own(b,names[at]))return false;
 for(let at=0;at<wanted.length;at++){const key=wanted[at],x=descriptor(a,key),y=descriptor(b,key);if(!x||!y||!own(x,'value')||!own(y,'value')||x.enumerable!==y.enumerable||!same(x.value,y.value,budget,depth+1))return false;}return true;
}
// The upstream block parser shallow-copies its tail with one block:true field.
// Recovery is available only at a genuine unchanged parsed parent/node join;
// the private original argument identity is necessary in addition to equality.
function parsedCallReceipt(origin){
 const node=origin.original,exact=calls.get(node);if(exact)return exact;
 if(!node||typeof node!=='object'||isProxy(node)||prototype(node)!==plainPrototype)return null;
 const names=keys(node),wanted=['k','operation','args','span','block'];if(names.length!==wanted.length)return null;for(let at=0;at<wanted.length;at++)if(names[at]!==wanted[at])return null;
 let args,block;for(let at=0;at<names.length;at++){const field=descriptor(node,names[at]);if(!field||!own(field,'value')||field.enumerable!==true||field.configurable!==true||field.writable!==true)return null;if(at===2)args=field.value;if(at===4)block=field.value;}if(block!==true)return null;
 const original=rawArgumentCalls.get(args);if(!original||original.parser!==origin.parser)return null;
 const syntax={...original.syntax,block:true};return same(node,syntax)?{...original,syntax}:null;
}
export function parseRouterCoreJsonUpdate(parser,path){
 const collection=sourceContract(()=>parseRouterCoreJsonParse(parser,path)??parseRouterCoreJsonCollection(parser,path),parser.cursor.peek());if(collection){const node=collection.node,receipt={parser,syntax:copyMetadata(node),trace:collection.trace,...(collection.numericProfile?{numericProfile:copyMetadata(collection.numericProfile)}:{})};calls.set(node,receipt);rawArgumentCalls.set(node.args,receipt);return node;}
 const c=parser.cursor;if(!['crate','::','translation_core','::'].every((word,at)=>c.is(word,at))||[0,2,4].some(at=>c.peek(at).kind!=='identifier'))return null;
 const operation=c.peek(4).value;if(!['json_copy','json_with_field'].includes(operation)&&!projectionNames.has(operation))return null;
 const first=c.peek(),location={start:first.start,end:c.peek(4).end},tokens=c.tokens,start=c.index;
 if(!qualified||!originalDataFreezeIntrinsicsUnchanged())throw unsupported('owned JSON update host','requires original native data operations',location);
 const state=sourceContract(()=>matchesParserFacts(parser),location),facade=sourceContract(()=>requireRouterCoreFacade(parser),location),original=sourceContract(()=>leaf(state),location),view=original.sourceView;
 if(projectionNames.has(operation)){
  const rows=originalSourceModuleItems(original).filter(item=>item.term==='fn'&&item.name===operation);if(rows.length!==1)fail();
  const tokens=rows[0].tokens.filter(token=>token.type!=='comment'),fn=tokens.findIndex(token=>token.text==='fn');
  if(fn<1||tokens[fn-1].text!=='pub'||original.source.slice(tokens[fn-1].start,rows[0].end)!==projectionDefinitions[operation])fail();
 }
 const stage=sourceContract(()=>createRulePipeline([
  {phase:'language',rules:[{id:'owned-json-update:complete-source-CST-roundtrip',apply:()=>{const value=transportConcreteSyntaxSource(original.source,{language:'Rust'});if(value.source!==ROUTER_CORE_PRIMITIVES_SOURCE)fail();return value;}}]},
  {phase:'repository',rules:[{id:'router-core:bind-qualified-json-update',apply:value=>value}]},
 ]).run(null),location);
 const current=end=>sourceContract(()=>{if(!originalDataFreezeIntrinsicsUnchanged())fail();requireRouterCoreFacadeCurrent(parser,facade);if(matchesParserFacts(parser)!==state||leaf(state)!==original||original.sourceView!==view||parser.cursor!==c||c.tokens!==tokens||c.index!==end)fail();},location);
 current(start);c.index+=5;c.expect('(','owned JSON update');const args=[];while(!c.is(')')){args.push(parser.expr(path));if(!c.eat(','))break;}const last=c.expect(')','owned JSON update');current(c.index);
 const node={k:'routerCoreJsonUpdateCall',operation,args,span:{start:first.start,end:last.end}},syntax=copyMetadata(node);current(c.index);const receipt={parser,syntax,trace:stage.trace};calls.set(node,receipt);rawArgumentCalls.set(node.args,receipt);return node;
}
export function captureRouterCoreJsonUpdates(checker,surface){
 if(!qualified||!originalJsonCaptureCheckerEligible(checker))return;const nodes=new WeakMap(),entries=new WeakMap();let guarded=false;
 const declaration=entry=>{
  let candidates=null,cells=200000;const members=new WeakMap(),matches=new WeakMap(),formats=new WeakMap();
  const visit=(node,depth=0)=>{if(--cells<0||depth>160||!node||typeof node!=='object'||isProxy(node))return;const parent=prototype(node);if(parent!==plainPrototype&&parent!==null&&parent!==arrayPrototype)return;const names=keys(node);for(let at=0;at<names.length;at++)if(names[at]==='stack')return;const kind=descriptor(node,'k');if(kind&&own(kind,'value')&&kind.value==='let')members.set(node,true);if(kind&&own(kind,'value')&&kind.value==='routerOrderedMatch')matches.set(node,copyMetadata(node));if(kind&&own(kind,'value')&&kind.value==='routerConstObligation'){const feature=descriptor(node,'sourceFeature');if(feature&&own(feature,'value')&&feature.value==='router-core-format')formats.set(node,copyMetadata(node));}if(kind&&own(kind,'value')&&kind.value==='routerCoreJsonUpdateCall')candidates={node,next:candidates};for(let at=0;at<names.length;at++){const key=names[at];if(typeof key!=='string'||key==='type'||key==='span'||key==='length')continue;const field=descriptor(node,key);if(field&&own(field,'value'))visit(field.value,depth+1);}};visit(entry);
  if(!qualified||!originalDataFreezeIntrinsicsUnchanged())fail();if(!guarded){requireOriginalPrimitiveTryFromChecker(checker);guarded=true;}if(!originalParsedDeclarationEvidence(entry))return;
  let captured=false;while(candidates){const node=candidates.node,origin=originalParsedSyntaxNode(entry,node),receipt=origin&&parsedCallReceipt(origin);if(origin?.actual===node&&receipt?.parser===origin.parser){const snapshot=copyMetadata(node);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();const current=originalParsedSyntaxNode(entry,node);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();if(current?.actual===node&&current.original===origin.original&&current.parser===receipt.parser&&same(origin.original,receipt.syntax)&&same(node,origin.relocated)&&same(node,snapshot)){nodes.set(node,{receipt,syntax:snapshot});captured=true;}}candidates=candidates.next;}
  {const syntax=copyMetadata(entry);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged()||!originalParsedDeclarationEvidence(entry)||!same(entry,syntax))fail();entries.set(entry,{syntax,members,matches,formats,owns:captured});}
 };
 let itemCells=200000;
 const items=(list,depth=0)=>{if(--itemCells<0||depth>160||!list||typeof list!=='object'||isProxy(list)||!isArray(list)||prototype(list)!==arrayPrototype)return;const length=descriptor(list,'length');if(!length||!own(length,'value')||length.value>200000)return;for(let at=0;at<length.value;at++){const field=descriptor(list,at),entry=field&&own(field,'value')?field.value:null;if(!entry||typeof entry!=='object'||isProxy(entry))continue;const names=keys(entry);let stack=false;for(let index=0;index<names.length;index++)if(names[index]==='stack')stack=true;if(stack)continue;const kind=descriptor(entry,'k');if(!kind||!own(kind,'value'))continue;if(kind.value==='fn')declaration(entry);else if(kind.value==='module'){const child=descriptor(entry,'items');if(child&&own(child,'value'))items(child.value,depth+1);}}};
 if(surface&&typeof surface==='object'&&!isProxy(surface)){const names=keys(surface);let stack=false;for(let at=0;at<names.length;at++)if(names[at]==='stack')stack=true;if(!stack){const field=descriptor(surface,'items');if(field&&own(field,'value'))items(field.value);}}checkedCalls.set(checker,nodes);functions.set(checker,entries);completedFunctions.set(checker,new Map());
}
function canonical(checker,type,span,shared){
 if(type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw unsupported('owned JSON update operand','unresolved source ownership',span);
 let value=type;
 if(shared){if(value.rustReference){if(value.rustReference.kind!=='shared'||!value.rustReference.pointee||value.rustReference.pointee.rustReference)throw unsupported('owned JSON copy reference','requires one checked shared Json reference',span);value=value.rustReference.pointee;}else if(value.patternOwnershipRefusal&&value.patternOwnershipRefusal!=='explicit shared reference expression')throw unsupported('owned JSON copy borrow','requires the written shared borrow',span);}
 else if(value.rustReference||value.rustOwnership||value.patternOwnershipRefusal)throw unsupported('owned JSON update value','requires a by-value canonical Json',span);
 const entry=value.kind==='data'?checker.items.get(value.name):null;if(entry?.hostTypePath?.join('::')!=='serde_json::Value'||value.rustGenericIdentityUnresolved||value.rustBorrowingUnresolved)throw unsupported('owned JSON update type','requires actual canonical Json',span);
}
export function checkRouterCoreJsonUpdate(checker,node,env,path,expected){
 if(!qualified||!originalDataFreezeIntrinsicsUnchanged())fail();const capture=checkedCalls.get(checker)?.get(node);if(!capture||!same(node,capture.syntax))throw typeError('owned JSON update lacks its actual qualified source call',node.span);
 requireOriginalPrimitiveTryFromChecker(checker);if(!activeFunctions.has(checker))throw unsupported('owned JSON flow','requires its active original function body',node.span);
 if(isRouterCoreJsonCollection(node.operation))return checkedCollection(checker,node,capture,env,path,expected);
 const contract=ROUTER_CORE_JSON_UPDATE_CONTRACTS.find(row=>row.rustPath.at(-1)===node.operation);if(!contract||node.args.length!==contract.params.length)throw typeError('owned JSON update argument count',node.span);
 const stage=createRulePipeline([
  {phase:'language',rules:[{id:'owned-json-update:check-canonical-ownership-and-operands',apply:()=>{
   if(isRouterCoreJsonParse(node.operation))return checkRouterCoreJsonParse(checker,node,env,path,expected);
   let args;const evaluate=syntax=>{requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();const value=checker.expr(syntax,env,path);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();return value;};
   if(projectionNames.has(node.operation)){args=projectionArguments(checker,node,env,path,evaluate);}
   else if(node.operation==='json_copy'){
    const written=node.args[0],borrow=written.k==='routerTextReference',value=evaluate(borrow?written.value:written);canonical(checker,value.type,written.span,true);if(!borrow&&!value.type.rustReference)throw unsupported('owned JSON copy argument','requires an explicit shared borrow or actual shared Json parameter',written.span);args=[value];
   }else{
    args=node.args.map(evaluate);canonical(checker,args[0].type,node.args[0].span,false);canonical(checker,args[2].type,node.args[2].span,false);const key=args[1].type;if(key.kind!=='string'||key.rustReference||key.rustOwnership?.kind!=='borrowed'||key.rustOwnership.source!=='str'||key.patternOwnershipRefusal||key.rustBorrowingUnresolved||key.rustGenericIdentityUnresolved)throw unsupported('owned JSON update key','requires checked borrowed scalar text',node.args[1].span);
   }
   const type=projectionNames.has(node.operation)?{...sourceShared(checker.hostType(JSON_TYPES.value,path,node.span)),rustSourceType:true}:{...checker.hostType(JSON_TYPES.value,path,node.span),rustSourceType:true};if(expected&&!sameType(type,expected))throw typeError('owned JSON update result type differs',node.span);if(expected)checker.expectedOwnership?.(type,expected,path,node.span);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged()||!same(node,capture.syntax))throw typeError('owned JSON update changed during checking',node.span);return {k:'routerHostCall',id:contract.id,args,type,span:node.span,constEligible:false};
  }}]},
  {phase:'repository',rules:[{id:'router-core:retain-owned-json-update-boundary',apply:call=>({...call,compatibilityCore:{id:'router-owned-json-update-v1',symbol:contract.rustPath.join('::'),sourceSha256:ROUTER_CORE_PRIMITIVES_SHA256,sourceTrace:capture.receipt.trace,...(capture.receipt.numericProfile?{numericProfile:capture.receipt.numericProfile}:{}),libraryImplementation:'untranslated-owned-rust-library',boundedProjection:true,runtimeParity:false}})}]},
 ]);const value=stage.run(null).value,record={checker,frame:activeFunctions.get(checker),id:value.id,args:copyMetadata(value.args)};
 if(isRouterCoreJsonParse(node.operation))record.typeIdentity=value.type;
 if(projectionNames.has(node.operation)||isRouterCoreJsonParse(node.operation)||record.frame.errorLane||record.frame.optionLane){
  const layouts=copyMetadata(captureBorrowedLayouts(checker,[...value.args.map(arg=>arg.type),value.type]));
  const key=metadataDigest({functionName:record.frame.functionName,source:record.frame.syntax,call:value,layouts});value.compatibilityCore.sourceProjectionKey=key;
  record.call=copyMetadata(value);record.layouts=layouts;record.roots=copyMetadata([...value.args.map(arg=>arg.type),value.type]);
  record.key=key;(record.frame.projections??=new Set()).add(record);
 }
 issued.set(value.compatibilityCore,record);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged()||!same(node,capture.syntax))fail();return value;
}

// The same private caller issuer handles both fixed JSON families. Collection
// contexts retain detached data only; checking frame/Checker never escapes.
function checkedCollection(checker,node,capture,env,path,expected){
 const iteration=forwardJsonIterationContract(node.operation);
 const stage=createRulePipeline([{phase:'language',rules:[{id:'owned-json-collections:check-shared-input-and-local-callback',apply:()=>checkRouterCoreJsonCollection(checker,node,env,path,expected)}]},{phase:'repository',rules:[{id:'router-core:retain-actual-eager-collection',apply:call=>({...call,compatibilityCore:{id:'router-owned-json-collections-v1',symbol:'crate::'+(iteration?.namespace??'translation_core')+'::'+node.operation,sourceSha256:iteration?.sourceSha256??routerCoreJsonCollectionSourceHash,sourceTrace:capture.receipt.trace,libraryImplementation:'untranslated-owned-rust-library',boundedProjection:true,runtimeParity:false}})}]}]).run(null);
 const value=stage.value,record={checker,frame:activeFunctions.get(checker),id:value.id,args:copyMetadata(value.args)};
 requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged()||!same(node,capture.syntax))fail();
 const roots=[...value.args.slice(0,-1).map(argument=>argument.type),value.type,value.args.at(-1).type.result];record.layouts=copyMetadata(captureBorrowedLayouts(checker,roots));record.roots=copyMetadata(roots);
 record.key=metadataDigest({functionName:record.frame.functionName,source:record.frame.syntax,call:value,layouts:record.layouts});value.compatibilityCore.sourceProjectionKey=record.key;record.call=copyMetadata(value);
 (record.frame.projections??=new Set()).add(record);issued.set(value.compatibilityCore,record);return value;
}

// Hooked only at the actual Host checker source ingress. This binds the
// checker-created ordered match to its original parsed node and source order;
// copying a public patternControl tag cannot produce membership.
export function visitOriginalJsonCollectionTextMatch(checker,node,run){
 const frame=activeFunctions.get(checker),syntax=frame?.matches.get(node);if(!syntax)return run();
 requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged()||!same(node,syntax))fail();
 const result=run(),body=result?.k==='let'?result.body:null;
 requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged()||!same(node,syntax))fail();
 if(!node.sourceMacro&&body?.k==='routerOrderedMatchArms'&&result.value.type.kind==='string'&&!result.value.type.rustReference&&!result.value.type.patternOwnershipRefusal&&!result.value.type.rustBorrowingUnresolved&&!result.value.type.rustGenericIdentityUnresolved&&result.value.type.rustOwnership?.kind==='borrowed'&&result.value.type.rustOwnership.source==='str'){
  const order=[];let bounded=0;
  const pattern=(value,span,depth=0)=>{if(++bounded>256||depth>32)return false;if(value?.k==='strLit'){order.push({value:value.value,span});return typeof value.value==='string';}if(value?.k==='wild'){order.push({value:null,span});return true;}return value?.k==='or'&&value.alternatives.every(child=>pattern(child,span,depth+1));};
  const closed=node.rows.every(row=>!row.guard&&pattern(row.pattern,row.span));
  if(closed&&order.length===body.branches.length&&body.branches.every((branch,at)=>{
   const selected=order[at],condition=branch.cond;return same(branch.span,selected.span)&&(selected.value===null?condition.k==='lit'&&condition.value===true:condition.k==='binary'&&condition.op==='eq'&&condition.right?.k==='lit'&&condition.right.value===selected.value);
  }))(frame.textMatches??=[]).push({body:copyMetadata(body),syntax,original:node});
 }
 return result;
}

// This hook sees only the output of the actual Host expression visit. The
// complete original function, qualified raw member and formatter stay joined;
// neither public format metadata nor a copied semantic node opens the lane.
export function observeOriginalJsonErrorFormat(checker,node,value){
 const frame=activeFunctions.get(checker);observeOptionReader(checker,node,value,frame);const syntax=frame?.formats.get(node);if(!syntax)return value;
 requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged()||!same(node,syntax)||value?.type.kind!=='string'||value.type.rustOwnership?.kind!=='owned'||value.type.rustOwnership.source!=='String')fail();
 const inner=value.k==='routerConstObligation'?value.value:value;if(!inner.formatProvenance||inner.formatProvenance.profile!=='checked-primitive-format-v1')fail();
 value={...value,type:{...value.type,rustSourceType:true}};
 (frame.formatted??=[]).push({value:copyMetadata(value),syntax,original:node});return value;
}
const stringError=(checker,entry)=>{const actual=canonicalResult(checker,entry.ret,entry.modulePath,entry.span,false);return actual?.error.kind==='string'&&actual.error.rustOwnership?.kind==='owned'&&actual.error.rustOwnership.source==='String'&&!actual.error.rustReference&&!actual.error.rustBorrowingUnresolved&&!actual.error.rustGenericIdentityUnresolved;};
// Qualification only: the complete flow below still checks every operation,
// current canonical field/layout, source lifetime and original caller receipt.
function ownedOptionReturn(checker,entry){
 const type=entry.ret,owner=type?.kind==='data'?checker.items.get(type.name):null,source=type?.rustStandardGeneric;
 if(type?.rustReference||type?.rustOwnership||type?.rustGenericIdentityUnresolved||type?.rustBorrowingUnresolved||owner?.k!=='data'||owner.fullName!==type.name||owner.standardGeneric?.kind!=='Option'||source?.kind!=='Option'||source.arguments?.length!==1||owner.standardGeneric.arguments?.length!==1||owner.ctors?.length!==2)return false;
 const some=owner.ctors.find(row=>row.name==='Some'),none=owner.ctors.find(row=>row.name==='None');if(!some||some.fields?.length!==1||some.fields[0].name!=='field0'||!none||none.fields?.length)return false;
 const payload=checker.resolveType(source.arguments[0],owner.modulePath,entry.span),text=payload.kind==='string'&&payload.rustSourceType===true&&payload.rustOwnership?.kind==='owned'&&payload.rustOwnership.source==='String'&&!payload.rustReference&&!payload.rustGenericIdentityUnresolved&&!payload.rustBorrowingUnresolved&&[undefined,'ownership-bearing String type','owned String source type','owned String formatting'].includes(payload.patternOwnershipRefusal);
 if(type.patternOwnershipRefusal&&!(text&&type.patternOwnershipRefusal==='ownership-bearing String type'))return false;
 if(!text){if(payload.kind!=='data'||payload.rustReference||payload.rustOwnership||payload.patternOwnershipRefusal||payload.rustBorrowingUnresolved||payload.rustGenericIdentityUnresolved||checker.items.get(payload.name)?.hostTypePath?.join('::')!=='serde_json::Value')return false;}
 for(const written of [owner.standardGeneric.arguments[0],some.fields[0].type]){const actual=checker.resolveType(written,owner.modulePath,entry.span);if(!sameType(actual,payload))return false;checker.expectedOwnership(actual,payload,owner.modulePath,entry.span);checker.expectedPrimitiveIdentity(actual,payload,owner.modulePath,entry.span);}return true;
}
// Both raw and checked membership are local to this actual completed function.
// No source checksum, copied callback or standalone CSV marker is an issuer.
function closedOptionSource(checker,fact,current,Parser,Checker,program){
 const allocations=new WeakSet(),actualTypes=new WeakMap();
 const member=(root,target,predicate)=>{let cells=100000,hits=[];const visit=(node,depth=0)=>{if(!node||typeof node!=='object')return;if(--cells<0||depth>160)fail();if(target?node===target:predicate(node))hits.push(node);for(const [key,value]of Object.entries(node))if(!['type','span','compatibilityCore','pinnedStandardBodyProof','originalCallbackProof','sourceFrameProof','originalLoanProof','sharedBodyProof','sourceSharedPatternProof'].includes(key))Array.isArray(value)?value.forEach(child=>visit(child,depth+1)):visit(value,depth+1);};visit(root);return hits;};
 member(fact.entry.body,null,node=>{if(node.type?.kind==='data')actualTypes.set(node,node.type);return false;});
 return {
  optionSource:(type,node,entry)=>{if(current(entry.fullName)!==fact||node?.type!==type||actualTypes.get(node)!==type)return null;const actual=currentOptionLayout(checker,type,node.span,true);return actual?{source:{kind:'Option',arguments:[actual.payload]},summary:actual.summary}:null;},
  standard:node=>{current(fact.entry.fullName);let body=null;if(node.k==='routerPinnedStandardBody'){requirePinnedStandardBody(node,Parser,{Checker,program});body=node.body;}else if(node.k==='routerPinnedOptionCallbackBody')body=requirePinnedOptionCallbackBody(node,program,Parser,Checker);else if(node.k==='routerOriginalMappedBody')body=requireOriginalMappedBody(node,program,Parser,Checker);current(fact.entry.fullName);return body;},
  map:(node,entry)=>{
   if(current(entry.fullName)!==fact||node.k!=='routerStandardMethod'||node.operation!=='option_map'||node.constEligible!==false||member(entry.body,node).length!==1)return null;
   const source=member(fact.item.body,null,value=>(value.k==='routerDispatchMethod'&&value.method==='map'||value.k==='routerIteratorOperation'&&value.op==='map')&&same(value.span,node.span));if(source.length!==1)return null;
   const raw=source[0],context=originalStandardCallContext(checker,raw);requireOriginalPrimitiveTryFromChecker(checker);current(entry.fullName);
   const item=raw.args?.[0],callback=node.callback,binding=callback?.binding,allocation=binding?.body;
   if(context.owner!==entry.fullName||raw.args.length!==1||item?.k!=='routerStandardFunctionItem'||!['str::to_string','ToString::to_string'].includes(item.operation)||item.sourceFunctionItem?.profile!==CSV_STRING_PROFILE.id||callback?.k!=='routerLambda'||callback.arity!==1||binding?.k!=='let'||binding.mutable===true||binding.value?.k!=='routerLambdaInput'||binding.value.position!==0||allocation?.k!=='routerAllocatingStringItem'||allocation.object?.k!=='var'||allocation.object.name!==binding.name||!same(allocation.span,item.span))return null;
   requireCsvEmitterProof(allocation);const result=checkedAllocatingStringItem(allocation.object.type,allocation.span);
   const plan=planStandardMethod(node.value.type,'map',{declarations:checker.items,resolveType:(type,span)=>checker.resolveType(type,entry.modulePath,span),expected:node.type,argumentCount:1,span:node.span});
   if(!plan||!sameType(binding.value.type,plan.callbackParameters[0])||!sameType(allocation.object.type,binding.value.type)||!sameType(allocation.type,result)||!sameType(callback.type.result,result)||!sameType(completeStandardMethod(plan,callback.type.result,{optionType:()=>node.type,span:node.span}),node.type))return null;
   for(const actual of [binding.value.type,allocation.object.type]){checker.expectedOwnership(actual,plan.callbackParameters[0],entry.modulePath,node.span);checker.expectedPrimitiveIdentity(actual,plan.callbackParameters[0],entry.modulePath,node.span);}checker.expectedOwnership(allocation.type,result,entry.modulePath,node.span);checker.expectedOwnership(callback.type.result,result,entry.modulePath,node.span);
   current(entry.fullName);allocations.add(allocation);return {input:plan.callbackParameters[0],result};
  },
  readOnlyString:(node,entry)=>{
   if(current(entry.fullName)!==fact||node.k!=='routerStringOperation'||!['trim','trim_start','trim_end'].includes(node.op)||!Array.isArray(node.args)||node.args.length!==0||member(entry.body,node).length!==1)return false;
   const source=member(fact.item.body,null,value=>value.k==='routerStringOperation'&&value.op===node.op&&Array.isArray(value.args)&&value.args.length===0&&same(value.span,node.span));if(source.length!==1)return false;
   for(const actual of [node.string?.type,node.type]){requireBorrowedString(actual,node.span);if(actual.patternOwnershipRefusal)return false;checker.expectedOwnership(actual,SOURCE_STR,entry.modulePath,node.span);checker.expectedPrimitiveIdentity(actual,SOURCE_STR,entry.modulePath,node.span);}
   if(current(entry.fullName)!==fact||member(entry.body,node).length!==1)return false;
   const original=member(fact.item.body,source[0]);return original.length===1&&original[0]===source[0];
  },
  allocate:(node,entry)=>{current(entry.fullName);if(!allocations.has(node))return false;requireCsvEmitterProof(node);const wanted=checkedAllocatingStringItem(node.object.type,node.span);checker.expectedOwnership(node.type,wanted,entry.modulePath,node.span);return sameType(node.type,wanted);},
 };
}
function publishProjectionContexts(receipt,entry,dependencies=[],checker=null){
 if(!receipt.projections)return;
 const functionContext=freeze(copyMetadata({name:entry.fullName,params:entry.params,ret:entry.ret,body:entry.body,...(dependencies.length?{dependencies}:{} )}));
 const extraRoots=receipt.errorLane||receipt.optionLane?[...entry.params.map(param=>param.type),entry.ret,...dependencies.flatMap(item=>[...item.params.map(param=>param.type),item.ret])]:[],extraLayouts=extraRoots.length?freeze(copyMetadata(captureBorrowedLayouts(checker,extraRoots))):[];
 for(const projection of receipt.projections)projectionContexts.set(projection.key,freeze({id:projection.id,call:projection.call,layouts:extraLayouts.length?[...projection.layouts,...extraLayouts]:projection.layouts,roots:extraRoots.length?[...projection.roots,...extraRoots]:projection.roots,functionContext}));
}

// The standard constructor may omit per-use metadata on an actual checked
// None/Some join. Recovery is allowed only by a separately private membership.
// Failure-only, bounded own-data summaries. These never select a proof or
// inspect public fake checker inputs when no actual source call was captured.
function optionDiagnosticData(value,key){if(!value||typeof value!=='object'||isProxy(value))return undefined;const field=descriptor(value,key);return field&&own(field,'value')?field.value:undefined;}
function optionDiagnosticText(value,limit=120){if(typeof value!=='string')return value===undefined?'undefined':value===null?'null':typeof value==='boolean'||typeof value==='number'?''+value:typeof value;let text='';for(let at=0;at<value.length&&at<limit;at++)text+=value[at];return text;}
function optionDiagnosticType(type,owner,source){
 const primitive=(value,key)=>optionDiagnosticText(optionDiagnosticData(value,key),96),args=optionDiagnosticData(source,'arguments');
 return 'kind='+primitive(type,'kind')+' name='+primitive(type,'name')+' perUse='+(!!type&&typeof type==='object'&&!isProxy(type)&&own(type,'rustStandardGeneric'))+' ref='+primitive(type,'rustReference')+' ownership='+primitive(type,'rustOwnership')+' refusal='+primitive(type,'patternOwnershipRefusal')+' genericUnresolved='+primitive(type,'rustGenericIdentityUnresolved')+' borrowUnresolved='+primitive(type,'rustBorrowingUnresolved')+' owner='+primitive(owner,'fullName')+' ownerKind='+primitive(owner,'k')+' ownerGeneric='+primitive(optionDiagnosticData(owner,'standardGeneric'),'kind')+' ctors='+primitive(optionDiagnosticData(owner,'ctors'),'length')+' sourceKind='+primitive(source,'kind')+' args='+primitive(args,'length');
}
function optionDiagnosticNode(node){const part=key=>optionDiagnosticText(optionDiagnosticData(node,key),96),span=optionDiagnosticData(node,'span');return 'k='+part('k')+' method='+part('method')+' operation='+part('operation')+' id='+part('id')+' span='+optionDiagnosticText(optionDiagnosticData(span,'start'))+'..'+optionDiagnosticText(optionDiagnosticData(span,'end'));}
function optionDiagnosticDifference(actual,expected){
 let cells=4096;const visit=(a,b,path,depth)=>{if(--cells<0||depth>64)return path+':bound';if(a===b)return null;if(!a||!b||typeof a!=='object'||typeof b!=='object')return path+':actual='+optionDiagnosticText(a)+' expected='+optionDiagnosticText(b);if(isProxy(a)||isProxy(b))return path+':proxy';const names=keys(a),wanted=keys(b);if(names.length!==wanted.length)return path+':key-count '+names.length+'/'+wanted.length;for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||!own(b,names[at]))return path+':key='+optionDiagnosticText(names[at],48);for(let at=0;at<names.length;at++){const name=names[at],x=descriptor(a,name),y=descriptor(b,name);if(!x||!y||!own(x,'value')||!own(y,'value'))return path+'/'+optionDiagnosticText(name,48)+':nondata';const difference=visit(x.value,y.value,optionDiagnosticText(path+'/'+optionDiagnosticText(name,48),1024),depth+1);if(difference)return difference;}return null;};return visit(actual,expected,'',0)??'no own-data difference';
}
function optionLayoutDiagnostic(diagnostic,gate,type,owner,source){if(diagnostic){diagnostic.gate=gate;diagnostic.detail=optionDiagnosticType(type,owner,source);}return null;}
function currentOptionLayout(checker,type,span,recover=false,diagnostic=null){
 const owner=type?.kind==='data'?checker.items.get(type.name):null,source=type&&!own(type,'rustStandardGeneric')&&recover?owner?.standardGeneric:type?.rustStandardGeneric;
 if(type?.rustReference||type?.rustOwnership||type?.rustBorrowingUnresolved||type?.rustGenericIdentityUnresolved||owner?.k!=='data'||owner.fullName!==type.name||owner.standardGeneric?.kind!=='Option'||source?.kind!=='Option'||source.arguments?.length!==1||owner.standardGeneric.arguments?.length!==1||owner.ctors?.length!==2)return optionLayoutDiagnostic(diagnostic,'option.type-owner-source',type,owner,source);
 const some=owner.ctors.find(row=>row.name==='Some'),none=owner.ctors.find(row=>row.name==='None');if(!some||some.fields?.length!==1||some.fields[0].name!=='field0'||!none||none.fields?.length)return optionLayoutDiagnostic(diagnostic,'option.Some-None-fields',type,owner,source);
 const payload=checker.resolveType(source.arguments[0],owner.modulePath,span);
 let position=0;for(const written of [owner.standardGeneric.arguments[0],some.fields[0].type]){const actual=checker.resolveType(written,owner.modulePath,span);if(!sameType(actual,payload))return optionLayoutDiagnostic(diagnostic,position===0?'option.owner-argument':'option.Some-field-payload',type,owner,source);position++;checker.expectedOwnership(actual,payload,owner.modulePath,span);checker.expectedPrimitiveIdentity(actual,payload,owner.modulePath,span);}
 let summary=false;if(type.patternOwnershipRefusal){
  if(payload.kind==='string'&&payload.rustOwnership?.kind==='owned'&&payload.rustOwnership.source==='String'&&!payload.rustReference&&!payload.rustBorrowingUnresolved&&!payload.rustGenericIdentityUnresolved&&type.patternOwnershipRefusal==='ownership-bearing String type')summary=true;
  else if(recover&&type.patternOwnershipRefusal==='owned String source type'&&payload.kind==='data'&&!payload.rustReference&&!payload.rustOwnership&&!payload.patternOwnershipRefusal){projectionOwner(checker,payload,span,false);summary=true;}
  else return optionLayoutDiagnostic(diagnostic,'option.ownership-summary',type,owner,source);
 }
 return {owner,payload,summary};
}
// Project relocation preserves syntax, not sharing between repeated receiver
// occurrences. Only original parser correspondence proves their common origin.
function optionReaderWrapperOrigin(checker,frame,node,expected=null){
 if(!frame.optionLane||node.k!=='routerStringOwnership'||node.operation!=='as_str'||node.fallback?.k!=='routerDispatchMethod'||node.fallback.method!=='as_str'||node.fallback.args?.length!==0)return null;
 currentFunction(checker,frame.activeItem,frame);
 const snapshot=expected?.syntax??copyMetadata(node),fallbackSnapshot=expected?.fallbackSyntax??copyMetadata(node.fallback),fallback=expected?.fallback??node.fallback,object=expected?.object??node.object,fallbackObject=expected?.fallbackObject??node.fallback.object;
 const outer=originalParsedSyntaxNode(frame.activeItem,node),inner=originalParsedSyntaxNode(frame.activeItem,fallback);
 const original=expected?.original??outer?.original,originalFallback=expected?.originalFallback??inner?.original,originalObject=expected?.originalObject??original?.object;
 currentFunction(checker,frame.activeItem,frame);
 if(!outer||!inner||outer.actual!==node||inner.actual!==fallback||outer.parser!==inner.parser||outer.original!==original||inner.original!==originalFallback||original?.k!=='routerStringOwnership'||original.operation!=='as_str'||original.fallback!==originalFallback||originalFallback?.k!=='routerDispatchMethod'||originalFallback.method!=='as_str'||originalFallback.args?.length!==0||original.object!==originalObject||originalFallback.object!==originalObject)return null;
 if(node.fallback!==fallback||node.object!==object||fallback.object!==fallbackObject||!same(node.span,fallback.span)||!same(node,snapshot)||!same(fallback,fallbackSnapshot)||!same(node,outer.relocated)||!same(fallback,inner.relocated))return null;
 return expected??{syntax:snapshot,fallbackSyntax:fallbackSnapshot,fallback,object,fallbackObject,original,originalFallback,originalObject};
}
function captureOptionReaders(root,output,checker,frame){let cells=100000;const visit=(node,depth=0)=>{if(!node||typeof node!=='object')return;if(--cells<0||depth>160)fail();if(node.k==='routerTry'||node.k==='routerDispatchMethod'&&['get','as_str'].includes(node.method))output.set(node,copyMetadata(node));else if(node.k==='routerStringOwnership'&&node.operation==='as_str'){const origin=optionReaderWrapperOrigin(checker,frame,node);if(origin)output.set(node,{syntax:origin.syntax,origin});}for(const [key,value]of Object.entries(node))if(!['type','span'].includes(key))Array.isArray(value)?value.forEach(child=>visit(child,depth+1)):visit(value,depth+1);};visit(root);}
function observeOptionReader(checker,node,value,frame){
 const capture=frame?.optionLane&&frame.readers?.get(node);if(!capture)return;const source=node.k==='routerStringOwnership'?capture.syntax:capture;
 let inner=null;if(node.k==='routerStringOwnership'){
  if(value.k!=='routerHostCall'||value.id!=='serde_json_value_as_str')return;
  inner=issued.get(value);if(inner?.kind!=='option-reader'||inner.checker!==checker||inner.frame!==frame||inner.source!==node.fallback||!same(value,inner.call)||!same(inner.source,inner.syntax))fail();
  if(!capture.origin||!optionReaderWrapperOrigin(checker,frame,node,capture.origin))fail();
  if(node.operation!=='as_str'||node.fallback?.k!=='routerDispatchMethod'||node.fallback.method!=='as_str'||node.fallback.args?.length!==0||node.object!==capture.origin.object||node.fallback.object!==capture.origin.fallbackObject||!same(node.span,node.fallback.span))fail();
 }
 currentFunction(checker,frame.activeItem,frame);if(!same(node,source))fail();
 if(inner){const actual=currentOptionLayout(checker,value.type,node.span,false),payload=actual?.payload;if(!payload||payload.kind!=='string'||payload.rustReference||payload.patternOwnershipRefusal||payload.rustBorrowingUnresolved||payload.rustGenericIdentityUnresolved||payload.rustOwnership?.kind!=='borrowed'||payload.rustOwnership.source!=='str')fail();}
 if(value.k==='routerTry'&&value.option===true||value.k==='routerHostCall'&&['serde_json_value_get_string','serde_json_value_get_usize','serde_json_value_as_str'].includes(value.id))issued.set(value,{kind:'option-reader',checker,frame,source:node,syntax:source,call:copyMetadata(value),...(inner?{inner,wrapperOrigin:capture.origin}: {})});
}
// An outer ownership wrapper carries only its actual inner issued reader.
// Neither a copied fallback nor an equal public source marker can supply it.
function optionReaderWrapperCurrent(checker,frame,value,record,diagnostic=null){
 if(!record.inner)return true;const inner=record.inner,node=record.source,refuse=gate=>{if(diagnostic)diagnostic.gate=gate;return false;};
 if(node.k!=='routerStringOwnership')return refuse('wrapper.kind');
 if(node.operation!=='as_str')return refuse('wrapper.operation');
 if(node.fallback!==inner.source)return refuse('wrapper.fallback-identity');
 if(node.fallback?.k!=='routerDispatchMethod')return refuse('wrapper.fallback-kind');
 if(node.fallback.method!=='as_str')return refuse('wrapper.fallback-method');
 if(node.fallback.args?.length!==0)return refuse('wrapper.fallback-arity');
 if(!record.wrapperOrigin||!optionReaderWrapperOrigin(checker,frame,node,record.wrapperOrigin))return refuse('wrapper.original-relocation');
 if(node.object!==record.wrapperOrigin.object)return refuse('wrapper.outer-object-identity');
 if(node.fallback.object!==record.wrapperOrigin.fallbackObject)return refuse('wrapper.fallback-object-identity');
 if(!same(node.span,node.fallback.span))return refuse('wrapper.span');
 if(inner.kind!=='option-reader')return refuse('wrapper.inner-kind');
 if(inner.checker!==checker)return refuse('wrapper.inner-checker');
 if(inner.frame!==frame)return refuse('wrapper.inner-frame');
 if(!same(inner.source,inner.syntax))return refuse('wrapper.inner-source');
 if(!same(value,inner.call))return refuse('wrapper.inner-call');
 return true;
}
// Called only by the existing standard callback gate. A copied semantic
// receiver or public Option/control marker cannot manufacture this membership.
export function originalJsonOptionReceiver(checker,node,receiver){
 const frame=activeFunctions.get(checker),record=issued.get(receiver);
 const report=(gate,detail='')=>{if(!frame||!hasOriginalStandardCall(checker,node))return false;const sourceSpan=optionDiagnosticData(node,'span'),start=optionDiagnosticData(sourceSpan,'start'),end=optionDiagnosticData(sourceSpan,'end');throw unsupported('Option callback control','requires ordinary tail callback/argument values; private receiver gate='+optionDiagnosticText(gate,1024)+(detail?' detail='+optionDiagnosticText(detail,2800):''),typeof start==='number'&&typeof end==='number'?{start,end}:null);};
 if(!frame?.optionLane)return report('eligibility.option-lane');
 if(!record)return report('eligibility.missing-reader-receipt',optionDiagnosticNode(receiver));
 if(record.kind!=='option-reader')return report('eligibility.reader-kind');
 if(record.checker!==checker)return report('eligibility.checker');
 if(record.frame!==frame)return report('eligibility.frame');
 if(record.source!==node.object)return report('eligibility.raw-source-identity','issued='+optionDiagnosticNode(record.source)+' actual='+optionDiagnosticNode(optionDiagnosticData(node,'object')));
 if(!hasOriginalStandardCall(checker,node))return false;
 const source=originalStandardCallContext(checker,node);currentFunction(checker,frame.activeItem,frame);
 if(source.owner!==frame.functionName)return report('source.function-owner');
 if(!same(record.source,record.syntax))return report('source.raw-syntax',optionDiagnosticDifference(record.source,record.syntax));
 if(!same(receiver,record.call))return report('source.checked-call',optionDiagnosticDifference(receiver,record.call));
 const wrapperDiagnostic={};if(!optionReaderWrapperCurrent(checker,frame,receiver,record,wrapperDiagnostic))return report(wrapperDiagnostic.gate??'wrapper.unknown');
 let cells=100000,found=false,rejection=null;
 const reject=(gate,path='',detail='')=>{if(!rejection)rejection={gate:gate+' path='+optionDiagnosticText(path,1024),detail};return false;};
 const readerPayload=(type,span)=>{if(type?.kind==='data'){projectionOwner(checker,type,span,false);return true;}return type?.kind==='string'&&!type.rustReference&&!type.patternOwnershipRefusal&&!type.rustBorrowingUnresolved&&!type.rustGenericIdentityUnresolved&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str';};
 const outputDiagnostic={},output=currentOptionLayout(checker,receiver.type,node.span,false,outputDiagnostic);if(!output)return report('output.'+(outputDiagnostic.gate??'layout'),outputDiagnostic.detail??'');if(!readerPayload(output.payload,node.span))return report('output.payload',optionDiagnosticType(output.payload,null,null));
 const visit=(value,depth=0,path='')=>{
  if(!value||typeof value!=='object')return reject('tree.nonobject',path);
  if(--cells<0||depth>160)return reject('tree.bound',path);
  if(['routerReturn','routerBreak','routerContinue','routerAwait','routerLambda','call','app'].includes(value.k))return reject('tree.nonlocal-kind',path,optionDiagnosticText(value.k));
  if(value.k==='routerTry'){
   const proof=issued.get(value),diagnostic={},actual=currentOptionLayout(checker,value.value?.type,value.span,false,diagnostic);
   if(value.option!==true)return reject('try.not-Option',path);
   if(!proof)return reject('try.missing-receipt',path);
   if(proof.kind!=='option-reader')return reject('try.receipt-kind',path);
   if(proof.checker!==checker)return reject('try.checker',path);
   if(proof.frame!==frame)return reject('try.frame',path);
   if(!same(value,proof.call))return reject('try.checked-call',path,optionDiagnosticDifference(value,proof.call));
   if(!same(proof.source,proof.syntax))return reject('try.raw-syntax',path,optionDiagnosticDifference(proof.source,proof.syntax));
   if(!actual)return reject('try.'+(diagnostic.gate??'layout'),path,diagnostic.detail??'');
   if(!sameType(value.type,actual.payload))return reject('try.output-type',path,optionDiagnosticType(value.type,null,null));
   if(!readerPayload(actual.payload,value.span))return reject('try.payload',path,optionDiagnosticType(actual.payload,null,null));
   checker.expectedOwnership(value.type,actual.payload,frame.activeItem.modulePath??[],value.span);found=true;
  }
  if(value.k==='routerHostCall'){
   if(['router_core_json_parse','router_core_json_parse_bytes'].includes(value.id)){
    const proof=issued.get(value.compatibilityCore);if(proof?.checker!==checker)return reject('parse.checker-or-receipt',path);if(proof.frame!==frame)return reject('parse.frame',path);if(proof.id!==value.id)return reject('parse.id',path);if(!same(value,proof.call))return reject('parse.checked-call',path,optionDiagnosticDifference(value,proof.call));
   }else if(['serde_json_value_get_string','serde_json_value_get_usize','serde_json_value_as_str'].includes(value.id)){
    const proof=issued.get(value);if(proof?.kind!=='option-reader')return reject('reader.kind-or-receipt',path);if(proof.checker!==checker)return reject('reader.checker',path);if(proof.frame!==frame)return reject('reader.frame',path);if(!same(value,proof.call))return reject('reader.checked-call',path,optionDiagnosticDifference(value,proof.call));if(!same(proof.source,proof.syntax))return reject('reader.raw-syntax',path,optionDiagnosticDifference(proof.source,proof.syntax));const diagnostic={};if(!optionReaderWrapperCurrent(checker,frame,value,proof,diagnostic))return reject(diagnostic.gate??'reader.wrapper',path);
   }else return reject('reader.unknown-host-operation',path,optionDiagnosticText(value.id));
  }
  for(const [key,child]of Object.entries(value))if(!['type','span','compatibilityCore','sourceFunctionItem'].includes(key)){let index=0;for(const nested of Array.isArray(child)?child:[child]){if(nested&&typeof nested==='object'&&!visit(nested,depth+1,optionDiagnosticText(path+'/'+key+'/'+index,1024)))return false;index++;}}return true;
 };
 const valid=visit(receiver)&&found;currentFunction(checker,frame.activeItem,frame);if(!valid)return report(rejection?.gate??'tree.no-Option-try',rejection?.detail??'');return valid;
}
// Only a direct, actually issued owned parser can enter this let-else lane.
// Existing Pattern code still handles every scalar/shared/uncertain case.
export function checkOriginalOwnedJsonLetElse(checker,node,env,path,expected,allowLiteral){
 const frame=activeFunctions.get(checker);if(!frame?.owns||node.k!=='routerLetElse'||node.subject?.k!=='routerCoreJsonUpdateCall'||!['json_parse','json_parse_bytes'].includes(node.subject.operation)||!hasOriginalStandardCall(checker,node))return null;
 const source=originalStandardCallContext(checker,node);currentFunction(checker,frame.activeItem,frame);if(source.owner!==frame.functionName)fail();
 if(node.else?.k!=='routerReturn'||node.else.body?.k!=='unit')throw unsupported('owned JSON let-else divergence','requires the original unconditional function return',node.else?.span??node.span);
 if(nonlocal(node.subject))throw unsupported('owned JSON let-else subject control','nonlocal exits cannot be emitted through its subject value',node.subject.span);
 env=checker.contextEnvironment(node,env,expected);const subject=checker.expr(node.subject,env,path),proof=issued.get(subject.compatibilityCore),actual=currentOptionLayout(checker,subject.type,node.span,false);
 if(proof?.checker!==checker||proof.frame!==frame||proof.typeIdentity!==subject.type||!['router_core_json_parse','router_core_json_parse_bytes'].includes(proof.id)||!same(subject,proof.call)||!actual)fail();projectionOwner(checker,actual.payload,node.span,false);requireBorrowedLayouts(proof.layouts,checker,{declarations:checker.items},proof.roots);
 const pattern=checker.patternOwner(node.pattern,subject.type,path,env),plan=planPattern(pattern,subject.type,{declarations:checker.items,resolveType:type=>checker.resolveType(type,path,node.span),span:node.span}),binding=plan.bindings[0];
 if(pattern.k!=='ctor'||pattern.ctor!=='Some'||pattern.data!==actual.owner.fullName||plan.bindings.length!==1||binding.projection.length!==1||binding.projection[0]!=='field0'||!sameType(binding.type,actual.payload))throw unsupported('owned JSON let-else pattern','requires its actual single immutable canonical Some payload',node.span);
 checker.expectedOwnership(binding.type,actual.payload,path,node.span);let name;do{name=checker.freshName('ml_owned_json_pattern_');}while(env.has(name));const variable={k:'var',name,type:subject.type,span:node.span};
 const otherwise=checker.expr(node.else,new Map(env),path,UNIT);if(!sameType(otherwise.type,UNIT))fail();const inner=checker.bindingEnvironment(new Map(env),binding.name,binding.type,false);let body=checker.expr(node.body,inner,path,expected,allowLiteral);
 body={k:'let',name:binding.name,value:checker.patternProjection(variable,binding.projection,binding.type,plan.projectionPaths),body,mutable:false,type:body.type,span:binding.span??node.span};
 const condition={k:'binary',op:'and',left:{k:'routerPatternImmutable',object:variable,type:BOOL},right:checker.patternTest(plan.test,variable,plan.projectionPaths),type:BOOL},conditional={k:'routerIf',cond:condition,then:{k:'unit',type:UNIT},else:otherwise,body,type:body.type,span:node.span};
 currentFunction(checker,frame.activeItem,frame);return {k:'let',name,value:subject,body:conditional,mutable:false,type:body.type,span:node.span,patternControl:{plan,subjectType:subject.type,kind:'let-else',divergence:'checked-exit'}};
}
// These receipts exist only during this checker's actual attributed body visit.
// A public shape, copied IR or fabricated source marker cannot open this lane.
function currentFunction(checker,item,receipt){
 requireOriginalPrimitiveTryFromChecker(checker);
 if(!originalDataFreezeIntrinsicsUnchanged()||!originalParsedDeclarationEvidence(item)||!same(item,receipt.syntax))fail();
 requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged()||!same(item,receipt.syntax))fail();
}
export function visitRouterCoreJsonUpdateFunction(checker,item,path,entry,visit,phase){
 const receipt=phase==='declaration-bodies'&&functions.get(checker)?.get(item);
 if(!receipt)return visit;
 return (...args)=>{
  const name=[...path,item.name].join('.');
  if(item.k!=='fn'||entry!==checker.items.get(name)||entry.fullName!==name)fail();
  currentFunction(checker,item,receipt);if(activeFunctions.has(checker))fail();receipt.functionName=name;receipt.errorLane=receipt.owns&&stringError(checker,entry);receipt.optionLane=receipt.owns&&!receipt.errorLane&&ownedOptionReturn(checker,entry);receipt.activeItem=item;if(receipt.optionLane){receipt.readers=new WeakMap();captureOptionReaders(item.body,receipt.readers,checker,receipt);}activeFunctions.set(checker,receipt);
  try{
   const result=visit(...args),body=copyMetadata(entry.body);
   currentFunction(checker,item,receipt);if(!same(entry.body,body))fail();
   const completed={item,receipt,entry,snapshot:copyMetadata({params:entry.params,ret:entry.ret,body:entry.body})};completedFunctions.get(checker).set(name,completed);
   if(!receipt.owns||receipt.errorLane||receipt.optionLane)return result;
   createRulePipeline([
    {phase:'language',rules:[{id:'owned-json-flow:check-whole-function-linear-state',apply:()=>{
     validateOwnedJsonFlow(checker,entry,{genuine:node=>{const proof=issued.get(node.compatibilityCore);return proof?.checker===checker&&proof.frame===receipt&&proof.id===node.id&&same(node.args,proof.args);},genuineTextMatch:node=>receipt.textMatches?.some(record=>same(node,record.body)&&same(record.syntax,record.original))===true});
     return null;
    }}]},
    {phase:'repository',rules:[{id:'router-core:rejoin-original-update-caller',apply:value=>{
     currentFunction(checker,item,receipt);
     if(entry!==checker.items.get(name)||!same(entry.body,body))fail();return value;
    }}]},
   ]).run(null);
   publishProjectionContexts(receipt,entry);
   return result;
  }finally{delete receipt.activeItem;delete receipt.readers;activeFunctions.delete(checker);}
 };
}
// Membership is conjunctive with the lifetime walk's current Result/layout checks.
// No returned record, summary or public flag can authorize a borrowed residual.
export function hasOriginalJsonStringErrorContext(checker,entry){
 const fact=completedFunctions.get(checker)?.get(entry.fullName);if(!fact||fact.entry!==entry)return false;
 currentFunction(checker,fact.item,fact.receipt);return same({params:entry.params,ret:entry.ret,body:entry.body},fact.snapshot);
}
export function finalizeOriginalJsonErrorFlow(checker,program,Parser,Checker,tailOrigin){
 const records=completedFunctions.get(checker);if(!records)return;
 const current=name=>{
  const fact=records.get(name);if(!fact||program.declarations.get(name)!==fact.entry||checker.items.get(name)!==fact.entry)throw unsupported('owned JSON helper','requires an actual completed original source body',program.declarations.get(name)?.span);
  currentFunction(checker,fact.item,fact.receipt);if(!same({params:fact.entry.params,ret:fact.entry.ret,body:fact.entry.body},fact.snapshot))fail();return fact;
 };
 for(const [name,fact]of records){
  if(!fact.receipt.errorLane&&!fact.receipt.optionLane)continue;current(name);const dependencies=new Map();
  try{createRulePipeline([
   {phase:'language',rules:[{id:'owned-json-error-flow:check-current-linear-result-and-readonly-closure',apply:()=>{
    validateOwnedJsonFlow(checker,fact.entry,{
     genuine:(node,entry)=>{const owner=records.get(entry.fullName),proof=issued.get(node.compatibilityCore);return proof?.checker===checker&&proof.frame===owner?.receipt&&proof.id===node.id&&same(node.args,proof.args);},
     genuineTextMatch:node=>fact.receipt.textMatches?.some(record=>same(node,record.body)&&same(record.syntax,record.original))===true,
     closedOption:fact.receipt.optionLane?closedOptionSource(checker,fact,current,Parser,Checker,program):null,
     closedErrors:fact.receipt.errorLane?{
      callee:(node)=>{const target=current(node.fn);dependencies.set(node.fn,{name:node.fn,...target.snapshot});return target.entry;},
      format:(node,entry)=>{
       if(node.k!=='routerConstObligation'||node.sourceFeature!=='router-core-format')return null;const fact=current(entry.fullName),frame=fact.receipt,record=frame.formatted?.find(record=>isSameSemantic(node,record.value)&&same(record.syntax,record.original))??frame.formatted?.find(record=>same(record.syntax,record.original)&&checkedTailFormatSame(fact,node,record,tailOrigin));if(!record)return null;
       let body=node.k==='routerConstObligation'?node.value:node;const values=[];while(body?.k==='let'){values.push(body.value);body=body.body;}return values;
      },
      diagnostic:node=>node?.k==='routerConstObligation'&&node.sourceFeature==='router-core-format'?{join:'format-record',function:fact.entry.fullName.slice(0,120),candidates:(fact.receipt.formatted??[]).slice(0,3).map(record=>({difference:describeOwnedJsonDifference(alphaTree(node),alphaTree(record.value))}))}:null,
      standard:(node)=>{if(node.k==='routerPinnedStandardBody'){requirePinnedStandardBody(node,Parser,{Checker,program});return node.body;}if(node.k==='routerPinnedOptionCallbackBody')return requirePinnedOptionCallbackBody(node,program,Parser,Checker);if(node.k==='routerOriginalMappedBody')return requireOriginalMappedBody(node,program,Parser,Checker);return null;},
      tail:(node,entry)=>{current(entry.fullName);return tailOrigin(node)&&node.sourceSharedPatternProof.functionTail===true;},
     }:null,
    });return null;
   }}]},
   {phase:'repository',rules:[{id:'router-core:rejoin-complete-error-flow-callers-and-helper-bodies',apply:value=>{current(name);for(const dependency of dependencies.keys())current(dependency);return value;}}]},
  ]).run(null);}catch(error){if(!(error instanceof TranslationError))throw error;throw new TranslationError(error.kind,error.reason,fact.entry.span,{...error.details,originalJsonFlowDiagnostic:{span:error.span,reason:error.reason}});}
  // Store detached data only, after every fresh helper/source join succeeds.
  publishProjectionContexts(fact.receipt,fact.entry,[...dependencies.values()],checker);
 }
}
// The complete current function was just rejoined by current(). Only a
// privately issued function-tail match may contribute an enclosing rename.
function checkedTailFormatSame(fact,target,record,tailOrigin){
 const originalBindings=[];let sourceCells=100000;
 const raw=value=>{if(!value||typeof value!=='object')return;if(--sourceCells<0)fail();if(['bind','bindOrCtor'].includes(value.k))originalBindings.push(value);for(const [key,child]of Object.entries(value))if(!['type','span','sourcePattern','sourceParameterPatterns'].includes(key))Array.isArray(child)?child.forEach(raw):raw(child);};raw(fact.receipt.syntax);
 let cells=100000,found=0,matched=false;
 const visit=(value,names=new Map(),inside=false,depth=0)=>{
  if(!value||typeof value!=='object')return;if(--cells<0||depth>160)fail();
  if(value===target){found++;if(!inside||!same(target.span,record.value.span))return;
   const env=new Map();const variables=node=>{if(!node||typeof node!=='object')return;if(node.k==='var')env.set(node.name,node.name);for(const [key,child]of Object.entries(node))if(!['type','span','compatibilityCore','formatProvenance'].includes(key))Array.isArray(child)?child.forEach(variables):variables(child);};variables(record.value);for(const [before,after]of names)env.set(before,after);
   matched=names.size>0&&canonicalSemanticSame(target,renameExpr(record.value,env,new Scope(name=>name,new Set(env.values()))));return;
  }
  if(value.k==='routerOriginalSharedPatternMatch'){
   if(!tailOrigin(value)||value.sourceSharedPatternProof.functionTail!==true)return;
   visit(value.body,names,true,depth+1);return;
  }
  if(inside&&value.k==='let'&&value.patternControl?.kind==='ordered-scalar-match'&&value.body?.k==='routerOrderedMatchArms'){
   const rows=value.patternControl.rows,branches=value.body.branches;
   if(!Array.isArray(rows)||rows.length!==branches.length||rows.some(row=>row.guarded||row.alternatives!==1))return;
   for(let at=0;at<rows.length;at++){
    const row=rows[at],branch=branches[at],bindings=row.plan?.bindings,inner=new Map(names);if(!Array.isArray(bindings)||bindings.length>1)return;
    if(bindings.length){const binding=bindings[0],source=row.sourcePattern?.pattern,let_=branch.body,type=binding.type;
     if(!['bind','bindOrCtor'].includes(source?.k)||source.name!==binding.name||originalBindings.filter(node=>node.name===binding.name&&same(node.span,binding.span)).length!==1||binding.projection?.length!==0||branch.cond?.k!=='lit'||branch.cond.value!==true||let_?.k!=='let'||let_.mutable!==false||let_.value?.k!=='var'||let_.value.name!==value.name||!same(let_.span,binding.span)||!sameType(let_.value.type,type)||type.kind!=='string'||type.rustReference||type.patternOwnershipRefusal||type.rustBorrowingUnresolved||type.rustGenericIdentityUnresolved||type.rustOwnership?.kind!=='borrowed'||type.rustOwnership.source!=='str')return;
     inner.set(binding.name,let_.name);
    }
    visit(branch.body,inner,true,depth+1);
   }return;
  }
  for(const [key,child]of Object.entries(value))if(!['type','span','patternControl','compatibilityCore','pinnedStandardBodyProof','originalCallbackProof','sourceFrameProof','originalLoanProof','sharedBodyProof','sourceSharedPatternProof','formatProvenance'].includes(key))Array.isArray(child)?child.forEach(node=>visit(node,names,inside,depth+1)):visit(child,names,inside,depth+1);
 };
 visit(fact.entry.body);return found===1&&matched;
}
function containsExit(node){if(!node||typeof node!=='object'||node.k==='routerLambda')return false;if(['routerReturn','routerBreak','routerContinue'].includes(node.k))return true;return Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(containsExit):containsExit(value)));}
export function checkRouterCoreJsonMutableLet(checker,node,env,path,expected,allowLiteral){
 const receipt=activeFunctions.get(checker);
 // This is a temporary checking permission for a genuine fresh JSON producer;
 // the entire checked body must subsequently pass the linear state analysis.
 if(node.k!=='let'||!node.mutable||!receipt?.owns||!receipt.members.has(node)||!['routerCoreJsonCall','routerJsonMacro','routerCoreJsonUpdateCall'].includes(node.value?.k))return null;
 if(containsExit(node.value))throw unsupported('control in value expression','nonlocal exits cannot be lowered through a value IIFE',node.value.span);
 env=checker.contextEnvironment(node,env,expected);const declared=node.type?checker.resolveType(node.type,path,node.span):undefined;
 let value=checker.expr(node.value,env,path,declared);if(declared)value=coerce(value,declared,checker.language,node.span);canonical(checker,value.type,node.span,false);
 let inner=checker.bindingEnvironment(env,node.name,value.type,true);inner=checker.bindingConstructorEnvironment?.(inner,node.name,value,true)??inner;
 const body=checker.expr(node.body,inner,path,expected,allowLiteral);
 return {k:'let',name:node.name,value,body,mutable:true,type:body.type,span:node.span};
}

// Membership only: the consuming language rule must still recursively check
// the operand's existing purity. Neither an id nor copied metadata can issue it.
export function hasCurrentRouterCoreJsonCopy(checker,node){
 if(!qualified||!originalDataFreezeIntrinsicsUnchanged())return false;
 const frame=activeFunctions.get(checker);if(!frame||!node||typeof node!=='object'||isProxy(node))return false;requireOriginalPrimitiveTryFromChecker(checker);
 const names=keys(node);for(let at=0;at<names.length;at++)if(names[at]==='stack')return false;
 const metadata=descriptor(node,'compatibilityCore');if(!metadata||!own(metadata,'value'))return false;
 const proof=issued.get(metadata.value);if(proof?.checker!==checker||proof.frame!==frame||proof.id!=='router_core_json_copy')return false;
 const kind=descriptor(node,'k'),id=descriptor(node,'id'),args=descriptor(node,'args');
 return !!kind&&own(kind,'value')&&kind.value==='routerHostCall'&&!!id&&own(id,'value')&&id.value===proof.id&&!!args&&own(args,'value')&&same(args.value,proof.args);
}

function projectionOwner(checker,type,span,map){
 let value=type;
 if(value.rustReference){if(value.rustReference.kind!=='shared'||!value.rustReference.pointee||value.rustReference.pointee.rustReference)throw unsupported('owned JSON projection reference','requires one genuine shared reference',span);value=value.rustReference.pointee;}
 if(value.rustReference||value.rustOwnership||value.rustGenericIdentityUnresolved||value.rustBorrowingUnresolved||value.patternOwnershipRefusal)throw unsupported('owned JSON projection owner','requires the actual canonical pointee',span);
 const entry=value.kind==='data'?checker.items.get(value.name):null,name=map?'Map_String_Value':'Value',wanted=JSON_DATA[0].items.find(item=>item.name===name);
 if(entry?.hostTypePath?.join('::')!=='serde_json::'+name||entry.generated!=='router-json-contract'||entry.ctors.length!==wanted.ctors.length)throw unsupported('owned JSON projection layout','requires the complete current canonical owner',span);
 for(let at=0;at<wanted.ctors.length;at++){
  const a=entry.ctors[at],b=wanted.ctors[at];if(a.name!==b.name||a.fields.length!==b.fields.length)throw typeError('owned JSON projection constructor changed',span);
  for(let index=0;index<b.fields.length;index++){const actual=checker.resolveType(a.fields[index].type,entry.modulePath,span),expected=checker.hostType(b.fields[index].type,entry.modulePath,span);if(a.fields[index].name!==b.fields[index].name||!sameType(actual,expected))throw typeError('owned JSON projection field changed',span);checker.expectedOwnership(actual,expected,entry.modulePath,span);checker.expectedPrimitiveIdentity(actual,expected,entry.modulePath,span);}
 }
 return value;
}
function projectionArguments(checker,node,env,path,evaluate){
 const syntax=node.args[0],borrow=syntax.k==='routerTextReference',receiver=evaluate(borrow?syntax.value:syntax);
 projectionOwner(checker,receiver.type,syntax.span,node.operation==='json_map_index');
 if(!borrow&&!receiver.type.rustReference)throw unsupported('owned JSON projection argument','requires a written shared borrow or shared canonical parameter',syntax.span);
 const contract=ROUTER_CORE_JSON_UPDATE_CONTRACTS.find(row=>row.rustPath.at(-1)===node.operation),expected=checker.hostType(contract.params[1],path,node.span);
 requireOriginalPrimitiveTryFromChecker(checker);let key=checker.expr(node.args[1],env,path,expected);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();
 if(node.operation==='json_index_usize'){
  if(node.args[1].k==='num'&&!node.args[1].sourceFloatLiteral&&(!node.args[1].type||!node.args[1].negative&&node.args[1].type.kind==='fixed'&&node.args[1].type.bits===64&&node.args[1].type.signed===false&&node.args[1].type.rustPrimitiveName==='usize'))key={...key,type:{...key.type,rustPrimitiveName:'usize',rustSourceType:true}};
  const type=key.type;if(type.kind!=='fixed'||type.bits!==64||type.signed!==false||type.rustPrimitiveName!=='usize'||!type.rustSourceType||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustBorrowingUnresolved||type.rustGenericIdentityUnresolved)throw unsupported('owned JSON projection index','requires an actual by-value source usize',node.args[1].span);
 }else{const type=key.type;if(type.kind!=='string'||type.rustReference||type.rustOwnership?.kind!=='borrowed'||type.rustOwnership.source!=='str'||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw unsupported('owned JSON projection key','requires actual borrowed scalar text',node.args[1].span);}
 checker.expectedOwnership(key.type,expected,path,node.span);checker.expectedPrimitiveIdentity(key.type,expected,path,node.span);return [receiver,key];
}
// This exact private checked-call receipt is consumed by lifetime/flow/purity
// walkers. A public host id, contract kind or written lifetime is insufficient.
function projectionRecord(node){
 if(!qualified||!originalDataFreezeIntrinsicsUnchanged()||!node||typeof node!=='object'||isProxy(node))return null;
 const names=keys(node);for(let at=0;at<names.length;at++)if(names[at]==='stack')return null;
 const metadata=descriptor(node,'compatibilityCore'),id=descriptor(node,'id');
 if(!metadata||!own(metadata,'value')||!id||!own(id,'value')||!projectionId(id.value))return null;
 const record=issued.get(metadata.value);return record?.id===id.value&&same(node,record.call)?record:null;
}
export function hasOriginalRouterCoreJsonProjection(node){return !!projectionRecord(node);}
export function hasCurrentRouterCoreJsonProjection(checker,node){
 const record=projectionRecord(node);return !!record&&record.checker===checker&&record.frame===activeFunctions.get(checker);
}
const emissionCall=node=>projectionId(node?.id)||['router_core_json_parse','router_core_json_parse_bytes'].includes(node?.id)||['router_core_json_copy','router_core_json_with_field'].includes(node?.id)&&typeof node.compatibilityCore?.sourceProjectionKey==='string';
function projectionNodes(node,result=[]){
 if(!node||typeof node!=='object')return result;
 if(['routerHostCall','routerCoreJsonCollection'].includes(node.k)&&emissionCall(node))result.push(node);
 for(const [key,value]of Object.entries(node))if(!['type','span','compatibilityCore','pinnedStandardBodyProof','originalCallbackProof','sourceFrameProof'].includes(key))Array.isArray(value)?value.forEach(child=>projectionNodes(child,result)):projectionNodes(value,result);
 return result;
}
export function prepareOriginalJsonProjectionEmission(emitter,entry,Checker){
 const nodes=projectionNodes(entry.body);if(!nodes.length)return null;
 const checker=new Checker('Rust',[]);requireOriginalPrimitiveTryFromChecker(checker);
 checker.program({language:'Rust',items:[...emitter.program.declarations.values()].filter(item=>item.k==='data').map(item=>({...copyMetadata(item),name:item.fullName})),main:null});
 for(const node of nodes){
  const context=projectionContexts.get(node.compatibilityCore?.sourceProjectionKey),fn=context?.functionContext;
  if(!context||!fn||node.id!==context.id||entry.fullName!==fn.name&&entry.fullName!=='rp_'+Buffer.from(fn.name).toString('hex'))throw new Error('Owned JSON projection lacks its actual source function');
  const expected=retargetCheckedCallback(context.call,emitter.program),wanted=retargetCheckedCallback(fn,emitter.program);
  if(!projectionSemanticSame(node,expected)||!projectionSemanticSame({params:entry.params,ret:entry.ret,body:entry.body},{params:wanted.params,ret:wanted.ret,body:wanted.body}))throw new Error('Owned JSON projection source function or checked call changed [comparison '+JSON.stringify({function:entry.fullName.slice(0,120),id:node.id,call:describeOwnedJsonDifference(alphaTree(node),alphaTree(expected)),body:describeOwnedJsonDifference(alphaTree({params:entry.params,ret:entry.ret,body:entry.body}),alphaTree({params:wanted.params,ret:wanted.ret,body:wanted.body}))})+']');
  if(!projectionSpansSame(node,expected)||!projectionSpansSame({params:entry.params,ret:entry.ret,body:entry.body},{params:wanted.params,ret:wanted.ret,body:wanted.body}))throw new Error('Owned JSON projection source spans changed from its actual checked function [comparison '+JSON.stringify(projectionSpanDiagnostic([{join:'call',actual:node,expected},{join:'body',actual:{params:entry.params,ret:entry.ret,body:entry.body},expected:{params:wanted.params,ret:wanted.ret,body:wanted.body}}]))+']');
  requireBorrowedLayouts(context.layouts,checker,emitter.program,retargetCheckedCallback(context.roots,emitter.program));
  for(const dependency of fn.dependencies??[]){const wanted=retargetCheckedCallback(dependency,emitter.program),name=emitter.program.declarations.has(dependency.name)?dependency.name:'rp_'+Buffer.from(dependency.name).toString('hex'),actual=emitter.program.declarations.get(name);if(!actual||!projectionSemanticSame({params:actual.params,ret:actual.ret,body:actual.body},{params:wanted.params,ret:wanted.ret,body:wanted.body}))throw new Error('Owned JSON readonly helper changed from its actual checked source body [comparison '+JSON.stringify({helper:name.slice(0,120),difference:actual?describeOwnedJsonDifference(alphaTree({params:actual.params,ret:actual.ret,body:actual.body}),alphaTree({params:wanted.params,ret:wanted.ret,body:wanted.body})):{reason:'actual helper absent'}})+']');if(!projectionSpansSame({params:actual.params,ret:actual.ret,body:actual.body},{params:wanted.params,ret:wanted.ret,body:wanted.body}))throw new Error('Owned JSON readonly helper source spans changed from its actual checked body [comparison '+JSON.stringify(projectionSpanDiagnostic([{join:'helper',actual:{params:actual.params,ret:actual.ret,body:actual.body},expected:{params:wanted.params,ret:wanted.ret,body:wanted.body}}]))+']');}
  requireOriginalPrimitiveTryFromChecker(checker);
 }
 const previous=emissionFrames.get(emitter),renamed=renameFunction(entry,emitter.state.ident,emitter.state.localReserved());emissionFrames.set(emitter,projectionNodes(renamed.body).map(node=>metadataDigest(alphaTree(node))));return ()=>{if(previous)emissionFrames.set(emitter,previous);else emissionFrames.delete(emitter);};
}
// Alpha equivalence deliberately erases diagnostics. Source-bound emission
// also rejoins every complete span at its actual path in the private envelope.
// No subtree (including opaque proof/type data) is omitted by a public flag.
function projectionSpansSame(actual,expected,budget={cells:200000},depth=0){
 if(--budget.cells<0||depth>160)return false;if(actual===expected)return true;
 const actualObject=actual!==null&&typeof actual==='object',expectedObject=expected!==null&&typeof expected==='object';if(!actualObject&&!expectedObject)return true;
 if(actualObject){if(isProxy(actual))return false;const parent=prototype(actual);if(parent!==plainPrototype&&parent!==arrayPrototype&&parent!==null)return false;}
 if(expectedObject){if(isProxy(expected))return false;const parent=prototype(expected);if(parent!==plainPrototype&&parent!==arrayPrototype&&parent!==null)return false;}
 const names=actualObject?keys(actual):[],wanted=expectedObject?keys(expected):[];
 // Finish BOTH complete key censuses before ANY descriptor of unknown fields.
 for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack')return false;
 for(let at=0;at<wanted.length;at++)if(typeof wanted[at]!=='string'||wanted[at]==='stack')return false;
 for(let at=0;at<names.length;at++){
  const name=names[at],a=descriptor(actual,name),b=expectedObject?descriptor(expected,name):null;if(!a||!own(a,'value')||b&&!own(b,'value'))return false;
  if(name==='span'){if(!b||!same(a.value,b.value,budget,depth+1))return false;}
  else if(!projectionSpansSame(a.value,b?.value,budget,depth+1))return false;
 }
 for(let at=0;at<wanted.length;at++){
  const name=wanted[at];if(actualObject&&own(actual,name))continue;const b=descriptor(expected,name);if(!b||!own(b,'value'))return false;
  // Genuine semantic JSON omits an undefined callback-input diagnostic span.
  // Numeric, null and object spans still require the complete matching value.
  if(name==='span'){if(b.value!==undefined)return false;continue;}
  if(!projectionSpansSame(undefined,b.value,budget,depth+1))return false;
 }return true;
}
// Failure-only first span difference; this never grants or repairs source authority.
// Keep the rejecting comparison above unchanged and expose no evidence objects.
function projectionSpanDiagnostic(pairs){
 const budget={cells:4096},text=(value,limit=512)=>{let result='';for(let at=0;at<value.length&&at<limit;at++)result+=value[at];return result;};
 const census=value=>{
  if(!value||typeof value!=='object')return {names:[]};if(isProxy(value))return {reason:'proxy'};
  const parent=prototype(value);if(parent!==plainPrototype&&parent!==arrayPrototype&&parent!==null)return {reason:'prototype'};
  const names=keys(value);if(names.length>budget.cells)return {reason:'diagnostic key bound'};for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack')return {reason:'key'};return {names};
 };
 const field=(value,name)=>{const scan=census(value);if(scan.reason||!value||typeof value!=='object')return null;const result=descriptor(value,name);return result&&own(result,'value')?result:null;};
 const summary=value=>{
  const kind=field(value,'k'),span=field(value,'span'),start=span&&field(span.value,'start'),end=span&&field(span.value,'end');
  return {kind:typeof kind?.value==='string'?text(kind.value,40):null,span:span?'present':'absent',spanType:span?typeof span.value:'absent',start:typeof start?.value==='number'?start.value:null,end:typeof end?.value==='number'?end.value:null,startType:start?typeof start.value:'absent',endType:end?typeof end.value:'absent'};
 };
 const walk=(actual,expected,path,depth,span=false,parents=null)=>{
  const difference=reason=>({path:text(path),reason,actual:summary(parents?parents.actual:actual),expected:summary(parents?parents.expected:expected)});
  if(--budget.cells<0||depth>64)return difference('diagnostic bound');if(actual===expected)return null;
  const aObject=actual!==null&&typeof actual==='object',bObject=expected!==null&&typeof expected==='object';
  if(!aObject&&!bObject)return span?difference('span primitive differs'):null;
  const a=census(actual),b=census(expected);if(a.reason||b.reason)return difference('own-data '+(a.reason??b.reason));
  // Both key censuses finish before any unknown field descriptor is read.
  for(let at=0;at<a.names.length;at++){
   const name=a.names[at],left=descriptor(actual,name),right=bObject?descriptor(expected,name):null,next=text(path+'/'+name);
   if(!left||!own(left,'value')||right&&!own(right,'value'))return difference('non-data field');
   if(!right&&(span||name==='span'))return {path:next,reason:'expected span field absent',actual:summary(parents?parents.actual:actual),expected:summary(parents?parents.expected:expected)};
   const found=walk(left.value,right?.value,next,depth+1,span||name==='span',parents??(name==='span'?{actual,expected}:null));if(found)return found;
  }
  for(let at=0;at<b.names.length;at++){
   const name=b.names[at];if(aObject&&own(actual,name))continue;const right=descriptor(expected,name),next=text(path+'/'+name);
   if(!right||!own(right,'value'))return difference('non-data field');
   if(span||name==='span')return {path:next,reason:'actual span field absent',actual:summary(parents?parents.actual:actual),expected:summary(parents?parents.expected:expected)};
   const found=walk(undefined,right.value,next,depth+1);if(found)return found;
  }return null;
 };
 for(let at=0;at<pairs.length;at++){const pair=pairs[at],found=walk(pair.actual,pair.expected,'',0);if(found)return {join:pair.join,...found};}
 return {reason:'no difference found within diagnostic domain'};
}
const canonicalSemanticSame=(actual,expected)=>same(alphaTree(copyMetadata(actual)),alphaTree(copyMetadata(expected)));
const isSameSemantic=(actual,expected)=>metadataDigest(alphaTree(actual))===metadataDigest(alphaTree(expected));
const projectionSemanticSame=(actual,expected)=>isSameSemantic(actual,expected)||canonicalSemanticSame(actual,expected);
export function requireOriginalJsonProjectionEmission(emitter,node){
 if(!emissionCall(node))return;
 if(!emissionFrames.get(emitter)?.includes(metadataDigest(alphaTree(node))))throw new Error('Owned JSON projection changed from its rechecked actual source function');
}
