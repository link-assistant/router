# Completed CI cycle at 37147a

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft and
unfinished. The [published run](https://github.com/link-assistant/router/actions/runs/42584714703)
reports PR head `37147a95ce5fb1efeced23b2ba49dcd036a53a8a`, starting at
2026-11-09 08:16:14 UTC. Its final JavaScript aggregate failed at 09:27:47 UTC.
All seven workflows for this head are terminal: the main workflow failed and
the six Rust-dependent workflows were skipped. No Rust verification occurred.
The main workflow has 17 failed, seven cancelled, ten successful and 25 skipped
jobs. Cancelled jobs reached their existing limits; this task did not cancel runs.

The actual checkout and `EXPECTED_SHA` in the jobs were GitHub's synthetic
merge commit `20727e24115897703285d4ada1454f7a7cc447f0`. The
[merge-commit response](evidence/current-37147a/tested-merge-commit.json) records
parents `eb2dad1c0a18394dc1aad46413e11401e74eb502` and the PR head. Its tree
`7c7d5e5e2c146b32ec40b015ddff486b71c57b77` equals the PR head's tree, checked
with `git rev-parse 37147a95ce5fb1efeced23b2ba49dcd036a53a8a^{tree}`.
Identical source trees do not make the commit IDs interchangeable: these CI
observations belong to the synthetic merge SHA. The reusable workflow receives
`${{ github.sha }}` from `delivery.yml` and preserves its same-SHA checks.

The [final job snapshot](evidence/current-37147a/current-37147a-job-snapshot-15.json),
[all-workflow snapshot](evidence/current-37147a/current-37147a-all-runs-final.json)
and [complete failed-job collection](evidence/current-37147a/current-37147a-completed-logs-15.json)
pin the head, timestamps and every completed non-passing job. All 24 complete
failed/cancelled logs were downloaded, decompressed and SHA-256 checked.
Their original paths in the collector are historical; the byte-identical files
now reside beside the [relocation map](evidence/current-37147a/relocation.json).

| Failed or cancelled job | Evidence in its complete decoded log |
| --- | --- |
| TypeScript, 129051660703 | Line 463: missing `profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json`. Native TypeScript proceeded further in CI than the heap-limited local attempt. |
| Parity, 129051660992 | Line 890: stale `account_routing_policy.rs` source hash. Strict parity also reports 441 gaps among 443 features, 12,345 carried items and `runtimeParity=false`. |
| Forward freshness, 129051661050 | Complete stale and missing output list ends at line 628; actual current generated artifacts are not installed. |
| Reverse freshness, 129051661117 | Line 292: owned corpus differs from the current forward inventory. |
| Profile matrix, 129051661128 | Line 281: cancelled at the original one-hour job limit; line 295: no matrix draft artifacts. |
| Owned profile matrix, 129051661118 | Line 284: cancelled at the original one-hour job limit; line 298: no matrix draft artifacts. |
| Forward 1, 129051661257 | Lines 1383, 1727, 2471 and 2520: original complete-parent tests time out. Line 2528: job cancellation. |
| Forward 2, 129051661234 | Line 2252: actual private Rust compiler tool exceeds its complete-source byte bound. Independent deadline audit also fails. |
| Forward 3, 129051661372 | Complete core module graph and original provider/producer cases exceed deadlines; child compiler probes time out. |
| Forward 4, 129051661188 | Actual core producer case takes 73,757.64 ms and whole-source private producer takes 62,460.24 ms against original 60,000 ms limits. |
| Forward 5, 129051661233 | Lines 2007–2012: original clients parent test times out. The audit records 1,256,216.57 ms against 60,000 ms, and a second 62,935.28 ms breach. Lines 3397–3399: audited runner exits with failure before the job limit. |
| Forward 6, 129051661099 | Line 1104: complete corpus case times out. Line 1703: original `safe_number` is not admitted. Audit records 2,024,700.08 ms against its original 60,000 ms limit. |
| Forward 7, 129051661230 | Original JSON string case exceeds 60 seconds; actual JSON/hash observer child probes exceed their existing limits. |
| Forward 8, 129051661482 | Lines 304–312: stale compiler hash. Lines 1131, 1152 and 1182: original CSV functions are refused; borrowed `str` lacks proved standard identity. Lines 2780, 3343 and 5498: child timeouts. Lines 3643–3659: stale tracked-source census. |
| Reverse Node 1, 129051661422 | Line 325: cancelled at its original 15-minute job limit. |
| Reverse Node 2, 129051661431 | Actual runtime-import parent case takes 74,068.50 ms against 60,000 ms. |
| Reverse Node 3, 129051661011 | Actual scalar-fold case takes 75,219.46 ms against 60,000 ms. |
| Reverse Node 5, 129051661451 | Line 429: cancelled at its original 15-minute job limit. |
| Reverse Node 7, 129051661575 | Actual ASCII shared-case test takes 200,467.75 ms against 60,000 ms. |
| Reverse Node 8, 129051661172 | Actual base64 evaluator case takes 70,944.75 ms against 60,000 ms. |
| Reverse Bun 1, 129051661401 | Line 294: cancelled at its original 15-minute job limit. |
| Reverse Bun 4, 129051661353 | Actual nullable native TypeScript first case takes 5,300.31 ms against Bun's unchanged 5,000 ms default. Complete raw stderr is separately retained. |
| Reverse Bun 5, 129051661463 | Line 286: cancelled at its original 15-minute job limit. |
| JavaScript aggregate, 129080824308 | Lines 96–146: correctly rejects the failed and cancelled mandatory stages. |

The logs are named `current-37147a-job-<job-id>.log.gz` in
[the evidence directory](evidence/current-37147a/). These failures require
implementation, performance work and actual regeneration. They are not made
optional by failures on `main`. No observed failure requires a missing secret
or manual permission, and no such skip was added.

The complete original deadline JSON is retained in three containers:
[initial inspection](https://github.com/link-assistant/router/blob/e88183bb894b9ea62c9d6ae170c3fc099047685b/docs/case-studies/issue-784/evidence/current-37147a/current-37147a-deadline-inspection-4.json.xz?raw=true),
[later shards](evidence/current-37147a/current-37147a-deadline-inspection-12.json.gz)
and [final shards](evidence/current-37147a/current-37147a-deadline-inspection-15.json.gz).
The latter two retain only the selected complete receipts and stderr logs;
their member inventories identify other inspected bytes. The initial inspection
retains every JSON member. Original ZIPs and copied source/raw stdout were
inspected and discarded, so these files do not establish custody of those bytes.
The later-shard receipt's earlier generic scope sentence says raw logs were
discarded; its explicit `completeSelectedRawLogs` field records the retained
stderr exceptions. No original receipt was rewritten to conceal that wording.

The relocation moved verified files without making another archive copy. Its
initial process exited 1 on a final Python tuple/list equality assertion after
all moves and byte checks; an independent
[readback](evidence/current-37147a/relocation-readback.json) verifies every moved
file. No CI log was deleted. The old temporary PR diff remains retired, as
recorded in the [separate receipt](evidence/current-37147a/current-custody-reviewed-whole-pr-retired.json).

Two other inactive review patch copies were retired after full gzip readback
and byte-for-byte hash comparison with their published Git blobs. The
[receipt](evidence/published-review-copy-retirement.json) records 20,282,031
logical bytes reclaimed and immutable links to both exact published files.
Those patches remain available in preserved Git history; no CI log was removed.

The [matrix trace change](current-matrix-live-progress.md) is a diagnostic
checkpoint. Its focused regressions pass under Node and Bun, including the
old-worker failure reproduction. It adds zero executable application functions
and resolves none of the outstanding parity or materialization requirements.
The [complete local gate](current-matrix-live-gate.md) also failed. None of this
evidence establishes completion of issue #784 or permission to run Rust.
