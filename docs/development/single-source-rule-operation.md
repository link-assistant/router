# One bounded rule operation per complete source

`prepare-single-row-proof-byte-source.mjs` derives the actual whole-source
producer through native selections and serialized/reparsed CST substitutions.
The existing shared engine executes the original language and repository
sequences and both inverses in one authenticated operation per complete source.
The separately generated batched producer retains its three-row chunks.

Before using the shared result, the producer compares its complete before,
middle and after canonical wires with three independently reconstructed source
transports. It also checks the exact result/stage shapes, whole sources,
inverses, phase order and actual original rule IDs. The source-planning paths
share a language engine; these checks establish orchestration equivalence.
The original generic public CST operation tests remain independent controls of
that engine. No source, hash, owner, verdict or encoded result is cached across
invocations.

The original path remains available for larger inputs. Let `m0`, `m1`, `m2`
be the three canonical JSON lengths and `s0`, `s1`, `s2` the source lengths.
The shared path requires both the original 32 MiB canonical sum
`2*m0 + 3*m1 + m2` and the conservative UTF8 result bound `3*W` to fit, where
`W = 4*(m0+m1+m2) + 6*(2*s0+2*s1+s2) + 4096`.
Canonical JSON needs at most twice its units when JSON-quoted, raw source at
most six, and UTF8 at most three bytes per UTF16 unit. A failing eligibility
bound selects the original complete operations instead of widening a limit.
The actual large-source receiving case checks that fallback with the real
native checker and public CST operations.

The existing batch generator's reserved-binding refusal remains intact. A
reexport adapter names the same runtime without adding a colliding imported
property identifier to its original producer. Regenerate all five dependent
files with their actual producer and review complete source/CST inverses.

Current-source history joins exact known predecessor/successor strings through
the phase-source producer. Unknown physical sources remain refused. The parked
upstream TypeScript scheduling profile remains unqualified and disabled; this
change does not enable it or treat a public compiler identity as a closed
compiler operation.

Require complete original Node/Bun files and their original deadlines. A local
pass close to a deadline needs CI feedback; it is no whole-gate, runtime-parity
or current compiler/export qualification. Rust runs only in CI after all eight
JavaScript stages pass for the same immutable SHA.
