# Receiving source successors after the 77e82f2bb checkpoint

This investigation accompanies [PR #785](https://github.com/link-assistant/router/pull/785).
Neither repair establishes complete translation, parity or a green gate.

## Complete CI failure set

All seven workflows at `77e82f2bbd75455fc29f5f4716b081644ed8e87c`
finished before another publication. The [main run](https://github.com/link-assistant/router/actions/runs/42382913262)
failed at 2026-11-07 15:43:44 UTC; six supplemental workflows skipped. All
complete workflow logs, job metadata and the three artifact ZIPs were retained.
Every ZIP member was read and its complete CRC/length/hash verified. There is
no missing secret or human-only prerequisite to skip.

| Stage | Evidence and remaining failure |
| --- | --- |
| Lint, native Node and native Bun | Pass; 259 native cases per engine. |
| TypeScript | Three ordinary profile trees pass with installed TypeScript 5.9.3. The complete owned matrix index is missing (workflow lines 4758 and 4771). |
| Strict parity | Stale `account_routing_policy.rs` source hash, 441 feature gaps and 12345 carried items (lines 2337–2341). |
| Profile matrix | The first ordinary worker exhausts its original 2048 MiB heap with SIGABRT; owned generation is unrun (line 2649, decoded complete child failure retained separately). |
| Forward | The original 60-minute job limit cancels the cohort. Its complete artifact retains 1975 emitted case records and 25 failure blocks, rather than a completed cohort audit. |
| Reverse | The original 15-minute limit cancels the cohort; its complete partial streams are retained without a terminal pass receipt. |
| Aggregate and Rust | Aggregate fails; Rust correctly remains skipped. |

The complete forward artifact's failures are indexed with full blocks and
original lines in `completed-forward-failures.json`. Eight actual-gain cases
need genuine current generation; the adoption child reaches its original
20-second deadline; corpus provenance exceeds 60 seconds; three CSV cases lack
declaration/ownership evidence; two cases reject the freezer producer; three
reject the facade receiving test; and seven isolated-project cases fail a
registered complete-source/mode join or its dependent assertion. None of these
is treated as optional because it also fails on main.

The complete required-sub-issue list remains empty. The refreshed original
title/body and all seven PR conversation comments add no requirement. Inline
comments and reviews remain empty. Fresh main `eb2dad1c0` remains an ancestor.

## Freezer producer evolution

The receiving-history coordinator compared its frozen complete freezer
producer directly with the current physical file. A later scanner evolution
had legitimately changed that producer. The coordinator consequently refused
before it could build its original receiving copy.

`invocation-freezer-producer-evolution.mjs` preserves the complete original
SHA256 `f0cdde90b547b6c7a6f4e638ac4b12d3c323ca541dd0bac6632924409a78c602`.
Installed native TypeScript selects the original complete function. Six exact
substitutions derive its scanner-history branch, current phase inputs, inverse
and fresh physical reread. A separate repository phase derives the actual
import. Both phases serialize/reparse full CST and execute complete inverses.
Changed imports, weakened guards and unrelated source refuse. The original
producer still supplies the original receiving copy; its source pin is intact.

The complete three-file cohorts retain all twelve cases and their deadlines:

| Engine | Result |
| --- | --- |
| Node 20.20.2 | All 12 TAP assertions pass, but the independent deadline audit fails the original proposal cases at 114382.322435 and 116838.969925 ms against 60000 ms. Total 256.88 s, sampled total cgroup peak 1506291712 bytes. |
| Bun 1.4.4 | 10 pass, 2 deadline failures: 98124.04 and 95118.18 ms against the original 60000 ms. Total 214.13 s, sampled total peak 1759080448 bytes. |

The three new regressions pass in both engines. No observer stops a child.
These source assertions remove the original mismatch but do not qualify the
existing proposal deadlines. The unchanged failing workloads are not repeated.

## Module-token receiving evolution

The facade-history producer expected its exact original import-only test
successor. The existing derive-effects test had subsequently acquired a genuine
module-token source-history layer, so that full physical file correctly differed.

`module-token-receiving-evolution.mjs` derives this later layer from the whole
original facade afterimage, SHA256
`75faaa6f0f7e843149303901f9cd97abe73b01a1619fad4c11884c5df27f8efd`.
Native syntax selects the complete original receiving declaration and its CST
import. The language phase composes the actual module-token producer and its
whole-source/hash/inverse assertions; the repository phase adds the real import.
Both complete CST inverses are checked. Original cases, options and deadlines
remain, and altered history checks, foreign imports or source extensions refuse.

The facade producer retains its original equation in `row.after` and records
the later equation separately in `row.receivingEvolution`. Its write/check
paths use the complete final successor. A later generation therefore cannot
silently restore the older test body.

The complete two-file Node run passes **9/9**, including the independent
deadline audit, in 183.58 seconds. Its sampled total-cgroup peak is 1519276032
bytes. The three existing full-proposal cases take 54916.509168,
50722.440361 and 53819.791211 ms, all below their unchanged 60000 ms limits.
The same complete Bun 1.4.4 cohort passes **9/9** in 166.17 seconds. Its sampled
total-cgroup peak is 1501364224 bytes. The original full-proposal cases take
52491.52, 46284.08 and 45406.29 ms. Neither engine's observer stops a child.

These are complete receiving-source checks, not new executable application
functions. The missing matrix, semantic refusals, original failed deadlines,
strict parity and literal all-tool privacy requirements remain unfinished.

## Source checkpoints and additional checks

The callback source is committed at `c2d87697b`, the freezer history at
`6aaa71c20`, and the module-token receiving successor at `cb65c0cc8`. Complete
changed compiler source hashes are frozen in `project-history-final-sources.json`.
The receiving checks above ran on those same source bytes before their commits.

The existing strict generated TypeScript project passes with installed
TypeScript **5.9.3**, in 12.20 seconds with a sampled total-cgroup maximum of
1719861248 bytes. This is not a full TypeScript-stage pass or a strict check
of every compiler JavaScript file. All 27 changed complete JavaScript files,
the evidence collector's Python syntax and `git diff --check` pass.

The complete changed core-vector receiving file also ran under Node 20.20.2.
Six of seven TAP assertions pass. The first case validates the entire callback
source composition but takes **365160.484944 ms** against its original
**60000 ms** limit, so the independent deadline audit fails. The last case
separately rejects the changed whole Rust upstream-header source at line 294:
the original fixture predates the requested geolocation changes. Its original
source pin and assertion are retained. The whole file takes 406.94 seconds;
sampled total cgroup peak is 2212732928 bytes and no observer stops a child.
This reproduces the older Bun file's distinct deadline/header failures; neither
engine supplies a passing complete-file qualification.

The mandatory complete local gate remains pending on the final committed batch;
its result cannot be inferred from these focused checks.
