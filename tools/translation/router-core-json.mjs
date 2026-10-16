// Owned JSON construction: the real Rust library delegation is explicit.
// A genuine qualified source call selects this route; ordinary json! is unchanged.
import {types} from 'node:util';
import {originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {copyMetadata,originalParsedDeclarationEvidence,originalParsedSyntaxNode} from './extensions/source-links.mjs';
import {capturedRustTokenSource} from './extensions/lexical.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {parseJsonMacroSyntax} from './json-macro-syntax.mjs';
import {JSON_TYPES} from './extensions/json-contracts.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {ROUTER_FORMATTING_FACADE_SHA256} from './router-core-source-data.mjs';
import {typeError,unsupported} from './vendor/meta-language/translation/diagnostics.js';
const initiallyQualified=originalDataFreezeIntrinsicsUnchanged();
const own=Object.hasOwn,descriptor=Object.getOwnPropertyDescriptor,keys=Reflect.ownKeys,prototype=Object.getPrototypeOf,isArray=Array.isArray,isProxy=types.isProxy;
const plainPrototype=Object.prototype,arrayPrototype=Array.prototype;
const calls=new WeakMap(),checkedCalls=new WeakMap();
const sourceContract=(run,span)=>{try{return run();}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('Router owned JSON source',error.message,span);}};
const relocate=(value,offset)=>isArray(value)?value.map(row=>relocate(row,offset)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,row])=>[key,key==='span'?{start:row.start+offset,end:row.end+offset}:relocate(row,offset)])):value;
export function parseRouterCoreJson(parser,path){
  const c=parser.cursor,words=['crate','::','translation_core','::'];
  if(!words.every((word,at)=>c.is(word,at))||[0,2].some(at=>c.peek(at).kind!=='identifier')||!['identifier','macro'].includes(c.peek(4).kind)||c.peek(4).value!=='json')return null;
  const attached=c.peek(4).kind==='macro',opening=c.index+(attached?5:6);
  if(!attached&&!c.is('!',5))return null;
  const start=c.index,tokens=c.tokens,first=c.peek(),range={start:first.start,end:c.peek(4).end};
  if(!initiallyQualified||!originalDataFreezeIntrinsicsUnchanged())throw unsupported('owned JSON host','requires original native data operations',range);
  const state=sourceContract(()=>matchesParserFacts(parser),range),facade=sourceContract(()=>requireRouterCoreFacade(parser),range),captured=capturedRustTokenSource(tokens);
  if(!captured)throw unsupported('Router owned JSON tokens','requires original source tokenization',range);
  const pairs={'(':')','[':']','{':'}'},stack=[];let last=opening;
  if(!pairs[tokens[opening]?.value])throw typeError('owned JSON requires a complete macro delimiter',range);
  for(;last<tokens.length;last++){
    const token=tokens[last];if(['string','rustChar'].includes(token.kind))continue;
    if(pairs[token.value])stack.push(pairs[token.value]);else if([')',']','}'].includes(token.value)){if(stack.pop()!==token.value)throw typeError('owned JSON delimiter mismatch',range);if(!stack.length)break;}
  }
  if(stack.length||last>=tokens.length)throw typeError('owned JSON delimiter is unterminated',range);
  const end=tokens[last].end,source=captured.source.slice(first.start,end),span={start:first.start,end};
  const pipeline=sourceContract(()=>createRulePipeline([
    {phase:'language',rules:[{id:'owned-json:reconstruct-and-parse-complete-invocation',apply:()=>{
      const stage=transportConcreteSyntaxSource(source,{language:'Rust'});if(stage.source!==source)throw new TypeError('owned JSON reconstruction changed');
      const syntax=parseJsonMacroSyntax(stage.source),args=syntax.leaves.map(leaf=>{
        const index=tokens.findIndex(token=>token.start===first.start+leaf.span.start);if(index<0)throw typeError('owned JSON interpolation lost original token',span);
        c.index=index;const value=parser.expr(path);if(tokens[c.index-1]?.end!==first.start+leaf.span.end)throw unsupported('owned JSON interpolation','requires complete original expression parsing',value.span);return value;
      });return {syntax,args};
    }}]},
    {phase:'repository',rules:[{id:'router-core:package-qualified-json-source-call',apply:({syntax,args})=>{c.index=last+1;return {k:'routerCoreJsonCall',jsonTree:relocate(syntax.value,first.start),args,span};}}]},
  ]).run(null),span),node=pipeline.value,finalIndex=c.index,snapshot=copyMetadata(node),currentSource=capturedRustTokenSource(tokens);
  sourceContract(()=>{if(!initiallyQualified||!originalDataFreezeIntrinsicsUnchanged())throw new TypeError('owned JSON native source operations changed');requireRouterCoreFacadeCurrent(parser,facade);if(matchesParserFacts(parser)!==state||parser.cursor!==c||c.tokens!==tokens||c.index!==finalIndex||currentSource!==captured||!sameSyntax(node,snapshot))throw new TypeError('owned JSON source changed during parsing');},span);
  calls.set(node,{parser,syntax:snapshot,trace:pipeline.trace});return node;
}
// Callback-free source association scans use only initially qualified captured
// reflection. In particular, no iterator, property getter or lazy stack field
// is read while discovering whether this operation exists in a legacy surface.
function sameSyntax(actual,expected,budget={cells:200000},depth=0){
  if(--budget.cells<0||depth>160)return false;
  if(actual===expected)return true;
  if(!actual||!expected||typeof actual!=='object'||typeof expected!=='object'||isProxy(actual)||isProxy(expected))return false;
  const parent=prototype(actual);if(isArray(actual)!==isArray(expected)||parent!==plainPrototype&&parent!==null&&parent!==arrayPrototype)return false;
  const names=keys(actual),wanted=keys(expected);if(names.length!==wanted.length)return false;
  for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack'||!own(expected,names[at]))return false;
  for(let at=0;at<wanted.length;at++){const name=wanted[at],a=descriptor(actual,name),b=descriptor(expected,name);if(!a||!b||!own(a,'value')||!own(b,'value')||a.enumerable!==b.enumerable||!sameSyntax(a.value,b.value,budget,depth+1))return false;}
  return true;
}
export function captureRouterCoreJsonCalls(checker,surface){
  if(!initiallyQualified)return;
  const nodes=new WeakMap();let guarded=false;
  const declaration=entry=>{
    let candidates=null,cells=200000;
    const visit=(node,depth=0)=>{
      if(--cells<0||depth>160||!node||typeof node!=='object'||isProxy(node))return;
      const parent=prototype(node);if(parent!==plainPrototype&&parent!==null&&parent!==arrayPrototype)return;
      const names=keys(node);for(let at=0;at<names.length;at++)if(names[at]==='stack')return;
      const kind=descriptor(node,'k');if(kind&&own(kind,'value')&&kind.value==='routerCoreJsonCall')candidates={node,next:candidates};
      for(let at=0;at<names.length;at++){const key=names[at];if(typeof key!=='string'||key==='type'||key==='span'||key==='length')continue;const field=descriptor(node,key);if(field&&own(field,'value'))visit(field.value,depth+1);}
    };visit(entry);
    if(!candidates)return;
    if(!originalDataFreezeIntrinsicsUnchanged())throw typeError('owned JSON native data operations changed',null);
    if(!guarded){requireOriginalPrimitiveTryFromChecker(checker);guarded=true;}
    if(!originalParsedDeclarationEvidence(entry))return;
    while(candidates){
      const node=candidates.node,origin=originalParsedSyntaxNode(entry,node),receipt=origin&&calls.get(origin.original);
      if(origin?.actual===node&&receipt?.parser===origin.parser){
        const snapshot=copyMetadata(node);
        if(!originalDataFreezeIntrinsicsUnchanged())throw typeError('owned JSON native source operations changed',null);
        requireOriginalPrimitiveTryFromChecker(checker);
        const current=originalParsedSyntaxNode(entry,node);
        if(current?.actual===node&&current.original===origin.original&&current.parser===receipt.parser&&sameSyntax(origin.original,receipt.syntax)&&sameSyntax(node,origin.relocated)&&sameSyntax(node,snapshot))nodes.set(node,{receipt,syntax:snapshot});
      }
      candidates=candidates.next;
    }
  };
  let itemCells=200000;
  const items=(list,depth=0)=>{
    if(--itemCells<0||depth>160)return;
    if(!list||typeof list!=='object'||isProxy(list)||!isArray(list)||prototype(list)!==arrayPrototype)return;
    const length=descriptor(list,'length');if(!length||!own(length,'value')||length.value>200000)return;
    for(let at=0;at<length.value;at++){
      const row=descriptor(list,at),entry=row&&own(row,'value')?row.value:null;
      if(!entry||typeof entry!=='object'||isProxy(entry))continue;
      const kind=descriptor(entry,'k');if(!kind||!own(kind,'value'))continue;
      if(kind.value==='fn')declaration(entry);else if(kind.value==='module'){const nested=descriptor(entry,'items');if(nested&&own(nested,'value'))items(nested.value,depth+1);}
    }
  };
  if(surface&&typeof surface==='object'&&!isProxy(surface)){const field=descriptor(surface,'items');if(field&&own(field,'value'))items(field.value);}
  checkedCalls.set(checker,nodes);
}

const pureKinds=new Set(['lit','var','ctor','field','routerField','let','if','binary','unary','routerHostCall','routerTry','routerOptionCallback','routerStandardMethod','routerLambda','routerLambdaInput','routerJsonMacro','routerConstObligation','routerPrimitiveDereference','routerStandardSharedReceiver']);
const readers=new Set(['serde_json_value_get_string','serde_json_value_get_usize','serde_json_value_as_str']);
function pure(checker,node){
  if(!node||typeof node!=='object')return true;
  if(node.k&&!pureKinds.has(node.k))return false;
  if(node.k==='routerHostCall'&&!readers.has(node.id)){
    const contract=checker.instantiations?.contracts.get(node.id);
    // Only the actual existing total saturating arithmetic contract can appear
    // here; arbitrary host effects and source calls are never interpolations.
    if(!contract||contract.id!==node.id||!/^rust_fixed_saturating_(add|sub|mul)_/u.test(node.id)||contract.pure!==true)return false;
  }
  for(const [name,value]of Object.entries(node))if(!['type','span','contract','jsonMacroProof','compatibilityCore','sourcePattern','patternControl'].includes(name)){
    if(isArray(value)){if(value.some(row=>!pure(checker,row)))return false;}else if(!pure(checker,value))return false;
  }return true;
}
// The private raw call binds these direct Rust literal nodes to original
// tokens. Preserve the checker's actual range/value check, then retain their
// explicit suffix or the Rust unsuffixed integer fallback, never an erased var.
function literalIdentity(argument,value){
  const number=argument.k==='num'?argument:argument.k==='unary'&&argument.op==='neg'&&argument.arg?.k==='num'?argument.arg:null;
  if(!number||number.sourceFloatLiteral||number.type&&number.type.kind!=='fixed')return value;
  const name=number.type?.rustPrimitiveName??(!number.type?'i32':null),match=/^([iu])(8|16|32|64|128)$/u.exec(name??''),bits=match?Number(match[2]):['usize','isize'].includes(name)?64:null,signed=name?.startsWith('i');
  if(bits===null||value.type.kind!=='fixed'||value.type.bits!==bits||value.type.signed!==signed||value.type.rustReference||value.type.rustOwnership)throw unsupported('owned JSON literal identity','requires the actual checked source suffix or Rust i32 integer fallback',argument.span);
  return {...value,type:{...value.type,rustSourceType:true,rustPrimitiveName:name}};
}
function serialization(checker,type,span){
  if(type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||type.patternOwnershipRefusal&&!(type.patternOwnershipRefusal==='shared source reference'&&type.rustReference?.kind==='shared'))throw unsupported('owned JSON operand','requires an actual checked scalar or canonical Json value',span);
  if(type.kind==='string'&&!type.rustReference&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return 'string';
  if(type.kind==='bool'&&!type.rustReference&&type.rustSourceType)return 'bool';
  const name=type.rustPrimitiveName;
  if(type.kind==='fixed'&&!type.rustReference&&type.rustSourceType&&/^([iu](8|16|32|64)|usize|isize)$/u.test(name??'')){
    const width=/^(u|i)(8|16|32|64)$/u.exec(name),bits=width?Number(width[2]):64,signed=name.startsWith('i');
    if(type.bits===bits&&type.signed===signed)return signed?'i64':'u64';
  }
  let current=type,depth=0;
  while(current.rustReference){if(++depth>16||current.rustReference.kind!=='shared'||!current.rustReference.pointee||current.kind!=='data'||current.rustGenericIdentityUnresolved||current.rustBorrowingUnresolved)throw unsupported('owned JSON reference','requires checked canonical shared Json forwarding',span);current=current.rustReference.pointee;}
  const entry=current.kind==='data'?checker.items.get(current.name):null;
  if(entry?.hostTypePath?.join('::')==='serde_json::Value'&&!current.rustGenericIdentityUnresolved&&!current.rustOwnership)return 'value';
  throw unsupported('owned JSON operand','custom Serialize, owned Text, floats, aggregate owners and unresolved primitives remain refused',span);
}
export function checkRouterCoreJson(checker,node,env,path,expected){
  const capture=checkedCalls.get(checker)?.get(node);
  if(!capture||!sameSyntax(node,capture.syntax))throw typeError('owned JSON lacks its actual qualified source call',node.span);
  if(!initiallyQualified||!originalDataFreezeIntrinsicsUnchanged())throw typeError('owned JSON native operations changed',node.span);
  requireOriginalPrimitiveTryFromChecker(checker);
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'owned-json:check-complete-typed-tree',apply:()=>{
      const tree=value=>{if(value.kind==='array'&&value.items.length)throw unsupported('owned JSON nonempty array','requires a separate allocation and element evaluation contract',value.span);if(value.kind==='object')value.entries.forEach(entry=>tree(entry.value));};tree(node.jsonTree);
      const type=checker.hostType(JSON_TYPES.value,path,node.span),entry=checker.items.get(type.name);
      if(entry?.hostTypePath?.join('::')!=='serde_json::Value')throw unsupported('owned JSON layout','requires registered immutable canonical Json',node.span);
      const args=node.args.map(argument=>{const value=literalIdentity(argument,checker.expr(argument,env,path));if(!pure(checker,value))throw unsupported('owned JSON interpolation effects','requires checked scalar/Json readers or total saturating arithmetic',argument.span);return {value,serialization:serialization(checker,value.type,argument.span)};});
      if(!originalDataFreezeIntrinsicsUnchanged())throw typeError('owned JSON native operations changed during operands',node.span);requireOriginalPrimitiveTryFromChecker(checker);if(!sameSyntax(node,capture.syntax))throw typeError('owned JSON call changed during operand checking',node.span);
      return {k:'routerJsonMacro',jsonTree:node.jsonTree,args,type:{...type,rustSourceType:true},span:node.span,constEligible:false};
    }}]},
    {phase:'repository',rules:[{id:'router-core:emit-existing-checked-json-vocabulary',apply:value=>({...value,jsonMacroProof:{loweringEligible:true,route:'owned-qualified-json-v1',runtimeParity:false},compatibilityCore:{id:'router-owned-json-v1',symbol:'crate::translation_core::json',facadeSha256:ROUTER_FORMATTING_FACADE_SHA256,libraryImplementation:'untranslated-owned-serde-json-delegation',sourceTrace:capture.receipt.trace,allocationBoundary:'bounded successful-resource projection; no allocator/OOM or arbitrary Serialize theorem'}})}]},
  ]);const result=pipeline.run(null);return {...result.value,compatibilityCore:{...result.value.compatibilityCore,trace:result.trace}};
}
