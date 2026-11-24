// Canonical Rust observations and JS proposals are DATA only. Every consumer
// must freshly check the JS source and reproduce the complete original Rust.
import {primitiveBitwiseType,primitiveBitwiseLiteral} from '../primitive-bitwise-types.mjs';
export function ownedRustPrimitiveType(text){
 if(typeof text!=='string')return null;return primitiveBitwiseType(text.replace(/^::core::primitive::/u,''));
}
export function ownedRustPrimitiveLiteral(text,negative){
 if(typeof text!=='string'||text.length>48)return null;const match=/^(0|[1-9][0-9]*)_([iu](?:8|16|32|64|128))$/u.exec(text);if(!match)return null;const value=primitiveBitwiseLiteral(match[1]+'n',negative,match[2]);return value===null?null:{kind:'integer',value,type:match[2]};
}
export function ownedRustPrimitiveObservationType(node){
 let cells=0;
 function visit(node,depth){
  if(++cells>100000||depth>160)throw new TypeError('Canonical primitive observation budget exceeded');if(!node)return null;
  if(node.kind==='temporary')return visit(node.value,depth+1);
  if(node.kind==='block')return node.statements.length?null:visit(node.tail,depth+1);
  if(node.kind==='name'||node.kind==='integer')return node.type==='bool'?'bool':primitiveBitwiseType(node.type)?.name??null;
  if(node.kind==='boolean')return 'bool';
  if(node.kind==='primitive-cast')return ownedRustPrimitiveType(node.target)?.name??null;
  if(node.kind==='not')return visit(node.value,depth+1)==='bool'?'bool':null;
  if(node.kind==='binary'){
   const left=visit(node.left,depth+1),right=visit(node.right,depth+1);if(!left||!right)return null;
   if(['&','|','^'].includes(node.op))return left===right?left:null;
   if(['<<','>>'].includes(node.op))return primitiveBitwiseType(left)&&primitiveBitwiseType(right)?left:null;
   if(['==','!=','<','<=','>','>='].includes(node.op))return left===right?'bool':null;
  }
  return null;
 }
 return visit(node,0);
}
export function projectOwnedRustPrimitiveObservation(node,{enabled,imported,expression}){
 if(!enabled)return null;const type=ownedRustPrimitiveObservationType(node),row=primitiveBitwiseType(type),call=(name,args)=>imported(name,'primitive-operator')+'('+args.join(', ')+')';
 if(node.kind==='block'&&!node.statements.length&&node.tail?.kind==='temporary'&&row)return call('integerCast',[expression(node.tail),row.bits,row.signed,row.bits,row.signed]);
 if(node.kind==='primitive-cast'){
  const input=primitiveBitwiseType(ownedRustPrimitiveObservationType(node.value));if(!input||!row)throw new TypeError('Canonical cast needs actual native scalar observations');return call('integerCast',[expression(node.value),input.bits,input.signed,row.bits,row.signed]);
 }
 if(node.kind==='binary'&&['&','|','^','<<','>>'].includes(node.op)){
  if(['&','|','^'].includes(node.op)){if(type!=='bool'&&!row)throw new TypeError('Canonical bitwise operands differ');return call('primitiveBitwise',[expression(node.left),expression(node.right),JSON.stringify(node.op),row?.bits??'null',row?.signed??'null']);}
  const count=primitiveBitwiseType(ownedRustPrimitiveObservationType(node.right));if(!row||!count)throw new TypeError('Canonical shift needs both exact native scalar domains');return call('integerShift',[expression(node.left),expression(node.right),row.bits,row.signed,count.bits,count.signed,JSON.stringify(node.op)]);
 }
 return null;
}
