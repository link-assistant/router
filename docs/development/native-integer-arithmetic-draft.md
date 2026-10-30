# Shared checked integer arithmetic draft

This implementation and all new cases are source drafted, unrun. No current
coverage increase, source-history qualification, full synchronization parity,
performance result, source-bank/export freshness or green gate is established.

Five checked native operations add/sub/mul/div/rem now share an exact BigInt
runtime across the ten by-value fixed widths. Input domains remain explicit
native ABI preconditions. Addition, subtraction and multiplication check the
mathematical result before returning. Division truncates toward zero; remainder
has the dividend's sign. Zero divisors and signed minimum divided or remaindered
by minus one fail before returning a result. The complete existing panic-message
implementation is copied locally, and original RangeError messages are retained.
Pointer/generic/borrowed/float arithmetic keeps its existing separate path.

Forward presentation selects only existing checked binary IR with exact actual
primitive identities on both operands and result. Division/remainder must retain
Rust truncating rounding and abort-on-zero semantics. Operand expressions emit
once in source order. This changes presentation, with the existing parser,
private semantic checks and serialized/reparsed semantic-meta boundary intact.

All seven reverse source profiles recognize the actual imported five-argument
runtime helper with literal width, sign and operation and exact source-bound
native operand types. Shared carriers drive strict TS, normal/prepared/batch
interpreters and Rust emission. Rust eagerly binds operands and uses absolute
primitive checked methods and Option::expect, with exact original overflow
messages; division/remainder include the explicit zero-divisor assertion.
This preserves checked overflow independently of Rust release build settings.
Raw unchecked BigInt arithmetic does not gain fixed-range permission.

Canonical Rust observations select the exact qualified checked-call/panic
adapter with same-domain source observations. The existing complete function
and source reproduction still authenticate every guard and message; observation
metadata grants no compiler authority. Actual imported helper observations also
compose into whole-project numeric-body synchronization. Fresh runtime source
pairs, native binding census, all original Rust/Cargo inputs, exact spans,
whole target reproduction and complete source inverses remain required.

Eighteen whole source equations include the unchanged original panic module,
complete current compiler copies, native owners and both language/repository
rule phases. Independent written runtime, forward, full-project sync and seven
reverse matrices cover every width/operation, boundaries, exact errors, division
rounding, effects/operand order, private metadata tampering, canonical guards,
inverses, inactive profiles, malformed metadata and raw arithmetic refusals.
Native edge oracles are written for later CI after all eight same-SHA JavaScript
gates. Every new case and integrated qualification obligation remains unrun.
