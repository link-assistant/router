// Explicit owned compatibility contract, not a translation of std::fmt.
// Only the qualified source-bound Router facade selects this operation. The
// existing Format parser/checker/emitter still check every operand and format.
import {FormatRustParser} from './extensions/formatting.mjs';
import {STRING} from './checked-types.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';

export const ROUTER_FORMATTING_FACADE_SOURCE="//! Owned compatibility operations shared by Rust and checked translation.\n//!\n//! These library implementations are intentionally not translated. The\n//! translator binds this complete facade and checks its supported operand domain.\n\nmod primitives;\npub use self::primitives::Str;\n\n/// Owned UTF-8 text returned by the compatibility formatting operation.\npub type Text = ::std::string::String;\n\n#[doc(hidden)]\n#[macro_export]\nmacro_rules! __router_translation_core_format {\n    ($($arguments:tt)*) => { ::std::format!($($arguments)*) };\n}\n\n/// Format through Rust's library; translation checks the primitive format subset.\npub use crate::__router_translation_core_format as format;\n";
export const ROUTER_FORMATTING_FACADE_SHA256="3f53c7fe464c83a56ba0c67a4deb339597b90cf1ee117544566730c01fc6d674";

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
  const roots=before.facts.modules.filter(module=>module.path.length===0),cores=before.facts.modules.filter(module=>module.path.length===1&&module.path[0]==='translation_core');
  if(roots.length!==1||cores.length!==1)fail();
  const root=roots[0],core=cores[0];
  // The actual tracked edge must select this complete external source. No alias,
  // cfg, attribute macro, caller flag or copied source-view can supply the API.
  const declarations=originalSourceModuleItems(root).filter(item=>item.term==='mod'&&item.name==='translation_core');
  if(declarations.length!==1||root.source.slice(declarations[0].start,declarations[0].end).trim()!=='pub mod translation_core;'||core.file!=='src/translation_core.rs'||core.source!==ROUTER_FORMATTING_FACADE_SOURCE||core.configurationCondition!=='active')fail();
  const scope=before.facts.evidence.scopes.find(scope=>scope.file===root.file&&scope.path.length===0),bindings=scope?.bindings.filter(binding=>binding.namespace==='type'&&binding.name==='translation_core');
  if(bindings?.length!==1||bindings[0].status!=='resolved'||bindings[0].kind!=='mod'||bindings[0].via!=='declaration'||bindings[0].source!==root.file||bindings[0].target?.join('::')!=='crate::translation_core'||bindings[0].span.start!==declarations[0].start||bindings[0].span.end!==declarations[0].end)fail();
  if(originalSourceModuleItems(root).some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_core')))fail();
  originalSourceModuleItems(core);
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'compatibility-format:lossless-owned-interface',apply:source=>{
      const stage=transportConcreteSyntaxSource(source,{language:'Rust'});
      if(stage.source!==ROUTER_FORMATTING_FACADE_SOURCE)fail();return stage;
    }}]},
    {phase:'repository',rules:[{id:'router-core:qualified-format-interface',apply:stage=>stage}]},
  ]);
  const stage=pipeline.run(core.source);
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
