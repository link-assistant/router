// Only source-bound owned JSON operations enter this language rule. The Rust
// library bodies remain untranslated; no general Clone/IndexMut is admitted.
import {types} from 'node:util';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {copyMetadata,originalParsedDeclarationEvidence,originalParsedSyntaxNode} from './extensions/source-links.mjs';
import {JSON_TYPES} from './extensions/json-contracts.mjs';
import {sameType} from './checked-types.mjs';
import {SOURCE_STR,sourceShared} from './extensions/source-contract-types.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_PRIMITIVES_SHA256} from './router-core-source-data.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';
const qualified=originalDataFreezeIntrinsicsUnchanged(),calls=new WeakMap(),checkedCalls=new WeakMap();
const own=Object.hasOwn,descriptor=Object.getOwnPropertyDescriptor,keys=Reflect.ownKeys,prototype=Object.getPrototypeOf,isArray=Array.isArray,isProxy=types.isProxy,plainPrototype=Object.prototype,arrayPrototype=Array.prototype;
const freeze=value=>{if(value&&typeof value==='object'){for(const value_ of Object.values(value))freeze(value_);Object.freeze(value);}return value;};
export const ROUTER_CORE_JSON_UPDATE_CONTRACTS=freeze(['json_copy','json_with_field'].map(name=>({
 id:'router_core_'+name,jsExport:'router_core_'+name,rustPath:['crate','translation_core',name],kind:'function',family:'json-update',
 params:name==='json_copy'?[sourceShared(JSON_TYPES.value)]:[JSON_TYPES.value,SOURCE_STR,JSON_TYPES.value],ret:JSON_TYPES.value,
 async:false,pure:true,constEligible:false,requiresRefinement:'genuine-router-owned-json-update',
 assumptions:['Actual complete owned facade and primitive leaf bind this exact operation.',
  'Canonical immutable JSON only; no custom Clone, IndexMut, Serialize or mutable-reference admission.',
  'Arguments evaluate once, left to right; an adopted assignment evaluates its RHS in a prior hygienic local.',
  'Deep copies and final results retain existing 4096-node/depth32/dense4096 bounds and Unicode/UTF8 map ordering.',
  'Null promotes to an object; other non-object bases panic. Allocation/OOM/allocator and payload Drop internals remain outside the bounded successful-resource projection.'],
})));
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
 const operation=c.peek(4).value;if(!['json_copy','json_with_field'].includes(operation))return null;
 const first=c.peek(),location={start:first.start,end:c.peek(4).end},tokens=c.tokens,start=c.index;
 if(!qualified||!originalDataFreezeIntrinsicsUnchanged())throw unsupported('owned JSON update host','requires original native data operations',location);
 const state=sourceContract(()=>matchesParserFacts(parser),location),facade=sourceContract(()=>requireRouterCoreFacade(parser),location),original=sourceContract(()=>leaf(state),location),view=original.sourceView;
 const stage=sourceContract(()=>createRulePipeline([
  {phase:'language',rules:[{id:'owned-json-update:complete-source-CST-roundtrip',apply:()=>{const value=transportConcreteSyntaxSource(original.source,{language:'Rust'});if(value.source!==ROUTER_CORE_PRIMITIVES_SOURCE)fail();return value;}}]},
  {phase:'repository',rules:[{id:'router-core:bind-qualified-json-update',apply:value=>value}]},
 ]).run(null),location);
 const current=end=>sourceContract(()=>{if(!originalDataFreezeIntrinsicsUnchanged())fail();requireRouterCoreFacadeCurrent(parser,facade);if(matchesParserFacts(parser)!==state||leaf(state)!==original||original.sourceView!==view||parser.cursor!==c||c.tokens!==tokens||c.index!==end)fail();},location);
 current(start);c.index+=5;c.expect('(','owned JSON update');const args=[];while(!c.is(')')){args.push(parser.expr(path));if(!c.eat(','))break;}const last=c.expect(')','owned JSON update');current(c.index);
 const node={k:'routerCoreJsonUpdateCall',operation,args,span:{start:first.start,end:last.end}},syntax=copyMetadata(node);current(c.index);calls.set(node,{parser,syntax,trace:stage.trace});return node;
}
export function captureRouterCoreJsonUpdates(checker,surface){
 if(!qualified)return;const nodes=new WeakMap();let guarded=false;
 const declaration=entry=>{
  let candidates=null,cells=200000;
  const visit=(node,depth=0)=>{if(--cells<0||depth>160||!node||typeof node!=='object'||isProxy(node))return;const parent=prototype(node);if(parent!==plainPrototype&&parent!==null&&parent!==arrayPrototype)return;const names=keys(node);for(let at=0;at<names.length;at++)if(names[at]==='stack')return;const kind=descriptor(node,'k');if(kind&&own(kind,'value')&&kind.value==='routerCoreJsonUpdateCall')candidates={node,next:candidates};for(let at=0;at<names.length;at++){const key=names[at];if(typeof key!=='string'||key==='type'||key==='span'||key==='length')continue;const field=descriptor(node,key);if(field&&own(field,'value'))visit(field.value,depth+1);}};visit(entry);
  if(!candidates)return;if(!qualified||!originalDataFreezeIntrinsicsUnchanged())fail();if(!guarded){requireOriginalPrimitiveTryFromChecker(checker);guarded=true;}if(!originalParsedDeclarationEvidence(entry))return;
  while(candidates){const node=candidates.node,origin=originalParsedSyntaxNode(entry,node),receipt=origin&&calls.get(origin.original);if(origin?.actual===node&&receipt?.parser===origin.parser){const snapshot=copyMetadata(node);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();const current=originalParsedSyntaxNode(entry,node);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();if(current?.actual===node&&current.original===origin.original&&current.parser===receipt.parser&&same(origin.original,receipt.syntax)&&same(node,origin.relocated)&&same(node,snapshot))nodes.set(node,{receipt,syntax:snapshot});}candidates=candidates.next;}
 };
 let itemCells=200000;
 const items=(list,depth=0)=>{if(--itemCells<0||depth>160||!list||typeof list!=='object'||isProxy(list)||!isArray(list)||prototype(list)!==arrayPrototype)return;const length=descriptor(list,'length');if(!length||!own(length,'value')||length.value>200000)return;for(let at=0;at<length.value;at++){const field=descriptor(list,at),entry=field&&own(field,'value')?field.value:null;if(!entry||typeof entry!=='object'||isProxy(entry))continue;const names=keys(entry);let stack=false;for(let index=0;index<names.length;index++)if(names[index]==='stack')stack=true;if(stack)continue;const kind=descriptor(entry,'k');if(!kind||!own(kind,'value'))continue;if(kind.value==='fn')declaration(entry);else if(kind.value==='module'){const child=descriptor(entry,'items');if(child&&own(child,'value'))items(child.value,depth+1);}}};
 if(surface&&typeof surface==='object'&&!isProxy(surface)){const names=keys(surface);let stack=false;for(let at=0;at<names.length;at++)if(names[at]==='stack')stack=true;if(!stack){const field=descriptor(surface,'items');if(field&&own(field,'value'))items(field.value);}}checkedCalls.set(checker,nodes);
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
 requireOriginalPrimitiveTryFromChecker(checker);
 const contract=ROUTER_CORE_JSON_UPDATE_CONTRACTS.find(row=>row.rustPath.at(-1)===node.operation);if(!contract||node.args.length!==contract.params.length)throw typeError('owned JSON update argument count',node.span);
 const stage=createRulePipeline([
  {phase:'language',rules:[{id:'owned-json-update:check-canonical-ownership-and-operands',apply:()=>{
   let args;const evaluate=syntax=>{requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();const value=checker.expr(syntax,env,path);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged())fail();return value;};
   if(node.operation==='json_copy'){
    const written=node.args[0],borrow=written.k==='routerTextReference',value=evaluate(borrow?written.value:written);canonical(checker,value.type,written.span,true);if(!borrow&&!value.type.rustReference)throw unsupported('owned JSON copy argument','requires an explicit shared borrow or actual shared Json parameter',written.span);args=[value];
   }else{
    args=node.args.map(evaluate);canonical(checker,args[0].type,node.args[0].span,false);canonical(checker,args[2].type,node.args[2].span,false);const key=args[1].type;if(key.kind!=='string'||key.rustReference||key.rustOwnership?.kind!=='borrowed'||key.rustOwnership.source!=='str'||key.patternOwnershipRefusal||key.rustBorrowingUnresolved||key.rustGenericIdentityUnresolved)throw unsupported('owned JSON update key','requires checked borrowed scalar text',node.args[1].span);
   }
   const type={...checker.hostType(JSON_TYPES.value,path,node.span),rustSourceType:true};if(expected&&!sameType(type,expected))throw typeError('owned JSON update result type differs',node.span);if(expected)checker.expectedOwnership?.(type,expected,path,node.span);requireOriginalPrimitiveTryFromChecker(checker);if(!originalDataFreezeIntrinsicsUnchanged()||!same(node,capture.syntax))throw typeError('owned JSON update changed during checking',node.span);return {k:'routerHostCall',id:contract.id,args,type,span:node.span,constEligible:false};
  }}]},
  {phase:'repository',rules:[{id:'router-core:retain-owned-json-update-boundary',apply:call=>({...call,compatibilityCore:{id:'router-owned-json-update-v1',symbol:contract.rustPath.join('::'),sourceSha256:ROUTER_CORE_PRIMITIVES_SHA256,sourceTrace:capture.receipt.trace,libraryImplementation:'untranslated-owned-rust-library',boundedProjection:true,runtimeParity:false}})}]},
 ]);return stage.run(null).value;
}
