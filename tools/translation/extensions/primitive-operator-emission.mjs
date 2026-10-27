// Shared checked primitive presentation only. Complete compiler/source and
// semantic-meta guards remain at every entry point.
import {requirePrimitiveOperator} from './primitive-operators.mjs';
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
