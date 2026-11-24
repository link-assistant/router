// Finite literal source DATA; no evaluated text or generic float-type inference.
import {originalFlatTokenIntrinsicsUnchanged,originalStaticSourceIntrinsicsUnchanged,throwOriginalCapturedTypeError} from '../original-json-intrinsics.mjs';
function host(){if(!originalFlatTokenIntrinsicsUnchanged()||!originalStaticSourceIntrinsicsUnchanged())throwOriginalCapturedTypeError('Owned vector f64 original numeric source host changed');}
function finite(value){return value===value&&value!==1/0&&value!==-1/0;}
function canonical(value){return value===0&&1/value<0?'-0':String(value);}
export function ownedVectorF64Literal(ts,node){
 host();let negative=false;if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken){negative=true;node=node.operand;}
 if(!ts.isNumericLiteral(node))throw new TypeError('Owned reverse vector f64 requires a native number literal');
 host();let value=Number(node.text.replaceAll('_',''));if(negative)value=-value;
 if(!finite(value))throw new TypeError('Owned reverse vector f64 literal exceeds finite binary64 range');
 const result={kind:'float',value:canonical(value)};host();return result;
}
export function evaluateOwnedVectorF64(item){
 host();if(item.kind!=='float'||typeof item.value!=='string'||item.value.length>32)throw new TypeError('Owned vector f64 literal DATA differs');
 const value=Number(item.value);if(!finite(value)||canonical(value)!==item.value)throw new TypeError('Owned vector f64 literal requires canonical finite binary64 data');
 host();return value;
}
export function emitOwnedVectorF64(item,rust){
 evaluateOwnedVectorF64(item);return rust?(item.value==='-0'?'-0.0':item.value)+'_f64':item.value;
}
