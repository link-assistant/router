Exact official Rust 1.89.0 source files and versioned Reference are retained as
gzip archives with original/archive SHA256 and bounded decompression checks in
extensions/utf16-fixed-f64.mjs. Rust source licensing is MIT OR Apache-2.0;
the included license files match the already pinned primitive-float profile.

core str::encode_utf16 returns EncodeUtf16 over chars; its Iterator yields u16,
retaining the second surrogate for the next call. core char::encode_utf16_raw
contains the scalar-to-surrogate formula. alloc String Deref has Target=str.
The versioned Reference expr.as.numeric.int-as-float specifies closest floating
value with roundTiesToEven; integer-to-f64 does not overflow for Rust integer
types up to u128. Runtime profiles retain 64-bit usize/isize source identities.

This source-only draft has no floating CTFE, mutable/shared iterator ownership,
f32 conversion, custom Deref or escaping temporary String borrow authority.
Original URLs and exact bounded line ranges are in the registered profile.
