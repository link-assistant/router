// Native parser observations select source proposals only. Complete private
// caller reissue and full original Rust reproduction remain mandatory.
import {primitiveSequenceOperationShape} from '../primitive-sequence-call-shape.mjs';
export function ownedRustPrimitiveSequenceCall(node){
 if(node?.kind!=='call'||typeof node.path!=='string')return null;const prefix='crate::translation_primitive_sequences_core::';if(!node.path.startsWith(prefix))return null;const operation=primitiveSequenceOperationShape(node.path.slice(prefix.length));if(!operation||operation.rustPath!==node.path||!Array.isArray(node.args)||node.args.length!==operation.parameters.length)throw new TypeError('Canonical primitive sequence call proposal differs');return operation;
}
export function ownedRustPrimitiveSequencePresence(functions){
 // Bounded syntax census, not a source/type/namespace or private-issuer receipt.
 let cells=0,found=false;function visit(node,depth){if(++cells>100000||depth>160)throw new TypeError('Canonical primitive sequence observation budget exceeded');if(node===null||typeof node!=='object')return;if(ownedRustPrimitiveSequenceCall(node))found=true;for(const value of Object.values(node))if(value&&typeof value==='object')visit(value,depth+1);}visit(functions,0);return found;
}
export function ownedRustPrimitiveSequenceOptionalWitness(text){
 if(typeof text!=='string')return null;const match=/^::std::option::Option<(?:::core::primitive::)?(bool|[ui](?:8|16|32|64|128))>$/u.exec(text);if(!match||match[0]!==text)return null;return primitiveSequenceOperationShape('slice_'+match[1]+'_get')?.javascriptName??null;
}
