// Explicit owned compatibility contract, not a translation of std::fmt.
// Only the qualified source-bound Router facade selects this operation. The
// existing Format parser/checker/emitter still check every operand and format.
import {FormatRustParser} from './extensions/formatting.mjs';
import {STRING} from './checked-types.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {selectOriginalRouterCoreFacade} from './router-core-facade-source.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';

import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_FORMATTING_FACADE_SHA256} from './router-core-source-data.mjs';
export {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_FORMATTING_FACADE_SHA256};

const formatDescriptor=Object.getOwnPropertyDescriptor(FormatRustParser.prototype,'expressionMacro');
const proofs=new WeakMap();
const fail=()=>{throw new TypeError('Router compatibility formatting requires its actual owned facade and qualified source binding');};
function formatterCurrent(){
  const current=Object.getOwnPropertyDescriptor(FormatRustParser.prototype,'expressionMacro');
  if(!current||current.value!==formatDescriptor.value||current.get!==formatDescriptor.get||current.set!==formatDescriptor.set||current.writable!==formatDescriptor.writable||current.enumerable!==formatDescriptor.enumerable||current.configurable!==formatDescriptor.configurable)fail();
}
function qualified(parser,leaf,kind){
  const c=parser.cursor;
  return c.peek().kind==='identifier'&&c.is('crate')&&c.is('::',1)&&c.peek(2).kind==='identifier'&&c.is('translation_core',2)&&c.is('::',3)&&c.peek(4).kind===kind&&c.peek(4).value===leaf;
}
export function requireRouterCoreFacade(parser){
  const before=matchesParserFacts(parser),cursor=parser.cursor,index=cursor.index,tokens=cursor.tokens;
  const selected=selectOriginalRouterCoreFacade({modules:before.facts.modules,sourceScopes:before.facts.evidence.scopes,compilationProfile:before.facts.compilationProfile});
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'compatibility-format:lossless-owned-interface',apply:source=>{
      const stage=transportConcreteSyntaxSource(source,{language:'Rust'});
      if(stage.source!==ROUTER_FORMATTING_FACADE_SOURCE)fail();return stage;
    }}]},
    {phase:'repository',rules:[{id:'router-core:qualified-format-interface',apply:stage=>stage}]},
  ]);
  const stage=pipeline.run(selected.source);
  const after=matchesParserFacts(parser);
  if(after!==before||parser.cursor!==cursor||cursor.index!==index||cursor.tokens!==tokens)fail();
  formatterCurrent();
  const proof=Object.freeze({trace:stage.trace});proofs.set(proof,{state:before,cursor,tokens});return proof;
}
export function requireRouterCoreFacadeCurrent(parser,proof){
  const state=proofs.get(proof);if(!state||matchesParserFacts(parser)!==state.state||parser.cursor!==state.cursor||parser.cursor.tokens!==state.tokens)fail();
  formatterCurrent();
}
function parseContract(parser,location){
  try{return requireRouterCoreFacade(parser);}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('Router compatibility facade',error.message,location);}
}
function parseCurrent(parser,proof,location){
  try{requireRouterCoreFacadeCurrent(parser,proof);}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('Router compatibility facade',error.message,location);}
}
export function parseRouterCoreFormatting(parser,path){
  if(!qualified(parser,'format','macro'))return null;
  const c=parser.cursor,first=c.peek(),macro=c.peek(4),proof=parseContract(parser,{start:first.start,end:macro.end});c.index+=5;
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'compatibility-format:parse-primitive-format-operands',apply:()=>formatDescriptor.value.call(parser,{...macro,value:'format',start:first.start},path)}]},
    {phase:'repository',rules:[{id:'router-core:bind-qualified-format-operation',apply:value=>({k:'routerConstObligation',value:{...value,compatibilityCore:{id:'router-core-format-v1',symbol:'crate::translation_core::format',facadeSha256:ROUTER_FORMATTING_FACADE_SHA256,libraryImplementation:'untranslated-rust-std-format',domain:'existing-checked-primitive-format',trace:proof.trace}},constEligible:false,sourceFeature:'router-core-format',span:value.span})}]},
  ]);
  const output=pipeline.run(null);parseCurrent(parser,proof,output.value.span);return output.value;
}
export function parseRouterCoreText(parser){
  if(!qualified(parser,'Text','identifier'))return null;
  const c=parser.cursor,location={start:c.peek().start,end:c.peek(4).end},proof=parseContract(parser,location);c.index+=5;parseCurrent(parser,proof,location);return {...STRING,rustSourceType:true,rustOwnership:{kind:'owned',source:'String'}};
}
