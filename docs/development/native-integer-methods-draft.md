# Shared native integer value methods source draft

Eight existing value operations now have an explicit native primitive ABI:
saturating add/subtract/multiply, wrapping add/subtract, min, max and clamp.
Their runtime uses a complete local source copy of the existing fixed-integer
implementation, with its original retained unchanged. Ten immutable runtime
specializations provide signed/unsigned 8/16/32/64/128-bit behavior. Compiler
source/proof/result caching is unchanged. Argument ranges, native wrapping,
saturation and reversed clamp errors retain the original implementation.

The actual forward emitter selects this presentation only after the existing
fixed contract checks and when result/operand identities prove the same actual
by-value native integer. Pointer, unresolved, checked Option and other contract
forms keep their existing factory path. Contract assumptions and whole checked
meta remain; the new presentation cannot create a type or owner. The original
factory observation/refusal tests retain their full path through the existing
pointer profile, while the new native presentation has separate complete cases.

All seven reverse profiles read genuine current runtime imports, literal method,
width and signedness, exact arity and full current source. Shared metadata,
Rust/TS emission and both interpreters preserve one left-to-right operand
evaluation. Rust output uses absolute primitive or Ord function paths, avoiding
user-scope trait selection. Canonical inverse readers observe those exact native
operands and require full original Rust reproduction. The actual imported-helper
body synchronizer proposes the original native method and still freshly checks
the whole project, entire target, executable/refusal census and paired sources.

One shared finite catalogue drives registrations and formatting; independent
boundary expectations do not come from it. Eighteen whole source equations
retain every original, both fixed phases and complete inverses, including the
full original fixed runtime. Unrun runtime/forward/meta/strict TS/whole-project
sync/seven-profile/reverse/canonical/legacy/refusal cases cover all 80 method/type
combinations, with a CI-only ten-width native Rust oracle. All new checks remain
**unrun**. No actual production coverage, performance, freshness, parity or full
translation result is claimed; every remaining ledger requirement remains open.
