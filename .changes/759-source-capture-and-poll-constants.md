Source capture compares validated scalar token fields directly rather than
serializing and hashing each token repeatedly. A bounded private cache indexed
by complete immutable source strings reuses original item indexing, byte counts
and full-file hashes. Mutable token streams, source scopes and checked IR remain
freshly validated; no per-root constant-evaluation budget is increased.

The pinned Rust 1.89 Duration const profile now evaluates from_millis by dividing
before scaling its remainder. This restores the unchanged 25 ms and 50 ms polling
constants and the 20 ms durable lock polling constant, with original full-file,
declaration and body hashes checked independently in JS and strict compiled TS.
Pure boundary fixtures include u64::MAX milliseconds and rejected descriptors.
The source-only bounded benchmark compares identical input bytes and semantic
digests before and after the optimization; it makes no whole-corpus timing claim.
On Node 20.19.4, 128 declarations in the same 3,887-byte source had a three-run
median of 2,164.269 ms before and 561.323 ms after, following one warmup each.
The complete related eight-file scope passed 60 tests under Node and 60 under
Bun, including all existing source freshness and evaluation-limit regressions.
