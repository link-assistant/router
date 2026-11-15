# Complete production and gate attempts at 358849070

All four original complete production commands were attempted sequentially at
`358849070837f236b15540ff123ad4e20527bdd0`, using the refreshed compiler
registration. Each hit the unchanged 2,866,933,760-byte aggregate memory guard
under the 3,135,369,216-byte cgroup limit. No generated output changed.

| Production family | Observed seconds | Peak sampled cgroup bytes |
| --- | ---: | ---: |
| Canonical | 22.853 | 2,867,384,320 |
| Retained owned canonical | 15.797 | 2,867,949,568 |
| Complete profile matrix | 4.538 | 2,873,765,888 |
| Retained owned profile matrix | 4.337 | 2,868,912,128 |

The mandatory `node scripts/check-js-first-local.mjs` then ran at that same
committed source. It stopped during the initial fingerprint after 14.519
seconds, peak sampled cgroup memory 2,872,737,792 bytes. All seven stages are
unrun; no green stamp or final fingerprint exists. This uses Node 20.20.2 on
PATH and inherited 512 MiB Node old-space. Production commands inherited
384 MiB. No original command, test body, strictness or deadline changed.

The separate completed-prefix page adviser also failed: `/proc/810116/fd/8`
became unreadable with `PermissionError`. It refused further advice rather
than assuming the same-user process's files were inactive. Its complete
traceback is retained; no successful page-advice receipt is claimed. The gate
log's last opening record reaches input 31,471 of 49,347, with 682,896,706
completed bytes. This incomplete fingerprint grants no stage qualification.
Every owned child and the separate adviser finished and were reaped.

`gh pr diff 785` failed with HTTP 406 because the PR exceeds GitHub's
300-file diff limit. Its full error and empty original stdout are retained.
The complete local `git diff origin/main...HEAD` succeeds: 55,921,044 decoded
bytes, SHA256 `8081711175c6befdee12cdbaa3e8239236738cec94173e0f5de13a98707faf33`.
Its complete compressed stream is retained and verified by full readback.
Source review of the coordinated batch preserves original public adapters,
complete upstream histories and independently checked semantic boundaries.
Original conversion and producer tests remain whole and retain deadlines.

The [complete checkpoint packet](evidence/current-conversion-checkpoint.json.gz)
retains every production/gate stream and resource receipt, the failed adviser,
exact commands and review results. Its external member is the complete local
PR patch; all members have full length/SHA256 readback checks. Fetched main
`eb2dad1c0a18394dc1aad46413e11401e74eb502` remains an ancestor. Complete current
issue/PR feedback has no new comments or required child issues.

The [previous published CI cycle](current-terminal-ci-764.md) is entirely
terminal, including all available logs and artifacts. This coordinated batch
is an authorized draft feedback checkpoint. Every remaining generation,
original application deadline, semantic refusal, strict parity and issue-wide
privacy criterion remains mandatory and unfinished. No missing-secret excuse,
skipped code check, local Rust invocation or executable production gain is
claimed. Rust CI remains gated on every required same-SHA JavaScript stage.
