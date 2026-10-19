Prepared a separate bounded exact binary64 decimal runtime draft for locked
serde_json float_roundtrip. It shares neutral BigInt rational/ties-even rounding
with Rust literals while retaining separate lexical grammar, overflow-lint and
resource policies. Default JSON numeric semantics and CURRENT Cargo parser
admission remain unchanged. Private candidate metadata verifies all twenty
original de/lexical source members and actual feature activation, but does not
yet assert algorithm equivalence or parsing admission.

Six new cases are authored and UNRUN: independent normal/subnormal/max-finite
boundaries, exponent/negative-zero grammar, sealed contexts, resource refusals,
descriptor-only byte inputs, and a strict-TS/JS runtime declaration carrier.
This carrier is not an original production body admission. No additional archive
bytes, Rust execution, corpus output or full application effect/parity claim.
