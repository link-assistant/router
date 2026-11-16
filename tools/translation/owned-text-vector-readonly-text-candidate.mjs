// Descriptor-only candidate DATA. The private parent must independently join
// the actual completed caller/callee, source receipt, ownership and exact types.
import {types} from 'node:util';
import {hasSourceBorrowedStrSignature} from './extensions/source-contract-types.mjs';
const parent=Object.getPrototypeOf,descriptor=Object.getOwnPropertyDescriptor,ordinary=Object.prototype,invalid=Symbol('invalid-source-field');
function field(value,name){if(!value||typeof value!=='object'||types.isProxy(value)||![null,ordinary].includes(parent(value)))return undefined;const row=descriptor(value,name);return !row?undefined:Object.hasOwn(row,'value')?row.value:invalid;}
export function borrowedScalarTextCandidate(type){
 if(field(type,'kind')!=='string')return false;for(const name of ['rustReference','patternOwnershipRefusal','rustGenericIdentityUnresolved','rustBorrowingUnresolved'])if(field(type,name)!==undefined)return false;
 const ownership=field(type,'rustOwnership');if(field(ownership,'kind')!=='borrowed'||field(ownership,'source')!=='str')return false;const signature=field(type,'rustStandardSignature');return signature===undefined||hasSourceBorrowedStrSignature(type);
}
export function borrowedScalarTextHelperCandidate(entry){
 const parameters=field(entry,'params');if(!Array.isArray(parameters)||types.isProxy(parameters)||parent(parameters)!==Array.prototype)return false;const size=descriptor(parameters,'length');if(!size||!Object.hasOwn(size,'value')||!Number.isSafeInteger(size.value)||size.value<0||size.value>64)return false;
 for(let at=0;at<size.value;at++){const row=descriptor(parameters,String(at));if(row&&Object.hasOwn(row,'value')&&borrowedScalarTextCandidate(field(row.value,'type')))return true;}return false;
}
