// Generated from pinned Rust 1.89 Unicode property meta; see generate-whitespace-data.mjs.
export const RUST_WHITESPACE_CODE_UNITS=Object.freeze([9,10,11,12,13,32,133,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288]);
export function isRustWhitespaceCodeUnit(unit){
  for(let at=0;at<RUST_WHITESPACE_CODE_UNITS.length;at++)if(unit===RUST_WHITESPACE_CODE_UNITS[at])return true;
  return false;
}
