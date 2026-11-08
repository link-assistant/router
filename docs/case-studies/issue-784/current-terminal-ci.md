# Complete terminal CI inventory for 4e709

The published head `4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2` is terminal.
[Run 42498636979](https://github.com/link-assistant/router/actions/runs/42498636979)
tests merge `3c1b36039cac28b1940ccfe83f3770566e539aae`; its tree equals the
published head. All 59 jobs and six supplemental workflows have finished.
There are 25 failed/cancelled jobs. Every available complete failed job log
and every available artifact was downloaded and independently verified.

**One full log is unavailable.** Translation shard 3, job `128786335823`, is
cancelled. Its final REST download returns HTTP 404 `BlobNotFound`; fresh
`gh run view --job ... --log` returns `log not found: 128786335823`. There is
no shard-3 artifact in the complete artifact listing. The failed HEAD request
for workflow logs returns HTTP 405 and supplies no further log evidence.
The cancellation cause is not established. Complete-cycle log collection is
explicitly false: 24 available whole job logs, one unavailable upstream log.

A subsequent actual GET of the complete workflow log ZIP succeeds. All 66
members pass full CRC/readback and SHA256 verification, and all 24 available
whole nonpassing job logs match their workflow-archive counterparts byte for
byte. The archive also omits the exact `translation (3)` job; the separate
`reverse-translation (3)` member is not its replacement. The
[checkpoint custody packet](evidence/current-terminal-checkpoint.json.gz)
retains every member identity and the complete archive identity. Complete-cycle
log collection remains false.

[The terminal custody packet](evidence/current-4e709-terminal-cycle.json.gz)
retains 14 entire metadata/error originals and identities for all 49 external
whole originals: 25 download streams (including the explicitly invalid XML
response) and 24 complete ZIP artifacts. All artifact CRCs, member hashes,
GitHub digests, head identities and complete archive hashes were checked.
An unavailable log is not replaced by its XML error or inferred as a pass.

The following table inventories every non-passing job. The complete streams
remain authoritative; representative errors do not replace their other failures.

| Job | Terminal result |
| --- | --- |
| [typescript](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786335765) | failure |
| [translation (2)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786335822) | failure |
| [translation (3)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786335823) | cancelled |
| [reverse-bun (2)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786335901) | failure |
| [parity](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786335905) | failure |
| [reverse-translation (7)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786335932) | failure |
| [reverse-translation (8)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786335946) | failure |
| [translation (7)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786335972) | failure |
| [translation (4)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786335978) | failure |
| [translation (6)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786335980) | failure |
| [profile-matrix](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336001) | cancelled |
| [translation (5)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336012) | failure |
| [reverse-translation (5)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336020) | cancelled |
| [translation-freshness](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336024) | failure |
| [owned-profile-matrix](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336028) | cancelled |
| [reverse-bun (1)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336031) | cancelled |
| [reverse-translation (2)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336037) | failure |
| [reverse-freshness](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336046) | failure |
| [reverse-translation (1)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336048) | cancelled |
| [translation (1)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336057) | cancelled |
| [reverse-translation (3)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336077) | failure |
| [translation (8)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336099) | failure |
| [reverse-bun (5)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336119) | cancelled |
| [reverse-translation (4)](https://github.com/link-assistant/router/actions/runs/42498636979/job/128786336201) | failure |
| [JavaScript fully green](https://github.com/link-assistant/router/actions/runs/42498636979/job/128803067443) | failure |

Current repairs have distinct evidence:

- [Current string equality parent](current-string-equality-parent.md), complete
  source registration and portable Git fixtures, and the complete current
  real-source fixture now have focused Node/Bun receiving results.
- [The current production fixture](current-real-source-fixture-receiving.md)
  passes its complete original eight-case file on both engines. Historical
  source, strict TypeScript and original deadlines remain intact.
- Actual reverse regeneration writes and independently checks all 11 stale
  outputs. This is freshness evidence, not complete reverse-suite qualification.
- [The owned-matches current parent](current-owned-matches-receiving.md) remains
  an unqualified whole-file draft after two bounded serialization heap aborts.
  Its unsuccessful writer is withdrawn; no passing or speed result is inferred.

The separate TypeScript sidecar, complete canonical/profile/owned generation,
strict parity and actual semantic/deadline failures remain unfinished. The last
strict inventory reports 441 gaps, including 151 partial and 290 unsupported
features. No local Rust tool was invoked. Required checks and the same-SHA
JavaScript gate before Rust remain unchanged. None of these failures is a
missing-secret or human-only setup condition.

## Evidence allocation and recovery

All metadata compression retains the entire original decoded byte streams.
The original job/artifact compressed containers are retained exactly. The
complete new fixture vector capture briefly reaches 500721474 bytes, exceeding
the allocation by 721474 bytes. Its full incident/custody receipt remains
[recorded](evidence/current-real-source-fixture-history-compression.json).
The cap is subsequently restored; an earlier allocation incident remains in
its separate receipt rather than being overwritten.

Verify the exact full `token-ci-complete.tar.xz` stream against its published
Git blob and GitHub metadata before retiring only the inactive local copy:
21418296 logical bytes reclaimed. All 205 original members remain recoverable
from the unchanged [published archive](https://github.com/link-assistant/router/blob/4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2/docs/case-studies/issue-784/evidence/token-ci-complete.tar.xz?raw=true).
The [retirement receipt](evidence/token-ci-complete-local-retirement.json.gz)
records the complete archive identity and inactive-path checks. No source,
active output, foreign path or build cache was removed.

The same complete published-blob and inactive-path checks subsequently retire
the 25575912-byte resolver packet. All 251 members remain in its unchanged
[published archive](https://github.com/link-assistant/router/blob/4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2/docs/case-studies/issue-784/evidence/resolver-complete.tar.xz?raw=true).
Its [separate receipt](evidence/resolver-complete-local-retirement.json.gz)
retains the full archive identity and remote metadata. These two retirements
reclaim 46994208 logical bytes without losing the published original streams.

Before the next complete gate and CI capture, the same full Git-blob, fresh
GitHub-metadata and inactive-path checks retire the 21592036-byte local restart
packet. Its 361 complete original members remain in the unchanged
[published archive](https://github.com/link-assistant/router/blob/4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2/docs/case-studies/issue-784/evidence/restart-complete.tar.xz?raw=true).
The [separate receipt](evidence/restart-complete-local-retirement.json.gz)
records exact compressed-stream recovery and reclaimed logical/allocated bytes.
This creates evidence capacity without deleting any active check output.

Before collecting the next cycle's complete artifacts, the same checks retire
the inactive 21279876-byte project-retention archive. All 429 original members
remain in its unchanged
[published archive](https://github.com/link-assistant/router/blob/4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2/docs/case-studies/issue-784/evidence/project-retention-complete.tar.xz?raw=true).
Its [receipt](evidence/project-retention-complete-local-retirement.json.gz)
records the complete stream hash and 21282816 allocated bytes reclaimed.

Issue #784 and the PR remain unfinished. The universal all-tool/account privacy
criterion is still unmet; the case-study requirement inventory and configuration
guide retain the exact supported scope and all external-account limitations.

## Mandatory local gate at the reviewed source checkpoint

Run the unchanged complete gate at committed source
`6ee1a798eba292b825cc4c61fee13c023fe65dfc`, using Node 20.20.2 and a 512 MiB
old-space limit. The observer resource-stops the initial repository fingerprint
at 25.414637 seconds, with peak sampled total cgroup memory 2867912704 bytes
above its unchanged 2866933760-byte guard. The command exits 143, its entire
process group is closed, and no stage has started. All seven stages are
**unrun**, and no green stamp is written. The completed asynchronous closed-page
advice changes no source or test clock and does not prevent the stop. This is
a failed resource experiment, not evidence of a particular compiler allocation
cause. The complete raw streams, observer source, gate source, full page-advice
receipts and fresh issue/PR metadata are retained by the checkpoint packet.

Main is freshly fetched and remains `eb2dad1c0a18394dc1aad46413e11401e74eb502`,
already an ancestor. The GitHub PR-diff API refuses the greater-than-300-file
comparison with HTTP 406; retain that complete response and the complete local
textual batch diff instead. Original binary evidence has its own retained blob
identities. Later evidence and documentation commits do not inherit a green
gate or a passing CI result from this checkpoint.
