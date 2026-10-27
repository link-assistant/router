# Shared checked signed negation draft

This implementation and every new case are source drafted, unrun. It certifies
no current coverage increase, source-history qualification, strict TS result,
full synchronization, source-bank/export freshness, performance or green gate.

Five actual signed fixed widths use the existing shared arithmetic carrier for
checked unary negation. The ABI supplies one value, a literal null second slot,
actual width, true signedness and the literal neg operation. Runtime evaluation
checks the domain, refuses unsigned and nonnull second slots, evaluates no
coercion and returns the exact negative. Negating signed minimum throws the
original RangeError message, attempt to negate with overflow. Binary operations
retain their existing two-operand contract; the TS declarations have distinct
unary and binary overloads.

Forward selection requires actual by-value native identities, the original
checked unary semantics and a signed result matching the operand. The shared
emitter evaluates the original argument once. All seven reverse profiles consume
only actual imported helper syntax with exact static metadata and the current
source-bound native type. Existing private body reissue, ownership, whole source
and semantic meta gates remain mandatory. Arbitrary raw BigInt unary minus
does not receive a fixed-range permission.

Rust emission eagerly binds the operand and selects the absolute native
checked_neg member through Option::expect with the exact original overflow
message. Canonical observations and the original helper inverse retain the
same domain, arity and message. Complete Rust reproduction authenticates the
whole original source; candidate observations grant no compiler authority.
Whole-project body synchronization composes the actual unary helper alongside
existing binary helpers and retains all source/Cargo/current-runtime guards.

Ten whole source equations retain complete originals, native declaration/type
alias owners, both language/repository phases and full CST/inverse obligations.
Independent written cases cover five signed boundaries, exact errors, single
effectful operand execution, strict TS, full project sync, seven private reverse
profiles and interpreters, canonical Rust inverses, arity/type/metadata and raw
operator refusals. Rust edge oracle source is drafted for later gated CI.
Every new case and integrated source/native/production/freshness/parity/delivery
obligation remains unverified.
