// Generated from the linked Rust numeric boundary policy. Do not edit.
/** @param {boolean} floating @param {boolean} trailingSeparator @param {string} suffix @param {boolean} continuedSuffix @param {number} followingCodeUnit @returns {boolean} */
export function acceptRustNumberDigitBoundary(floating, trailingSeparator, suffix, continuedSuffix, followingCodeUnit) {
  return floating || !trailingSeparator || (!continuedSuffix && followingCodeUnit < 128 && (suffix === "u8" || suffix === "i8" || suffix === "u16" || suffix === "i16" || suffix === "u32" || suffix === "i32" || suffix === "u64" || suffix === "i64" || suffix === "u128" || suffix === "i128" || suffix === "usize" || suffix === "isize"));
}
