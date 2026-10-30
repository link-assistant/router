// Closed scalar-flow DATA only. These predicates consume independently checked
// source domains; no alias spelling, row or result issues compiler authority.
import {primitiveBitwiseType,primitiveBitwiseLiteral} from '../primitive-bitwise-types.mjs';
export const ownedNativeIntegerDomain=(type,enabled)=>enabled===true&&primitiveBitwiseType(type)!==null;
export const ownedNativeCopyScalarDomain=(type,enabled)=>enabled===true&&(type==='bool'||primitiveBitwiseType(type)!==null);
export function joinOwnedNativeScalarOperands(left,right,enabled){
 if(enabled!==true)return;
 for(const [literal,other]of [[left,right],[right,left]]){
  const domain=primitiveBitwiseType(other.type);if(!domain||literal.kind!=='integer'||typeof literal.value!=='string'||literal.root!==null||literal.type!=='usize'&&!(literal.type==='i64'&&literal.value.startsWith('-')))continue;
  const negative=literal.value.startsWith('-'),digits=negative?literal.value.slice(1):literal.value;if(primitiveBitwiseLiteral(digits+'n',negative,domain.name)!==null)literal.type=domain.name;
 }
}

// Additive literal-choice joins; the original binary operand API stays unchanged.
export function joinOwnedNativeScalarChoiceOperands(left,right,enabled){
 if(enabled!==true)return 0;let work=0;
 function literalTree(value,depth=0){if(++work>100000||depth>160)throw new TypeError('Primitive choice domain: bounded actual literal choices required');if(!value||value.root!==null)return false;if(value.kind==='choose')return value.type==='usize'||value.type==='i64'?value.cond?.type==='bool'&&literalTree(value.then,depth+1)&&literalTree(value.else,depth+1):false;return value.kind==='integer'&&typeof value.value==='string'&&(value.type==='usize'||value.type==='i64'&&value.value.startsWith('-'));}

 for(const [literal,other]of [[left,right],[right,left]]){
  const domain=primitiveBitwiseType(other.type);if(!domain||!literalTree(literal))continue;narrowOwnedNumericLiteral(literal,domain.name);
 }
 return work;
}

import {narrowOwnedNumericLiteral} from './owned-numeric-literals.mjs';
