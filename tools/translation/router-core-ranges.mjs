// Owned binary64 compatibility operation, not standard Range method admission.
// The genuine complete facade and leaf bind this one fixed qualified API.
import {types} from 'node:util';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {copyMetadata,originalParsedDeclarationEvidence,originalParsedSyntaxNode} from './extensions/source-links.mjs';
import {SOURCE_F64,requirePrimitiveFloat} from './extensions/primitive-float-contracts.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';

import {ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_RANGES_SHA256} from './router-core-source-data.mjs';
export {ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_RANGES_SHA256};

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const ROUTER_CORE_RANGE_CONTRACT=freeze({
  id:'router_core_f64_inclusive_contains',jsExport:'router_core_f64_inclusive_contains',
  rustPath:['crate','translation_core','f64_inclusive_contains'],kind:'function',family:'float',
  params:[SOURCE_F64,SOURCE_F64,SOURCE_F64],ret:{kind:'bool'},async:false,pure:true,constEligible:false,
  requiresRefinement:'genuine-router-core-range-call',profile:'router-owned-f64-inclusive-v1',
  assumptions:['Complete owned facade and range leaf select this qualified operation.',
    'Three by-value primitive f64 arguments evaluate left to right exactly once.',
    'IEEE ordered comparisons; NaN yields false, infinities and signed zero are included.',
    'The generic Rust library may also accept same-type f32 inputs; the checked JavaScript operation admits only f64.',
    'Rust library internals are intentionally untranslated; no standard Range owner proof.'],
});
const calls=new WeakMap(),checkedCalls=new WeakMap();
const fail=()=>{throw new TypeError('Router inclusive bounds require the actual owned range leaf and qualified source binding');};
function sourceContract(run,location){try{return run();}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('Router compatibility inclusive bounds',error.message,location);}}
function originalLeaf(state){
  const leaves=state.facts.modules.filter(module=>module.path.length===2&&module.path[0]==='translation_core'&&module.path[1]==='ranges');
  if(leaves.length!==1)fail();const leaf=leaves[0];
  if(leaf.file!=='src/translation_core/ranges.rs'||leaf.configurationCondition!=='active'||leaf.source!==ROUTER_CORE_RANGES_SOURCE||!Object.hasOwn(leaf,'sourceView'))fail();
  originalSourceModuleItems(leaf);return leaf;
}
export function parseRouterCoreRangeCall(parser,path){
  const c=parser.cursor,words=['crate','::','translation_core','::','f64_inclusive_contains'];
  if(!words.every((word,index)=>c.is(word,index))||[0,2,4].some(index=>c.peek(index).kind!=='identifier'))return null;
  const first=c.peek(),location={start:first.start,end:c.peek(4).end};
  if(!c.is('(',5))throw unsupported('Router inclusive bounds call','requires a complete nongeneric call',location);
  const state=sourceContract(()=>matchesParserFacts(parser),location),tokens=c.tokens,start=c.index;
  const facade=sourceContract(()=>requireRouterCoreFacade(parser),location),leaf=sourceContract(()=>originalLeaf(state),location),view=leaf.sourceView;
  const stage=sourceContract(()=>createRulePipeline([
    {phase:'language',rules:[{id:'compatibility-f64-bounds:lossless-owned-operation',apply:()=>{
      const value=transportConcreteSyntaxSource(leaf.source,{language:'Rust'});if(value.source!==ROUTER_CORE_RANGES_SOURCE)fail();return value;
    }}]},
    {phase:'repository',rules:[{id:'router-core:bind-qualified-inclusive-bounds',apply:value=>value}]},
  ]).run(null),location);
  sourceContract(()=>{requireRouterCoreFacadeCurrent(parser,facade);if(originalLeaf(state)!==leaf||leaf.sourceView!==view||matchesParserFacts(parser)!==state||parser.cursor!==c||c.tokens!==tokens||c.index!==start)fail();},location);
  c.index+=5;c.expect('(','Router inclusive bounds');const args=[];
  while(!c.is(')')){args.push(parser.expr(path));if(!c.eat(','))break;}
  const last=c.expect(')','Router inclusive bounds'),span={start:first.start,end:last.end};
  const end=c.index;
  sourceContract(()=>{requireRouterCoreFacadeCurrent(parser,facade);if(originalLeaf(state)!==leaf||leaf.sourceView!==view||matchesParserFacts(parser)!==state||parser.cursor!==c||c.tokens!==tokens||c.index!==end)fail();},span);
  const node={k:'routerCoreF64InclusiveCall',args,span};calls.set(node,{parser,syntax:copyMetadata(node),trace:stage.trace});return node;
}
// Compare complete mutable node data after the last source-link hash. Keys
// are preflighted before descriptors; proxies/accessors never supply syntax.
function sameSyntax(actual,expected,budget={cells:200000},depth=0){
  if(--budget.cells<0||depth>160)return false;
  if(actual===expected)return true;
  if(!actual||!expected||typeof actual!=='object'||typeof expected!=='object'||types.isProxy(actual)||types.isProxy(expected))return false;
  if(Array.isArray(actual)!==Array.isArray(expected)||![Object.prototype,null,Array.prototype].includes(Object.getPrototypeOf(actual)))return false;
  const keys=Reflect.ownKeys(actual),wanted=Reflect.ownKeys(expected);
  if(keys.length!==wanted.length||keys.some(key=>typeof key!=='string'||!Object.hasOwn(expected,key)))return false;
  for(const key of wanted){const a=Object.getOwnPropertyDescriptor(actual,key),b=Object.getOwnPropertyDescriptor(expected,key);if(!a||!b||!Object.hasOwn(a,'value')||!Object.hasOwn(b,'value')||a.enumerable!==b.enumerable||!sameSyntax(a.value,b.value,budget,depth+1))return false;}
  return true;
}
export function captureRouterCoreRangeCalls(checker,surface){
  const nodes=new WeakMap();let guarded=false;
  const declaration=entry=>{
    const candidates=[];let cells=200000;
    const visit=(node,depth=0)=>{
      if(--cells<0||depth>160||!node||typeof node!=='object'||types.isProxy(node))return;
      const kind=Object.getOwnPropertyDescriptor(node,'k');
      if(kind&&Object.hasOwn(kind,'value')&&kind.value==='routerCoreF64InclusiveCall')candidates.push(node);
      for(const key of Reflect.ownKeys(node))if(typeof key==='string'&&!['type','span','length'].includes(key)){
        const field=Object.getOwnPropertyDescriptor(node,key);if(field&&Object.hasOwn(field,'value'))visit(field.value,depth+1);
      }
    };visit(entry);
    // Negative selection grants nothing and leaves old source-link/hash/guard
    // schedules alone when this declaration has no owned range operation.
    if(!candidates.length)return;
    if(!guarded){requireOriginalPrimitiveTryFromChecker(checker);guarded=true;}
    if(!originalParsedDeclarationEvidence(entry))return;
    for(const node of candidates){
      const origin=originalParsedSyntaxNode(entry,node),receipt=origin&&calls.get(origin.original);
      if(origin?.actual===node&&receipt?.parser===origin.parser&&sameSyntax(origin.original,receipt.syntax)&&sameSyntax(node,origin.relocated))nodes.set(node,{receipt,syntax:copyMetadata(node)});
    }
  };
  const items=list=>{for(const entry of list)if(entry.k==='module')items(entry.items);else if(entry.k==='fn')declaration(entry);};items(surface.items);checkedCalls.set(checker,nodes);
}

export function checkRouterCoreRangeCall(checker,node,env,path,expected){
  const capture=checkedCalls.get(checker)?.get(node);
  if(!capture||!sameSyntax(node,capture.syntax))throw typeError('inclusive bounds call lacks its actual owned source association',node.span);
  requireOriginalPrimitiveTryFromChecker(checker);const receipt=capture.receipt;
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'compatibility-f64-bounds:check-by-value-operands',apply:()=>{
      const call=checker.hostCall([ROUTER_CORE_RANGE_CONTRACT],node.args,env,path,expected,node.span);
      call.args.forEach(arg=>requirePrimitiveFloat(arg,node.span));
      requireOriginalPrimitiveTryFromChecker(checker);if(!sameSyntax(node,capture.syntax))throw typeError('inclusive bounds source call changed during operand checking',node.span);return call;
    }}]},
    {phase:'repository',rules:[{id:'router-core:retain-inclusive-bounds-boundary',apply:call=>({...call,compatibilityCore:{id:'router-owned-f64-inclusive-v1',symbol:'crate::translation_core::f64_inclusive_contains',sourceSha256:ROUTER_CORE_RANGES_SHA256,libraryImplementation:'untranslated-owned-rust-library',sourceTrace:receipt.trace}})}]},
  ]);return pipeline.run(null).value;
}
