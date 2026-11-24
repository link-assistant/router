// Classify observations from the original checked signature. No type permit.
export function observedSourceF64(type){
 return !!type&&type.kind==='float'&&type.rustPrimitiveName==='f64'&&type.rustSourceType===true&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&!type.rustBorrowLifetime;
}
