// Rust implements Pattern for &&str explicitly; this is a trait argument
// contract, not a conversion of a shared reference into a by-value string.
export const STANDARD_STR_PATTERN_PROFILE=Object.freeze({
  id:'rust-1.89-shared-str-pattern',rust:'1.89.0',
  url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/str/pattern.rs',
  sha256:'22d0e4e3e51a3a55dfaf16a5559117899bbeb4a53dc8ed8b6837b38dd4cf518a',
  lines:Object.freeze([950,956,972,1005]),
});
const sharedMarkers=new Set(['shared source reference','shared iterator item']);
const borrowedStr=type=>type?.kind==='string'&&type.rustSourceType===true&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;

export function sharedStrPatternProof(type,span) {
  const reference=type?.rustReference,pointee=reference?.pointee;
  if(!borrowedStr(type)||!sharedMarkers.has(type.patternOwnershipRefusal)||reference?.kind!=='shared'||!borrowedStr(pointee)||pointee.rustReference||pointee.patternOwnershipRefusal)return null;
  return {profile:STANDARD_STR_PATTERN_PROFILE.id,implementation:'Pattern for &&str',argumentType:structuredClone(type),span:{...span}};
}
