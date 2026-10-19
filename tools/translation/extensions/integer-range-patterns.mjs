// Rust integer patterns over actual primitive domains. Coverage uses intervals,
// never enumeration; guards provide no coverage even when statically true.
import {fixedBounds,rustFixedType} from '../checked-types.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
export const INTEGER_RANGE_PROFILE=Object.freeze({id:'rust-1.89-primitive-integer-range-pattern',rust:'1.89.0',reference:'https://doc.rust-lang.org/reference/patterns.html#range-patterns',intervalLimit:256,endpointProfile:'two-written-integer-literals',coverage:'unguarded-interval-union'});
function domain(type,span) {
  const actual=rustFixedType(type?.rustPrimitiveName);
  if(type?.kind!=='fixed'||!actual||actual.bits!==type.bits||actual.signed!==type.signed||type.rustReference||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustOwnership?.kind==='owned')throw unsupported('integer range domain','requires an actual by-value Rust fixed integer primitive',span);
  return fixedBounds(type);
}
function endpoint(node,type,bounds) {
  if(node?.k!=='numLit'||typeof node.value!=='string'||!/^\d+$/u.test(node.value)||node.negative!==undefined&&typeof node.negative!=='boolean')throw unsupported('integer range endpoint','requires an original integer literal, not a constant, character or expression',node?.span);
  if(node.value.length>40)throw unsupported('integer range endpoint','exceeds the bounded fixed integer spelling',node.span);
  if(node.suffix&&node.suffix!==type.rustPrimitiveName)throw typeError('integer range suffix differs from the actual Rust primitive',node.span);
  if(node.negative&&!type.signed)throw typeError('unsigned integer range endpoint cannot use source negation',node.span);
  const value=BigInt(node.value)*(node.negative?-1n:1n);
  if(value<bounds.min||value>bounds.max)throw typeError('integer range endpoint is outside the actual Rust primitive domain',node.span);
  return value;
}
export function checkedIntegerRange(pattern,type) {
  const bounds=domain(type,pattern?.span);
  if(pattern?.k!=='routerIntegerRangePattern'||typeof pattern.inclusive!=='boolean')throw typeError('integer range lacks checked source endpoint syntax',pattern?.span);
  const lower=endpoint(pattern.lower,type,bounds),sourceUpper=endpoint(pattern.upper,type,bounds),upper=sourceUpper-(pattern.inclusive?0n:1n);
  if(lower>upper)throw typeError('integer range pattern is empty or reversed',pattern.span);
  return {lower:lower.toString(),upper:upper.toString(),sourceUpper:sourceUpper.toString(),inclusive:pattern.inclusive,coversDomain:lower===bounds.min&&upper===bounds.max,profile:INTEGER_RANGE_PROFILE.id};
}
export function containsIntegerRange(pattern) {
  return pattern?.k==='routerIntegerRangePattern'||(pattern?.alternatives??pattern?.args??pattern?.items??[]).some(containsIntegerRange)||(pattern?.fields??[]).some(field=>containsIntegerRange(field.pattern));
}
export function proveIntegerCoverage(patterns,type,span) {
  const bounds=domain(type,span),intervals=[];
  const append=(pattern,depth=0)=>{
    if(depth>128||intervals.length>=INTEGER_RANGE_PROFILE.intervalLimit)throw unsupported('integer match coverage','exceeds the bounded interval proof',pattern?.span??span);
    if(['wild','bind'].includes(pattern.k)){intervals.push([bounds.min,bounds.max]);return;}
    if(pattern.k==='or'){for(const alternative of pattern.alternatives)append(alternative,depth+1);return;}
    if(pattern.k==='numLit'){const value=endpoint(pattern,type,bounds);intervals.push([value,value]);return;}
    if(pattern.k==='routerIntegerRangePattern'){const range=checkedIntegerRange(pattern,type);intervals.push([BigInt(range.lower),BigInt(range.upper)]);return;}
    throw unsupported('integer match coverage','requires checked primitive literal, range, binder or wildcard patterns',pattern.span);
  };
  for(const pattern of patterns)append(pattern);
  intervals.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  let next=bounds.min;
  for(const [lower,upper]of intervals){if(lower>next)throw typeError(`nonexhaustive integer match: uncovered value ${next}`,span);if(upper>=next)next=upper+1n;}
  if(next<=bounds.max)throw typeError(`nonexhaustive integer match: uncovered value ${next}`,span);
  return {profile:INTEGER_RANGE_PROFILE.id,primitive:type.rustPrimitiveName,domain:{min:bounds.min.toString(),max:bounds.max.toString()},intervals:intervals.map(([lower,upper])=>({lower:lower.toString(),upper:upper.toString()})),exhaustiveness:INTEGER_RANGE_PROFILE.coverage};
}
