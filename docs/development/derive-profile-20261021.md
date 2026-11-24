# Complete derive performance diagnostic

Two source-generated arithmetic-retention candidates were measured against every
original case in `derive-bang-context.test.mjs`, with all source and deadlines
unchanged. The first retained complete roots or completed subtrees of at least
64 cells inside the existing invocation-only 32,768-record limit. The second
also restored the original global-root lookup before the invocation guard.
Neither changed the global retention policy or source/owner checks.

Both runs had all 12 passing Node assertions but failed the independent original
60,000 ms deadline: 84,225.163 ms (`complete-BiWWCE`) and 84,862.990 ms
(`complete-EHBkiD`). Their complete source proposals, CST/native inverses, raw
streams and deadline audits remain retained. Neither establishes a performance
pass or measured speed gain. Both producer and runtime files were restored
exactly from reviewed checkpoint `80bec04ad595fc4a2ca70612710325d7d6956505`.

The separate complete-file V8 CPU diagnostic retains every original workload.
Its original long case takes 90,562.362 ms, so its command exit zero is not a
deadline qualification. Complete source snapshots rejoin all 2,235 inputs before
and after profiling. The full native profile was compressed, reopened and
verified before its task-owned raw copy was removed.

Sampled costs identify repeated full binding-data hashing and metadata work as
major costs. Hash-module self samples total about 21.0 seconds; private frozen
JSON, intrinsic guards, builtin source metadata and private native JSON account
for about 12.0, 11.6, 10.3 and 9.5 seconds respectively. Garbage-collection samples
account for about 9.6 seconds. These are profiler estimates across the complete
file, not separately measured wall-clock phases or speed comparisons.

The largest hash-update stacks reach the original `attributeOwners` complete
binding digest. Fresh source, owner and hash checks remain required; the
profile does not authorize a new source or verdict cache or an altered proof.
Further work must preserve original observations and refusal boundaries, or
introduce and independently qualify a separately explicit data-format contract.

Complete evidence remains under `router-invocation-priority-source-v1`,
`router-invocation-profile-inputs-v1` and the corresponding bounded monitors.
No Rust tools ran, no deadline increased and no reduced workload qualified.
