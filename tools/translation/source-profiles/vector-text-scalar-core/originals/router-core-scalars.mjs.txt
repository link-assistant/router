import {crateModuleSourcePath} from './repository-layout.mjs';
// Owned Unicode scalar counting, not general char iterator admission.
// The genuine complete facade and leaf bind this one fixed qualified API.
import {types} from 'node:util';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {copyMetadata,originalParsedDeclarationEvidence,originalParsedSyntaxNode} from './extensions/source-links.mjs';
import {SOURCE_STR} from './extensions/source-contract-types.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';

import {ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_PRIMITIVES_SHA256} from './router-core-source-data.mjs';
export {ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_PRIMITIVES_SHA256};

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const ROUTER_CORE_SCALAR_CONTRACT=freeze({
  id:'router_core_unicode_scalar_count',jsExport:'router_core_unicode_scalar_count',
  rustPath:['crate','translation_core','unicode_scalar_count'],kind:'function',family:'string-iterator',
  params:[SOURCE_STR],ret:{kind:'fixed',bits:64,signed:false,rustPrimitiveName:'usize'},async:false,pure:true,constEligible:false,
  requiresRefinement:'genuine-router-core-scalar-call',profile:'router-owned-unicode-scalar-count-v1',
  assumptions:['Complete owned facade and primitives leaf select this qualified operation.',
    'One checked borrowed Rust scalar-text argument evaluates exactly once.',
    'Count Unicode scalar values, preserving CR/LF, NUL, combining marks and ZWJ separately.',
    'The target result uses the existing 64-bit usize BigInt ABI.',
    'Rust library internals remain intentionally untranslated; no general iterator admission.'],
});

export const ROUTER_CORE_ASCII_CONTRACT=freeze({
  id:'router_core_ascii_chars_in',jsExport:'router_core_ascii_chars_in',
  rustPath:['crate','translation_core','ascii_chars_in'],kind:'function',family:'string-iterator',
  params:[SOURCE_STR,SOURCE_STR],ret:{kind:'bool'},async:false,pure:true,constEligible:false,
  requiresRefinement:'genuine-router-core-ascii-call',profile:'router-owned-ascii-chars-in-v1',
  assumptions:['Complete owned facade and primitives leaf select the exact qualified operation.',
    'Two checked borrowed scalar-text arguments evaluate once, left to right.',
    'Every input UTF-8 byte must be ASCII and occur in the alphabet; empty input is true.',
    'Non-ASCII alphabet characters do not admit non-ASCII input.',
    'Native iterators and Pattern dispatch remain intentionally untranslated.'],
});
const calls=new WeakMap(),checkedCalls=new WeakMap();
const fail=()=>{throw new TypeError('Router scalar counting requires the actual owned primitives leaf and qualified source binding');};
function sourceContract(run,location){try{return run();}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('Router compatibility scalar count',error.message,location);}}
function originalLeaf(state){
  const leaves=state.facts.modules.filter(module=>module.path.length===2&&module.path[0]==='translation_core'&&module.path[1]==='primitives');
  if(leaves.length!==1)fail();const leaf=leaves[0];
  if(leaf.file!==crateModuleSourcePath(state.facts.modules,'src/translation_core/primitives.rs')||leaf.configurationCondition!=='active'||leaf.source!==ROUTER_CORE_PRIMITIVES_SOURCE||!Object.hasOwn(leaf,'sourceView'))fail();
  originalSourceModuleItems(leaf);return leaf;
}
export function parseRouterCoreScalarCall(parser,path){
  const c=parser.cursor,ascii=c.is('ascii_chars_in',4),words=['crate','::','translation_core','::',ascii?'ascii_chars_in':'unicode_scalar_count'];
  if(!words.every((word,index)=>c.is(word,index))||[0,2,4].some(index=>c.peek(index).kind!=='identifier'))return null;
  const first=c.peek(),location={start:first.start,end:c.peek(4).end};
  if(!c.is('(',5))throw unsupported('Router scalar count call','requires a complete nongeneric call',location);
  const state=sourceContract(()=>matchesParserFacts(parser),location),tokens=c.tokens,start=c.index;
  const facade=sourceContract(()=>requireRouterCoreFacade(parser),location),leaf=sourceContract(()=>originalLeaf(state),location),view=leaf.sourceView;
  const stage=sourceContract(()=>createRulePipeline([
    {phase:'language',rules:[{id:'compatibility-unicode-scalar-count:lossless-owned-operation',apply:()=>{
      const value=transportConcreteSyntaxSource(leaf.source,{language:'Rust'});if(value.source!==ROUTER_CORE_PRIMITIVES_SOURCE)fail();return value;
    }}]},
    {phase:'repository',rules:[{id:'router-core:bind-qualified-scalar-count',apply:value=>value}]},
  ]).run(null),location);
  sourceContract(()=>{requireRouterCoreFacadeCurrent(parser,facade);if(originalLeaf(state)!==leaf||leaf.sourceView!==view||matchesParserFacts(parser)!==state||parser.cursor!==c||c.tokens!==tokens||c.index!==start)fail();},location);
  c.index+=5;c.expect('(','Router scalar count');const args=[];
  while(!c.is(')')){args.push(parser.expr(path));if(!c.eat(','))break;}
  const last=c.expect(')','Router scalar count'),span={start:first.start,end:last.end};
  const end=c.index;
  sourceContract(()=>{requireRouterCoreFacadeCurrent(parser,facade);if(originalLeaf(state)!==leaf||leaf.sourceView!==view||matchesParserFacts(parser)!==state||parser.cursor!==c||c.tokens!==tokens||c.index!==end)fail();},span);
  const node={k:'routerCoreScalarCountCall',args,span};calls.set(node,{parser,syntax:copyMetadata(node),trace:stage.trace,contract:ascii?ROUTER_CORE_ASCII_CONTRACT:ROUTER_CORE_SCALAR_CONTRACT});return node;
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
export function captureRouterCoreScalarCalls(checker,surface){
  const nodes=new WeakMap();let guarded=false;
  const declaration=entry=>{
    const candidates=[];let cells=200000;
    const visit=(node,depth=0)=>{
      if(--cells<0||depth>160||!node||typeof node!=='object'||types.isProxy(node))return;
      const kind=Object.getOwnPropertyDescriptor(node,'k');
      if(kind&&Object.hasOwn(kind,'value')&&kind.value==='routerCoreScalarCountCall')candidates.push(node);
      for(const key of Reflect.ownKeys(node))if(typeof key==='string'&&!['type','span','length'].includes(key)){
        const field=Object.getOwnPropertyDescriptor(node,key);if(field&&Object.hasOwn(field,'value'))visit(field.value,depth+1);
      }
    };visit(entry);
    // Negative selection grants nothing and leaves old source-link/hash/guard
    // schedules alone when this declaration has no owned scalar operation.
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

export function checkRouterCoreScalarCall(checker,node,env,path,expected){
  const capture=checkedCalls.get(checker)?.get(node);
  if(!capture||!sameSyntax(node,capture.syntax))throw typeError('scalar-count call lacks its actual owned source association',node.span);
  requireOriginalPrimitiveTryFromChecker(checker);const receipt=capture.receipt;
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'compatibility-unicode-scalar-count:check-borrowed-text-operand',apply:()=>{
      const call=checker.hostCall([receipt.contract],node.args,env,path,expected,node.span);
      if(call.args.some(arg=>arg.type.kind!=='string'||arg.type.rustReference||arg.type.rustOwnership?.kind!=='borrowed'||arg.type.rustOwnership.source!=='str'||arg.type.patternOwnershipRefusal||arg.type.rustGenericIdentityUnresolved))throw typeError('scalar count requires checked borrowed Rust text',node.span);
      requireOriginalPrimitiveTryFromChecker(checker);if(!sameSyntax(node,capture.syntax))throw typeError('scalar-count source call changed during operand checking',node.span);return call;
    }}]},
    {phase:'repository',rules:[{id:'router-core:retain-scalar-count-boundary',apply:call=>({...call,compatibilityCore:{id:receipt.contract.profile,symbol:receipt.contract.rustPath.join('::'),sourceSha256:ROUTER_CORE_PRIMITIVES_SHA256,libraryImplementation:'untranslated-owned-rust-library',sourceTrace:receipt.trace}})}]},
  ]);return pipeline.run(null).value;
}
