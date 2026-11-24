# Native integer complement source draft

Rust `!value` on an actual by-value fixed integer now has a dedicated checked
meta operation and a shared BigInt runtime helper for all ten native widths.
The checker retains primitive identity, width, signedness, ownership and expected
type checks. Borrowed, pointer-sized, custom and unresolved generic domains remain
refused. Boolean negation keeps the ordinary checked unary representation; its
operand is checked once and passed through the existing Boolean coercion.

The forward emitter uses the explicit primitive runtime import and checked meta;
the bounded constant evaluator traverses the actual operand and computes the
fixed-width complement. Seven reverse source profiles recognize only the
actual current helper import with literal native metadata, preserving complete
source/private checks and full checked meta. Shared Rust/TS emission and both
interpreter paths retain one operand evaluation. Canonical Rust inverse readers
observe the native operand and reissue the helper proposal, then require full
fresh Rust reproduction. Ordinary Boolean inverse projection remains unchanged.

The original-import source observer also proposes complement syntax through the
existing whole-project numeric and composite body synchronizers. Their complete
project type checking, census, source guards, paired target reproduction and
Git-aware physical transactions remain mandatory. Source observations and public
operation metadata grant no new owner, trait or executable authority. Both fixed
substitution phases, full original sources/CST and complete inverses remain.

Seventeen whole compiler/runtime source equations, unrun forward/runtime/constant/
meta/strict TS/all-seven-reverse/canonical-inverse/synchronization/refusal cases
and a CI-only ten-width Rust oracle are drafted. All new checks are **unrun**;
no coverage, performance, freshness, parity or complete translation result is
claimed. Every remaining ledger requirement stays open.
