// Canonical syntax observations only. Complete private JS reissue and original
// Rust reproduction remain mandatory; names/shape DATA cannot issue a caller.
import {ownedRustTextVectorCall} from './owned-text-vector-rust-proposals.mjs';
import {ownedTextVectorLiteralOperationShape} from '../owned-text-vector-literal-call-shape.mjs';
export function ownedRustTextVectorLiteralCall(node){const row=ownedRustTextVectorCall(node);if(row?.operation!=='from_slice'||node.args[0]?.kind!=='borrow'||node.args[0].value?.kind!=='json-array')return null;const args=node.args[0].value.elements;if(!Array.isArray(args)||args.length>64)throw new TypeError('Canonical owned String literal source arity differs');return {...ownedTextVectorLiteralOperationShape('router_owned_text_vec_literal',args.length),args,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false};}
