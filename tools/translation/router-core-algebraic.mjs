// Source-bound owned aliases feed the existing registered JSON/Option/Result
// representations. Native library implementations remain untranslated.
import {JSON_TYPES,JSON_CONTRACTS} from './extensions/json-contracts.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from './router-core-source-data.mjs';
import {HostRustParser,originalHostParserIdentitySnapshot} from './extensions/host-contracts.mjs';
import {TokenCursor} from './vendor/meta-language/translation/lexer.js';
import {originalTextCursorGuard} from './extensions/text.mjs';
import {assertOriginalParserIdentity} from './original-parser-identity.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';

const kinds={Maybe:'Option',Outcome:'Result'},prefix=['crate','::','translation_core','::'];
const location=(first,last)=>({start:first.start,end:last.end});
const head=(c,count)=>Array.from({length:count},(_,at)=>{const token=c.peek(at);return {token,value:token.value,kind:token.kind,start:token.start,end:token.end};});
const fail=message=>{throw new TypeError('Router algebraic core: '+message);};
function selected(parser){
  const c=parser.cursor;
  if(!prefix.every((word,at)=>c.is(word,at))||[0,2,4].some(at=>c.peek(at).kind!=='identifier'))return null;
  const name=c.peek(4).value;return name==='Json'||Object.hasOwn(kinds,name)?{c,name,first:c.peek(),last:c.peek(4),start:c.index,tokens:c.tokens,head:head(c,5)}:null;
}
function identity(parser){
  const snapshot=originalHostParserIdentitySnapshot();
  assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));
  assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});
}
function context(parser,row){
  identity(parser);const state=matchesParserFacts(parser),facade=requireRouterCoreFacade(parser);
  const leaves=state.facts.modules.filter(module=>module.path.join('.')==='translation_core.primitives');
  if(leaves.length!==1)fail('requires the complete owned primitives leaf');const leaf=leaves[0];
  if(leaf.file!=='src/translation_core/primitives.rs'||leaf.configurationCondition!=='active'||leaf.source!==ROUTER_CORE_PRIMITIVES_SOURCE)fail('primitives source changed');
  originalSourceModuleItems(leaf);
  if(row.name==='Json'){const target=parser.resolveSourceNamespace(JSON_TYPES.value.path,parser.modulePath??[],'type');if(target.join('::')!=='serde_json::Value'||parser.shadowedEffectRoots?.has('serde_json'))fail('the registered JSON representation is shadowed');}
  const stage=createRulePipeline([
    {phase:'language',rules:[{id:'owned-algebraic:reparse-native-alias-interface',apply:()=>transportConcreteSyntaxSource(leaf.source,{language:'Rust'})}]},
    {phase:'repository',rules:[{id:'router-core:select-qualified-algebraic-alias',apply:value=>value}]},
  ]).run(null);
  if(stage.value.source!==ROUTER_CORE_PRIMITIVES_SOURCE)fail('primitives reconstruction changed');
  current(parser,row,{state,facade,leaf},row.start);return {state,facade,leaf};
}
function current(parser,row,proof,end){
  requireRouterCoreFacadeCurrent(parser,proof.facade);identity(parser);
  if(matchesParserFacts(parser)!==proof.state||proof.leaf.source!==ROUTER_CORE_PRIMITIVES_SOURCE||parser.cursor!==row.c||row.c.tokens!==row.tokens||row.c.index!==end)fail('actual parser/source association changed');
  for(let at=0;at<row.head.length;at++){const expected=row.head[at],actual=row.tokens[row.start+at];if(actual!==expected.token)fail('qualified source token identity changed');for(const key of ['value','kind','start','end']){const field=Object.getOwnPropertyDescriptor(actual,key);if(!field||!Object.hasOwn(field,'value')||field.value!==expected[key])fail('qualified source token data changed');}}
}
function sourceContract(run,span){try{return run();}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('Router owned algebraic interface',error.message,span);}}
export function parseRouterCoreAlgebraicType(parser){
  const row=selected(parser);if(!row)return null;const {c,name,first,last}=row,span=location(first,last);
  // A following associated member belongs to expression/pattern parsing.
  if(c.is('::',5))return null;
  const proof=sourceContract(()=>context(parser,row),span);c.index+=5;let type;
  if(name==='Json'){
    if(c.is('<'))throw unsupported('owned Json alias','requires the nongeneric Json type',span);
    // Existing registered support must retain its actual canonical owner;
    // a competing source serde_json module cannot supply the runtime layout.
    type={...JSON_TYPES.value,path:[...JSON_TYPES.value.path],span};
  }else{
    c.expect('<','owned algebraic type');const arguments_=[parser.type()];
    if(name==='Outcome'){c.expect(',','owned Outcome error type');arguments_.push(parser.type());}
    c.eat(',');const close=c.expect('>','owned algebraic type');
    // Reuse the exact canonical generic constructor and its existing source
    // ownership normalization. This narrow issuer has already bound the actual
    // owned alias; it does not change any old bare-prelude selection.
    const before=parser.authorizedGenericKind;parser.authorizedGenericKind=kinds[name];
    try{type=parser.genericType(kinds[name],arguments_,location(first,close));}finally{parser.authorizedGenericKind=before;}
  }
  sourceContract(()=>current(parser,row,proof,c.index),span);return type;
}
function member(parser){
  const row=selected(parser);if(!row||!row.c.is('::',5)||row.c.peek(6).kind!=='identifier')return null;
  const name=row.c.peek(6).value,kind=Object.hasOwn(kinds,row.name)?kinds[row.name]:null;
  if(kind&&!(kind==='Option'?['Some','None']:['Ok','Err']).includes(name))return null;
  const json=row.name==='Json',constructors=['Null','Bool','Number','String','Array','Object'];
  if(json&&!constructors.includes(name)&&!JSON_CONTRACTS.some(contract=>contract.rustPath.join('::')==='serde_json::Value::'+name))return null;
  return {...row,member:name,kind,json,jsonConstructor:json&&constructors.includes(name),last:row.c.peek(6),head:head(row.c,7)};
}
export function parseRouterCoreAlgebraicExpression(parser,path){
  const row=member(parser);if(!row)return null;const {c,first,last}=row,span=location(first,last),proof=sourceContract(()=>context(parser,row),span);c.index+=7;
  const args=[];let called=false,end=last;
  if(c.eat('(')){called=true;while(!c.is(')')){args.push(parser.expr(path));if(!c.eat(','))break;}end=c.expect(')','owned algebraic member');}
  if(c.is('::')||c.is('<'))throw unsupported('owned algebraic member','explicit generic member instantiation remains unsupported',span);
  if(called&&(row.member==='None'||row.member==='Null'))throw unsupported('owned unit constructor','unit variants do not take call parentheses',span);
  if(!called&&row.kind&&row.member!=='None')throw unsupported('owned constructor function item','requires an explicit checked constructor call',span);
  sourceContract(()=>current(parser,row,proof,c.index),span);const range=location(first,end);
  if(row.kind)return {k:'routerRegisteredConstructor',kind:row.kind,constructor:row.member,args,span:range};
  const target=['serde_json','Value',row.member];
  if(!called)return {k:'name',path:target,span:range};
  if(row.jsonConstructor)return {k:'app',fn:{k:'name',path:target,span:range},args,span:range};
  return {k:'routerHostCall',path:target,args,span:range};
}
export function parseRouterCoreAlgebraicPattern(parser,path,aliases){
  const row=member(parser);if(!row||!row.kind&&!row.jsonConstructor)return null;
  const {c,first,last}=row,span=location(first,last),proof=sourceContract(()=>context(parser,row),span);c.index+=7;const args=[];let end=last;
  if(c.eat('(')){if(row.member==='None'||row.member==='Null')throw unsupported('owned unit pattern','unit variants do not take tuple parentheses',span);while(!c.is(')')){args.push(parser.pattern(path,aliases));if(!c.eat(','))break;}end=c.expect(')','owned algebraic pattern');}
  sourceContract(()=>current(parser,row,proof,c.index),span);
  return {k:'ctor',path:row.kind?[row.member]:['serde_json','Value',row.member],args,...(row.kind?{registeredGenericOwner:row.kind}:{}),span:location(first,end)};
}
