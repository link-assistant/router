# Complete JavaScript gate attempt at 5ef265492

Issue [#784](https://github.com/link-assistant/router/issues/784),
[PR #785](https://github.com/link-assistant/router/pull/785), 2026-11-10 UTC.
The complete local gate was invoked at clean commit
`5ef26549252f406e3e03aa5aa7f3a487121ceaa1`. It failed; no green stamp,
complete parity, release readiness or Rust authorization is established.

Node 20.20.2, Bun 1.4.4 and lockfile-installed TypeScript 5.9.3 were used.
CI pins Bun 1.4.3. Child old-space was limited to 512 MiB, with the original
gate's 128 MiB coordinator. Original commands, assertions, whole files,
deadlines, compiler source limits and strictness were preserved.

| Stage | Observed result |
| --- | --- |
| Initial fingerprint | 50,517 files / 1,876,580,375 bytes completed |
| Lint | All ten original commands passed |
| Native Node and Bun | All 259 cases passed in each engine |
| TypeScript | Ten deadline controls, both package typechecks, native freshness and strict compilation of all 167 native files passed |
| Original native receiving file | All nine assertions passed; independent deadline audit failed |
| Acceptance | All 121 original cases passed in 1,200,716.908296 ms |
| Strict parity | Failed: canonical child heap exhaustion and retained draft gaps |
| Forward whole-file suite | Interrupted during startup by the unchanged container memory guard; no case TAP or deadline receipt was produced |
| Remaining forward commands and reverse stage | Unrun |

The native file's four-regeneration case took 122,899.689168 ms against its
unchanged 60,000 ms deadline. The independent auditor correctly failed it
(`complete-IfWBnK`); passing assertions do not override that result. A preceding
1 GiB-heap receiving cohort also failed at 64,335.027529 ms.

The strict parity command failed after 398,365.145408 ms. Its canonical child
exhausted the configured 512 MiB heap after 302,699 ms, within the unchanged
1,200,000 ms command budget. It reported 441 draft gaps and one validation
error; the retained inventory still has 865 sources and 12,431 carried items.
The lower gap count after an interrupted validation establishes no parity gain.
Acceptance rejection controls likewise do not establish canonical freshness.

At 2,450.553613 seconds the observer sampled 2,869,854,208 cgroup bytes, above
its unchanged 2,866,933,760-byte threshold. It stopped only the owned gate tree;
exit was 143 after 2,451.677686 seconds. The forward auditor's missing
`case-deadlines.json` follows that interruption, not a successful source audit.
Its terminal receipt records SIGTERM, SIGKILL and complete group cleanup.
Every owned gate/adviser/child process was reaped and checked absent.

An earlier complete-gate attempt stopped at the same guard during fingerprinting
after 35.009564 seconds; every stage in that attempt is unrun. Completed-page
advice in the second attempt changed no file bytes, clocks, limits or guard.
Independent diagnostic drafts were retained outside the gate inputs and restored
only after it ended. Production compiler inputs stayed unchanged; no final
fingerprint or green stamp was reached.

## Published CI and independent drafts

The entire published `1c82cbd9` cycle is terminal. Its
[run 42697950690](https://github.com/link-assistant/router/actions/runs/42697950690)
has 59 jobs: 18 failed, eight passed, eight cancelled and 25 skipped. All 26
nonpassing logs and all 26 artifacts were inspected before this repair batch.
That CI passes the original native regeneration case at 29,190.101233 ms
(TypeScript job 129434728167, log line 407); its actual TypeScript failure is
the missing genuine owned matrix at line 453. The local deadline failure and
CI's missing generation obligation remain distinct. No secret-only blocker was
found and no skip substitutes for a source repair.

A bounded 15-second, 100 Hz observation of one owned canonical child retained
1,348 samples. Derive-context construction dominated the sample. It includes
profiler overhead and supplies no controlled performance qualification. A first
attachment refused after its selected child had already exited. Separate native
allocation and path-index reentry source candidates were authored and syntax
checked, but remain uninstalled and unqualified; neither adds executable functions.

The [complete gate evidence packet](evidence/complete-gate-5ef265-20261110.tar.xz)
contains 40 complete members / 1,085,207 original bytes, with full readback;
its [receipt](evidence/complete-gate-5ef265-20261110.json.gz) records SHA-256
`5c50f2831e83ee4e1c4648ec8e67339411a40186a857a20fa7e0f66208f08694`.
The [terminal Node audit packet](evidence/complete-gate-5ef265-node-audits-20261110.tar.gz)
preserves 85 complete members from 13 closed attempts, including failures;
its [receipt](evidence/complete-gate-5ef265-node-audits-20261110.json.gz) records
SHA-256 `c91329e5f462e5306edcd66505970f79f7f9916ebd513ec111eef6cfc6c84e84`.
Only after full member verification and inactivity checks were 15,002,107 raw
audit bytes retired. No Rust tools ran. Every remaining source, generation,
deadline, parity and universal client/account criterion remains mandatory.
