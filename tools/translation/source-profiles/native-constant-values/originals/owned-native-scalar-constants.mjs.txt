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
  if(node.kind==='not'){const type=visit(node.value,depth+1);return type==='bool'||primitiveBitwiseType(type)?type:null;}
  if(node.kind==='call'||node.kind==='method')return (readOwnedRustNativeIntegerArithmetic(node,(value,level)=>visit(value,level),depth)??readOwnedRustNativeIntegerMethod(node,(value,level)=>visit(value,level),depth))?.domain.name??null;
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
 const arithmetic=readOwnedRustNativeIntegerArithmetic(node,value=>ownedRustPrimitiveObservationType(value),0);if(arithmetic)return call('integerArithmetic',arithmetic.args.map(expression).concat([...(arithmetic.operation.arity===1?['null']:[]),arithmetic.domain.bits,arithmetic.domain.signed,JSON.stringify(arithmetic.operation.name)]));
 const nativeMethod=readOwnedRustNativeIntegerMethod(node,value=>ownedRustPrimitiveObservationType(value),0);if(nativeMethod){const args=nativeMethod.args.map(expression);if(nativeMethod.method.arity===2)args.push('null');return call('primitiveIntegerMethod',args.concat([nativeMethod.domain.bits,nativeMethod.domain.signed,JSON.stringify(nativeMethod.method.name)]));}
 if(node.kind==='not'&&row)return call('primitiveNot',[expression(node.value),row.bits,row.signed]);
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

// Fully qualified primitive/Ord calls or same-domain native method observations.
function readOwnedRustNativeIntegerMethod(node,observe,depth){
 let name,args,expected=null;if(node.kind==='method'){name=node.name;args=[node.value,...node.args];}else if(node.kind==='call'){const primitive=/^::core::primitive::([iu](?:8|16|32|64|128))::([a-z_]+)$/u.exec(node.path),ordered=/^::core::cmp::Ord::(min|max|clamp)$/u.exec(node.path);if(primitive){expected=primitive[1];name=primitive[2];}else if(ordered)name=ordered[1];else return null;args=node.args;}else return null;const method=nativeIntegerMethod(name);if(!method||args.length!==method.arity)return null;const domain=primitiveBitwiseType(observe(args[0],depth+1));if(!domain||expected&&expected!==domain.name||args.slice(1).some(value=>observe(value,depth+1)!==domain.name))return null;return {method,domain,args};
}
import {nativeIntegerMethod} from '../native-integer-methods.mjs';

// Select the exact eager checked primitive call and canonical panic adapter.
function readOwnedRustNativeIntegerArithmetic(node,observe,depth){
 if(node.kind!=='call'||node.path!=='::core::option::Option::expect'||node.args.length!==2||node.args[1].kind!=='string')return null;const checked=node.args[0];if(checked.kind!=='call')return null;const path=/^::core::primitive::([iu](?:8|16|32|64|128))::checked_(add|sub|mul|div|rem|neg)$/u.exec(checked.path);if(!path)return null;const domain=primitiveBitwiseType(path[1]),operation=nativeIntegerArithmetic(path[2]);if(!domain||!operation||operation.signedOnly&&domain.signed!==true||checked.args.length!==operation.arity||node.args[1].value!==overflowMessage(operation.name)||checked.args.some(value=>observe(value,depth+1)!==domain.name))return null;return {domain,operation,args:checked.args};
}
import {nativeIntegerArithmetic} from '../native-integer-arithmetic.mjs';
import {overflowMessage} from '../vendor/meta-language/translation/aborts.js';

// DATA expansion from this invocation's genuine checked native dependency map.
// No supplied proof, table, source hash or factory can issue semantic permission.
export function nativeScalarConstantObserver(lowered,guard){
 const program=lowered?.program,active=new Set(),flatten=name=>'rp_'+Buffer.from(name).toString('hex');
 return function observe(node,read,events){
  if(node.k!=='call'||!(program?.declarations instanceof Map))return null;
  const key=program.declarations.has(node.fn)?node.fn:flatten(node.fn),target=program.declarations.get(key);
  if(!target||target.constant!==true)return null;
  const fail=message=>{throw new TypeError('Native scalar constant: '+message);},role=type=>{
   if(!type||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)return null;
   if(type.kind==='bool')return 'bool';const row=primitiveBitwiseType(type.rustPrimitiveName);return type.kind==='fixed'&&row&&type.bits===row.bits&&type.signed===row.signed?row.name:null;
  },proof=target.constantEvaluationProof;
  if(target.k!=='fn'||target.async||target.params?.length!==0||node.args?.length!==0||!role(target.ret)||role(target.ret)!==role(node.type)||!sameType(target.ret,node.type)||proof?.verified!==true||proof.sourceLinksVerified!==true||typeof proof.entry!=='string'||![node.fn,key,target.fullName].includes(proof.entry)&&![node.fn,key,target.fullName].includes(flatten(proof.entry)))fail('actual zero-argument checked primitive constant/source identity required');
  if(active.size>=32||active.has(key))fail('bounded acyclic actual constant dependency chain required');
  const before=events.length;active.add(key);
  function expand(value,depth=0){guard.charge(depth);const arithmetic=observeNativeConstantArithmetic(value,child=>expand(child,depth+1));return arithmetic??read(value);}
  try{const value=expand(target.body);if(events.length!==before)fail('constant expansion cannot invent runtime effects');return value;}finally{active.delete(key);}
 };
}
import {sameType} from '../checked-types.mjs';

// Literal substitution inside an actual checked constant only. This is not a
// runtime arithmetic rule or a replacement for original constant source links.
function observeNativeConstantArithmetic(node,read){
 const unary=node.k==='unary'&&node.op==='neg',binary=node.k==='binary',operation=nativeIntegerArithmetic(node.op);
 if(!operation||(unary?operation.arity!==1:!binary||operation.arity!==2))return null;
 const row=primitiveBitwiseType(node.type?.rustPrimitiveName),fail=message=>{throw new TypeError('Native constant arithmetic: '+message);};
 if(!row||node.type.kind!=='fixed'||node.type.rustReference||node.type.rustOwnership||node.type.patternOwnershipRefusal||node.type.rustGenericIdentityUnresolved||node.type.rustBorrowingUnresolved||node.type.bits!==row.bits||node.type.signed!==row.signed||node.semantics!=='checked'||operation.signedOnly&&row.signed!==true||['div','rem'].includes(operation.name)&&(node.rounding!=='trunc'||node.byZero!=='abort'))fail('actual checked primitive arithmetic semantics required');
 const nodes=unary?[node.arg]:[node.left,node.right],values=nodes.map(value=>{if(!sameType(value.type,node.type)||value.type.rustReference||value.type.rustOwnership||value.type.patternOwnershipRefusal||value.type.rustGenericIdentityUnresolved||value.type.rustBorrowingUnresolved||value.type.rustPrimitiveName!==row.name)fail('identical actual constant primitive operands required');const model=read(value);if(!Array.isArray(model)||model.length!==3||model[0]!=='integer'||model[1]!==row.name||typeof model[2]!=='string'||!/^[-]?(?:0|[1-9][0-9]{0,38})$/u.test(model[2]))fail('arithmetic constant operands need literal substitutions');return BigInt(model[2]);});
 const minimum=row.signed?-BigInt(row.minimumAbs):0n,maximum=BigInt(row.maximum);if(values.some(value=>value<minimum||value>maximum))fail('constant operand outside its actual primitive range');const [left,right]=values;
 if(['div','rem'].includes(operation.name)&&(right===0n||row.signed&&left===minimum&&right===-1n))fail('constant divisor zero or signed minimum overflow');
 let value;switch(operation.name){case 'add':value=left+right;break;case 'sub':value=left-right;break;case 'mul':value=left*right;break;case 'div':value=left/right;break;case 'rem':value=left%right;break;case 'neg':value=-left;break;default:fail('unsupported constant arithmetic');}
 if(value<minimum||value>maximum)fail('constant result outside its actual primitive range');return ['integer',row.name,value.toString()];
}
