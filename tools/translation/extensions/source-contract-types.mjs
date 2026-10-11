// Actual Rust source qualifiers for registered standard-library signatures.
// Portable runtime schemas deliberately project these qualifiers separately.
export const SOURCE_STR=Object.freeze({kind:'string',rustOwnership:Object.freeze({kind:'borrowed',source:'str'})});
export const SOURCE_STRING=Object.freeze({kind:'string',rustOwnership:Object.freeze({kind:'owned',source:'String'}),patternOwnershipRefusal:'owned String source type'});
export const sourceVector=element=>({kind:'array',element,rustOwnership:{kind:'owned',source:'Vec'}});
export const sourceShared=pointee=>{const {rustBorrowLifetime,...portable}=pointee;return {...portable,...(pointee.rustOwnership?.kind==='owned'?{rustOwnership:{kind:'borrowed',source:pointee.rustOwnership.source}}:{}),patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee:structuredClone(pointee)}};};
