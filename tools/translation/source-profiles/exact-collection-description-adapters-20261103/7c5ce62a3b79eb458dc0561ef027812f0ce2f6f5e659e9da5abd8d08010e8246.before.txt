// Finite shape DATA, never namespace/type/caller permission.
export const OWNED_TEXT_VECTOR_TYPE='vec:text-owned';
export const OWNED_TEXT_VECTOR_SHARED_TYPE='vec:text-owned-ref';
export const OWNED_TEXT_VECTOR_SLICE_TYPE='text-owned-list-ref';
export const OWNED_TEXT_VECTOR_RUST_TYPES=Object.freeze({'vec:text-owned':'::std::vec::Vec<::std::string::String>','vec:text-owned-ref':"&'a ::std::vec::Vec<::std::string::String>",'text-owned-list-ref':"&'a [::std::string::String]"});
export function ownedTextVectorType(type){return type===OWNED_TEXT_VECTOR_TYPE;}
export function ownedTextVectorSharedType(type){return type===OWNED_TEXT_VECTOR_SHARED_TYPE;}
export function ownedTextVectorOperationShape(name){
 if(typeof name!=='string')return null;const match=/^(?:vec_text_|router_owned_text_vec_)(new|from_slice|push|append|truncate|replace|len|get)$/u.exec(name);if(!match||match[0]!==name)return null;const operation=match[1],v=OWNED_TEXT_VECTOR_TYPE,parameters={new:[],from_slice:[OWNED_TEXT_VECTOR_SLICE_TYPE],push:[v,'text-owned'],append:[v,v],truncate:[v,'u64'],replace:[v,'u64','text-owned'],len:[OWNED_TEXT_VECTOR_SHARED_TYPE],get:[OWNED_TEXT_VECTOR_SHARED_TYPE,'u64']}[operation];return {operation,rustName:'vec_text_'+operation,javascriptName:'router_owned_text_vec_'+operation,rustPath:'crate::translation_owned_text_vectors_core::vec_text_'+operation,parameters,returns:operation==='len'?'u64':operation==='get'?'text-owned-option':v,sourceAuthority:false,semanticAuthority:false};
}
export function ownedTextVectorTypeWitness(type){if(type===OWNED_TEXT_VECTOR_TYPE)return {name:'router_owned_text_vec_new',kind:'return'};if(type===OWNED_TEXT_VECTOR_SHARED_TYPE)return {name:'router_owned_text_vec_len',kind:'parameter',index:0};if(type===OWNED_TEXT_VECTOR_SLICE_TYPE)return {name:'router_owned_text_vec_from_slice',kind:'parameter',index:0};if(type==='text-owned')return {name:'router_owned_text_vec_push',kind:'parameter',index:1};if(type==='text-owned-option')return {name:'router_owned_text_vec_get',kind:'return'};return null;}
