// Source-certified, checked JSON macro expressions; no arbitrary Serialize or
// caller-supplied namespace/feature assertions are admitted.
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {JSON_TYPES,JSON_CONTRACTS} from './json-contracts.mjs';
import {jsonMacroParserOriginal,originalJsonMacroCandidate,sealJsonMacroCall,assertJsonMacroCall,assertJsonEmptyArrayCall} from '../json-macro-context.mjs';
import {parseJsonMacroSyntax} from '../json-macro-syntax.mjs';
const key=path=>path.join('::');
const originalTreeSpans=(value,offset)=>Array.isArray(value)?value.map(item=>originalTreeSpans(item,offset)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([name,item])=>[name,name==='span'?{start:item.start+offset,end:item.end+offset}:originalTreeSpans(item,offset)])):value;
export function withJsonMacroParser(Base) {return class extends Base {
  primary(path,options) {
    const c=this.cursor,first=c.peek();if(!['identifier','macro'].includes(first.kind))return super.primary(path,options);
    // The original lexer retains an adjacent bang in a single macro token;
    // whitespace-separated bangs remain punctuation. Keep both source forms,
    // including a qualified path whose last segment is the macro token.
    const segments=[first.value];let tail=c.index;
    while(c.tokens[tail]?.kind==='identifier'&&c.tokens[tail+1]?.value==='::'&&['identifier','macro'].includes(c.tokens[tail+2]?.kind)){tail+=2;segments.push(c.tokens[tail].value);}
    const attached=c.tokens[tail]?.kind==='macro',bang=attached?tail:tail+1;
    if(!attached&&c.tokens[bang]?.value!=='!'||!originalJsonMacroCandidate(this,segments))return super.primary(path,options);
    const original=jsonMacroParserOriginal(this);if(!original)throw unsupported('json! context','requires actual sealed dependency/features and original module scope',first);
    const opening=c.tokens[bang+1],pairs={'(':')','[':']','{':'}'},stack=[];let last=bang+1;
    if(!pairs[opening?.value])throw typeError('JSON macro needs an actual original delimiter',opening);
    for(;last<c.tokens.length;last++) {
      const value=c.tokens[last].value;if(pairs[value])stack.push(pairs[value]);else if([')',']','}'].includes(value)){if(stack.pop()!==value)throw typeError('JSON macro delimiter mismatch',c.tokens[last]);if(!stack.length)break;}
    }
    if(stack.length||last>=c.tokens.length)throw typeError('JSON macro delimiter is unterminated',first);
    const start=first.start,end=c.tokens[last].end,source=original.source.slice(start,end);let syntax,proof;
    try{syntax=parseJsonMacroSyntax(source);proof=sealJsonMacroCall(this,{segments,start,end,syntax});}
    catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('json! source contract',error.message,{start,end});}
    const arguments_=syntax.leaves.map(leaf=>{
      const index=c.tokens.findIndex(token=>token.start===start+leaf.span.start);if(index<0)throw typeError('JSON interpolation lost original token association',first);
      c.index=index;const value=this.expr(path);if(c.tokens[c.index-1]?.end!==start+leaf.span.end)throw unsupported('json! interpolation','requires complete original checked expression parsing',value.span);return value;
    });
    c.index=last+1;const value={k:'routerJsonMacro',jsonTree:originalTreeSpans(syntax.value,start),args:arguments_,jsonMacroProof:proof,constEligible:false,span:{start,end}};
    return {k:'routerConstObligation',value,constEligible:false,sourceFeature:'serde_json::json!',span:{start,end}};
  }
};}
const pureKinds=new Set(['lit','var','ctor','field','routerField','let','if','binary','unary','routerHostCall','routerTry','routerOptionCallback','routerStandardMethod','routerLambda','routerLambdaInput','routerJsonMacro','routerConstObligation','routerPrimitiveDereference','routerStandardSharedReceiver']);
// These registered readers do not invoke default numeric deserialization or
// arbitrary Serialize. A generic 'pure JSON' family marker is insufficient.
const readerIds=new Set(JSON_CONTRACTS.filter(contract=>['serde_json_value_get_string','serde_json_value_get_usize','serde_json_value_as_str'].includes(contract.id)).map(contract=>contract.id));
function checkedPure(node) {
  if(!node||typeof node!=='object')return true;
  if(node.k&&!pureKinds.has(node.k))return false;
  if(node.k==='routerHostCall'&&!readerIds.has(node.id))return false;
  for(const [name,value]of Object.entries(node))if(!['type','span','contract','jsonMacroProof','sourcePattern','patternControl'].includes(name)){
    if(Array.isArray(value)){if(value.some(item=>!checkedPure(item)))return false;}else if(!checkedPure(value))return false;
  }return true;
}
function serializeKind(checker,type,range) {
  if(type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||type.patternOwnershipRefusal&&!(type.patternOwnershipRefusal==='shared source reference'&&type.rustReference?.kind==='shared'))throw unsupported('json! Serialize','requires a known standard scalar or canonical Value implementation',range);
  if(type.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&!type.rustReference)return 'string';
  if(type.kind==='bool'&&!type.rustReference&&type.rustSourceType)return 'bool';
  if(type.kind==='fixed'&&!type.rustReference&&type.rustSourceType&&type.bits===64&&(type.rustPrimitiveName==='i64'&&type.signed||type.rustPrimitiveName==='u64'&&!type.signed))return type.rustPrimitiveName;
  let current=type,depth=0;
  while(current.rustReference){if(++depth>16||current.rustReference.kind!=='shared'||!current.rustReference.pointee||current.kind!=='data'||current.rustGenericIdentityUnresolved||current.rustBorrowingUnresolved||current.patternOwnershipRefusal&&current.patternOwnershipRefusal!=='shared source reference')throw unsupported('json! Value references','requires actual standard shared reference forwarding',range);current=current.rustReference.pointee;}
  const entry=current.kind==='data'?checker.items.get(current.name):null;
  if(entry&&key(entry.hostTypePath??[])===key(JSON_TYPES.value.path)&&!current.rustGenericIdentityUnresolved&&!current.rustOwnership)return 'value';
  throw unsupported('json! Serialize','custom Serialize, owned String, floats, erased primitives and unproved aggregate owners remain unsupported',range);
}
export function withJsonMacroChecker(Base) {return class extends Base {
  expr(node,env,path,expected,allowLiteral=false) {
    if(node.k!=='routerJsonMacro')return super.expr(node,env,path,expected,allowLiteral);
    try{assertJsonMacroCall(node.jsonMacroProof);}catch(error){throw unsupported('json! call proof',error.message,node.span);}
    const checkTree=tree=>{if(tree.kind==='array'){if(tree.items.length)throw unsupported('json! nonempty array allocation effects','boxed storage allocation precedes initialization; linked-crate global allocator/abort effects remain an explicit obligation',tree.span);try{assertJsonEmptyArrayCall(node.jsonMacroProof);}catch(error){throw unsupported('json! empty array owner',error.message,tree.span);}}if(tree.kind==='object')tree.entries.forEach(entry=>checkTree(entry.value));};checkTree(node.jsonTree);
    const type=this.hostType(JSON_TYPES.value,path,node.span),entry=this.items.get(type.name);
    if(!entry||key(entry.hostTypePath??[])!=='serde_json::Value')throw unsupported('json! output layout','requires the actual registered canonical Value declaration',node.span);
    const args=node.args.map(argument=>{
      const checked=this.expr(argument,env,path);if(!checkedPure(checked))throw unsupported('json! interpolation effects','only registered JSON/scalar expressions and checked Option propagation are supported',argument.span);
      return {value:checked,serialization:serializeKind(this,checked.type,argument.span)};
    });
    return {...node,args,type:{...type,rustSourceType:true},constEligible:false,jsonMacroProof:{...node.jsonMacroProof,checkedInterpolationCount:args.length,serializeOwners:args.map(arg=>arg.serialization),loweringEligible:true,projectionSemanticsOnly:true,applicationEffectCompleteness:false,remainingEffectObligations:['bounded value projection assumes successful memory resources; String/key/Value serialization allocation, linked allocator callbacks, OOM and payload-sensitive drop behavior are not a complete application effect contract'],nonlocalFlow:'existing checked routerTry propagation',runtimeParity:false}};
  }
};}
export function withJsonMacroEmitter(Base) {return class extends Base {
  constructor(program,state){super(program,state);this.jsonMacroRuntime=false;for(const name of ['null','bool','string','i64','u64','value','array','object'])state.reserved.add('ml_json_macro_'+name);}
  expr(node) {
    if(node.k!=='routerJsonMacro')return super.expr(node);
    if(!node.jsonMacroProof?.loweringEligible||node.type.kind!=='data')throw new Error('JSON macro has no checked operation contract');this.jsonMacroRuntime=true;
    const emit=tree=>{
      if(tree.kind==='null')return 'ml_json_macro_null()';
      if(['bool','string'].includes(tree.kind))return `ml_json_macro_${tree.kind}(${JSON.stringify(tree.value)})`;
      if(tree.kind==='array')return `ml_json_macro_array([${tree.items.map(emit).join(', ')}])`;
      if(tree.kind==='object')return `ml_json_macro_object([${tree.entries.map(entry=>`[${JSON.stringify(entry.key)}, ${emit(entry.value)}]`).join(', ')}])`;
      if(tree.kind==='expression'){const arg=node.args[tree.index];if(!arg)throw new Error('Missing checked JSON interpolation');return `ml_json_macro_${arg.serialization}(${this.expr(arg.value)})`;}
      throw new Error('Unchecked JSON macro tree');
    };return emit(node.jsonTree);
  }
  file() {
    const result=super.file();if(!this.jsonMacroRuntime)return result;
    const module=(this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'json-macro-runtime.mjs');
    const import_= `import { ${['null','bool','string','i64','u64','value','array','object'].map(name=>`json_macro_${name} as ml_json_macro_${name}`).join(', ')} } from ${JSON.stringify(module)};`;
    if(result.preludes.includes(import_))return result;
    const preludes=[import_,...result.preludes];return {...result,preludes,text:[...preludes,...result.definitions].join('\n\n')};
  }
};}
