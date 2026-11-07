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
