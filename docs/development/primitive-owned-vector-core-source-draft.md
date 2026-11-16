# Bounded owned primitive vector core source draft

Status: source drafted, all execution UNRUN. This separate paired library has
88 operations: new, from-slice copy, push, append, truncate, replace, length and
copied lookup for bool and all ten fixed integer widths. It does not modify the
original unbounded readonly slice APIs or older vector readers.

The Rust library uses actual by-value Vec arguments for consuming updates and
shared Vec references for nonescaping reads. Its native internals remain
intentionally untranslated. JavaScript represents values as frozen, ordinary,
dense arrays with exact scalar domains. Copy and update results are immutable;
only the independent source checker may establish that a caller's original
value has moved or a shared receiver is live. Readonly syntax or this carrier's
shape cannot itself grant native ownership or source/namespace authority.

Both implementations explicitly enforce 4096 values. Native constructors and
updates check that bound; it is not a JavaScript-only restriction on otherwise
supported native calls. Runtime preflight rejects proxy/mutable/nonordinary
carriers and oversized arrays before full element traversal. Lookup and truncate
validate u64 indices, convert to host indexing only after a small proven bound,
and preserve huge valid indices as absence or no truncation. Scalar lookup
returns copied Option values, including false/zero/extrema, and never a loan.
No input, result, proof, source or owner cache crosses operations.

Strict declarations and finite operation DATA describe consumed/shared operands
and both rule sequences. Their caller/source/namespace/root/receiving flags all
remain false. Six complete source equations retain original paired sequence
implementations, actual compiler sources, full CST/inverses and ordered language
then repository phases. Independent JavaScript/strict TS case source and CI-only
native oracles cover all eight operations and domains, extrema, copied values,
consuming-update results, cap edges, missing/huge indices, malformed carriers,
proxy/getter/coercion refusal and source inverses. Every case is UNRUN.

Private full caller/type/move/loan integration, original native owned-Vec source
qualification, canonical inverse, native forward emission, runtime/source asset
registration, root/history installation and actual production adoption remain
OPEN. Existing mutable Vec literal carriers cannot be passed blindly into this
new immutable representation. Their migration requires explicit compiler rules
and complete reissue. The new Rust file is not yet a root module; its oracle
uses an explicit test source path and can run only after same-SHA JS gates.

No local compiler, parser, translator, preparer, tests or Rust tools ran.
All exported receiving/freshness/resource evidence is UNRUN. CI feedback remains
uninspected; full bulk drafting and complete synchronization remain OPEN.
