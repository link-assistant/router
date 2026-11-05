// These are source-analysis equations over freshly constructed expressions.
// They issue no caller. The private whole-source checker recreates every flag.
import {ownedPrimitiveOptionOperation,ownedPrimitiveOptionAbsent} from './owned-primitive-option-contracts.mjs';
import {ownedTextOperation} from './owned-text-contracts.mjs';
export function hasOwnedStaticOptionalLoan(value,{stringLoan}={}){
 if(!value||value.type!=='str-option-ref'||value.root!==null)return false;
 if(value.kind==='option-none'||ownedPrimitiveOptionAbsent(value))return true;
 if(value.kind==='option-some')return stringLoan(value.value)?.root===null;
 if(value.kind==='primitive-option-call'){const row=ownedPrimitiveOptionOperation(value.name);return row?.method==='some'&&stringLoan(value.args[0])?.root===null;}
 if(value.kind==='text-call'){const row=ownedTextOperation(value.name);return row?.root!==null&&row?.root!==undefined&&stringLoan(value.args[row.root])?.root===null;}
 if(value.kind==='choose')return hasOwnedStaticOptionalLoan(value.then,{stringLoan})&&hasOwnedStaticOptionalLoan(value.else,{stringLoan});
 return ['variable','local-call','primitive-option-callback-call','primitive-result-call'].includes(value.kind)&&Object.hasOwn(value,'staticOptionalBorrow')&&value.staticOptionalBorrow===true;
}
