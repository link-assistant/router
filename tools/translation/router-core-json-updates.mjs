// Only source-bound owned JSON operations enter this language rule. The Rust
// library bodies remain untranslated; no general Clone/IndexMut is admitted.
import {types} from 'node:util';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {copyMetadata,metadataDigest,originalParsedDeclarationEvidence,originalParsedSyntaxNode} from './extensions/source-links.mjs';
import {JSON_TYPES,JSON_DATA} from './extensions/json-contracts.mjs';
import {sameType} from './checked-types.mjs';
import {alphaTree,retargetCheckedCallback} from './extensions/standard-body-checker.mjs';
import {captureBorrowedLayouts,requireBorrowedLayouts} from './extensions/standard-borrowed-body.mjs';
import {renameFunction} from './vendor/meta-language/translation/ir.js';
import {coerce} from './checked-coercions.mjs';
import {validateOwnedJsonFlow} from './owned-json-flow.mjs';
import {SOURCE_STR,sourceShared} from './extensions/source-contract-types.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_PRIMITIVES_SHA256} from './router-core-source-data.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';
const qualified=originalDataFreezeIntrinsicsUnchanged(),calls=new WeakMap(),checkedCalls=new WeakMap(),functions=new WeakMap(),activeFunctions=new WeakMap(),issued=new WeakMap();
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
export const ROUTER_CORE_JSON_UPDATE_CONTRACTS=freeze([...updateContracts,...['json_index_str','json_index_usize','json_map_index'].map(name=>({id:'router_core_'+name,jsExport:'router_core_'+name,rustPath:['crate','translation_core',name],kind:'function',family:'json-update',params:[sourceShared(name==='json_map_index'?JSON_TYPES.map:JSON_TYPES.value),name==='json_index_usize'?{kind:'fixed',bits:64,signed:false,rustSourceType:true,rustPrimitiveName:'usize'}:SOURCE_STR],ret:sourceShared(JSON_TYPES.value),async:false,pure:true,constEligible:false,requiresRefinement:'genuine-router-owned-json-projection',assumptions:['Actual complete facade/primitive sources bind this shared projection.','Result borrows only argument zero; the key grants no lifetime.','Value missing/wrong-kind returns canonical Null; Map missing entry panics.','Existing canonical JSON bounds apply; no Index/IndexMut/Copy/Drop or arbitrary borrowing authority.']}))]);
const projectionNames=new Set(['json_index_str','json_index_usize','json_map_index']),projectionContexts=new Map(),emissionFrames=new WeakMap();
const projectionDefinitions={"json_index_str":"pub fn json_index_str<'a>(value: &'a Json, key: &Str) -> &'a Json {\n    &value[key]\n}","json_index_usize":"pub fn json_index_usize<'a>(value: &'a Json, index: usize) -> &'a Json {\n    &value[index]\n}","json_map_index":"pub fn json_map_index<'a>(\n    value: &'a ::serde_json::Map<::std::string::String, Json>,\n    key: &Str,\n) -> &'a Json {\n    &value[key]\n}"};
const projectionId=id=>typeof id==='string'&&id.startsWith('router_core_')&&projectionNames.has(id.replace(/^router_core_/u,''));
const fail=()=>{throw new TypeError('Owned JSON update requires its actual complete source binding');};
function sourceContract(run,span){try{return run();}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('Router owned JSON update source',error.message,span);}}
function leaf(state){const rows=state.facts.modules.filter(module=>module.path.join('::')==='translation_core::primitives');if(rows.length!==1||rows[0].file!=='src/translation_core/primitives.rs'||rows[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||rows[0].configurationCondition!=='active'||!rows[0].sourceView)fail();originalSourceModuleItems(rows[0]);return rows[0];}
function same(a,b,budget={cells:200000},depth=0){
 if(--budget.cells<0||depth>160)return false;if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||isProxy(a)||isProxy(b))return false;
 if(isArray(a)!==isArray(b)||(prototype(a)!==plainPrototype&&prototype(a)!==null&&prototype(a)!==arrayPrototype))return false;
 const names=keys(a),wanted=keys(b);if(names.length!==wanted.length)return false;
 for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack'||!own(b,names[at]))return false;
 for(let at=0;at<wanted.length;at++){const key=wanted[at],x=descriptor(a,key),y=descriptor(b,key);if(!x||!y||!own(x,'value')||!own(y,'value')||x.enumerable!==y.enumerable||!same(x.value,y.value,budget,depth+1))return false;}return true;
}
export function parseRouterCoreJsonUpdate(parser,path){
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
 const node={k:'routerCoreJsonUpdateCall',operation,args,span:{start:first.start,end:last.end}},syntax=copyMetadata(node);current(c.index);calls.set(node,{parser,syntax,trace:stage.trace});return node;
}
export function captureRouterCoreJsonUpdates(checker,surface){
 if(!qualified)return;const nodes=new WeakMap(),entries=new WeakMap();let guarded=false;
 const declaration=entry=>{
  let candidates=null,cells=200000;const members=new WeakMap();
  const visit=(node,depth=0)=>{if(--cells<0||depth>160||!node||typeof node!=='object'||isProxy(node))return;const parent=prototype(node);if(parent!==plainPrototype&&parent!==null&&parent!==arrayPrototype)return;const names=keys(node);for(let at=0;at<names.length;at++)if(names[at]==='stack')return;const kind=descriptor(node,'k');if(kind&&own(kind,'value')&&kind.value==='let')members.set(node,true);if(kind&&own(kind,'value')&&kind.value==='routerCoreJsonUpdateCall')candidates={node,next:candidates};for(let at=0;at<names.length;at++){const key=names[at];if(typeof key!=='string'||key==='type'||key==='span'||key==='length')continue;const field=descriptor(node,key);if(field&&own(field,'value'))visit(field.value,depth+1);}};visit(entry);
  if(!candidates)return;if(!qualified||!originalDataFreezeIntrinsicsUnchanged())fail();if(!guarded){requireOriginalPrimitiveTryFromChecker(checker);guarded=true;}if(!originalParsedDeclarationEvidence(entry))return;
  let captured=false;while(candidates){const node=candidates.node,origin=originalParsedSyntaxNode(entry,node),receipt=origin&&calls.get(origin.original);if(origin?.actual===node&&receipt?.parser===origin.parser){const snapshot=copyMetadata(node);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();const current=originalParsedSyntaxNode(entry,node);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();if(current?.actual===node&&current.original===origin.original&&current.parser===receipt.parser&&same(origin.original,receipt.syntax)&&same(node,origin.relocated)&&same(node,snapshot)){nodes.set(node,{receipt,syntax:snapshot});captured=true;}}candidates=candidates.next;}
  if(captured){const syntax=copyMetadata(entry);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged()||!originalParsedDeclarationEvidence(entry)||!same(entry,syntax))fail();entries.set(entry,{syntax,members});}
 };
 let itemCells=200000;
 const items=(list,depth=0)=>{if(--itemCells<0||depth>160||!list||typeof list!=='object'||isProxy(list)||!isArray(list)||prototype(list)!==arrayPrototype)return;const length=descriptor(list,'length');if(!length||!own(length,'value')||length.value>200000)return;for(let at=0;at<length.value;at++){const field=descriptor(list,at),entry=field&&own(field,'value')?field.value:null;if(!entry||typeof entry!=='object'||isProxy(entry))continue;const names=keys(entry);let stack=false;for(let index=0;index<names.length;index++)if(names[index]==='stack')stack=true;if(stack)continue;const kind=descriptor(entry,'k');if(!kind||!own(kind,'value'))continue;if(kind.value==='fn')declaration(entry);else if(kind.value==='module'){const child=descriptor(entry,'items');if(child&&own(child,'value'))items(child.value,depth+1);}}};
 if(surface&&typeof surface==='object'&&!isProxy(surface)){const names=keys(surface);let stack=false;for(let at=0;at<names.length;at++)if(names[at]==='stack')stack=true;if(!stack){const field=descriptor(surface,'items');if(field&&own(field,'value'))items(field.value);}}checkedCalls.set(checker,nodes);functions.set(checker,entries);
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
 const contract=ROUTER_CORE_JSON_UPDATE_CONTRACTS.find(row=>row.rustPath.at(-1)===node.operation);if(!contract||node.args.length!==contract.params.length)throw typeError('owned JSON update argument count',node.span);
 const stage=createRulePipeline([
  {phase:'language',rules:[{id:'owned-json-update:check-canonical-ownership-and-operands',apply:()=>{
   let args;const evaluate=syntax=>{requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();const value=checker.expr(syntax,env,path);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();return value;};
   if(projectionNames.has(node.operation)){args=projectionArguments(checker,node,env,path,evaluate);}
   else if(node.operation==='json_copy'){
    const written=node.args[0],borrow=written.k==='routerTextReference',value=evaluate(borrow?written.value:written);canonical(checker,value.type,written.span,true);if(!borrow&&!value.type.rustReference)throw unsupported('owned JSON copy argument','requires an explicit shared borrow or actual shared Json parameter',written.span);args=[value];
   }else{
    args=node.args.map(evaluate);canonical(checker,args[0].type,node.args[0].span,false);canonical(checker,args[2].type,node.args[2].span,false);const key=args[1].type;if(key.kind!=='string'||key.rustReference||key.rustOwnership?.kind!=='borrowed'||key.rustOwnership.source!=='str'||key.patternOwnershipRefusal||key.rustBorrowingUnresolved||key.rustGenericIdentityUnresolved)throw unsupported('owned JSON update key','requires checked borrowed scalar text',node.args[1].span);
   }
   const type=projectionNames.has(node.operation)?{...sourceShared(checker.hostType(JSON_TYPES.value,path,node.span)),rustSourceType:true}:{...checker.hostType(JSON_TYPES.value,path,node.span),rustSourceType:true};if(expected&&!sameType(type,expected))throw typeError('owned JSON update result type differs',node.span);if(expected)checker.expectedOwnership?.(type,expected,path,node.span);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged()||!same(node,capture.syntax))throw typeError('owned JSON update changed during checking',node.span);return {k:'routerHostCall',id:contract.id,args,type,span:node.span,constEligible:false};
  }}]},
  {phase:'repository',rules:[{id:'router-core:retain-owned-json-update-boundary',apply:call=>({...call,compatibilityCore:{id:'router-owned-json-update-v1',symbol:contract.rustPath.join('::'),sourceSha256:ROUTER_CORE_PRIMITIVES_SHA256,sourceTrace:capture.receipt.trace,libraryImplementation:'untranslated-owned-rust-library',boundedProjection:true,runtimeParity:false}})}]},
 ]);const value=stage.run(null).value,record={checker,frame:activeFunctions.get(checker),id:value.id,args:copyMetadata(value.args)};
 if(projectionNames.has(node.operation)){
  const layouts=copyMetadata(captureBorrowedLayouts(checker,[...value.args.map(arg=>arg.type),value.type]));
  const key=metadataDigest({functionName:record.frame.functionName,source:record.frame.syntax,call:value,layouts});value.compatibilityCore.sourceProjectionKey=key;
  record.call=copyMetadata(value);record.layouts=layouts;record.roots=copyMetadata([...value.args.map(arg=>arg.type),value.type]);
  record.key=key;(record.frame.projections??=new Set()).add(record);
 }
 issued.set(value.compatibilityCore,record);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged()||!same(node,capture.syntax))fail();return value;
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
  currentFunction(checker,item,receipt);if(activeFunctions.has(checker))fail();receipt.functionName=name;activeFunctions.set(checker,receipt);
  try{
   const result=visit(...args),body=copyMetadata(entry.body);
   currentFunction(checker,item,receipt);if(!same(entry.body,body))fail();
   createRulePipeline([
    {phase:'language',rules:[{id:'owned-json-flow:check-whole-function-linear-state',apply:()=>{
     validateOwnedJsonFlow(checker,entry,{genuine:node=>{const proof=issued.get(node.compatibilityCore);return proof?.checker===checker&&proof.frame===receipt&&proof.id===node.id&&same(node.args,proof.args);}});
     return null;
    }}]},
    {phase:'repository',rules:[{id:'router-core:rejoin-original-update-caller',apply:value=>{
     currentFunction(checker,item,receipt);
     if(entry!==checker.items.get(name)||!same(entry.body,body))fail();return value;
    }}]},
   ]).run(null);
   if(receipt.projections){
    // Global emission storage contains immutable data only. The live checker
    // and visit receipt remain solely in the weak checking registry above.
    const functionContext=freeze(copyMetadata({name,params:entry.params,ret:entry.ret,body:entry.body}));
    for(const projection of receipt.projections)projectionContexts.set(projection.key,freeze({id:projection.id,call:projection.call,layouts:projection.layouts,roots:projection.roots,functionContext}));
   }
   return result;
  }finally{activeFunctions.delete(checker);}
 };
}
function containsExit(node){if(!node||typeof node!=='object'||node.k==='routerLambda')return false;if(['routerReturn','routerBreak','routerContinue'].includes(node.k))return true;return Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(containsExit):containsExit(value)));}
export function checkRouterCoreJsonMutableLet(checker,node,env,path,expected,allowLiteral){
 const receipt=activeFunctions.get(checker);
 // This is a temporary checking permission for a genuine fresh JSON producer;
 // the entire checked body must subsequently pass the linear state analysis.
 if(node.k!=='let'||!node.mutable||!receipt?.members.has(node)||!['routerCoreJsonCall','routerJsonMacro','routerCoreJsonUpdateCall'].includes(node.value?.k))return null;
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
  if(node.args[1].k==='num'&&!node.args[1].type&&!node.args[1].sourceFloatLiteral)key={...key,type:{...key.type,rustPrimitiveName:'usize',rustSourceType:true}};
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
function projectionNodes(node,result=[]){
 if(!node||typeof node!=='object')return result;
 if(node.k==='routerHostCall'&&projectionId(node.id))result.push(node);
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
  if(!isSameSemantic(node,expected)||!isSameSemantic({params:entry.params,ret:entry.ret,body:entry.body},{params:wanted.params,ret:wanted.ret,body:wanted.body}))throw new Error('Owned JSON projection source function or checked call changed');
  requireBorrowedLayouts(context.layouts,checker,emitter.program,retargetCheckedCallback(context.roots,emitter.program));
  requireOriginalPrimitiveTryFromChecker(checker);
 }
 const previous=emissionFrames.get(emitter),renamed=renameFunction(entry,emitter.state.ident,emitter.state.localReserved());emissionFrames.set(emitter,projectionNodes(renamed.body).map(node=>metadataDigest(alphaTree(node))));return ()=>{if(previous)emissionFrames.set(emitter,previous);else emissionFrames.delete(emitter);};
}
const isSameSemantic=(actual,expected)=>metadataDigest(alphaTree(actual))===metadataDigest(alphaTree(expected));
export function requireOriginalJsonProjectionEmission(emitter,node){
 if(!projectionId(node.id))return;
 if(!emissionFrames.get(emitter)?.includes(metadataDigest(alphaTree(node))))throw new Error('Owned JSON projection changed from its rechecked actual source function');
}
