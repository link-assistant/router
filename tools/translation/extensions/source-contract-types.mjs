// Actual Rust source qualifiers for registered standard-library signatures.
// Portable runtime schemas deliberately project these qualifiers separately.
import {types} from 'node:util';
export const SOURCE_STR=Object.freeze({kind:'string',rustOwnership:Object.freeze({kind:'borrowed',source:'str'}),rustStandardSignature:Object.freeze({kind:'borrowed-str',origin:'registered-standard-library-signature'})});
export const SOURCE_STRING=Object.freeze({kind:'string',rustOwnership:Object.freeze({kind:'owned',source:'String'}),patternOwnershipRefusal:'owned String source type'});
export const sourceVector=element=>({kind:'array',element,rustOwnership:{kind:'owned',source:'Vec'}});
export const sourceShared=pointee=>{const {rustBorrowLifetime,...portable}=pointee;return {...portable,...(pointee.rustOwnership?.kind==='owned'?{rustOwnership:{kind:'borrowed',source:pointee.rustOwnership.source}}:{}),patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee:structuredClone(pointee)}};};

// Data comparison only. Actual caller/source/layout checking supplies authority.
// copyMetadata deliberately permits ordinary and null-prototype own-data records.
const signatureProxy=types.isProxy,signaturePrototype=Object.getPrototypeOf,signatureDescriptors=Object.getOwnPropertyDescriptors;
const signatureKeys=Reflect.ownKeys,signatureOwn=Object.hasOwn,signatureObjectPrototype=Object.prototype;
function signatureFields(value){
 if(!value||typeof value!=='object'||signatureProxy(value))return null;
 const prototype=signaturePrototype(value);if(prototype!==null&&prototype!==signatureObjectPrototype)return null;
 const fields=signatureDescriptors(value),keys=signatureKeys(fields);
 for(const key of keys){if(typeof key!=='string')return null;const field=fields[key];if(!signatureOwn(field,'value')||!field.enumerable)return null;}
 return fields;
}
const signatureValue=(fields,key)=>fields&&signatureOwn(fields,key)?fields[key].value:undefined;
/** Exact registered borrowed-str signature representation, never a proof token. */
export function hasSourceBorrowedStrSignature(type){
 const fields=signatureFields(type);if(!fields||signatureValue(fields,'kind')!=='string')return false;
 for(const name of ['rustReference','patternOwnershipRefusal','rustGenericIdentityUnresolved','rustBorrowingUnresolved'])if(signatureValue(fields,name)!==undefined)return false;
 const source=signatureValue(fields,'rustSourceType');if(source!==undefined&&source!==true)return false;
 const owner=signatureFields(signatureValue(fields,'rustOwnership'));
 if(!owner||signatureKeys(owner).length!==2||signatureValue(owner,'kind')!=='borrowed'||signatureValue(owner,'source')!=='str')return false;
 const signature=signatureFields(signatureValue(fields,'rustStandardSignature'));
 return Boolean(signature&&signatureKeys(signature).length===2&&signatureValue(signature,'kind')==='borrowed-str'&&signatureValue(signature,'origin')==='registered-standard-library-signature');
}
