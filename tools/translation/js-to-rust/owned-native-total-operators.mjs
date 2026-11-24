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

// Finite total scalar operations, DATA only. Actual source/private program
// checks remain mandatory at every caller; operationProof is not an issuer.
export const ownedNativeTotalOperator=name=>['primitiveBitwise','primitiveNot','integerCast','primitiveIntegerMethod'].includes(name);
export function requestedNativeTotalOperator(node,read){
 if(node.kind==='primitive-method-call'){const {target,method}=ownedPrimitiveOperatorCallMetadata(node);if(!totalNativeIntegerMethod(method.name))fail('native method needs its separate ordered failure rule');return ['fixed-method',method.name,target.name,node.args.map(read)];}
 if(node.kind==='primitive-bitwise-call'){
  const domain=node.type==='bool'?'bool':primitiveBitwiseType(node.type)?.name;
  if(node.name!=='primitiveBitwise'||!domain||!['&','|','^'].includes(node.operation)||node.args?.length!==2||node.root!==null||node.args.some(arg=>arg.type!==domain)||domain!=='bool'&&(node.bits!==primitiveBitwiseType(domain).bits||node.signed!==primitiveBitwiseType(domain).signed))fail('exact total bitwise operands required');
  return ['fixed-bitwise',node.operation,domain,node.args.map(read)];
 }
 if(['primitive-not-call','primitive-cast-call'].includes(node.kind)){
  const {target,input}=ownedPrimitiveOperatorCallMetadata(node),value=read(node.args[0]);
  return node.kind==='primitive-not-call'?['fixed-not',target.name,value]:input.name===target.name?value:['fixed-cast',input.name,target.name,value];
 }
 return null;
}
export function actualNativeTotalOperator(node,read){
 const method=actualNativeTotalIntegerMethod(node,read);if(method!==null)return method;
 if(!['routerPrimitiveScalarBitwise','routerPrimitiveIntegerNot','routerPrimitiveIntegerCast'].includes(node.k))return null;
 const proof=requirePrimitiveOperator(node);
 if(node.k==='routerPrimitiveScalarBitwise')return ['fixed-bitwise',proof.operation,proof.domain,[read(node.left),read(node.right)]];
 if(node.k==='routerPrimitiveIntegerNot')return ['fixed-not',proof.input,read(node.value)];
 const value=read(node.value);return proof.input===proof.target?value:['fixed-cast',proof.input,proof.target,value];
}
export function projectNativeTotalOperator(node,{expression,imported}){
 if(!Array.isArray(node))return null;const [kind,a,b,c]=node;
 const domain=name=>name==='bool'?{name,bits:null,signed:null}:primitiveBitwiseType(name);
 const call=(name,args)=>imported(name,'primitive-operator')+'('+args.join(', ')+')';
 if(kind==='fixed-method'){const row=primitiveBitwiseType(b),method=totalNativeIntegerMethod(a);if(node.length!==4||!row||!method||!Array.isArray(c)||c.length!==method.arity)fail('exact total method source projection required');return call('primitiveIntegerMethod',[...c.map(expression),'null',row.bits,row.signed,JSON.stringify(method.name)]);}
 if(kind==='fixed-bitwise'){
  const row=domain(b);if(node.length!==4||!row||!['&','|','^'].includes(a)||!Array.isArray(c)||c.length!==2)fail('exact bitwise source projection required');
  return call('primitiveBitwise',[...c.map(expression),JSON.stringify(a),JSON.stringify(row.bits),JSON.stringify(row.signed)]);
 }
 if(kind==='fixed-not'){
  const row=primitiveBitwiseType(a);if(node.length!==3||!row)fail('exact complement source projection required');return call('primitiveNot',[expression(b),row.bits,row.signed]);
 }
 if(kind==='fixed-cast'){
  const input=primitiveBitwiseType(a),target=primitiveBitwiseType(b);if(node.length!==4||!input||!target)fail('exact fixed cast source projection required');return call('integerCast',[expression(c),input.bits,input.signed,target.bits,target.signed]);
 }
 return null;
}
import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
import {ownedPrimitiveOperatorCallMetadata} from './owned-primitive-operator-emission.mjs';
import {requirePrimitiveOperator} from '../extensions/primitive-operators.mjs';

export const totalNativeIntegerMethod=name=>{const row=nativeIntegerMethod(name);return row&&row.name!=='clamp'?row:null;};
export function requireOwnedNativeTotalCall(node){
 if(!ownedNativeTotalOperator(node.name)||node.kind==='primitive-method-call'&&!totalNativeIntegerMethod(node.operation))fail('native call requires a total qualified scalar operation');return node;
}
function actualNativeTotalIntegerMethod(node,read){
 if(node.k!=='routerHostCall'||node.contract?.family!=='fixed')return null;
 const contract=node.contract,method=totalNativeIntegerMethod(contract.rustPath?.at(-1));if(!method)return null;
 actualFixedOperand(node.type,node.span);const row=primitiveBitwiseType(node.type.rustPrimitiveName);
 if(!row||contract.id!==node.id||contract.jsExport!=='rust_fixed_'+method.name||contract.kind!=='method'||contract.async!==false||contract.pure!==true||contract.rustPath.length!==2||contract.rustPath[0]!==row.name||contract.runtimeInstantiation?.factory!=='createFixedIntegerRuntime'||contract.runtimeInstantiation.type?.kind!=='fixed'||contract.runtimeInstantiation.type.bits!==row.bits||contract.runtimeInstantiation.type.signed!==row.signed||node.args?.length!==method.arity||contract.params?.length!==method.arity)fail('actual total native method contract differs');
 for(let index=0;index<node.args.length;index++){actualFixedOperand(node.args[index].type,node.span);actualFixedOperand(contract.params[index],node.span);if(node.args[index].type.rustPrimitiveName!==row.name||contract.params[index].rustPrimitiveName!==row.name)fail('actual same-domain total method operands required');}
 actualFixedOperand(contract.ret,node.span);actualFixedOperand(contract.receiver,node.span);actualFixedOperand(contract.instantiation,node.span);
 if([contract.ret,contract.receiver,contract.instantiation].some(type=>type.rustPrimitiveName!==row.name)||method.ordered&&(contract.trait!=='std::cmp::Ord'||contract.traitImplementation!=='primitive-integer'))fail('actual total primitive method owner and return differ');
 if(method.name.startsWith('wrapping_'))requireFixedWrappingMetadata(contract.sourceWrappingProof,contract.instantiation,method.name);
 return ['fixed-method',method.name,row.name,node.args.map(read)];
}
import {actualFixedOperand} from '../extensions/primitive-operators.mjs';
import {requireFixedWrappingMetadata} from '../extensions/fixed-wrapping-source.mjs';
