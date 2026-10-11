// A pinned standard trait profile, not a coercion between owned and borrowed
// strings. The checked operands and their source ownership remain intact.
import {BOOL,STRING} from '../checked-types.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';

export const STANDARD_STRING_EQUALITY_PROFILE=Object.freeze({
  id:'rust-1.89-standard-string-partial-eq',rust:'1.89.0',
  sources:Object.freeze([
    Object.freeze({url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/alloc/src/string.rs',sha256:'46dadb69bbe909b50146366020dc23d4fa88f53b93435b7e0f70c6692d0ba629',lines:Object.freeze([357,2574,2605])}),
    Object.freeze({url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/cmp.rs',sha256:'4d99f17bff4740a566d839f9ec990ebb5f593cbfe369334fac5f08463203e1c4',lines:Object.freeze([2021,2033])}),
  ]),
});
const owned=type=>type?.kind==='string'&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String'&&!type.rustReference&&(!type.patternOwnershipRefusal||type.patternOwnershipRefusal==='ownership-bearing String type')&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;
const fail=span=>{throw unsupported('standard string equality','requires an actual registered String/str PartialEq pair and checked source reference or field-place evidence',span);};
const sourceRange=span=>Number.isInteger(span?.start)&&Number.isInteger(span?.end)&&span.start>=0&&span.end>=span.start;

export function standardStringEqualityOperand(value,{declarations}={}) {
  const type=value?.type,span=value?.span;
  const scopedStringBorrow=type?.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&type.rustBorrowingUnresolved==='borrow of owned String'&&type.rustBorrowLifetime?.source==='String::as_str'&&!type.rustReference&&!type.patternOwnershipRefusal;
  if(type?.kind!=='string'||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved&&!scopedStringBorrow)return fail(span);
  // PartialEq consumes these checked operands only to produce bool. Keep the
  // unresolved borrow marker intact so argument/return escape checks still run.
  if(owned(type))return 'String';
  const reference=type.rustReference;
  if(reference) {
    if(reference.kind!=='shared'||!owned(reference.pointee))return fail(span);
    if(type.patternOwnershipRefusal==='shared field place'||reference.source==='shared-field-projection') {
      // A non-Copy shared field is an operator place, not a moved String.
      // Match the actual checked nominal declaration and original projection.
      const proof=value.sharedProjectionProof,receiver=value.object?.type,nominal=receiver?.rustReference?.pointee;
      const entry=nominal?.kind==='data'?declarations?.get(nominal.name):null;
      const field=entry?.record&&entry.ctors.length===1?entry.ctors[0].fields.find(field=>field.name===value.field):null;
      if(value.k!=='routerField'||proof?.kind!=='borrowed-field-place'||proof.field!==value.field||proof.pointee?.kind!=='data'||proof.pointee.name!==nominal?.name||receiver?.kind!=='data'||receiver.name!==nominal?.name||receiver.rustReference?.kind!=='shared'||nominal.rustReference||reference.source!=='shared-field-projection'||!owned(field?.type)||field.rustTypeSyntax?.join('')!=='String'||!sourceRange(receiver.rustReference.span)||reference.sourceReceiverSpan?.start!==receiver.rustReference.span.start||reference.sourceReceiverSpan?.end!==receiver.rustReference.span.end)return fail(span);
      return 'String';
    }
    if(type.patternOwnershipRefusal&&type.patternOwnershipRefusal!=='shared source reference'||!sourceRange(reference.span)||reference.tokens?.[0]?.value!=='&')return fail(span);
    return '&String';
  }
  if(type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&!type.patternOwnershipRefusal)return '&str';
  return fail(span);
}

const PAIRS=new Set(['String:String','String:&str','&str:String','&str:&str','&String:&String','&String:&str','&str:&String']);
export function planStandardStringEquality(left,right,context) {
  const lhs=standardStringEqualityOperand(left,context),rhs=standardStringEqualityOperand(right,context);
  if(!PAIRS.has(`${lhs}:${rhs}`))return fail(left.span??right.span);
  return {profile:STANDARD_STRING_EQUALITY_PROFILE.id,left:lhs,right:rhs};
}

export function withStandardStringEqualityChecker(Base) {
  return class StandardStringEqualityChecker extends Base {
    binary(node,env,path,expected,allowLiteral) {
      if(this.language!=='Rust'||!['eq','ne'].includes(node.op))return super.binary(node,env,path,expected,allowLiteral);
      const left=this.expr(node.left,env,path,undefined,true),right=this.expr(node.right,env,path,undefined,true);
      // The independent portable core has no Rust ownership qualifiers. Its
      // existing string comparisons stay there; qualified Rust strings require
      // the exact trait profile above, never erased-type unification.
      if(![left,right].some(value=>value.type.kind==='string'&&(value.type.rustOwnership||value.type.rustReference)))return super.binary(node,env,path,expected,allowLiteral);
      const proof=planStandardStringEquality(left,right,{declarations:this.items});
      return {k:'binary',op:node.op,left,right,type:BOOL,domain:STRING,span:node.span,standardStringEquality:proof};
    }
  };
}
