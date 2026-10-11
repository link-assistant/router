// The checked &str Pattern profile accepts string values, never JS regexes.
// https://doc.rust-lang.org/std/primitive.str.html#method.contains
// https://doc.rust-lang.org/std/primitive.str.html#method.replacen
import {FormatRustParser,FormatChecker,FormatEmitter} from './formatting.mjs';
import {BOOL,STRING,fixed,rustFixedType,sameType} from '../vendor/meta-language/translation/types.js';
import {coerce} from '../vendor/meta-language/translation/check.js';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const SPLITS=new Set(['split_once','rsplit_once']);
const STRIPS=new Set(['strip_prefix','strip_suffix']);
const TRIMS=new Set(['trim_start_matches','trim_end_matches','trim_matches']);
const METHODS=new Map([['starts_with',1],['ends_with',1],['contains',1],['replace',2],['replacen',3],...Array.from([...SPLITS,...STRIPS,...TRIMS],method=>[method,1])]);
const USIZE={...fixed(64,false),rustPrimitiveName:'usize'};
const exits=node=>node&&typeof node==='object'&&(['routerReturn','routerBreak','routerContinue','routerTry','routerAwait'].includes(node.k)||Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(exits):exits(value))));
export class TextRustParser extends FormatRustParser {
  constructor(tokens) {
    super(tokens);
    // A decoded literal payload is never a Rust delimiter or keyword, even
    // when its value is ")", "&", "let" or another syntax spelling.
    const is=this.cursor.is.bind(this.cursor);
    this.cursor.is=(value,offset=0)=>!['string','rustChar'].includes(this.cursor.peek(offset).kind)&&is(value,offset);
  }
  primary(path,options) {
    const token=this.cursor.peek();if(token.kind==='rustChar'){this.cursor.next();return {k:'routerPatternChar',value:token.value,raw:token.raw,span:{start:token.start,end:token.end}};}
    const value=super.primary(path,options);
    return token.kind==='number'&&rustFixedType(token.suffix)&&value.k==='num'?{...value,type:{...value.type,rustPrimitiveName:token.suffix}}:value;
  }
  unary(path,options) {
    const token=this.cursor.peek();if(!this.cursor.eat('&'))return super.unary(path,options);
    if(this.cursor.is('mut'))throw unsupported('mutable shared reference','requires separately checked borrowing',token);
    const value=this.unary(path,{});return {k:'routerTextReference',value,span:{start:token.start,end:value.span.end}};
  }
  method(object,name,args,span) {
    if(!METHODS.has(name.value))return super.method(object,name,args,span);
    if(args.length!==METHODS.get(name.value))throw typeError(`${name.value} expects ${METHODS.get(name.value)} arguments`,span);
    const tupleType=SPLITS.has(name.value)?this.tupleType([0,1].map(index=>({name:`field${index}`,type:STRING,rustTypeSyntax:['&','str']})),span):null;
    return {k:'routerTextPattern',op:name.value,object,args,...(tupleType?{tupleType}:{}),span};
  }
}
export class TextChecker extends FormatChecker {
  defaultNumber() {const type=super.defaultNumber();return this.language==='Rust'?{...type,rustPrimitiveName:'i32'}:type;}
  expr(node,env,path,expected,allowLiteral=false) {
    if(node.k==='routerTextReference'){if(expected?.kind==='fixed'&&!expected.patternOwnershipRefusal)throw unsupported('primitive reference coercion','a shared reference is not a by-value integer',node.span);const value=this.expr(node.value,env,path,expected,allowLiteral);return {...node,value,type:{...value.type,patternOwnershipRefusal:'explicit shared reference expression'}};}
    if(node.k==='cast'&&node.to?.rustPrimitiveName){const value=super.expr(node,env,path,expected,allowLiteral);if(value.type.patternOwnershipRefusal)throw unsupported('primitive cast reference','the source value is a reference, not a primitive integer',node.span);return {...value,type:{...value.type,rustPrimitiveName:node.to.rustPrimitiveName}};}
    if(node.k!=='routerTextPattern'){
      const value=super.expr(node,env,path,expected,allowLiteral);
      if(expected?.kind==='fixed'&&expected.rustPrimitiveName&&value.type.kind==='fixed'&&value.type.rustPrimitiveName&&expected.rustPrimitiveName!==value.type.rustPrimitiveName)throw typeError('distinct Rust primitive integer identities require an explicit checked cast',node.span);
      return value;
    }
    env=this.contextEnvironment(node,env,expected);
    const bindings=[];
    const bind=(surface,wanted,stringView=false,characterPattern=false)=>{
      if(exits(surface))throw unsupported('string method control','nonlocal exits require statement lowering',surface.span);
      const checked=characterPattern&&surface.k==='routerPatternChar'?{k:'lit',value:surface.value,type:STRING,sourceRustChar:{raw:surface.raw,span:surface.span},span:surface.span}:this.expr(surface,env,path,wanted);
      const value=coerce(checked,wanted,this.language,node.span);
      if(value.type.kind!==wanted.kind)throw typeError(`${node.op} requires checked string values and a usize replacement count`,node.span);
      if(wanted===USIZE&&(value.type.rustPrimitiveName!=='usize'||value.type.patternOwnershipRefusal))throw unsupported('replacement count Rust type','requires actual by-value usize provenance; equal portable widths and erased references are insufficient',surface.span);
      if(stringView&&value.type.patternOwnershipRefusal)throw unsupported('string Pattern ownership','requires an actual borrowed scalar string; owned arguments and erased non-string references need separate trait/borrow checking',surface.span);
      let name;do{name=this.freshName('ml_text_');}while(env.has(name));bindings.push({name,value});
      return {k:'var',name,type:value.type,span:surface.span};
    };
    const value=bind(node.object,STRING),args=node.args.map((arg,index)=>bind(arg,index===2?USIZE:STRING,index<2,index===0));
    const owning=node.op==='replace'||node.op==='replacen';let type=owning?{...STRING,patternOwnershipRefusal:'owned String replacement'}:BOOL,tupleType;
    if([...SPLITS,...STRIPS,...TRIMS].includes(node.op)&&value.type.patternOwnershipRefusal)throw unsupported('string borrowed receiver','requires actual borrowed str provenance; owned temporaries and erased references need checked lifetimes',node.span);
    if(SPLITS.has(node.op)) {
      tupleType=this.resolveType(node.tupleType,path,node.span);const entry=this.items.get(tupleType.name);
      if(!entry?.tuple||entry.generated!=='router-tuple-type'||entry.ctors.length!==1||entry.ctors[0].name!=='Tuple'||entry.ctors[0].fields.length!==2||entry.ctors[0].fields.some(field=>!sameType(field.type,STRING)||field.type.patternOwnershipRefusal||field.rustTypeSyntax?.[0]!=='&'||field.rustTypeSyntax?.at(-1)!=='str'))throw unsupported('split borrowed product','requires the actual two-borrowed-str tuple layout; equal portable scalar encodings do not prove ownership',node.span);
      if(!this.instantiations?.option)throw unsupported('split standard Option','requires checked standard-library result instantiation',node.span);
      type=this.instantiations.option(tupleType,node.span);
      if(expected&&!sameType(expected,type))throw typeError('split result differs from the actual expected standard Option layout',node.span);
    }
    if(STRIPS.has(node.op)) {
      if(!this.instantiations?.option)throw unsupported('strip standard Option','requires checked standard-library result instantiation',node.span);
      type=this.instantiations.option(STRING,node.span);
      if(expected&&!sameType(expected,type))throw typeError('strip result differs from the actual expected standard Option layout',node.span);
    }
    if(TRIMS.has(node.op)) {
      if(node.op==='trim_matches'&&node.args[0].k!=='routerPatternChar')throw unsupported('double-ended trim Pattern','the checked profile requires an actual scalar char literal; str searchers do not implement the required DoubleEndedSearcher',node.span);
      type=STRING;
    }
    const operation={k:node.k,op:node.op,value,args,type,...(tupleType?{tupleType}:{}),constEligible:false,patternKind:node.args[0].k==='routerPatternChar'?'char':'borrowed-str',sourceProfile:'checked-str-pattern-v1',span:node.span};
    return bindings.reduceRight((body,binding)=>({k:'let',...binding,body,mutable:false,type,span:node.span}),operation);
  }
}
export class TextEmitter extends FormatEmitter {
  expr(node) {
    if(node.k==='routerTextReference')return this.expr(node.value);
    if(node.k!=='routerTextPattern')return super.expr(node);
    const value=this.expr(node.value),[pattern,replacement,count]=node.args.map(arg=>this.expr(arg));
    if(['starts_with','ends_with','contains'].includes(node.op))return `${value}.${{starts_with:'startsWith',ends_with:'endsWith',contains:'includes'}[node.op]}(${pattern})`;
    if(SPLITS.has(node.op)) {
      const option=this.program.declarations.get(node.type.name),tuple=this.program.declarations.get(node.tupleType.name);
      const product=this.ctorObject(tuple,tuple.ctors[0],[`${value}.slice(0,index)`,`${value}.slice(index+${pattern}.length)`]);
      const some=this.ctorObject(option,option.ctors.find(ctor=>ctor.name==='Some'),[product]),none=this.ctorObject(option,option.ctors.find(ctor=>ctor.name==='None'),[]);
      return `(()=>{const index=${value}.${node.op==='split_once'?'indexOf':'lastIndexOf'}(${pattern});return index<0?${none}:${some};})()`;
    }
    if(STRIPS.has(node.op)) {
      const option=this.program.declarations.get(node.type.name),suffix=node.op==='strip_suffix';
      const some=this.ctorObject(option,option.ctors.find(ctor=>ctor.name==='Some'),[suffix?`${value}.slice(0,${value}.length-${pattern}.length)`:`${value}.slice(${pattern}.length)`]);
      const none=this.ctorObject(option,option.ctors.find(ctor=>ctor.name==='None'),[]);
      return `(${value}.${suffix?'endsWith':'startsWith'}(${pattern})?${some}:${none})`;
    }
    if(TRIMS.has(node.op)) {
      const start=node.op!=='trim_end_matches'?`while(text.startsWith(${pattern}))text=text.slice(${pattern}.length);`:'';
      const end=node.op!=='trim_start_matches'?`while(text.endsWith(${pattern}))text=text.slice(0,text.length-${pattern}.length);`:'';
      return `(()=>{let text=${value};if(${pattern}.length===0)return text;${start}${end}return text;})()`;
    }
    // Empty patterns match each UTF-8 character boundary, including both ends.
    // Array.from visits Unicode scalars, unlike String.split("") or replaceAll.
    if(node.op==='replace')return `(${pattern}.length===0?(${value}.length===0?${replacement}:${replacement}+Array.from(${value}).join(${replacement})+${replacement}):${value}.split(${pattern}).join(${replacement}))`;
    if(node.op==='replacen')return `(${pattern}.length===0?[...Array.from(${value}),""].map((part,index)=>(BigInt(index)<${count}?${replacement}:"")+part).join(""):${value}.split(${pattern}).map((part,index)=>(index===0?"":BigInt(index)<=${count}?${replacement}:${pattern})+part).join(""))`;
    throw new Error(`unhandled checked string pattern method ${node.op}`);
  }
}
