# Ordinary resolver allocation investigation

The complete ordinary planner still has no qualified generation result. The
previous 512 MiB diagnostic heap failed during the `Default` context's final
resolver, at `TokenClaims`; this was before the outer project namespace finished.
Its 52243 complete JSON events include six ordinary resolver starts and one bang
resolver start. The latter began at 456138.63 ms. This diagnostic heap is smaller
than the unchanged CI worker heap and does not establish CI's failure cause.

The complete `rust/src/token.rs` parent succeeds in a separate one-file graph
with the production profile: 2.82 seconds, sampled cgroup peak 1706348544 bytes.
It produces one genuine `TokenClaims` input certificate, but all four output
owners remain refused. This does not reproduce the whole-crate failure or
establish an executable-function gain. The preceding null-profile attempt
produced no certificates; the first incorrectly composed external-table attempt
failed its existing private-origin check. All terminal streams remain preserved.

A separate native inspector sample stops deliberately at 400 MiB heap, before
the known failure. It exits zero in 72.99 seconds, with sampled cgroup peak
2159521792 bytes, after 17296 checkpoints. Its complete compressed profile is
`ordinary-retained-allocation-profile.json.gz` in the restart evidence directory:
139728 logical bytes, SHA-256
`f7204a7480ea7125f783b1449391b390305dde12ebd70af415f7e837fb03f3e8`.
The retained sample estimates 295976224 bytes across 151 sites. Large sites are
the CST construction and source-view token copies; sampling does not prove a
leak or explain later proof-construction costs. No installed compiler source,
JSON intrinsic, private issuer, original test deadline or gate is changed.

A second complete profile stops at `resolver-bang-start`, immediately before
the nested final resolver. It exits zero in 368.68 seconds, with sampled cgroup
peak 2497454080 bytes and 45387 checkpoints. Heap used at that boundary is
568931944 bytes, under a 768 MiB old-space diagnostic limit. The complete
`ordinary-proof-interval-profile.json.gz` contains 3933844 logical bytes,
SHA-256 `d0a3236779c28017d77698d2ace3e90634f201317d51b0e8605785e237154d9d`.
Every CPU node, sample delta and allocation stack is inspected. The 35657 CPU
samples cover 367.60 seconds. Aggregated self time includes garbage collection
(32.75 seconds), hash updates (27.93), proof serialization (21.83), source-meta
visitation (20.49), frozen JSON composition (16.75), intrinsic guards and source
module key serialization. No single site dominates or establishes the cause of
CI's unchanged timeout. This working set also exceeds the earlier 512 MiB
diagnostic heap; that earlier failure does not establish a CI heap failure.

A separate resolver interval reaches 47435 checkpoints, exactly 2048 after
the same final resolver starts. It stops at `client_command_token.rs`, before
`TokenClaims`, in 385.08 seconds, with sampled cgroup peak 2709692416 bytes.
The 19.32-second CPU interval contains 1889 samples; the complete profile has
667608 logical bytes, SHA-256
`7275a1332092ecba0adf1cd947fb150797fcff896c1ee7ad357e86a210695dae`.
Heap used at this boundary is 647970240 bytes. Immutable JSON composition,
proof serialization, hashing and garbage collection remain substantial costs.
This deliberate early stop supplies neither a complete planner result nor a
measurement of the original CI test's duration.

The diagnostic shared project scope reaches that exact same source, stage and
checkpoint boundary. It keeps the nonrefundable 4096-admission limit and current
private issuers. Total observed duration is 376.43 seconds, but the resolver CPU
interval increases from 19.32 to 20.44 seconds and boundary heap used increases
from 647970240 to 660712096 bytes. The complete candidate profile has 636727
logical bytes, SHA-256
`10a7319945c9166ba7237593779eecccf650f6982247d011558c7f604ab2812c`.
The sampled total cgroup peak is 2090897408 bytes; cgroup values include other
container memory and cannot establish a compiler memory improvement. These
single diagnostic trials do not qualify a speed gain, complete output
equivalence or an original receiving deadline. The candidate is not installed.

The inspected CI logs explicitly install Node 20.20.2. Its actual `Hash`
constructor differs from the pinned 20.19.4 constructor by a deprecation-warning
path. The existing bulk-operation ABI guard therefore remains refused. Neither
the version nor its complete function-source pins have been relaxed.

After verifying complete archive hashes and every selected original member,
inactive duplicate evidence retirement reclaims 230936576 allocated bytes.
All 229414797 original bytes remain in their verified public packets. Current
producer inputs and the preceding complete CI cycle are excluded. The first
cleanup harness failed before unlinking; its source and terminal log remain.

The alias probe separately retains the full parent and exact selected original
declarations. The isolated selection exposes a missing standalone format-capture
dependency, while the complete parent retains a different namespace refusal.
Adding a captured name without lexical shadowing and genuine namespace evidence
would be unsound. No speculative capture repair is installed or counted.

The diagnostic scripts and full source equations are under
`experiments/issue-784/`. The fresh native parser is TypeScript 5.9.3. Original
and diagnostic sources, both CST phases, inverses, complete output hashes,
terminal logs and cgroup receipts are retained. Ordinary generation, owned
matrix generation, strict parity, original receiving deadlines and the full
JavaScript gate remain unfinished; no Rust tool has run locally.
