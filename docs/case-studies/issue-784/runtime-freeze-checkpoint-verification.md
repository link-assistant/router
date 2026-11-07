# Runtime source and Clone checkpoint verification

All seven workflows at published head
`be8560a8d446f039c602672ad5d0f6f1a218acc6` finish before the next publication.
The [main run](https://github.com/link-assistant/router/actions/runs/42400974916)
starts at 2026-11-07 18:22:33 UTC and finishes at 19:23:03 UTC with failure.
Six supplemental callers skip. Complete logs and all three diagnostic ZIPs are
downloaded; every ZIP member is read, CRC-checked and hashed. No original test,
strictness, timeout, compiler pin or Rust gate is relaxed.

| Stage | Complete published-head evidence |
| --- | --- |
| Lint, native Node, native Bun | Pass; 259 native cases per engine. |
| TypeScript | Earlier native and profile checks pass with installed TypeScript 5.9.3. The real owned-definition matrix index is absent: log lines 453–474, `owned-definition-output.mjs:23`, `check-owned-definition-typescript.mjs:16`. |
| Strict parity | Fail: stale `account_routing_policy.rs` inventory, 441 feature gaps and 12345 carried items across 847 recorded Rust sources; runtime parity false. Log lines 4561–4566. |
| Profile matrix | Cancelled at the unchanged 60-minute job limit, log lines 7915–7919. No heap-fatal message establishes a cause in this cycle. |
| Forward | Cancelled at the unchanged 60-minute job limit. Complete partial TAP retains eleven failures, without a terminal cohort audit. |
| Reverse | Cancelled at the unchanged 15-minute job limit, log line 7591. Its partial 381-line TAP contains no complete terminal audit. |
| Aggregate / Rust | Aggregate fails; Rust remains skipped. No local Rust tools run. |

The forward TAP in artifact `13587092079`, `complete-GZlZix/stdout.raw.tap`,
contains eight stale generation compiler-pin hook failures at lines 553, 582,
611, 640, 669, 698, 727 and 756. The required `translate.mjs` hash starts
`84d99f5f6dbc`; current source starts `cd328961a7be`. Genuine complete generation
remains necessary; changing the stored expected pin would not repair it.

TAP line 5433 preserves the original 20000 ms child timeout in
`core-adoption-receiving.test.mjs`: the process exits with SIGTERM and the case
takes 22657.654426 ms. Line 6085 records the original 60000 ms deadline in
`core-literal-text-adoption.test.mjs`, observed 106249.984641 ms. Line 6179
records the same original deadline in `corpus-native-parse-provenance.test.mjs`,
observed 124811.935036 ms. Cancelled cohorts remain incomplete.

The next source batch adds [completed Clone freezing](clone-completed-freeze.md)
and [fresh original Node source DATA for Bun composition](runtime-import-source-data.md).
Their complete new files pass in both engines; independent Node case audits
pass. Unchanged broader parent files still fail original deadlines or require a
memory stop. The [integrated local gate](runtime-integrated-gate.md) at clean
`21caf33cf798bcb90a00778fc538664f2f3cb4cc` also remains interrupted and failed.
No green stamp or newly executable production function is claimed.

The complete inspection has 234799 logical bytes and SHA256
`97b22b9c51ca597ea5645b7a90166e453fd58054293b470498bca102809aad06`.
The [complete packet](evidence/runtime-freeze-complete.tar.xz) at source head
`bc249eb95be2f4ccb4449bb986b13d05dbc50bd2` preserves 190 originals / 22706608
logical bytes. Every decoded member and unchanged selected input verifies.
The archive is 14158312 bytes with SHA256
`1b2ee98cf145bff00a49ebdb2cfc0d9025556b65fb42e8fa12157340805236ff`.
The [full receipt](evidence/runtime-freeze-complete.json.gz) and
[complete observer originals](evidence/runtime-freeze-observer.json.gz) retain
the 13.28-second successful attempt, sampled cgroup peak 1736130560 bytes and
the earlier refusal caused by a still-changing selection log. The refused
selection and all its closed logs are also retained. Original limits stay exact;
all task evidence remains below 500000000 bytes. Actual
ordinary/owned generation, compiler provenance, complete receiving files, strict
parity, the full local gate and green same-head CI remain open. No human-only
secret or access prerequisite was found. [PR #785](https://github.com/link-assistant/router/pull/785)
remains draft and unmerged.
