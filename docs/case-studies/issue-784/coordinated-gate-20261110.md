# Coordinated repair batch: complete local gate attempt

The required complete gate was attempted against
`1ec7b77f4447b85b26c3c8e2cb939a0aeef3750d` for
[PR #785](https://github.com/link-assistant/router/pull/785). It did not pass.
The guard terminated the owned process tree during translation-suite startup;
the launcher waited for its descendants and exited 143. No green stamp was
written, no Rust tool ran, and the PR remains a draft.

The input fingerprint covered all 50,990 paths and 1,919,042,372 bytes. Source
files and HEAD stayed unchanged throughout the attempt. Node was 20.20.2,
the lockfile TypeScript compiler was 5.9.3, and local Bun was 1.4.4. The Bun
results do not certify CI's pinned 1.4.3 environment.

## All seven stages

| Stage | Passed | Failed or interrupted | Unrun |
| --- | --- | --- | --- |
| Lint | All ten commands | None | None |
| Node native tests | All 259 cases | None | None |
| Bun native tests | All 259 cases | None | None |
| TypeScript | Deadline controls, both package type checks, native freshness, strict native compilation | Whole native TypeScript file: deadline audit | Nine later commands |
| Parity | All 121 acceptance cases | Strict parity | None |
| Forward translation | None | First complete test command interrupted during startup | Four generation/freshness commands |
| Reverse translation | None | None | All five commands |

Native freshness compared 11,586,409 bytes with no changed or unexpected
outputs. Strict native TypeScript compilation covered 167 files. The whole
native TypeScript file passed all nine assertions, including complete shared
source and compiled runtime cases. Its regeneration case at
`tools/translation/js-to-rust/test/native-typescript.test.mjs:230` took
95,985.016971 ms against the original 60,000 ms limit. The independent audit
`complete-8H3oxq` correctly failed. Total whole-file time was 332,436.975 ms.

Strict parity reported a stale hash for
`rust/tests/json_shared_f64_translation_test.rs`, 441 draft feature gaps and
12,431 carried items across 865 Rust sources. Inventory validation does not
establish executable parity. The earlier receiving repairs do not resolve
these failures.

The first forward command selected all 713 original files with concurrency two
and its original 3,600,000 ms outer deadline. The guard stopped at sampled
cgroup use of 2,874,605,568 bytes, above the unchanged 2,866,933,760-byte stop
threshold and below the 3,135,369,216-byte container limit. Its raw TAP and
stderr streams are empty; no case audit was produced. Terminal audit
`complete-iWAIf2` retains the interruption and missing-audit refusal. This is
not a test assertion result. Reverse checks never started.

## Complete canonical regeneration attempts

Two subsequent calls to the real `scripts/translate-router.mjs --progress`
producer kept the same HEAD and original source. Neither reached output
publication. With 320 MiB Node old space, V8 exhausted its heap after
60.608545 seconds, before namespace construction completed; exit was 134 and
sampled cgroup peak was 2,087,010,304 bytes. The bounded inactive-page adviser
was enabled but never invoked because its threshold was not reached.

The 768 MiB attempt passed derive namespace construction at 309,869 ms and
entered `default-source`. The unchanged resource guard stopped it after
327.401006 seconds with exit 143 and sampled cgroup peak 2,884,120,576 bytes.
All owned descendants were collected. This attempt used no page advice. The
two different heap settings are resource diagnostics, not changed compiler
limits, original test deadlines or passing regeneration evidence. No further
unchanged attempt was made.

The [complete attempt packet](evidence/coordinated-canonical-attempts-20261110.tar.gz)
retains both full producer logs and resource receipts, the complete seven-stage
command review, coordinated implementation diff and fresh publication-context
snapshots. Its [receipt](evidence/coordinated-canonical-attempts-20261110.json.gz)
pins every complete member after independent readback. The packet has 31,485
compressed bytes, SHA-256
`7f87489ce8837be53a0665ba790cbc4818ebfc11fa7567232826b83ed488754a`.
Fresh main remains `eb2dad1c0a18394dc1aad46413e11401e74eb502`, already an
ancestor. The published `e88183bb8` cycle is terminal; no newer review feedback
or required sub-issue was found.

## Complete evidence and storage

The [complete packet](https://github.com/link-assistant/router/blob/9b6c9192c70f1f9309eac0c516b59102ce080409/docs/case-studies/issue-784/evidence/coordinated-gate-20261110.tar.xz?raw=true) contains 100
members and 3,270,296 compressed bytes, SHA-256
`6659809745c75ad9b4532d123332e0f4525cc627d02e759ef83913eeeaa6ef26`.
The [receipt](evidence/coordinated-gate-20261110.json.gz) pins each member's
complete byte count and SHA-256. It retains the entire gate log, fingerprint
page-advice record, resource observations, fresh issue/PR/all-comment-type
snapshots, and all 13 closed audit directories. Expected failing auditor
negative controls remain distinct from the genuine regeneration failure.

Every archived member was fully read back before retiring 15,925,006 bytes of
identified inactive original task copies. Evidence briefly reached 501,283,616
bytes while full audit records were created, exceeding the 500 MB task cap.
Compression and verified retirement restored it to 488,636,879 bytes. This
overrun is recorded rather than presented as cap compliance throughout. The
first archive attempt stopped at its two-MiB draft output cap; its complete
failure log and incomplete-file retirement receipt are retained. The successful
archive used a six-MiB output cap, single-threaded level-one compression, and
changed no compiler resource bound or test deadline.

Canonical, owned-definition, profile and reverse generation remain unfinished,
as do the original deadline failures, private compiler admission, strict
parity and the universal privacy/account criteria. The coordinated batch has
no newly measured executable production functions. Same-head green CI and
every original acceptance criterion remain required before ready status.
