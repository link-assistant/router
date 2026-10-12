# Original fixed range reversal through checked meta

Exact source `625d2aa729420b288bc0c092fe1d6bece88dd884` passed all 175 cases
across nineteen files in Node (58.509 seconds) and Bun (41.636 seconds).
Both engines retained the same 1,468-input digest
`5c1b468a67058353c2e1b9c0a91c9776d16a1337ebd5204bcdc2d1ec0753efec`.
There were no failures, skips or timeouts; Node also reported zero cancellations.
Bun does not expose a separate cancellation count.

Eight new cases cover fresh fixed-integer `Range` and `RangeInclusive` through
the original `Rev::next` and `TrustedStep` backward transitions, signed and wide
endpoints, empty/equality cases, lazy adapters, source loop control, once-only
left-to-right endpoint effects, original project closure and exact meta proofs.
The same cases execute emitted JavaScript and independently strict-compiled
TypeScript. Original application Rust bodies and Cargo inputs are unchanged.
The other 167 cases retain the prior pattern/enumerate and ownership regressions.

The initial pair at `c6fa39144089c3d29d61e16ff9c12c4de00da3cc` passed 174/175
under each engine. Its sole failure used the typed test helper's result argument
as the effects runtime. The additive fourth callback context now supplies the
actual runtime of each target while retaining the first three callback arguments.
The original endpoint-order fixture body and expected behavior are unchanged.

The receipt and deterministic compressed archive preserve all four complete raw
attempts, input manifests, timings, resource observations, the immutable harness,
archive builder and exact base/current-published comparison. All fifteen members
were reopened and verified; two identical input manifests use archive hardlinks.
The Root base and current published head differ only in five changelog/docs/
evidence paths. Existing tracked generated fixtures were materialized earlier
from exact original Git blobs, without a producer or mutable worktree copy.

This is focused evidence. No canonical or profile-matrix producer, complete gate,
Rust build or corpus gain ran here. Stored/custom/borrowed range owners, reversed
adapters, specialized terminal/backward consumers and complete namespace, trait,
allocation and runtime parity remain unproved. Resource observations are
`RUSAGE_CHILDREN` maxima per terminated owned child, not aggregate sampled peak
RSS or footprint. Full strict parity remains blocked elsewhere in this cycle.
