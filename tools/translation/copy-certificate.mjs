// Integrity checks shared by low data layouts and high original-source Copy
// issuance. This is the unchanged certificate verifier, not a source issuer.
import {createHash} from 'node:crypto';
import {fixedArrayLength,typeKey} from './checked-types.mjs';
import {currentSharedReferenceCopyIdentity as sharedReferenceCopyIdentity} from './current-standard-copy-source.mjs';
export const checkedCopyTypeKey=type=>{
  if(!type || typeof type!=='object')return null;
  if(type.rustReference)return sharedReferenceCopyIdentity(type);
  if(['bool','unit','float'].includes(type.kind))return typeKey(type);
  if(type.kind==='fixed' && [8,16,32,64,128].includes(type.bits) && typeof type.signed==='boolean')return typeKey(type);
  if(type.kind==='data' && typeof type.name==='string' && type.name.length)return typeKey(type);
  if(type.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return 'rust-borrowed-str';
  if(type.kind==='array'&&fixedArrayLength(type)!==null&&type.rustOwnership?.kind==='value'&&type.rustOwnership.source==='array')return checkedCopyTypeKey(type.element)?typeKey(type):null;
  return null;
};
export function validCopyCertificate(certificate,type) {
  if(!certificate||certificate.version!==1||certificate.profile!=='checked-rust-copy-layout-v1'||!certificate.verified||certificate.diagnostics?.length||!checkedCopyTypeKey(type)||checkedCopyTypeKey(certificate.type)!==checkedCopyTypeKey(type))return false;
  const {digest,...evidence}=certificate;
  return typeof digest==='string'&&createHash('sha256').update(JSON.stringify(evidence)).digest('hex')===digest;
}
