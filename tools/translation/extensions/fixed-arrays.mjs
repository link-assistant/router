// Sized source arrays are Copy values, distinct from Vec and borrowed slices.
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {fixedArrayLength,FIXED_ARRAY_MAX_LENGTH,typeKey} from '../checked-types.mjs';
import {decodeRustInteger} from './rust-number.mjs';

export const FIXED_ARRAY_PROFILE=Object.freeze({version:1,rust:'1.89.0',maxLength:FIXED_ARRAY_MAX_LENGTH,maxCells:16000,
  source:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/array/mod.rs',
  sha256:'b5239b8af6bb1eb99b589518161f7fcf017dc80c275620517d145974cf7029a1',copyLine:435});
const owner=Object.freeze({kind:'value',source:'array'});
const reject=(message,span)=>{throw unsupported('fixed source array',message,span);};
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
      const token=c.next();
      if(token.kind!=='number')reject('length requires a literal usize, not a const expression',token);
      const integer=decodeRustInteger(token.raw??token.value,token);
      if(integer.suffix&&integer.suffix!=='usize')throw typeError('fixed-array length requires usize identity',token);
      const length=BigInt(integer.value);
      if(length>BigInt(FIXED_ARRAY_MAX_LENGTH))reject('length exceeds the checked array bound',token);
      c.expect(']','fixed-array type');
      return {kind:'array',element,rustFixedArray:{length:Number(length)},rustOwnership:owner,rustSourceType:true,span:{start:first.start,end:c.peek().start}};
    }
    primary(path,options) {
      const fixedLiteral=this.cursor.is('['),value=super.primary(path,options);
      return fixedLiteral?{...value,sourceFixedArrayLiteral:true}:value;
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
