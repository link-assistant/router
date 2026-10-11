// Identifier-safe injective encoding of supported monomorphic type syntax.
// Delimiters are outside the UTF-8 hex alphabet, so paths and nested arrays
// cannot collide (including distinct underscore-containing Rust identifiers).
import {typeKey} from './vendor/meta-language/translation/types.js';
export function encodeMonomorphicType(type) {
  if(type.rustGenericIdentityUnresolved) {
    const {rustGenericIdentityUnresolved,...pointee}=type;
    return 'unresolved_'+encodeMonomorphicType(pointee);
  }
  if(type.rustReference) {
    if(type.rustReference.kind!=='shared'||!type.rustReference.pointee)throw new TypeError('Monomorphic references require their checked shared pointee');
    return 'reference_shared_'+encodeMonomorphicType(type.rustReference.pointee);
  }
  if(type.rustOwnership?.kind==='owned'&&type.kind==='string')return 'rust_owned_string';
  if(type.rustOwnership?.kind==='owned'&&type.kind==='array')return 'rust_owned_vec_'+encodeMonomorphicType(type.element);
  if(type.kind === 'named')return 'named_' + type.path.filter((part,index)=>index !== 0 || part !== 'crate').map(part=>Buffer.from(part,'utf8').toString('hex')).join('_');
  if(type.kind === 'array')return 'array_' + encodeMonomorphicType(type.element);
  if(type.kind === 'data')return encodeMonomorphicType({kind:'named',path:type.name.split('.')});
  // Pointer-sized Rust integers retain their actual primitive identity. The
  // portable 64-bit assumption does not make usize=u64 or isize=i64.
  if(type.kind === 'fixed' && ['usize','isize'].includes(type.rustPrimitiveName))return 'rust_' + type.rustPrimitiveName;
  if(['fixed','bool','string','unit','nat','int','float'].includes(type.kind))return typeKey(type);
  throw new TypeError(`Unsupported monomorphic type encoding: ${type.kind}`);
}
export const monomorphicTypeName=(kind,types)=>`Router${kind}_${types.map(type=>{const encoded=encodeMonomorphicType(type);return `${encoded.length}_${encoded}`;}).join('_')}`;
