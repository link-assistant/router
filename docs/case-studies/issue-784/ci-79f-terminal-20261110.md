# Terminal CI review for 79f375ed

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft and
unfinished. [Run 42832857700](https://github.com/link-assistant/router/actions/runs/42832857700)
started on 2026-11-10 at 14:19:09 UTC for published head
`79f375ed1d9690ab8336e06a28331c2871092eb0`. All 59 jobs are terminal, including
24 nonpassing jobs. The actual tested merge SHA is
`ac46abf2eb6c7f311287bfdaa8a7dabe834f34fa`. Results for this merge do not
qualify the subsequent local compiler batch. Rust remains skipped behind the
failed JavaScript gate. This task did not cancel CI.

All 23 available nonpassing job logs were downloaded in full and read in
chunks of at most 1500 lines. Translation shard eight's original log is
unavailable: both the job API and `gh run view --job` fail, and the complete
229-member workflow ZIP also lacks that job. Its final job metadata and
check annotation report the original one-hour execution limit. This proves
the cancellation reason, not its unobserved stdout or case census. The
[custody receipt](evidence/ci-79f-terminal-20261110.json.gz) preserves this
gap, complete terminal results, every available original payload identity,
and all workflow ZIP member checksums.

The first custody index included its own still-open output log. Its initial
receipt remains as `ci-79f-terminal-initial-20261110.json.gz`; that log identity
is invalid after the subsequent write. The corrected receipt excludes the
collector's output log and independently rechecks every selected file after
writing. Original downloaded evidence is unchanged.

All 25 original artifact ZIPs remain complete. Their readback receipts retain
every member CRC and SHA-256. The canonical artifact has 2874 ZIP members;
its 2873 generated members contain 320407358 decoded bytes. Every nested gzip
CRC, decoded SHA-256, source join and manifest equality was independently
checked. Its whole ZIP is 58769430 bytes, SHA-256
`4d83d42a5ac65736f8a750f03e1d8b2e31f719cd9f7d50b0d90015f642427659`.
These are computed outputs for the published merge, not verified current-tree
outputs. They have not been installed against the changed local compiler.

The complete retained payloads reside under the immutable published
[`ci-logs/issue-784-restart-2`](https://github.com/link-assistant/router/tree/a598d2b01b5a8e47bbf6bb5a8f90b317d90ce5de/ci-logs/issue-784-restart-2/).
Logs use `checkpoint79f-job-JOBID.log.gz`; artifacts use
`checkpoint79f-artifact-ARTIFACTID.zip`. The complete failure review is
`checkpoint79f-current-failure-review.json.gz`, and the independent nested
canonical readback is `checkpoint79f-canonical-member-verification.json.gz`.
No ZIP or log was replaced by a selected excerpt or its receipt alone.

After that commit was published, 49 inactive local copies were retired:
all 25 artifact ZIPs, all 23 available full nonpassing job logs and the complete
workflow ZIP. Each whole local stream was compared with its published Git
blob and GitHub directory metadata before retirement. The
[custody receipt](evidence/ci-79f-published-local-retirement.json.gz) retains
every immutable URL, complete byte count, SHA-256 and Git blob identity; its
[completion receipt](evidence/ci-79f-published-local-retirement-complete.json.gz)
records 97292190 logical bytes and 97394688 allocated bytes reclaimed.
Open descriptors and mapped paths were checked before deleting only these
identified task copies. All original whole streams remain in published Git.

| Nonpassing job or group | Evidence and remaining work |
| --- | --- |
| Parity, 129887202554 | Complete log line 890 reports a stale Rust source hash. Strict parity retains 441 draft gaps, 12431 carried items and `runtimeParity=false`. Actual canonical production coverage is 162 executable top-level functions out of 2578, with 2416 carried. Neither the source census nor 121 acceptance cases establishes parity. |
| TypeScript, 129887202687 | Log line 468: missing `profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json`. Native TypeScript and the original deadline auditor controls pass; intentional fixture failures are negative controls. The genuine owned matrix must still be materialized and checked. |
| Forward freshness, 129887202154 | Log lines 305–324 list 20 stale products, including complete library project products, application configuration/header products, shared-f64 test products and inventory. All require actual generation and review. |
| Reverse freshness, 129887202919 | Log line 293 completes ordinary regeneration with zero changes; line 298 rejects the owned corpus's forward inventory join. |
| Matrices, 129887202552 and 129887203250 | Both jobs are cancelled at their unchanged one-hour limit. Worker diagnostics remain in the complete logs. Neither complete matrix is qualified. |
| Translation 1, 129887202758 | Artifact 13774481200 retains 638 completed cases, six deadline breaches and seven original failures. The batched birth, fresh-plan, native-source, subscription/catalog, metadata and source-packet cases exceed original 60000 ms limits. Display and per-file export failures have local source repairs; those repairs have separate receiving evidence. |
| Translation 2, 129887202599 | Artifact 13774530659 retains 607 completed cases, four deadline breaches and four original failures. Derive catalog, owned JSON, complete core stream and ClientKind exceed 60000 ms. Project progress histories are repaired locally; complete performance remains unfinished. |
| Translation 3, 129887202800 | Artifact 13775208501: actual `parse_csv` takes 1558039 ms against 900000 ms. Core unit matches take 1648204 ms against 60000 ms; storage CSV, schemars candidate scope and receiving source failures also remain. Original native build and JSON-parent cases exceed 60000 ms. |
| Translation 4, 129887202691 | Artifact 13773848474 retains 636 completed cases, five deadline breaches and six failures. Complete native/reverse source, vector, lifetime and original-method cases exceed 60000 ms. Streaming source, whole-owner child limits and stale translation hashes remain mandatory. |
| Translation 5, 129887202978 | Artifact 13776517773: actual `safe_number` takes 2159779.95 ms and ActivityPub takes 1783067.58 ms against original 60000 ms limits. Log lines 2647–2666 show the shared-freeze proof child failing with `spawnSync node ETIMEDOUT` at its original 10000 ms child limit, before its source-comparison assertion. The complete core adoption export has a local archive-compression repair. |
| Translation 6, 129887203000 | Artifact 13773293975 retains 615 completed cases, six deadline breaches and 24 failures. Display, class-birth source and stale isolated registry have local repairs. The private Rust compiler's complete source still exceeds its separate unchanged 4 MiB raw admission bound. Literal, deployment, grouped-refusal, HostEmitter, matches and static lifecycle deadlines remain failed. |
| Translation 7, 129887203003 | Artifact 13774970439 retains 608 completed cases, five deadline breaches and three failures. Schema generation takes 373370 ms against 30000 ms. Grouped parents, method metadata, private parser proposals and candidate wrappers exceed 60000 ms. The original private freeze child times out. |
| Translation 8, 129887202892 | Cancelled at the original one-hour job limit. Complete job metadata and the check annotation survive; the original log and test artifact are unavailable. No assertion or deadline result is inferred for unobserved cases. |
| Reverse Node 1 and 7, 129887202682 and 129887202931 | Cancelled at original 15-minute job limits. |
| Reverse Node 2, 129887202798 | The original base64 evaluator case takes 91452 ms against 60000 ms. |
| Reverse Node 4, 129887202836 | The original runtime-import parent takes 73546 ms against 60000 ms. |
| Reverse Node 5, 129887202626 | The original scalar-fold case takes 81999 ms against 60000 ms. |
| Reverse Node 6, 129887202583 | The original conditional returned-loan case takes 62423 ms against 60000 ms. |
| Reverse Bun 1 and 7, 129887202580 and 129887203110 | Cancelled at original 15-minute job limits. |
| Reverse Bun 3, 129887202968 | Original deterministic regeneration takes 81064 ms against Bun's unchanged 5000 ms default. |
| JavaScript aggregate, 129926692715 | Log line 146 fails after checking the mandatory failed/cancelled stage results. The aggregate correctly blocks Rust. |

The current local source batch composes complete original class-birth and
project-progress histories, pairs genuine enclosing/method analyses for
Display, shares operation size measurements inside the existing byte frame,
and losslessly recompresses the complete static archive below the existing
per-file export bound. It also refreshes the isolated compiler registration
from the reviewed source commit. The individual reports preserve whole
source equations, original refusal controls, failed checks and unrun checks.
None waives the remaining failures above or the complete local gate.

The compression files pass all 20 Node assertions but fail independent
performance qualification: the two complete producers take 163665.85 ms
against 60000 ms, and complete storage takes 62052.67 ms against 60000 ms.
The Display cohort passes 43 Node cases and its original deadlines; the same
Bun cohort has seven unchanged default-deadline failures. Complete canonical
local generation has also failed its 768 MiB heap limit. These observations
must remain failed until the original workloads pass without raised limits.

No observed CI failure requires a missing secret or manual access. No check
was skipped or weakened. Universal client/account geolocation behavior,
genuine generated freshness, strict parity, complete matrix completion,
all original deadlines and the full same-SHA gate remain unfinished.
No Rust tool ran locally.
