// Reusable native-AST-to-carrier substitutions, DATA only. The caller must
// resolve its genuine current import and independently reissue its whole body.
import {primitiveBitwiseMetadata,primitiveBitwiseLiteral,primitiveBitwiseCompatible} from '../primitive-bitwise-types.mjs';
import {ownedBooleanBitwiseOperator} from './owned-boolean-bitwise-source.mjs';
const fail=message=>{throw new TypeError('Owned primitive operator source: '+message);};
export const ownedPrimitiveOperatorOperation=name=>typeof name==='string'&&['primitiveBitwise','integerCast','integerShift','primitiveNot','primitiveIntegerMethod','integerArithmetic'].includes(name);
export function readOwnedPrimitiveOperatorCall(ts,node,name,read){
 if(!ownedPrimitiveOperatorOperation(name)||node.typeArguments?.length)fail('unregistered or generic primitive operator');
 const width=(bits,signed)=>ts.isNumericLiteral(bits)&&[ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword].includes(signed.kind)?primitiveBitwiseMetadata(bits.text,signed.kind===ts.SyntaxKind.TrueKeyword):null;
 const operand=(node,domain)=>{const negative=ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken&&ts.isBigIntLiteral(node.operand),literal=ts.isBigIntLiteral(node)?node:negative?node.operand:null;
  if(domain&&literal){const value=primitiveBitwiseLiteral(literal.text,negative,domain.name);if(value===null)fail('primitive literal outside its exact native domain');return {kind:'integer',value,type:domain.name,root:null};}return read(node);
 };
 if(name==='primitiveBitwise'){
  if(node.arguments.length!==5||!ts.isStringLiteral(node.arguments[2])||!ownedBooleanBitwiseOperator(node.arguments[2].text))fail('fixed eager primitive bitwise metadata required');
  const boolean=node.arguments[3].kind===ts.SyntaxKind.NullKeyword&&node.arguments[4].kind===ts.SyntaxKind.NullKeyword,domain=boolean?null:width(node.arguments[3],node.arguments[4]);if(!boolean&&!domain)fail('literal registered fixed integer width/sign required');
  const args=node.arguments.slice(0,2).map(argument=>operand(argument,domain)),type=domain?.name??'bool';if(args.some(value=>!primitiveBitwiseCompatible(value.type,type)))fail('primitive bitwise operands require exact scalar domains');return {kind:'primitive-bitwise-call',name,args,operation:node.arguments[2].text,type,root:null,...(domain?{bits:domain.bits,signed:domain.signed}:{})};
 }
 if(name==='integerArithmetic'){
  if(node.arguments.length!==5||!ts.isStringLiteral(node.arguments[4]))fail('five exact checked arithmetic arguments required');const operation=nativeIntegerArithmetic(node.arguments[4].text),domain=width(node.arguments[2],node.arguments[3]);if(!operation||!domain||operation.signedOnly&&domain.signed!==true||operation.arity===1&&node.arguments[1].kind!==ts.SyntaxKind.NullKeyword)fail('literal native arithmetic domain and operation required');const args=node.arguments.slice(0,operation.arity).map(argument=>operand(argument,domain));if(args.some(value=>!primitiveBitwiseCompatible(value.type,domain.name)))fail('checked arithmetic operands differ from written native domain');return {kind:'primitive-arithmetic-call',name,args,operation:operation.name,type:domain.name,bits:domain.bits,signed:domain.signed,root:null};
 }
 if(name==='primitiveIntegerMethod'){
  if(node.arguments.length!==6||!ts.isStringLiteral(node.arguments[5]))fail('six exact native method operands required');const method=nativeIntegerMethod(node.arguments[5].text),input=width(node.arguments[3],node.arguments[4]);if(!method||!input||method.arity===2&&node.arguments[2].kind!==ts.SyntaxKind.NullKeyword)fail('literal registered native method domain and arity required');const args=node.arguments.slice(0,method.arity).map(argument=>operand(argument,input));if(args.some(value=>!primitiveBitwiseCompatible(value.type,input.name)))fail('native method operands differ from written domain');return {kind:'primitive-method-call',name,args,operation:method.name,type:input.name,bits:input.bits,signed:input.signed,root:null};
 }
 if(name==='primitiveNot'){
  if(node.arguments.length!==3)fail('three exact complement arguments required');const input=width(node.arguments[1],node.arguments[2]);if(!input)fail('literal native complement domain required');const value=operand(node.arguments[0],input);if(!primitiveBitwiseCompatible(value.type,input.name))fail('complement operand differs from its written native domain');return {kind:'primitive-not-call',name,args:[value],type:input.name,bits:input.bits,signed:input.signed,root:null};
 }
 if(name==='integerCast'){
  if(node.arguments.length!==5)fail('five exact cast arguments required');const input=width(node.arguments[1],node.arguments[2]),target=width(node.arguments[3],node.arguments[4]);if(!input||!target)fail('literal native input and target cast domains required');const value=operand(node.arguments[0],input);if(!primitiveBitwiseCompatible(value.type,input.name))fail('cast operand differs from its written input domain');
  return {kind:'primitive-cast-call',name,args:[value],type:target.name,inputType:input.name,bits:target.bits,signed:target.signed,inputBits:input.bits,inputSigned:input.signed,root:null};
 }
 if(node.arguments.length!==7||!ts.isStringLiteral(node.arguments[6])||!['<<','>>'].includes(node.arguments[6].text))fail('seven exact shift arguments and a fixed operator required');const input=width(node.arguments[2],node.arguments[3]),count=width(node.arguments[4],node.arguments[5]);if(!input||!count)fail('literal native value and count shift domains required');const args=[operand(node.arguments[0],input),operand(node.arguments[1],count)];if(!primitiveBitwiseCompatible(args[0].type,input.name)||!primitiveBitwiseCompatible(args[1].type,count.name))fail('shift operands differ from their written native domains');
 return {kind:'primitive-shift-call',name,args,type:input.name,countType:count.name,operation:node.arguments[6].text,bits:input.bits,signed:input.signed,countBits:count.bits,countSigned:count.signed,root:null};
}

import {nativeIntegerMethod} from '../native-integer-methods.mjs';

import {nativeIntegerArithmetic} from '../native-integer-arithmetic.mjs';

// Additive contextual DATA callback; the original public reader above stays exact.
export function readOwnedPrimitiveOperatorCallWithDomains(ts,node,name,read){
 if(!ownedPrimitiveOperatorOperation(name)||node.typeArguments?.length)fail('unregistered or generic primitive operator');
 const width=(bits,signed)=>ts.isNumericLiteral(bits)&&[ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword].includes(signed.kind)?primitiveBitwiseMetadata(bits.text,signed.kind===ts.SyntaxKind.TrueKeyword):null;
 const operand=(node,domain)=>{const negative=ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken&&ts.isBigIntLiteral(node.operand),literal=ts.isBigIntLiteral(node)?node:negative?node.operand:null;
  if(domain&&literal){const value=primitiveBitwiseLiteral(literal.text,negative,domain.name);if(value===null)fail('primitive literal outside its exact native domain');return {kind:'integer',value,type:domain.name,root:null};}return read(node,domain?.name??null);
 };
 if(name==='primitiveBitwise'){
  if(node.arguments.length!==5||!ts.isStringLiteral(node.arguments[2])||!ownedBooleanBitwiseOperator(node.arguments[2].text))fail('fixed eager primitive bitwise metadata required');
  const boolean=node.arguments[3].kind===ts.SyntaxKind.NullKeyword&&node.arguments[4].kind===ts.SyntaxKind.NullKeyword,domain=boolean?null:width(node.arguments[3],node.arguments[4]);if(!boolean&&!domain)fail('literal registered fixed integer width/sign required');
  const args=node.arguments.slice(0,2).map(argument=>operand(argument,domain)),type=domain?.name??'bool';if(args.some(value=>!primitiveBitwiseCompatible(value.type,type)))fail('primitive bitwise operands require exact scalar domains');return {kind:'primitive-bitwise-call',name,args,operation:node.arguments[2].text,type,root:null,...(domain?{bits:domain.bits,signed:domain.signed}:{})};
 }
 if(name==='integerArithmetic'){
  if(node.arguments.length!==5||!ts.isStringLiteral(node.arguments[4]))fail('five exact checked arithmetic arguments required');const operation=nativeIntegerArithmetic(node.arguments[4].text),domain=width(node.arguments[2],node.arguments[3]);if(!operation||!domain||operation.signedOnly&&domain.signed!==true||operation.arity===1&&node.arguments[1].kind!==ts.SyntaxKind.NullKeyword)fail('literal native arithmetic domain and operation required');const args=node.arguments.slice(0,operation.arity).map(argument=>operand(argument,domain));if(args.some(value=>!primitiveBitwiseCompatible(value.type,domain.name)))fail('checked arithmetic operands differ from written native domain');return {kind:'primitive-arithmetic-call',name,args,operation:operation.name,type:domain.name,bits:domain.bits,signed:domain.signed,root:null};
 }
 if(name==='primitiveIntegerMethod'){
  if(node.arguments.length!==6||!ts.isStringLiteral(node.arguments[5]))fail('six exact native method operands required');const method=nativeIntegerMethod(node.arguments[5].text),input=width(node.arguments[3],node.arguments[4]);if(!method||!input||method.arity===2&&node.arguments[2].kind!==ts.SyntaxKind.NullKeyword)fail('literal registered native method domain and arity required');const args=node.arguments.slice(0,method.arity).map(argument=>operand(argument,input));if(args.some(value=>!primitiveBitwiseCompatible(value.type,input.name)))fail('native method operands differ from written domain');return {kind:'primitive-method-call',name,args,operation:method.name,type:input.name,bits:input.bits,signed:input.signed,root:null};
 }
 if(name==='primitiveNot'){
  if(node.arguments.length!==3)fail('three exact complement arguments required');const input=width(node.arguments[1],node.arguments[2]);if(!input)fail('literal native complement domain required');const value=operand(node.arguments[0],input);if(!primitiveBitwiseCompatible(value.type,input.name))fail('complement operand differs from its written native domain');return {kind:'primitive-not-call',name,args:[value],type:input.name,bits:input.bits,signed:input.signed,root:null};
 }
 if(name==='integerCast'){
  if(node.arguments.length!==5)fail('five exact cast arguments required');const input=width(node.arguments[1],node.arguments[2]),target=width(node.arguments[3],node.arguments[4]);if(!input||!target)fail('literal native input and target cast domains required');const value=operand(node.arguments[0],input);if(!primitiveBitwiseCompatible(value.type,input.name))fail('cast operand differs from its written input domain');
  return {kind:'primitive-cast-call',name,args:[value],type:target.name,inputType:input.name,bits:target.bits,signed:target.signed,inputBits:input.bits,inputSigned:input.signed,root:null};
 }
 if(node.arguments.length!==7||!ts.isStringLiteral(node.arguments[6])||!['<<','>>'].includes(node.arguments[6].text))fail('seven exact shift arguments and a fixed operator required');const input=width(node.arguments[2],node.arguments[3]),count=width(node.arguments[4],node.arguments[5]);if(!input||!count)fail('literal native value and count shift domains required');const args=[operand(node.arguments[0],input),operand(node.arguments[1],count)];if(!primitiveBitwiseCompatible(args[0].type,input.name)||!primitiveBitwiseCompatible(args[1].type,count.name))fail('shift operands differ from their written native domains');
 return {kind:'primitive-shift-call',name,args,type:input.name,countType:count.name,operation:node.arguments[6].text,bits:input.bits,signed:input.signed,countBits:count.bits,countSigned:count.signed,root:null};
}
