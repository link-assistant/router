This source-only candidate reuses the existing exact checksum-locked
serde_json-1.0.151.crate under ../json-macro. No archive is downloaded, installed
or duplicated. Its manifest now pins all twenty original de.rs/lexical members
(203,444 decoded bytes), including the original decimal fast/moderate/fallback
algorithms, half-way comparison, cached power tables, binary64 parameters and
rounding. Original MIT/Apache license members remain verified in that profile.
The lexical files retain their original rust-lexical adaptation notices.

Candidate dependency/feature context is private and must match the actual locked
Cargo.toml/Cargo.lock production incoming feature closure: std, serde_core/std
and float_roundtrip, with arbitrary_precision/preserve_order excluded. It does
not infer macro, caller type, generated trait or runtime owner from spelling.

The draft shares exact nonnegative rational rounding with the existing Rust
literal converter. The owners keep separate grammars, overflow policies and
resource-domain bounds. JSON number classification/negative zero/exponent
overflow follow the pinned de.rs Value-f64 branches; f32 is not covered.
JSON syntax errors use the existing byte reader. Bound failures are explicit
adapter-domain RangeError values, not fabricated serde_json errors.

Twenty source pins plus mathematical expectations do not prove every lexical
fast/moderate/fallback algorithm branch. The source algorithm equivalence review,
six new authored tests and affected Rust/default JSON regressions remain UNRUN.
parseAdmission and algorithmEquivalenceVerified stay false. CURRENT guard82→225
still denies actual root float_roundtrip parsing, until a separately reviewed
private capability dispatch is integrated. No complete allocation/OOM/drop,
application effect or native runtime parity is asserted. Scratch and BigInt
allocation remain explicit effect obligations under successful-resource bounds.
