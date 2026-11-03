// Finite shape DATA, never namespace/type/caller permission.
import {vectorOperationShape} from './vector-operation-descriptions-20261103.mjs';
export const OWNED_TEXT_VECTOR_TYPE='vec:text-owned';
export const OWNED_TEXT_VECTOR_SHARED_TYPE='vec:text-owned-ref';
export const OWNED_TEXT_VECTOR_SLICE_TYPE='text-owned-list-ref';
export const OWNED_TEXT_VECTOR_RUST_TYPES=Object.freeze({'vec:text-owned':'::std::vec::Vec<::std::string::String>','vec:text-owned-ref':"&'a ::std::vec::Vec<::std::string::String>",'text-owned-list-ref':"&'a [::std::string::String]"});
export function ownedTextVectorType(type){return type===OWNED_TEXT_VECTOR_TYPE;}
export function ownedTextVectorSharedType(type){return type===OWNED_TEXT_VECTOR_SHARED_TYPE;}
export function ownedTextVectorOperationShape(name){return vectorOperationShape('owned-text-vector',name);}
export function ownedTextVectorTypeWitness(type){if(type===OWNED_TEXT_VECTOR_TYPE)return {name:'router_owned_text_vec_new',kind:'return'};if(type===OWNED_TEXT_VECTOR_SHARED_TYPE)return {name:'router_owned_text_vec_len',kind:'parameter',index:0};if(type===OWNED_TEXT_VECTOR_SLICE_TYPE)return {name:'router_owned_text_vec_from_slice',kind:'parameter',index:0};if(type==='text-owned')return {name:'router_owned_text_vec_push',kind:'parameter',index:1};if(type==='text-owned-option')return {name:'router_owned_text_vec_get',kind:'return'};return null;}
