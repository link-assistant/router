# Verification

No green gate stamp, complete parity, vendor-account change, or blanket
geolocation guarantee has been established. Rust tools remain unrun locally.

## Completed CI cycle at 7586d14b1 and export repair

[Run 42330245583](https://github.com/link-assistant/router/actions/runs/42330245583)
checked head `7586d14b1331823be35a1289ad01c49e6018ffa9`, using merge
`31dff4f6bf4412069c4cb5c89d04f7bae739f1b6`. The complete cycle ran from
**2026-11-07 02:38:30 to 03:38:58 UTC** and failed. Every same-head workflow
finished before further repairs. Complete workflow/job logs and all three
original artifact ZIPs, including hidden reverse deadline files, were downloaded
under `ci-logs/restart-published-complete-*`.

| Stage | Result and original log location |
| --- | --- |
| Lint, native Node, native Bun | Passed; both native suites passed all 259 cases. |
| TypeScript | Strict APIs, generation freshness, 165 strict native files, nine receiving cases and their independent deadline audit, 259 shared expectations, compiled Bun, and 32 strict translator fixture modules passed. Regeneration took 52729.63655 ms against the original 60000 ms limit. The stage then failed on `Missing TypeScript output tree: neutral`, `typescript.log:452`; later commands were unrun. |
| Parity | All 121 acceptance cases passed. Strict verification failed: stale account-policy source hash, 441 draft gaps, 847 declared sources and 12345 carried items, `parity.log:871–875`. |
| Profile matrix | Neutral worker aborted at its V8 heap limit, `profile-matrix.log:261`. |
| Reverse translation | Original 15-minute CI limit reached after completed case 76, `reverse-translation.log:656`. No final complete audit or later Bun/regeneration result exists. |
| Forward translation | Original 60-minute CI limit reached, `translation.log:6744`. The incomplete portion reported 31 failing entries, including a file-level exit. This is not a complete-cohort count or evidence that 43 previous failures were fixed. |
| Aggregate and Rust | Aggregate failed; all Rust/release jobs stayed skipped. No Rust qualification exists. |

Forward failures include unchanged historical compiler/alias/composer/scanner
pins, original 60000 ms case timeouts, and a newly exposed export failure at
`translation.log:5953–5972`: the regenerated current-source archive was
**5245605 bytes**, above the exporter's unchanged **4194304-byte** individual
file bound. This is a PR-introduced failure. The complete failure index and all
blocks are in `restart-published-complete-forward-failures.json`.

The repair factors only matching repeated Git blob identifiers through the
existing source dictionary. The explicit `source-and-blob-index-v1` metadata
encoding preserves key order and every original value. Old plain metadata and
`source-index-v1` archives remain readable; foreign or absent Git blobs retain
their literal old representation. New integer-index and dictionary refusals
apply to both full and text-only reads. These are storage DATA operations and
grant no source, CST, semantic or executable authority.

Both complete fixture producers now use gzip level 9. The strict producer copy
was regenerated through its existing native/CST source derivation, with an
independent assertion that only the two compression-level literals changed.
The complete source fixture was then regenerated through its normal producer
under Node 20.20.2 with a 768 MiB old-space bound. Its archive is
**4134635 bytes**, SHA256
`c41c1333a471268c8401424d34e806438ad1bf589287396b87de75b5ca77d29a`.
Its original logical byte count/hash, current source-set hash, both historical
universes, every 867 current source byte and NOTICE remain unchanged.
No resource bound, test deadline, assertion or parity status was increased.

Five complete transport inverse/refusal tests passed under Node 26.13.0 and
Bun 1.4.4 before integration. At source head
`b913882ab538e0ffda77ff1b6a1171a53228ca59`, all five complete receiving files
were then attempted under Node 20.20.2 with a 768 MiB old-space limit and one
worker. **33/34 TAP cases passed**. The real core-adoption producer child hit
its unchanged **20000 ms** deadline and received SIGTERM
(`restart-export-receiving.log:38–65`). The independent source/deadline audit
also failed: the complete current-bank codec case took **65319.319072 ms**
against its unchanged **60000 ms** deadline (lines 160–164, 205–206).
The full export file, layout file and five new transport cases passed; the
actual committed archive-budget regression passed too. Complete deadline
originals are retained in `complete-ifetLh`.

The complete four-file Bun attempt passed **23 cases**, including all nine
export cases, three layout cases, five transport cases and the first six codec
cases. Its owned memory guard then stopped Bun during a full-bank codec case
at **2869792768 sampled total cgroup bytes**, below the **3135369216-byte**
container limit (`restart-export-memory.json`). Later codec cases remain
unqualified. The original assertions and deadlines were unchanged; this is an
interrupted attempt, not a passing four-file suite. The process and its guard
closed before further resource-intensive work; no kernel OOM kill occurred.

The complete local gate is still failed at its previously recorded source
head. A new complete local gate is **unrun**: the unchanged forward and Bun
lifecycle workloads already required owned resource stops in this container,
and strict parity, missing-profile and compiler-pin failures remain unresolved.
No repeated killed workload, green stamp, Rust invocation, or receiving/full-gate
equivalence is claimed. The next published-head CI cycle remains unqualified
at this source snapshot. Source proposals, independent reviews, complete logs
and bounded compression experiments are retained under `ci-logs/restart-export-*`
and the task experiment directory.

The repository syntax check passed all **1747 JavaScript files**. Its strict
translation API TypeScript project also passed with the lockfile compiler
**5.9.3**. After all local children closed, cleanup verified complete preserved
proposal bytes and removed only this attempt's inactive Node toolchain and
external proposal. Distinct file allocation removed: **164212736 bytes**;
observed filesystem free delta: **166510592 bytes**. The earlier cleanup
attempt refused a missing preserved `proposal.json`; that complete original
was copied and compared before the successful cleanup. Both receipts remain
in the evidence. No Rust cache or other worker's directory was removed.

The [complete export-repair packet](evidence/export-repair-complete.tar.xz)
and its [verification receipt](evidence/export-repair-complete.json.gz) preserve
**160 complete originals / 38377813 logical bytes** in **14219992 archive
bytes**. SHA256:
`e6a19758d356028ba028243138b506623a8e8d1c9ebb1155cc3b830a5776e99c`.
The unchanged capture tool reopened and byte-verified every member against
its original, including the previous finished CI cycle, full receiving logs,
raw deadline receipts, complete proposals and changed source. Its source head
is `b913882ab538e0ffda77ff1b6a1171a53228ca59`; captured file hashes distinguish
the subsequent documentation drafts. No evidence packet supplies a green gate.

## Restart regression and configuration audit

The restart began from published head `1e6e0b36a9acb13cc7b829d7b6e3455e9a4b7c70`;
the PR already contained source changes. Fresh issue and PR feedback was read,
and `origin/main` at `eb2dad1c0a18394dc1aad46413e11401e74eb502` was an ancestor.

The added shared ProtoJSON matrix reproduced **six failures** in the previous
Gemini filter (`restart-protojson-before.log`). After the source fix, both
complete geolocation files pass **30/30 cases in Node and Bun**, including 16
real-router Gemini HTTP captures across eight spelling combinations and two
consent values. Those focused runs used Node 26.13.0 and Bun 1.4.4. They do not
qualify the compiler's unsupported Node 26 host-intrinsic check. Native TypeScript
was regenerated successfully with Node 20.20.2 and a bounded 768 MiB V8 heap:
11,586,409 AST-cycle bytes, 3 changed artifacts, 0 unexpected artifacts.

The configuration guide now records verified Codex optional search-location
and provider-header settings and Claude Code's newline-separated custom headers.
Primary sources are preserved as observations in `raw/restart-research.json`.
Rust source mirrors the fix and consumes the same fixture; no Rust tool ran.
These focused observations precede the complete gate below and do not claim it
passed.

## Complete restart gate at 08e09f884

Source head: `08e09f884546ecf373dfa2997f7d0dd906a0cb1c`. The complete local
gate finished **exit 1 at 2026-11-07 01:18:29 UTC**, after attempting all seven
groups. Node 20.20.2 used a bounded 640 MiB V8 old-space heap and 8 MiB
semi-space per process, with the existing child reaper. Source inputs remained
unchanged during the attempt. No green stamp was written. Original test cases,
strictness and deadlines were preserved.

Line references are to the complete 3137-line member
`experiments/issue-784/restart-full-gate.log`.

| Group | Result and evidence |
| --- | --- |
| Lint | Passed: 1746 JavaScript source files, 20 coordinator cases, 31 workflow controls, 7 gate controls and 14 validated workflows (lines 2–327). |
| Native Node | **259 passed, 0 failed** (lines 1630–1638). |
| Native Bun | **259 passed, 0 failed**, across 35 complete files (lines 1976–1978). |
| TypeScript | Both strict API checks, generation freshness (0 changed/unexpected artifacts), strict compilation of 165 native files, all 9 receiving TAP cases, 259 shared Node expectations and the compiled Bun suite passed. Independent qualification **failed**: regeneration took **152128.545269 ms**, above the unchanged **60000 ms** source deadline (lines 2083–2108). Later TypeScript commands were unrun. |
| Parity | All **121 acceptance cases passed**. Strict inventory failed with **441 draft gaps**, a stale `rust/src/account_routing_policy.rs` hash and 12345 carried items across 847 sources; `runtimeParity: false` (lines 2718–2730). |
| Forward translation | **Failed** after the owned coordinator and two workers approached the 3135369216-byte container limit. The cohort alone was stopped with SIGTERM at a sampled **3131424768 bytes** of total cgroup memory. Its audit remained incomplete; missing final audit data is secondary to the recorded resource stop (lines 2732–2735). Later generation commands were unrun. |
| Reverse translation | **Failed** at its unchanged **900000 ms** enclosing deadline after subtest 76. Explicit 60000 ms case timeouts occurred in callback-inputs (**80223.907595 ms**, line 2755), completions (**61416.176567 ms**, line 2864) and the Rust-reader source case (**111697.231983 ms**, line 2953). Captured-primitives (**62472.99861 ms**) and closures (**84090.661461 ms**) also exceeded their unchanged 60000 ms deadlines despite TAP passes. The enclosing shutdown/audit receipt remained failed; no complete deadline audit was produced. Later files, Bun reverse and regeneration commands were unrun. |

Complete raw deadline directories are `complete-07XTjn` (controls),
`complete-MWJTIi` (TypeScript), `complete-5GWNLL` (forward) and
`complete-BGdFKm` (reverse), under `js/node_modules/.node-case-deadlines`.
The forward resource observation is `ci-logs/restart-forward-memory-guard.json`.
No kernel OOM kill occurred. After the enclosing reaper exited, no owned test
process remained. No Rust tool ran or was unlocked by this attempt.

After all local checks closed, the inactive temporary Node 20 installation at
`js/node_modules/.issue-784-tools` was removed. No process referenced that path.
Distinct file allocation removed: **154140672 bytes**; observed filesystem free
space increased by **237060096 bytes**, which also includes other filesystem
activity and directory allocation. No Rust cache was created or removed.
Complete cleanup receipt: `ci-logs/restart-cleanup.json`.

## Completed intermediate CI cycle

[Run 42318628676](https://github.com/link-assistant/router/actions/runs/42318628676)
started **2026-11-07 00:30:25 UTC** for head
`b79ebc1b4beee49bebd6f9d5cbb2c2f56d5fc192`, checking merge commit
`50c9043f0f4f5b0de5b04d90280ae8a768ae5b2d`. The entire cycle finished
**failure at 01:30:52 UTC**. These observations do not qualify `08e09f884`.

| Job | Completed result and full log |
| --- | --- |
| Lint, native Node, native Bun | Passed. |
| TypeScript | Failed: `Missing TypeScript output tree: neutral`, `ci-logs/restart-prior-typescript.log:446`. The nine receiving cases and their independent deadline audit passed on this runner; regeneration took 42844.906 ms. Later profile/descriptor/UI commands were unrun. |
| Parity | Failed: 441 draft gaps and a stale account-policy source hash, `ci-logs/restart-prior-parity.log:872–875`. All 121 acceptance cases passed. |
| Profile matrix | Failed: the neutral worker aborted at its V8 heap limit, `ci-logs/restart-prior-profile.log:276`. |
| Reverse translation | Cancelled at its original 15-minute CI limit. Last completed case was 76; `ci-logs/restart-prior-reverse.log:669–670`. No complete audit or later Bun/regeneration result exists. |
| Forward translation | Cancelled at its original 60-minute CI limit, `ci-logs/restart-prior-forward.log:11646`. Its completed portion reports 73 failing TAP entries, including file-level failures; this is not a complete-cohort failure count. |
| Aggregate, Rust and release | JavaScript aggregate failed; all downstream Rust/release jobs stayed skipped. Full aggregate log: `ci-logs/restart-prior-aggregate.log`. |

The forward failures include compiler-pin mismatches (lines 828–1058), complete
current-source fixture mismatches (1238–1419 and 6854–7104), alias-history and
immutable-composer pins (1660–1721 and 2981–3474), a source-scanner API mismatch
(3621–3640), a receiving child SIGTERM (6058–6085), an original 60000 ms timeout
(6800–6807), a historical reader substitution mismatch (10378–10404), and
isolated-child byte authentication failures (10891–11022). The full log and
`ci-logs/restart-prior-forward-failures.json` preserve every reported failure
block, source location and line range, including eleven file-level exits.

The read-only `inspect-ci-baseline.mjs` experiment independently decoded the
authenticated source-text archive. Its current census exactly matches the
**865** Rust/Cargo paths on `main`, but this PR has **867**: the two additional
paths are `rust/src/geolocation.rs` and `rust/src/geolocation_tests.rs`.
Those new files introduce the exact-census failure; it is not classified as a
baseline defect. In contrast, the observed `translate.mjs`, concrete-syntax
and immutable-composer bytes are identical to `main` and already differ from
their reported historical pins. This comparison does not qualify the full base
gate or establish that every failure predates the PR. Complete receipt:
`ci-logs/restart-fixture-base-comparison.json`.

### Current Rust source fixture repair

The unchanged `prepareStaticSourceLifecycleProposalReleased` producer generated
an external proposal at source head `08e09f884`, under Node 20.20.2 with a
768 MiB old-space bound. The first Node 26.13.0 attempt refused with
`Private parser execution: native source operations changed`; it is not a pass.
The successful proposal retains both fixed historical universes, all source/CST
round trips and complete inverses. Independent source-text review compared every
historical source byte, all current physical files, notices and authority flags:
**806/808 original paths unchanged; 867 current paths match**. Only the generated
archive and manifest change. The producer, readers, assertions and deadlines
remain unchanged. This is source-data fidelity, not executable parity.

Complete proposal/review receipts are `ci-logs/restart-static-proposal.json` and
`ci-logs/restart-static-review.json`.

At source head `b852b955c68d419ee2a7e2fc9f87a1d47deacd13`, both complete
`static-source-lifecycle.test.mjs` and `associated-original-text-data.test.mjs`
finished under Node 20.20.2, one worker and a bounded 768 MiB old-space heap.
All **16 TAP cases passed**, including current source/Git joins, deterministic
producer equality, complete historical bytes, CST inverses, strict typed
execution and tamper refusals. The independent audit nevertheless **failed**
with three unchanged 60000 ms deadline breaches: complete universe validation
**87606.702682 ms**, producer determinism **191174.753546 ms** and forgery
controls **85549.779081 ms**. Overall **exit 1**, complete log
`ci-logs/restart-static-receiving.log:1–95`; original deadline directory
`js/node_modules/.node-case-deadlines/complete-LNvHCq`. All selected files and
owned children closed; process-group cleanup passed. No assertion, deadline,
compiler rule or admission status changed. This receiving attempt does not
replace the failed complete gate at `08e09f884` or qualify a later whole gate.

The complete associated-original-text file also passed **8/8** under Bun 1.4.4
in **51.13 seconds** (`ci-logs/restart-static-associated-bun.log`). After both
receiving commands closed, the
cleanup script checked live process references, verified the external proposal
against its preserved originals and removed only the temporary Node 20
installation and that proposal directory. It removed **166809600 bytes** of
distinct file allocation; the observed filesystem free-space increase was
**169107456 bytes**, including directory allocation and concurrent activity.
Exact paths and counts: `ci-logs/restart-static-cleanup.json`. No Rust tool or
cache was involved.

A subsequent complete-file Bun lifecycle attempt used `bun --smol test` and
the child reaper, retaining every original case and deadline. Its first case
failed at **87205.71 ms** against the unchanged **60000 ms** limit, with Bun
terminating a dangling Git census subprocess (`restart-static-lifecycle-bun.log:4–30`).
Later in the attempt, an owned-process guard sent SIGTERM at
**2026-11-07 02:20:34.498 UTC**, when total sampled cgroup memory reached
**2888380416 bytes**, above the **2866933760-byte** stop threshold and below the
**3135369216-byte** container limit. The monitor sampled every 0.1 seconds;
these are cgroup observations, not Bun RSS or a complete process peak.
Overall **exit 143**, no final suite qualification, remaining cases unrun or
interrupted. All owned children closed; no kernel OOM kill occurred. Complete
streams and samples are `ci-logs/restart-static-lifecycle-bun.log` and
`ci-logs/restart-static-lifecycle-memory.json`. This failed resource attempt
does not qualify the fixture or justify repeating it in this container.

## Completed published-head CI cycle

[Run 42318632426](https://github.com/link-assistant/router/actions/runs/42318632426)
was created **2026-11-07 00:30:27 UTC** for published head
`1e6e0b36a9acb13cc7b829d7b6e3455e9a4b7c70`, checking merge commit
`c4f9678e217601059402661f6a5af614d8aafda7`. Jobs started at **01:30:54 UTC**;
the full cycle finished **failure at 02:31:19 UTC**. All seven workflows for
that head had closed: six supplemental workflows were skipped. This cycle
predates the mixed-ProtoJSON fix and current-source fixture regeneration.

| Job | Completed result and complete log reference |
| --- | --- |
| Lint, native Node, native Bun | Passed; the published head had 250 native cases per engine. |
| TypeScript | Failed: `Missing TypeScript output tree: neutral`, `ci-logs/restart-head-complete-typescript.log:452`. All nine receiving cases and the independent deadline audit passed on this runner; regeneration took 54407.004101 ms. Later profile/descriptor/UI commands were unrun. |
| Parity | Failed: stale `rust/src/account_routing_policy.rs` source hash and **441 draft gaps**, `ci-logs/restart-head-complete-parity.log:891–892`. All 121 acceptance cases passed. |
| Profile matrix | Failed: neutral worker `SIGABRT` at its V8 heap limit, `ci-logs/restart-head-complete-profile-matrix.log:276`. |
| Reverse translation | Cancelled at its unchanged 15-minute CI limit, `ci-logs/restart-head-complete-reverse-translation.log:665`. Last completed case was 76; no final audit or later Bun/regeneration result exists. |
| Forward translation | Cancelled at its unchanged 60-minute CI limit, `ci-logs/restart-head-complete-translation.log:11658`. The 11718-line original reports **74 failing TAP entries**, including eleven file-level exits; this is an incomplete-cohort observation. |
| Aggregate, Rust and release | JavaScript aggregate failed; all downstream Rust/release jobs stayed skipped. |

The complete forward failure index is
`ci-logs/restart-head-complete-forward-failures.json`. Failures include compiler
input pins (lines 836–1066), current-source census checks (1246–1427 and
6866 onward), immutable-composer and alias-history pins, a scanner API mismatch,
a receiving child `SIGTERM` (6066–6093), two original 60000 ms timeouts,
historical reader substitution (10390–10416) and isolated-child byte
authentication (10903–11034). The regenerated fixture addresses the introduced
current-source census mismatch; its local failed deadline qualifications remain
separate. Other compiler failures remain unresolved. No assertion or pin was
edited merely to make those failures pass.

All failed job logs, the complete workflow log, paginated metadata and all
three original artifact ZIPs are preserved under `ci-logs/restart-head-complete-*`.
The reverse ZIP contains four complete files below its hidden
`.node-case-deadlines/complete-j0nPdj` directory; it has no terminal audit receipt.
The capture includes those files without treating an interrupted artifact as
passing evidence. No CI run was cancelled manually, no original limit was
increased, and the published head remained unchanged throughout its cycle.

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

[`restart-complete.tar.xz`](evidence/restart-complete.tar.xz) preserves **361
complete members**, including both completed restart CI cycles, every downloaded
artifact, the complete local gate, all receiving logs, resource observations,
cleanup receipts and authenticated tested-source snapshots. Its **91,292,737
uncompressed bytes** occupy **21,592,036 compressed bytes**. SHA-256:
`177d943783a62d112f878dc40b4b452cb1bc887d5985715a38157a4d5a027b6b`.
The losslessly compressed full receipt is
[`restart-complete.json.gz`](evidence/restart-complete.json.gz). Every selected
original was verified before, during and after capture. Capture occurred at
`b852b955c68d419ee2a7e2fc9f87a1d47deacd13`; authenticated Git snapshots retain
the distinct `08e09f884` gate inputs, including its older current-source fixture.
The failed gate and failed receiving qualifications retain their original
tested heads; this packet supplies no later same-SHA or executable authority.

Unfinished: a green final-source gate, green current-head CI, Rust qualification
after all JavaScript stages pass, and the literal all-tool guarantee
(transport IPs, mandatory vendor security inference, account settings and
traffic bypassing Router). Unsupported integrations remain refused. The PR
stays draft and unmerged while those criteria remain unmet.
