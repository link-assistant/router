Source-only audit identified a source-inferred integer-padding discrepancy in
the pinned serde_json lexical fallback: a769-digit integer encoding an exact
binary64 halfway value can have an all-zero discarded integer tail, while the
fallback appends a synthetic sticky one. Exact nearest-even projection and
pinned fallback behavior then differ. This is not a Rust-observed result.

Added three UNRUN arithmetic/source-trace cases, full licensed input pins,
explicit reproduction text and hand trace. A private original-array verifier
checks normalized cached-power arithmetic only; complete coefficient error
propagation, parser algorithm equivalence and admission remain false. No current
Cargo guard, default parser or application/native parity is promoted. A narrower
at-most768-total-mantissa-digit profile still requires the moderate-path error
proof, including the one truncated prefix whose multiply-by-ten fits u64.
