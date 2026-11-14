# Complete 17c7 CI review and evidence custody

[Run 42467233769](https://github.com/link-assistant/router/actions/runs/42467233769)
tested published head `17c7dd9942814f2a6a17eee135016e5941f04f15` through
merge head `f7065eceb9a5171d0a6e7864c1edf996510e15bb`. Both have tree
`323b4f8af55bf99d02d8ff745293630d7ae526f2`. The complete cycle ran from
2026-11-08 09:27:05 to 10:32:30 UTC. Its 59 jobs finished with six successes,
21 failures, seven cancellations and 25 skips. All six supplemental workflows
also finished skipped. No run was cancelled by this task.

All 28 nonpassing job logs were downloaded and read in batches of at most
1500 lines. Every complete raw log was decoded and SHA-256 verified. All
25 available artifacts were retained: 34687021 compressed bytes containing
430 members, each independently checked against its complete bytes, hash
and ZIP CRC. The [retention manifest](evidence/ci-17c7/manifest.json) maps
all 209 original paths to their permanent paths. Files were moved with
verified inode identity; no second copy was allocated.

The complete sources of failure are retained in the
[failure index](evidence/ci-17c7/current-17c7-failure-index-13.json.gz),
[job log inventory](evidence/ci-17c7/current-17c7-ci-logs-13.json) and
[artifact verification](evidence/ci-17c7/current-17c7-complete-artifact-verification.json).
Their embedded original paths remain unchanged; use the retention manifest
to resolve them. The original aggregate CLI download refusal is also retained:
GitHub required narrowing the request to individual jobs. This was recovered
through complete per-job downloads, not treated as missing test evidence.

| Failure group | Actual evidence and remaining obligation |
| --- | --- |
| Strict parity | 443 features, two implemented, 441 gaps; 151 partial and 290 unsupported. Inventory freshness also fails for account routing policy. Inventory validation does not prove parity. |
| TypeScript | Job 128689456931 line 464 requires the absent `owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json` sidecar. Produce and qualify the actual matrix. |
| Forward freshness | 267 stale or missing results across the four required modes. No carried source is counted as executable. |
| Reverse freshness | Eleven owned ASCII results require current producer outputs. |
| Profile matrices | Both jobs were cancelled near their existing enclosing limit and retained no completed draft directory. A cancellation is not a successful matrix or an infrastructure diagnosis. |
| Reverse receiving history | Original 52-source comparisons encounter a 53-source native cohort; ASCII host history also rejects changed source. Local follow-up repairs retain their own functional and deadline evidence. |
| Forward receiving history | Job 128689456957 lines 1045–1050 rejects the current negative-budget fixture. The complete local follow-up restores all five targets; its original 60000-ms deadline remains independently required. |
| Other translation failures | Complete static source inventory drift, actual owner and import changes, class source bounds, `MethodRustParser` initialization, original option behavior, strict generated TypeScript and original case deadline breaches remain separate obligations. |
| Aggregate and Rust | The aggregate correctly fails its required JavaScript stages. Rust remains skipped; no local Rust tool was invoked. |

All 21 retained deadline-audit rows were reviewed. Eight rows belong to the
intentional core-integration control fixture and are not production failures.
Thirteen rows are production audit records. The cancelled translation shard 8
has a partial artifact without a final audit; absence is not zero breaches.
Its full log also records the Qwen typed-target child failure at line 2444;
the test did not print the compiler diagnostic, so no diagnostic is invented.
No missing secret, credential, or human-only action explains these failures.
The same-commit JavaScript requirements and Rust gate are unchanged.

To stay within the 500000000-byte evidence budget, 1107 identified inactive
duplicate CI files were removed only after their complete original members
were reread from 13 already published archives. Both archive and manifest
were checked against their exact published Git blobs. No original evidence
was removed. This reclaimed 19152317 logical bytes and 22192128 allocated
bytes. The exact plan, every member hash, inactivity checks, full receipt and
actual collection/retirement tools are preserved in
[the custody packet](evidence/current-ci-custody.json.gz).

The 25 inactive original artifact ZIP copies were subsequently retired from the
current working tree after every full SHA-256, size and Git blob was checked
against immutable published commit `764222b6e6d4f0ce1efb0341396cfb6a87661e85`.
The [retirement receipt](evidence/ci-17c7-artifact-local-retirement.json.gz)
retains the whole manifest, remote metadata, complete original hashes and
permanent download links for all 25 originals. They remain in that published
commit. No current CI artifact, job log or active file was removed. This
reclaimed 34,687,021 logical bytes and the receipt records filesystem allocation.

These are failed published-head results. Subsequent focused source repairs
do not retroactively qualify this head or establish full-gate success, strict
parity, Rust verification, or completion of issue #784. The pull request stays
draft and unmerged while these acceptance criteria remain unfinished.
