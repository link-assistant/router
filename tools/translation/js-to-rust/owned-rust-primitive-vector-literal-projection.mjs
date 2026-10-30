// Canonical Rust observation DATA only, never native binding/owner evidence.
// Full private JS reissue and reproduction of the original Rust remain required.
import {ownedRustPrimitiveVectorCall} from './owned-rust-primitive-vector-projection.mjs';
import {primitiveVectorLiteralOperationShape} from '../primitive-vector-literal-call-shape.mjs';
export function ownedRustPrimitiveVectorLiteralCall(node){const row=ownedRustPrimitiveVectorCall(node);if(row?.operation!=='from_slice'||node.args[0]?.kind!=='borrow'||node.args[0].value?.kind!=='json-array')return null;const args=node.args[0].value.elements;if(!Array.isArray(args)||args.length>64)throw new TypeError('Canonical primitive literal source arity differs');const shape=primitiveVectorLiteralOperationShape('router_vec_'+row.domain+'_literal',args.length);return {...shape,args,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false};}
