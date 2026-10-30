// Structural DATA only. Complete fresh source flow must establish every root.
import {httpResourceResult} from './http-resource-caller-contracts.mjs';
export function hasHttpResourceBorrowedReference(type,depth=0){
 if(typeof type!=='string'||depth>8)throw new TypeError('Closed shared HTTP result reference domain required');
 if(['str','json-ref'].includes(type))return true;if(type.startsWith('optional:'))return hasHttpResourceBorrowedReference(type.slice(9),depth+1);const result=httpResourceResult(type);
 return !!result&&hasHttpResourceBorrowedReference(result.value,depth+1);
}
