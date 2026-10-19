The runtime draft executes the original serde_json1.0.151 f64 lexical branch
structure on at most768 raw mantissa digits. The exact original cached_float80
source is retained as licensed data with SHA-256 verification. The package
archive, full23 original source members and licenses are independently pinned
by the portable source profile. Bundled MIT/Apache texts apply to source data.

Fast/moderate acceptance, upper-product rounding, normalization, error counters,
downward candidate, half-way comparison and positive hi64/sticky native rounding
are preserved rather than replaced by ideal rounding. The reusable mantissa
operation deliberately retains the source's unconditional sticky injection for
larger integer tails; the JSON reader still refuses those inputs as an explicit
unsupported domain. The769-digit discrepancy is SOURCE-INFERRED, not measured
with Rust. Existing default JSON numeric parsing and its guard are unchanged.

These direct-branch cases are UNRUN. Branch fidelity, bounded limb arithmetic,
source feature-directed admission and source identity remain review/test
obligations. Runtime/native parity and complete allocation/OOM/drop/application
effects are not asserted. Arithmetic uses the declared ordinary IEEE binary64
nearest-even environment and successful resource assumptions.
