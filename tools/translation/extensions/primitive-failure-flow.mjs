// Observations of independently checked source IR only. A possible panic is
// never a total operation and cannot be discarded because its result is unused.
import {actualFixedOperand} from './primitive-operators.mjs';
import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
const fail=message=>{throw new TypeError('Checked primitive failure flow: '+message);};
export function primitiveFailureFlow(node){
 if(node.k==='unary'&&node.op==='neg'&&node.type?.kind==='fixed'&&primitiveBitwiseType(node.type.rustPrimitiveName)){const type=actualFixedOperand(node.type,node.span);actualFixedOperand(node.arg?.type,node.span);if(type.signed!==true||node.semantics!=='checked'||node.arg.type.rustPrimitiveName!==type.rustPrimitiveName)fail('actual signed by-value checked negation required');return {kind:'arithmetic',operation:'neg',domain:type.rustPrimitiveName,args:[node.arg]};}
 if(node.k==='binary'&&['add','sub','mul'].includes(node.op)&&node.type?.kind==='fixed'&&primitiveBitwiseType(node.type.rustPrimitiveName)){
  const type=actualFixedOperand(node.type,node.span);actualFixedOperand(node.left?.type,node.span);actualFixedOperand(node.right?.type,node.span);
  if(node.semantics!=='checked'||node.left.type.rustPrimitiveName!==type.rustPrimitiveName||node.right.type.rustPrimitiveName!==type.rustPrimitiveName)fail('actual same-domain checked arithmetic operands required');
  return {kind:'arithmetic',operation:node.op,domain:type.rustPrimitiveName,args:[node.left,node.right]};
 }
 if(node.k!=='routerHostCall'||node.contract?.family!=='fixed'||node.contract.rustPath?.at(-1)!=='clamp'||!primitiveBitwiseType(node.type?.rustPrimitiveName))return null;
 const contract=node.contract,type=actualFixedOperand(node.type,node.span),row=primitiveBitwiseType(type.rustPrimitiveName);
 if(!row||contract.id!==node.id||contract.jsExport!=='rust_fixed_clamp'||contract.kind!=='method'||contract.async!==false||contract.pure!==true||contract.constEligible!==false||contract.trait!=='std::cmp::Ord'||contract.traitImplementation!=='primitive-integer'||contract.rustPath.length!==2||contract.rustPath[0]!==row.name||contract.runtimeInstantiation?.factory!=='createFixedIntegerRuntime'||contract.runtimeInstantiation.type?.kind!=='fixed'||contract.runtimeInstantiation.type.bits!==row.bits||contract.runtimeInstantiation.type.signed!==row.signed||node.args?.length!==3||contract.params?.length!==3)fail('actual primitive Ord clamp contract differs');
 for(const operand of [...node.args.map(argument=>argument.type),...contract.params,contract.ret,contract.receiver,contract.instantiation]){actualFixedOperand(operand,node.span);if(operand.rustPrimitiveName!==row.name)fail('actual same-domain clamp receiver arguments and result required');}
 return {kind:'method',operation:'clamp',domain:row.name,args:node.args};
}

// Additive complete failure observer; the original public lane remains exact.
export function primitiveFailureFlowWithDivision(node){
 if(node.k==='unary'&&node.op==='neg'&&node.type?.kind==='fixed'&&primitiveBitwiseType(node.type.rustPrimitiveName)){const type=actualFixedOperand(node.type,node.span);actualFixedOperand(node.arg?.type,node.span);if(type.signed!==true||node.semantics!=='checked'||node.arg.type.rustPrimitiveName!==type.rustPrimitiveName)fail('actual signed by-value checked negation required');return {kind:'arithmetic',operation:'neg',domain:type.rustPrimitiveName,args:[node.arg]};}
 if(node.k==='binary'&&['add','sub','mul','div','rem'].includes(node.op)&&node.type?.kind==='fixed'&&primitiveBitwiseType(node.type.rustPrimitiveName)){
  const type=actualFixedOperand(node.type,node.span);actualFixedOperand(node.left?.type,node.span);actualFixedOperand(node.right?.type,node.span);
  if(node.semantics!=='checked'||node.left.type.rustPrimitiveName!==type.rustPrimitiveName||node.right.type.rustPrimitiveName!==type.rustPrimitiveName)fail('actual same-domain checked arithmetic operands required');
  return {kind:'arithmetic',operation:node.op,domain:type.rustPrimitiveName,args:[node.left,node.right]};
 }
 if(node.k!=='routerHostCall'||node.contract?.family!=='fixed'||node.contract.rustPath?.at(-1)!=='clamp'||!primitiveBitwiseType(node.type?.rustPrimitiveName))return null;
 const contract=node.contract,type=actualFixedOperand(node.type,node.span),row=primitiveBitwiseType(type.rustPrimitiveName);
 if(!row||contract.id!==node.id||contract.jsExport!=='rust_fixed_clamp'||contract.kind!=='method'||contract.async!==false||contract.pure!==true||contract.constEligible!==false||contract.trait!=='std::cmp::Ord'||contract.traitImplementation!=='primitive-integer'||contract.rustPath.length!==2||contract.rustPath[0]!==row.name||contract.runtimeInstantiation?.factory!=='createFixedIntegerRuntime'||contract.runtimeInstantiation.type?.kind!=='fixed'||contract.runtimeInstantiation.type.bits!==row.bits||contract.runtimeInstantiation.type.signed!==row.signed||node.args?.length!==3||contract.params?.length!==3)fail('actual primitive Ord clamp contract differs');
 for(const operand of [...node.args.map(argument=>argument.type),...contract.params,contract.ret,contract.receiver,contract.instantiation]){actualFixedOperand(operand,node.span);if(operand.rustPrimitiveName!==row.name)fail('actual same-domain clamp receiver arguments and result required');}
 return {kind:'method',operation:'clamp',domain:row.name,args:node.args};
}
