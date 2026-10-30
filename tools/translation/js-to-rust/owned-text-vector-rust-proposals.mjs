// Canonical Rust syntax observations only. Parent requires fresh complete
// JS checking, private meta reissue and exact authoritative Rust reproduction.
import {ownedTextVectorOperationShape,ownedTextVectorTypeWitness} from '../owned-text-vector-call-shape.mjs';
export function ownedRustTextVectorCall(node){
 if(node?.kind!=='call'||typeof node.path!=='string')return null;const prefix='crate::translation_owned_text_vectors_core::';if(!node.path.startsWith(prefix))return null;const row=ownedTextVectorOperationShape(node.path.slice(prefix.length));return row&&row.rustPath===node.path&&node.args?.length===row.parameters.length?row:null;
}
export function ownedRustTextVectorTypeWitness(text){
 if(typeof text!=='string')return null;const normalized=text.replaceAll("&'a",'&').replaceAll("&'static",'&'),roles={'::std::vec::Vec<::std::string::String>':'vec:text-owned','&::std::vec::Vec<::std::string::String>':'vec:text-owned-ref','&[::std::string::String]':'text-owned-list-ref','::std::string::String':'text-owned','::std::option::Option<::std::string::String>':'text-owned-option'};return Object.hasOwn(roles,normalized)?ownedTextVectorTypeWitness(roles[normalized]):null;
}
