# Fixed-integer arithmetic contracts

These adapters are independently implemented from the pinned Rust 1.89 primitive
arithmetic and Ord contracts. No Rust source function is substituted, and no Rust
compiler or executable was used. Exact source hashes and primary URLs appear in
../fixtures/rust-fixed-integer-sources.json.

The factory specializes only an actual checked fixed integer. Checked results
use registered standard Option provenance. Ordinary Ord methods remain distinct
from const-eligible arithmetic. Typed domain failure is distinct from the source
clamp panic; neither becomes a fabricated successful result.

The implementation excludes floating point, mixed signed operands, wrapping and
unchecked arithmetic, division, clocks, arbitrary trait implementations and
alternate pointer-width profiles. Frontend instantiation and dependency checking
are required before any original caller becomes executable. Runtime parity
remains false.
