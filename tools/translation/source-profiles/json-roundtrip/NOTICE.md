This source-only candidate reuses the existing exact checksum-locked
serde_json-1.0.151.crate under ../json-macro. No archive is downloaded, installed
or duplicated. The frozen first draft pinned twenty original de.rs/lexical
members. This audit adds original build.rs/read.rs/error.rs: twenty-three
members (254,912 decoded bytes), including decimal fast/moderate/fallback
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

Source pins plus mathematical expectations do not prove every lexical branch.
A source-inferred769-digit integer zero-tail counterexample now blocks complete
equivalence of the4096-digit exact replacement. Its hand trace/reproduction and
the proposed768-digit proof boundary are retained under fixtures/json-roundtrip.
The source equivalence review, six original plus three new authored tests and
affected Rust/default JSON regressions remain UNRUN.
parseAdmission and algorithmEquivalenceVerified stay false. CURRENT guard82→225
still denies actual root float_roundtrip parsing, until a separately reviewed
private capability dispatch is integrated. No complete allocation/OOM/drop,
application effect or native runtime parity is asserted. Scratch and BigInt
allocation remain explicit effect obligations under successful-resource bounds.
