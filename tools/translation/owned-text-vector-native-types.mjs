// Actual checked type observations only; no flag or returned DATA issues IR.
import {sameType} from './checked-types.mjs';
import {forwardOwnedString} from './owned-forward-domain.mjs';
import {SOURCE_STRING} from './extensions/source-contract-types.mjs';
import {currentSharedReferenceCopyIdentity} from './current-standard-copy-source.mjs';
export function actualOwnedTextVector(checker,type,node,path=[]){
 if(type?.kind!=='array'||type.rustSourceType!==true||type.rustOwnership?.kind!=='owned'||type.rustOwnership.source!=='Vec'||type.rustReference||type.rustFixedArray||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||![undefined,'ownership-bearing Vec type'].includes(type.patternOwnershipRefusal)||!forwardOwnedString(type.element))return false;
 checker.expectedOwnership(type.element,SOURCE_STRING,path,node.span);return true;
}
function reference(type){const row=type?.rustReference;return row?.kind==='shared'&&row.pointee&&!row.pointee.rustReference&&type.patternOwnershipRefusal==='shared source reference'&&row.tokens?.[0]?.value==='&'&&Number.isInteger(row.span?.start)&&Number.isInteger(row.span?.end)&&row.span.start>=0&&row.span.end>=row.span.start&&currentSharedReferenceCopyIdentity(type);}
export function actualSharedTextVector(checker,type,node,path=[]){
 if(type?.kind!=='array'||type.rustSourceType!==true||type.rustFixedArray||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||type.rustOwnership?.source!=='Vec'||!['owned','borrowed'].includes(type.rustOwnership.kind)||!reference(type)||!sameType(type.element,type.rustReference.pointee.element)||!actualOwnedTextVector(checker,type.rustReference.pointee,node,path))return false;
 checker.expectedOwnership(type.element,type.rustReference.pointee.element,path,node.span);return true;
}
export function actualOwnedTextSlice(checker,type,node,path=[]){
 const shape=value=>value?.kind==='array'&&value.rustSourceType===true&&value.rustOwnership?.kind==='borrowed'&&value.rustOwnership.source==='slice'&&!value.rustFixedArray&&!value.rustGenericIdentityUnresolved&&!value.rustBorrowingUnresolved&&forwardOwnedString(value.element);
 if(!shape(type)||!reference(type)||!shape(type.rustReference.pointee)||type.rustReference.pointee.patternOwnershipRefusal||!sameType(type.element,type.rustReference.pointee.element))return false;
 checker.expectedOwnership(type.element,SOURCE_STRING,path,node.span);checker.expectedOwnership(type.rustReference.pointee.element,SOURCE_STRING,path,node.span);return true;
}
