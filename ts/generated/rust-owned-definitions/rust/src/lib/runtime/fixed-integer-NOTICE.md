# Fixed-integer arithmetic contracts

These adapters are independently implemented from the pinned Rust 1.89 primitive
arithmetic and Ord contracts. No Rust source function is substituted, and no Rust
compiler or executable was used. Exact source hashes and primary URLs appear in
../fixtures/rust-fixed-integer-sources.json.

The factory specializes only an actual checked fixed integer. Checked results
use registered standard Option provenance. Ordinary Ord methods remain distinct
from const-eligible arithmetic. Typed domain failure is distinct from the source
clamp panic; neither becomes a fabricated successful result.

The implementation excludes floating point, mixed signed operands, unregistered wrapping operations and
unchecked arithmetic, division, clocks, arbitrary trait implementations and
alternate pointer-width profiles. Frontend instantiation and dependency checking
are required before any original caller becomes executable. Runtime parity
remains false.

The separate source-only fixed-wrapping draft adds only `wrapping_add/sub` for
actual checked signed/unsigned fixed primitives through128bits. The original
primitive `Self`/width invocation, complete macro member and generic modulo
intrinsic are retained in `source-profiles/fixed-wrapping/`; the new authored
cases are unrun. This is not whole-macro expansion, whole-core or formatter
authority. Pointer profiles, mixed operands and custom numeric owners refuse.
The existing source receipt describes the earlier checked/saturating/Ord scope.
