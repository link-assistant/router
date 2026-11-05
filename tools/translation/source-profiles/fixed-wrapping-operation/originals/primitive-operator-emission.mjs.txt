// Shared checked primitive presentation only. Complete compiler/source and
// semantic-meta guards remain at every entry point.
import {requirePrimitiveOperator,actualFixedOperand} from './primitive-operators.mjs';
export function emitPrimitiveOperator(emitter,node){
    if(['routerPrimitiveIntegerCast','routerPrimitiveIntegerShift','routerPrimitiveScalarBitwise','routerPrimitiveIntegerNot'].includes(node.k)){
      const proof=requirePrimitiveOperator(node);emitter.primitiveOperators=true;
      emitter.state.encode('rust-primitive-integer-operators','Actual by-value primitive casts, shifts, fixed integer complement and eager bool/fixed-integer bitwise operations; exact BigInt ABI and checked counts; no trait or pointer authority.');
      if(node.k==='routerPrimitiveIntegerNot')return `ml_primitive_not(${emitter.expr(node.value)}, ${node.type.bits}, ${node.type.signed})`;
      if(node.k==='routerPrimitiveScalarBitwise')return `ml_primitive_bitwise(${emitter.expr(node.left)}, ${emitter.expr(node.right)}, ${JSON.stringify(proof.operation)}, ${node.type.kind==='bool'?'null':node.type.bits}, ${node.type.kind==='bool'?'null':node.type.signed})`;if(node.k==='routerPrimitiveIntegerCast')return `ml_integer_cast(${emitter.expr(node.value)}, ${node.value.type.bits}, ${node.value.type.signed}, ${node.type.bits}, ${node.type.signed})`;
      return `ml_integer_shift(${emitter.expr(node.left)}, ${emitter.expr(node.right)}, ${node.type.bits}, ${node.type.signed}, ${node.right.type.bits}, ${node.right.type.signed}, ${JSON.stringify(proof.operation)})`;
    }
 return null;
}

// Select only an existing checked fixed contract with actual native identities.
export function emitPrimitiveIntegerMethod(emitter,node,contract){
 if(contract.family!=='fixed')return null;const method=nativeIntegerMethod(contract.rustPath?.at(-1)),type=node.type,row=primitiveBitwiseType(type?.rustPrimitiveName);if(!method||!row||type.kind!=='fixed'||type.rustReference||type.rustOwnership||type.rustGenericIdentityUnresolved||type.patternOwnershipRefusal)return null;actualFixedOperand(type,node.span);if(contract.jsExport!=='rust_fixed_'+method.name||contract.runtimeInstantiation?.type?.bits!==row.bits||contract.runtimeInstantiation?.type?.signed!==row.signed||node.args.length!==method.arity)throw new TypeError('Checked native integer method contract differs');for(const value of node.args){actualFixedOperand(value.type,node.span);if(value.type.rustPrimitiveName!==row.name)throw new TypeError('Checked native integer method operands differ');}emitter.primitiveOperators=true;emitter.state.encode('host-contract-'+contract.id,contract.assumptions.join(' '));const args=node.args.map(value=>emitter.expr(value));if(method.arity===2)args.push('null');return 'ml_primitive_integer_method('+args.concat([String(row.bits),String(row.signed),JSON.stringify(method.name)]).join(', ')+')';
}
import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
import {nativeIntegerMethod} from '../native-integer-methods.mjs';
