// Sized source arrays are Copy values, distinct from Vec and borrowed slices.
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {fixedArrayLength,FIXED_ARRAY_MAX_LENGTH,typeKey} from '../checked-types.mjs';
import {decodeRustInteger} from './rust-number.mjs';
import {coerce} from '../checked-coercions.mjs';

export const FIXED_ARRAY_PROFILE=Object.freeze({version:1,rust:'1.89.0',maxLength:FIXED_ARRAY_MAX_LENGTH,maxCells:16000,
  source:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/array/mod.rs',
  sha256:'b5239b8af6bb1eb99b589518161f7fcf017dc80c275620517d145974cf7029a1',copyLine:435});
const owner=Object.freeze({kind:'value',source:'array'});
const reject=(message,span)=>{throw unsupported('fixed source array',message,span);};
const nonlocal=node=>node&&typeof node==='object'&&(['routerReturn','routerBreak','routerContinue','routerTry','routerAwait'].includes(node.k)||Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(nonlocal):nonlocal(value))));
const literalLength=token=>{
  if(token.kind!=='number')reject('length requires a literal usize, not a const expression',token);
  const integer=decodeRustInteger(token.raw??token.value,token);
  if(integer.suffix&&integer.suffix!=='usize')throw typeError('fixed-array length requires usize identity',token);
  const length=BigInt(integer.value);
  if(length>BigInt(FIXED_ARRAY_MAX_LENGTH))reject('length exceeds the checked array bound',token);
  return Number(length);
};
export function fixedArrayCopyCells(type,span,depth=0) {
  if(depth>32||!type||type.rustGenericIdentityUnresolved)reject('requires a bounded resolved Copy element type',span);
  if(type.rustReference)reject('shared aggregate references require a separate Copy and lifetime profile',span);
  if(type.kind==='array') {
    const length=fixedArrayLength(type);
    if(length===null||type.rustOwnership?.kind!=='value'||type.rustOwnership.source!=='array')reject('requires actual sized value storage, not Vec or slice ownership',span);
    const cells=1+length*fixedArrayCopyCells(type.element,span,depth+1);
    if(cells>FIXED_ARRAY_PROFILE.maxCells)reject('exceeds the fixed-array cell budget',span);
    return cells;
  }
  if(['bool','unit','float'].includes(type.kind))return 1;
  if(type.kind==='fixed'&&[8,16,32,64,128].includes(type.bits)&&typeof type.signed==='boolean')return 1;
  if(type.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return 1;
  reject('element has no checked scalar or borrowed-str Copy profile',span);
}
export function withFixedArrayParser(Base) {
  return class extends Base {
    type() {
      const c=this.cursor,first=c.peek();
      if(!c.eat('['))return super.type();
      const element=this.type();
      if(!c.eat(';')) {c.expect(']','shared slice type');return {kind:'array',element};}
      const length=literalLength(c.next());
      c.expect(']','fixed-array type');
      return {kind:'array',element,rustFixedArray:{length},rustOwnership:owner,rustSourceType:true,span:{start:first.start,end:c.peek().start}};
    }
    primary(path,options) {
      const c=this.cursor,first=c.peek();
      if(!c.eat('['))return super.primary(path,options);
      const items=[];
      while(!c.is(']')) {
        const value=this.expr(path);items.push({value,spread:false});
        if(c.eat(';')) {
          if(items.length!==1)reject('repetition requires one original operand',first);
          const token=c.next(),length=literalLength(token),last=c.expect(']','fixed-array repetition');
          return {k:'routerFixedArrayRepeat',value,length,sourceLength:{kind:token.kind,value:token.value,raw:token.raw??token.value,span:{start:token.start,end:token.end}},span:{start:first.start,end:last.end}};
        }
        if(!c.eat(','))break;
      }
      const last=c.expect(']','fixed-array literal');
      return {k:'array',items,sourceFixedArrayLiteral:true,span:{start:first.start,end:last.end}};
    }
  };
}
export function withFixedArrayChecker(Base) {
  return class extends Base {
    program(surface) {
      const program=super.program(surface);
      const visit=(type,span)=>{
        if(type?.kind!=='array')return;
        if(type.rustFixedArray)fixedArrayCopyCells(type,span);
        else visit(type.element,span);
      };
      for(const entry of program.declarations.values()) {
        if(entry.k==='fn') {for(const param of entry.params)visit(param.type,param.span??entry.span);visit(entry.ret,entry.span);}
        else if(entry.k==='data')for(const ctor of entry.ctors)for(const field of ctor.fields)visit(field.type,field.span??entry.span);
      }
      return program;
    }
    resolveType(type,path,span) {
      const value=super.resolveType(type,path,span);
      return type?.rustFixedArray?{...value,rustFixedArray:{length:fixedArrayLength(type)}}:value;
    }
    expr(node,env,path,expected,allowLiteral=false) {
      if(node.k!=='routerFixedArrayRepeat')return super.expr(node,env,path,expected,allowLiteral);
      if(!node.sourceLength||literalLength({...node.sourceLength,start:node.sourceLength.span?.start,end:node.sourceLength.span?.end})!==node.length)reject('repeat length differs from its original checked integer syntax',node.span);
      if(nonlocal(node.value))reject('repeat operand control requires a separate checked value join',node.span);
      if(expected?.kind==='array'&&expected.rustOwnership&&expected.rustOwnership.source!=='array')throw typeError('source array repetition cannot fabricate Vec or slice conversion',node.span);
      const wanted=expected?.kind==='array'?fixedArrayLength(expected):null;
      if(wanted!==null&&wanted!==node.length)throw typeError('source array repetition length differs from the expected fixed array',node.span);
      // Const-item and const-block operands have a different zero-length rule.
      // Keep them outside this exactly-once non-const expression profile.
      if(node.value.k==='name'&&!env.has(node.value.path[0])&&this.lookup(node.value.path,path,node.value.span)?.constant)reject('constant-item repeat operands require their separate evaluation-count profile',node.span);
      let value=this.expr(node.value,env,path,expected?.kind==='array'?expected.element:undefined);
      if(value.type.kind==='literal')value=coerce(value,this.defaultNumber(),this.language,node.span);
      const type={kind:'array',element:value.type,rustFixedArray:{length:node.length},rustOwnership:owner,rustSourceType:true};
      fixedArrayCopyCells(type,node.span);
      if(wanted!==null&&typeKey(type)!==typeKey(expected))throw typeError('fixed-array repeat element type differs from the expected source type',node.span);
      let name;do{name=this.freshName('ml_fixed_array_repeat_');}while(env.has(name));
      const variable={k:'var',name,type:value.type,span:node.value.span};
      const body={k:'array',items:Array.from({length:node.length},()=>({...variable})),type,span:node.span,fixedArrayProof:{profile:FIXED_ARRAY_PROFILE,verified:true,length:node.length,syntax:'repeat',evaluation:'non-const-operand-once-including-zero',sourceLength:node.sourceLength,repeatSeed:variable}};
      return {k:'let',name,value,body,type,mutable:false,span:node.span};
    }
    arrayLiteral(node,env,path,expected) {
      if(!node.sourceFixedArrayLiteral||expected?.rustArrayBorrowStorage)return super.arrayLiteral(node,env,path,expected);
      if(node.sourceRustOwnership||node.items.some(item=>item.spread))reject('literal must retain original comma-separated array syntax',node.span);
      if(expected?.kind==='array'&&expected.rustOwnership&&expected.rustOwnership.source!=='array')throw typeError('source array literal cannot fabricate Vec or slice conversion',node.span);
      const length=node.items.length;
      if(length>FIXED_ARRAY_MAX_LENGTH)reject('literal exceeds the checked array bound',node.span);
      const wanted=expected?.kind==='array'?fixedArrayLength(expected):null;
      if(wanted!==null&&wanted!==length)throw typeError('source array literal length differs from the expected fixed array',node.span);
      // The portable literal builder checks every element. Its internal hint
      // intentionally has no sized refinement; the complete result gets it.
      const hint=expected?.kind==='array'?{kind:'array',element:expected.element}:expected;
      const value=super.arrayLiteral(node,env,path,hint);
      if(value.k!=='array')reject('requires a single checked array literal',node.span);
      const type={...value.type,rustFixedArray:{length},rustOwnership:owner,rustSourceType:true};
      fixedArrayCopyCells(type,node.span);
      if(wanted!==null&&typeKey(type)!==typeKey(expected))throw typeError('fixed-array element type differs from the expected source type',node.span);
      return {...value,type,span:node.span,fixedArrayProof:{profile:FIXED_ARRAY_PROFILE,verified:true,length}};
    }
  };
}
