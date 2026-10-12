// Original source AST capture only. An actual macro owner and typed expansion
// must be proved separately; a syntactic fragment is never runtime authority.
import {HostRustParser} from './extensions/host-contracts.mjs';
import {originalTextCursorGuard} from './extensions/text.mjs';
import {TokenCursor} from './vendor/meta-language/translation/lexer.js';
import {types} from 'node:util';
import {isStandardMatchesSourceProfile,standardMatchesOriginalDefinition} from './matches-source-profile.mjs';
import {capturedRustTokenSource} from './extensions/lexical.mjs';
import {macroTreeSource,freezeMacroTree} from './macro-token-trees.mjs';
const contexts=new WeakMap(),captures=new WeakMap();
function methodSnapshot(prototype) {
  const methods=new Map();
  for(let current=prototype;current&&current!==Object.prototype;current=Object.getPrototypeOf(current))for(const [name,field]of Object.entries(Object.getOwnPropertyDescriptors(current)))if(name!=='constructor'&&typeof field.value==='function'&&!methods.has(name))methods.set(name,field.value);
  return methods;
}
// Delay reading the highest parser class until an actual call: the generic
// declarative engine and Host parser share a module dependency cycle.
let parserMethods=null;const cursorMethods=methodSnapshot(TokenCursor.prototype);
function originalParserMethods(){return parserMethods??=methodSnapshot(HostRustParser.prototype);}
function assertOriginalMethods(value,prototype,methods,{cursor=false}={}) {
  if(!value||types.isProxy(value)||Object.getPrototypeOf(value)!==prototype)throw new TypeError('Macro fragment parser/cursor must retain its actual source class');
  const registered=cursor?originalTextCursorGuard(value):null,guard=registered?.baseIs===methods.get('is')?registered.guard:null;
  for(const [name,descriptor]of Object.entries(Object.getOwnPropertyDescriptors(value)))if(!Object.hasOwn(descriptor,'value')||typeof descriptor.value==='function'&&!(name==='is'&&descriptor.value===guard))throw new TypeError('Macro fragment parser/cursor callbacks or accessors are not original source methods');
  for(const [name,method]of methods)if(value[name]!==method&&!(name==='is'&&value[name]===guard))throw new TypeError('Macro fragment parser/cursor method identity changed');
}

const flags={macroOwnerResolved:false,namespaceAuthority:false,runtimeAuthority:false,applicationEffectCompleteness:false};
export function createOriginalMacroFragmentContext(parser,input,{sourceStart,modulePath=parser?.modulePath??[],definitionProfile=null}={}) {
  assertOriginalMethods(parser,HostRustParser.prototype,originalParserMethods());assertOriginalMethods(parser.cursor,TokenCursor.prototype,cursorMethods,{cursor:true});
  const source=parser instanceof HostRustParser&&capturedRustTokenSource(parser.cursor.tokens),original=macroTreeSource(input);
  if(!source||!original||!Number.isSafeInteger(sourceStart)||sourceStart<0||source.source.slice(sourceStart,sourceStart+original.source.length)!==original.source)throw new TypeError('Macro fragments require genuine parser tokens and exact original invocation bytes');
  if(!Array.isArray(modulePath)||modulePath.length>64||modulePath.some(part=>typeof part!=='string')||JSON.stringify(modulePath)!==JSON.stringify(parser.modulePath??[]))throw new TypeError('Macro fragment context differs from the actual parser module');
  if(definitionProfile!==null&&!isStandardMatchesSourceProfile(definitionProfile))throw new TypeError('Macro fragment definition requires its private pinned source profile');
  const context=Object.freeze({schema:'original-rust-macro-fragment-context-v1',originalSourceSha256:original.sha256,sourceStart,modulePath:Object.freeze([...modulePath]),...flags});
  contexts.set(context,{parser,input,source,original,tokens:parser.cursor.tokens,modulePath:[...modulePath],definitionProfile});return context;
}
export const isOriginalMacroFragmentContext=value=>!!value&&contexts.has(value);
export function parseOriginalMacroFragment(context,fragment,input,start) {
  const state=contexts.get(context);
  if(!state||state.input!==input||!['expr','pat'].includes(fragment)||!Number.isSafeInteger(start)||start<0||start>=input.length)throw new TypeError('Unsealed or mismatched original macro fragment request');
  const {parser,tokens,modulePath}=state,c=parser.cursor;
  assertOriginalMethods(parser,HostRustParser.prototype,originalParserMethods());assertOriginalMethods(c,TokenCursor.prototype,cursorMethods,{cursor:true});
  if(c.tokens!==tokens||JSON.stringify(parser.modulePath??[])!==JSON.stringify(modulePath)||capturedRustTokenSource(tokens)!==state.source)throw new TypeError('Original macro fragment parser identity changed');
  const first=input[start],tokenStart=first.span.start+context.sourceStart;
  const index=tokens.findIndex(token=>token.start===tokenStart);
  if(index<0)throw new TypeError('Original macro fragment lost its source token association');
  const previous=c.index;
  try {
    c.index=index;
    const ast=fragment==='expr'?parser.expr(modulePath):parser.controlPattern(modulePath,c.peek());
    if(c.index<=index)throw new TypeError('Original macro fragment parser did not consume source tokens');
    const last=tokens[c.index-1],stop=last.end-context.sourceStart;
    let end=start;while(end<input.length&&input[end].span.end<=stop)end++;
    if(end===start||input[end-1].span.end!==stop||input[end]?.span.start<stop)throw new TypeError('Original macro fragment did not consume a complete original token-tree interval');
    const trees=input.slice(start,end),capture=freezeMacroTree({schema:'original-rust-macro-ast-fragment-v1',fragment,trees,span:{start:tokenStart,end:last.end},originalSourceSha256:context.originalSourceSha256,ast,...flags});
    captures.set(capture,{context,input,start,end,ast});return {end,capture};
  } finally {c.index=previous;}
}
export const isOriginalMacroAstFragment=value=>!!value&&captures.has(value);
export function originalMacroFragmentAst(context,capture) {
  const state=captures.get(capture);if(!contexts.has(context)||!state||state.context!==context)throw new TypeError('Unsealed or differently owned original macro AST fragment');return state.ast;
}

export function originalMacroFragmentDefinition(context) {
  const state=contexts.get(context),profile=state?.definitionProfile;
  if(!state||!isStandardMatchesSourceProfile(profile))throw new TypeError('Macro fragment grammar lacks a private original definition edition/profile');
  return Object.freeze({source:standardMatchesOriginalDefinition(profile),name:profile.name,edition:profile.definitionEdition,profileDigest:profile.digest});
}
export function originalMacroFragmentParser(context) {
  const state=contexts.get(context);if(!state)throw new TypeError('Unsealed original macro parser context');return state.parser;
}
export function originalMacroFragmentTokens(context,capture) {
  const state=captures.get(capture),owner=contexts.get(context);
  if(!owner||!state||state.context!==context)throw new TypeError('Unsealed original macro source tokens');
  return owner.tokens.filter(token=>token.kind!=='eof'&&token.start>=capture.span.start&&token.end<=capture.span.end).map(token=>({kind:token.kind,value:token.value,...(token.raw?{raw:token.raw}:{}),span:{start:token.start,end:token.end}}));
}
