// The checked &str Pattern profile accepts string values, never JS regexes.
// https://doc.rust-lang.org/std/primitive.str.html#method.contains
// https://doc.rust-lang.org/std/primitive.str.html#method.replacen
import {FormatRustParser,FormatChecker,FormatEmitter} from './formatting.mjs';
import {BOOL,STRING,fixed,rustFixedType} from '../vendor/meta-language/translation/types.js';
import {coerce} from '../vendor/meta-language/translation/check.js';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const METHODS=new Map([['starts_with',1],['ends_with',1],['contains',1],['replace',2],['replacen',3]]);
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
    return {k:'routerTextPattern',op:name.value,object,args,span};
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
    const owning=node.op==='replace'||node.op==='replacen',type=owning?{...STRING,patternOwnershipRefusal:'owned String replacement'}:BOOL;
    const operation={k:node.k,op:node.op,value,args,type,constEligible:false,patternKind:node.args[0].k==='routerPatternChar'?'char':'borrowed-str',sourceProfile:'checked-str-pattern-v1',span:node.span};
    return bindings.reduceRight((body,binding)=>({k:'let',...binding,body,mutable:false,type,span:node.span}),operation);
  }
}
export class TextEmitter extends FormatEmitter {
  expr(node) {
    if(node.k==='routerTextReference')return this.expr(node.value);
    if(node.k!=='routerTextPattern')return super.expr(node);
    const value=this.expr(node.value),[pattern,replacement,count]=node.args.map(arg=>this.expr(arg));
    if(['starts_with','ends_with','contains'].includes(node.op))return `${value}.${{starts_with:'startsWith',ends_with:'endsWith',contains:'includes'}[node.op]}(${pattern})`;
    // Empty patterns match each UTF-8 character boundary, including both ends.
    // Array.from visits Unicode scalars, unlike String.split("") or replaceAll.
    if(node.op==='replace')return `(${pattern}.length===0?(${value}.length===0?${replacement}:${replacement}+Array.from(${value}).join(${replacement})+${replacement}):${value}.split(${pattern}).join(${replacement}))`;
    if(node.op==='replacen')return `(${pattern}.length===0?[...Array.from(${value}),""].map((part,index)=>(BigInt(index)<${count}?${replacement}:"")+part).join(""):${value}.split(${pattern}).map((part,index)=>(index===0?"":BigInt(index)<=${count}?${replacement}:${pattern})+part).join(""))`;
    throw new Error(`unhandled checked string pattern method ${node.op}`);
  }
}
