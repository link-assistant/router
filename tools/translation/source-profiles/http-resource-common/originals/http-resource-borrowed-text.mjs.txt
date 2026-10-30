// A structural DATA query only. The whole fresh source checker issues roots.
import {httpResourceResult} from './http-resource-caller-contracts.mjs';
export function hasHttpResourceBorrowedText(type,depth=0){
 if(depth>8)throw new TypeError('Closed HTTP borrowed result nesting bound');
 if(type==='str')return true;const result=httpResourceResult(type);
 return !!result&&hasHttpResourceBorrowedText(result.value,depth+1);
}
