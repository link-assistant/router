// A separate narrow standard-source boundary for explicit primitive reads.
// The preexisting Option witness is reused as original source evidence only;
// its Option-field scope does not grant a general trait or nominal capability.
import {SOURCE_F64,requirePrimitiveFloat} from './primitive-float-contracts.mjs';
import {SHARED_REFERENCE_COPY_SOURCE,currentPrimitiveCopySource as originalPrimitiveCopySource} from '../current-standard-copy-source.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {copyMetadata} from './source-links.mjs';
let source;
export function originalSharedF64CopySource(){
 if(source)return source;
 const primitive=originalPrimitiveCopySource(SOURCE_F64);
 if(!primitive||primitive.source.path!=='library/core/src/marker.rs'||primitive.source.sha256!=='db5d413946a48f816af89e83f99741693d1aaf088633db60c8d372a555ff8809'||SHARED_REFERENCE_COPY_SOURCE.sourceSha256!==primitive.source.sha256)throw new TypeError('Shared f64 read lacks its actual original marker/Copy macro source');
 source=Object.freeze({profile:'original-standard-explicit-shared-f64-read-v1',primitive:'f64',primitiveSourceEvidence:primitive,sharedReferenceSource:SHARED_REFERENCE_COPY_SOURCE,scope:'explicit builtin dereference of actual checked shared f64 only',traitDispatchAuthority:false,nominalCopyAuthority:false,pointeeMutationAuthority:false,lifetimeEscapeAuthority:false,implicitMethodAuthority:false});
 return source;
}
export function sharedF64Pointee(type,span){
 const refuse=()=>{throw unsupported('shared f64 dereference','requires a bounded checked shared reference chain to an actual source primitive f64',span);};
 // New public type utility: reject proxy/accessor ingress before field reads.
 // A structural result still supplies no original caller or trait capability.
 try{type=copyMetadata(type);}catch{refuse();}
 let leaf=type,depth=0;
 while(leaf?.rustReference){
  const next=leaf.rustReference.pointee;
  if(++depth>32||leaf.kind!=='float'||leaf.rustPrimitiveName!=='f64'||leaf.rustSourceType!==true||leaf.rustOwnership||leaf.rustGenericIdentityUnresolved||leaf.rustBorrowingUnresolved||leaf.rustReference.kind!=='shared'||!['shared source reference','explicit shared reference expression'].includes(leaf.patternOwnershipRefusal)||!next||next.kind!=='float'||next.rustPrimitiveName!=='f64')refuse();
  leaf=next;
 }
 if(!depth||leaf?.kind!=='float'||leaf.rustSourceType!==true||leaf.rustBorrowingUnresolved)refuse();
 requirePrimitiveFloat({type:leaf},span);originalSharedF64CopySource();
 // Return one complete source pointee, including remaining reference/lifetime.
 return type.rustReference.pointee;
}
