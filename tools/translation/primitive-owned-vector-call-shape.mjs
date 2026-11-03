// Finite candidate/type spelling DATA only; actual current ABI and private
import {primitiveCollectionOperationShape} from './primitive-collection-operation-descriptions-20261103.mjs';
// complete caller/move/loan reissue remain mandatory.
const domains=['bool','u8','i8','u16','i16','u32','i32','u64','i64','u128','i128'];
export function ownedPrimitiveVectorElement(type){return typeof type==='string'&&type.startsWith('vec:')&&domains.includes(type.slice(4))?type.slice(4):null;}
export function ownedPrimitiveVectorSharedElement(type){return typeof type==='string'&&type.endsWith('-ref')?ownedPrimitiveVectorElement(type.slice(0,-4)):null;}
export const OWNED_PRIMITIVE_VECTOR_RUST_TYPES=Object.freeze(Object.fromEntries(domains.map(domain=>['vec:'+domain,'::std::vec::Vec<::core::primitive::'+domain+'>'])));
export function primitiveOwnedVectorOperationShape(name){return primitiveCollectionOperationShape('owned-vector',name);}
export function primitiveOwnedVectorTypeWitness(type){const domain=ownedPrimitiveVectorElement(type);return domain?'router_vec_'+domain+'_new':null;}
export function primitiveOwnedVectorOptionalWitness(type){if(typeof type!=='string'||!type.endsWith('-option'))return null;const domain=type.slice(0,-7);return domains.includes(domain)?'router_vec_'+domain+'_get':null;}

export const SHARED_PRIMITIVE_VECTOR_RUST_TYPES=Object.freeze(Object.fromEntries(Object.entries(OWNED_PRIMITIVE_VECTOR_RUST_TYPES).map(([type,native])=>[type+'-ref',"&'a "+native])));
