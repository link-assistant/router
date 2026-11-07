# Verification

No green gate stamp, complete parity, vendor-account change, or blanket
geolocation guarantee has been established. Rust tools remain unrun locally.

## Runtime development

- Initial head: `83cb0d789e9f875a9e38353ce1a18ebb00a814a3`.
- Pre-fix regression: `CF-IPCountry: GB` reached the synthetic upstream when
  absence was expected (`experiments/issue-784/before.log`).
- Five complete focused files passed **64 tests, 0 failures**, under both
  Node 20.20.2 and Bun 1.4.4. Tests capture HTTP headers/bodies and real localhost
  fragmented WebSocket frames, including consent, masking and unchanged prompts.
- Both strict public API checks passed. Lockfile TypeScript is **5.9.3**;
  strictness and original deadlines were retained.
- Native TypeScript was produced with the existing generator under Node
  20.20.2: 11,584,666 source bytes, 7 updated artifacts, 0 unexpected artifacts.
  The earlier Node 26.13.0 intrinsic-validation failure is not a pass.
- `npm ci --prefix js` reported one moderate audit finding. No unrelated
  dependency update or telemetry-setting override was applied.

## Complete local attempt at 6f36a43f

Immutable source head: `6f36a43f7eacf73a519c9ca2437cee9d3dc10f77`.
The complete seven-stage `node scripts/check-js-first-local.mjs` finished
**exit 1** at **2026-11-06 23:30:46 UTC**. Each group was attempted;
subsequent commands within a failing group were not reached. Environment:
Node 20.20.2, `NODE_OPTIONS='--max-old-space-size=512 --max-semi-space-size=8'`
and the Linux child-reaper experiment. Cases and deadlines were unchanged.

The full log is archive member
`experiments/issue-784/local-gate-bounded.log`. Line numbers below refer to
that original member, not an excerpt.

| Group | Result and exact evidence |
| --- | --- |
| Lint | Failed workflow-budget assertions at lines 118, 173, 267 and 298. Two additional distinct native evidence files exceeded the enclosing parity job budget. Repaired below. |
| Native Node | **250 passed, 0 failed**, lines 1628–1635. |
| Native Bun | **250 passed, 0 failed**, 37 files, ending before line 1972. |
| TypeScript | Deadline controls, both strict API checks, fresh generation and strict compilation of 165 native generated files passed. All 9 native TypeScript TAP cases passed; 250 shared expectations passed in Node and Bun. The independent deadline audit nevertheless failed: regeneration took **138182.754164 ms**, exceeding its unchanged **60000 ms** deadline (line 2100). Later profile/UI checks were unrun. |
| Parity | All **121 acceptance cases passed**. Strict inventory failed with a stale `rust/src/lib.rs` hash and **441 draft gaps, 1 validation error** (lines 2718–2723). Inventory: 847 sources, 12345 carried items, `runtimeParity: false`. No partial/carried status was promoted. |
| Forward translation | Coordinator aborted at its bounded V8 heap limit (line 2733). Missing final deadline evidence follows the abort; it is not the primary cause. Later canonical/profile generation commands were unrun. |
| Reverse translation | Original **900000 ms** outer limit expired after subtest 93. Historical comparisons failed in callback-inputs, captured-primitives, closures, completions and implicit-completion; inputs repaired below. The Rust-reader case exceeded its unchanged 60000 ms deadline (line 3036); a JSON-composition worker aborted at its heap limit (lines 3225–3240). Later files, Bun reverse checks and regeneration were unrun. |

The earlier mixed-source attempt is preserved as `local-gate.log`. It failed
lifecycle/process-group checks because container PID 1 did not reap orphaned
descendants. Its forward cohort was stopped before exhausting the 2.92 GiB
container limit; reverse was unrun. The child reaper resolved those lifecycle
failures in the immutable attempt. Neither caused a kernel OOM kill. The
512 MiB compiler experiment failed; it is not a passing configuration.

## Coordinated source repairs

The two complete geolocation files now run through the existing native-server
suite. Both named parity evidence entries reference that suite, preserving all
250 cases while restoring the existing enclosing workflow budget. Complete
workflow-policy tests passed **31/31**. Complete native suites then passed
**250/250 under Node** and **250/250 under Bun**, across 35 files.

Historical comparisons asserted original hashes and fixed 52-module/788-item/
705-scope counts but read mutable sources. Adding geolocation changed that
input census. The repair authenticates all original source bytes in a bounded
fixture and freshly invokes the current compiler on them, retaining every
assertion, refusal, program comparison, strict target check and deadline.
Current native TypeScript and parity checks still inspect current sources. See
[`historical-native-source.md`](../../../tools/translation/fixtures/historical-native-source.md).
The 11 complete affected compiler files finished under Node with **51 passed,
0 assertion failures, 2 cancelled by their original 60000 ms deadlines**.
The independent audit found **4 deadline breaches**: callback-inputs
73067.228066 ms, closures 73387.496052 ms, completions 60483.5719 ms and
static native TypeScript producer comparison 73398.361917 ms. Overall result:
**exit 1**, not a passing qualification. The source/hash/census mismatches are
resolved; deadline failures remain. Full log:
`experiments/issue-784/historical-node-repaired.log`; full receipt directory:
`js/node_modules/.node-case-deadlines/complete-r8QRiB`. The same 11 complete
files ran sequentially in fresh Bun processes: **52 passed, 1 failed**. The
immutable-oracle test exceeded its original **5000 ms** default, reporting
10002.89 ms (`historical-bun-static-native-performance.log:4`). Its complete
native program and 59-source producer comparisons passed in Bun, but the file
and overall receiving qualification remain **failed**.

Source review also found that Rust static account header overrides run after
native filtering. Commit `bfa72b1b1` applies the same request consent check as
the existing JavaScript configured-header path. Shared fixture-based Rust
regression source covers default, true, false and repeated-value consent;
its execution remains **unrun**, as do all other new Rust tests.

A second regression exposed `x-original-forwarded-for` in native JavaScript
forwarding and configured `cf-connecting-ipv6` on the converted HTTP path.
`network-before.log` preserves both failures. Both paths now reuse the same
network-header classifier, retaining unconditional network-origin removal even
with geolocation consent. Rust account overrides likewise reject the existing
ingress-header list and the `x-forwarded-` family. All 19 complete JavaScript
geolocation cases passed afterward (`network-after.log`); the expanded Rust
source remains unrun. Commit `60b4f53bdd38fc42748055b4eaa740a803cc912f` includes
the repair and producer-generated TypeScript: **11,585,604 source bytes,
5 changed artifacts, 0 unexpected artifacts** (`final-generation.log`). Final
runtime and generated TypeScript qualification are recorded separately below.

## Post-repair source checks

Source head: `60b4f53bdd38fc42748055b4eaa740a803cc912f`, Node 20.20.2,
Bun 1.4.4, lockfile TypeScript 5.9.3. The diagnostic launcher runs complete
commands sequentially with the child reaper and
`NODE_OPTIONS='--max-old-space-size=768 --max-semi-space-size=8'`.
Original test deadlines and strictness remain unchanged. Full command/result
list: `experiments/issue-784/final-checks.json`; each command has its own complete
`final-*.log`.

| Check | Result |
| --- | --- |
| Rust asset sync and Bun reverse source freshness | Passed; no Rust tool invoked. |
| JavaScript syntax and workflow validation | Passed; 1746 JavaScript files checked. |
| Public and native API strict types | Both passed. |
| Complete native Node and Bun suites | **250 passed, 0 failed** per engine; 35 files. |
| Native TypeScript generation freshness | Passed; 0 changed and 0 unexpected artifacts. |
| Native TypeScript strict compilation | Passed; 165 files with TypeScript 5.9.3. |
| Complete native TypeScript receiving/runtime file | All **9 TAP cases passed**; **250 shared expectations** passed against source and compiled TypeScript in Node, and the compiled suite passed in Bun. The independent audit **failed**: regeneration took **168908.191799 ms**, above its unchanged **60000 ms** deadline. |
| Strict parity with all named native evidence | **Failed**: 443 features, 62/62 operations and 368/368 routes; **441 draft gaps**, stale `rust/src/account_routing_policy.rs` hash. Inventory remains 847 sources, 12345 carried items and `runtimeParity: false`. Full errors: `final-strict-parity.log:1–5`. |

These diagnostics are **not a second complete local gate**. Later forward,
reverse, profile, descriptor and UI stages remain unqualified. The failed
512 MiB whole-compiler experiment was not repeated; no failed stage was bypassed
to run Rust.
The complete TypeScript log is `final-native-ts-complete.log`; raw audit inputs,
case durations and terminal result are in
`js/node_modules/.node-case-deadlines/complete-2wBBJd`. A TAP pass after a
synchronous deadline breach is not a passing qualification.

After those commands closed, Rust-only commit
`df1420d2a76434f40da11e7c9ca998ac25a81a55` aligned native forwarding with
JavaScript's existing unconditional `x-forwarded-` prefix rule. The new Rust
case checks derived `x-forwarded-city` across every consent value. JavaScript,
TypeScript and their fixture inputs remain byte-identical to tested head
`60b4f53bd`. This final Rust change and all other Rust tests remain **unrun**;
the diagnostic results above belong to `60b4f53bd`, not a later same-SHA gate.

The owned cleanup script first refused any path referenced by a live process,
then removed the temporary Node 20 toolchain and two inactive test directories.
It removed **154,296,320 bytes of distinct file allocation**; the filesystem's
observed free-space increase was **156,573,696 bytes**, which also includes
directory allocation and concurrent filesystem activity. No Rust build cache
was created or removed. Exact paths and counts: [`raw/cleanup.json`](raw/cleanup.json).

## Initial published-head CI

The entire initial CI cycle finished. Results belong to head
`83cb0d789e9f875a9e38353ce1a18ebb00a814a3`, checked out as merge commit
`9b12456101e788a467026db74fdf02de841c5a1a`:
[run 42303967922](https://github.com/link-assistant/router/actions/runs/42303967922),
created **2026-11-06 22:20:36 UTC**, aggregate failed **23:21:00 UTC**.
They do not qualify the later implementation.
At the final main-branch check (**2026-11-07 00:11 UTC**), `main` remained
`eb2dad1c0a18394dc1aad46413e11401e74eb502` and was already an ancestor of the
source head. The initial published head differed from that main only in
`.gitkeep`; its production and verification source therefore predated these
implementation changes. This does not excuse current-head failures or the new
stale inventory hash. Full comparison receipt: `ci-logs/final-base-review.json`.

| CI stage | Completed result and raw evidence |
| --- | --- |
| Native Node, native Bun, lint | Passed. |
| TypeScript | Failed: `Missing TypeScript output tree: neutral`, `ci-logs/initial-typescript-128188522173.log.plain:452`. |
| Parity | Failed: stale `rust/src/translation_core.rs` hash and 441 draft gaps, `ci-logs/initial-parity-128188522201.log.plain:876–878`. |
| Profile matrix | Failed at 22:51:03 UTC: neutral worker aborted at its V8 heap limit, `ci-logs/initial-profile-matrix-128188522356.log.plain:265`. |
| Reverse translation | Cancelled at its original 15-minute CI limit, 22:35:55 UTC; full log and unfinished deadline artifact preserved. Last complete output at 22:25:23 UTC; later Bun/regeneration commands unrun. |
| Forward translation | Cancelled at its original 60-minute CI limit, 23:20:55 UTC; `ci-logs/initial-translation-complete.log` preserves all 2461 lines and unfinished deadline artifact. Later canonical regeneration unrun. |
| Aggregate / Rust / release | JavaScript aggregate failed; downstream Rust and release jobs stayed skipped. |

Complete workflow log: `ci-logs/pipeline-42303967922.log` (7832 lines).
Job metadata: `ci-logs/initial-ci-status.json`. Complete forward/reverse raw
evidence is included. Nothing was manually cancelled, no deadline increased,
and no failed JavaScript gate bypassed to run Rust.

## Preserved evidence and remaining obligations

[`6f36-complete-attempt.tar.xz`](evidence/6f36-complete-attempt.tar.xz)
contains **2217 complete members**: initial CI logs/artifacts, local logs, raw
deadline evidence, changed source and compiler/harness inputs. It contains
**86,538,429 uncompressed bytes** in a **4,798,284-byte** archive.
SHA-256: `b365a8ca0f932ba12ab3d8742bae6ac88998c557521d4a8ef42edb13d752248e`.
Losslessly compressed capture receipt:
[`6f36-complete-attempt.json.gz`](evidence/6f36-complete-attempt.json.gz).
The tool checked every complete member's byte length and hash before, during
and after capture. Compression supplies no semantic or runtime authority.

[`repairs-complete.tar.xz`](evidence/repairs-complete.tar.xz) preserves the
post-repair complete logs, raw deadline receipts, reviewed diffs and diagnostic
scripts at source head `df1420d2a76434f40da11e7c9ca998ac25a81a55`. Its **107
complete members** contain **2,666,914 uncompressed bytes** in a
**634,180-byte** archive. SHA-256:
`fd6e08affe5e1f9531b416faa60a10c6db32c17d3868b68dbad3dda972f7eb2f`.
Its losslessly compressed receipt is
[`repairs-complete.json.gz`](evidence/repairs-complete.json.gz); every decoded
original was verified and every selected input remained unchanged. This later
capture preserves the distinct tested heads and the final Rust change's unrun
status; capture does not rerun or qualify a check.

Unfinished: a green final-source gate, current-head CI, Rust qualification
after all JavaScript stages pass, and the literal all-tool guarantee
(transport IPs, mandatory vendor security inference, account settings and
traffic bypassing Router). Unsupported integrations remain refused. The PR
stays draft and unmerged while those criteria remain unmet.
