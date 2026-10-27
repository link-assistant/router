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
