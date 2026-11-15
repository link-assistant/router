# Terminal CI review for 02bf28e5, 2026-11-09

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
[Run 42631154648](https://github.com/link-assistant/router/actions/runs/42631154648)
tested published head `02bf28e5dd6ce7bb90f6a75cfabcb339b895b43a` through merge
`d38b22b9b62da403558c04e257c73c798a8ab5ed`. It started at 14:04:46 UTC and
finished at 15:40:29 UTC: 59 terminal jobs, with 11 successes, 15 failures,
eight cancellations and 25 skips. Six supplemental workflows also finished
as skipped. No Rust verification was unlocked by these results.

All 23 non-passing job responses were downloaded and read. Twenty-two contain
complete job logs. Cancelled forward shard 7, job `129207491917`, instead
returns GitHub's `BlobNotFound` response. CLI recovery also returns `log not
found`; the verified whole workflow ZIP has 137 members and no corresponding
shard log. The original unavailable response and retry streams are retained.
This is an explicit evidence gap, not a passing or investigated-empty shard.

The failing groups remain mandatory:

| Job | Original log evidence | Unfinished criterion |
| --- | --- | --- |
| TypeScript `129207492094` | Line 463: `ENOENT` for `profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json` | Generate and independently qualify every actual owned profile and counterpart. |
| Strict parity `129207492121` | Lines 895–899: forward check exceeds its 1,200,000 ms budget; 441 draft gaps, one validation error and 12,431 carried items | Complete actual source behavior and the strict same-SHA gate. |
| Reverse freshness `129207491810` | Actual check reports three stale outputs | Local commit `19593b3a` regenerates these outputs and separately checks all 12,027,571 bytes. Current CI qualification remains pending. |
| Ordinary and owned profile matrices | Neutral profile finishes; subsequent profile work is cancelled without a complete matrix | Complete all original profiles within original resource and time requirements. |
| Forward shards 1, 2, 3, 5, 6, 8 | Assertion failures and independent original deadline breaches | Repair the shared source implementation and run each complete original receiving file. |
| Reverse shards 2, 4, 7, 8 and Bun shard 2 | Original assertions can pass while the independent audit records deadline breaches | Preserve assertions and original deadlines; a zero test exit alone is insufficient. |
| Aggregate JavaScript gate | Required upstream groups fail or are cancelled | All mandatory JavaScript stages must pass for the identical head before Rust. |

Forward semantic failures include the original CSV parents' unresolved standard
namespace, shadowed prelude and derive owners; the complete private compiler's
unchanged 4 MiB source limit; and bounded child compiler timeouts. Recorded
deadline failures range from slightly above 60 seconds to original cases taking
about 29–32 minutes. No test was filtered, shortened or granted a longer limit.

These are implementation, generation, performance and unavailable-log failures.
The reviewed logs show no secret or account-access-only step for which a PR
skip/default-branch action requirement applies. No manual-action exemption is
used. Passing lint, native suites, source preparation or an unqualified canonical
artifact does not qualify the remaining stages or universal geolocation claim.

The [complete custody manifest](evidence/ci-02bf/manifest.json.gz) joins 131
original files by length and SHA-256. All 24 ordinary artifact ZIPs were fully
decoded and CRC-checked; their complete selected reports and raw stderr are
retained. Other member bytes were discarded and receive no custody claim.
The canonical artifact's 58,476,520 ZIP bytes and all 2,873 nested outputs
(318,860,481 decoded bytes) passed complete checksum and CRC inspection.
Its complete original manifest and member inventory are retained, while its
ZIP and output bytes were discarded. Its unqualified inventory still reports
158 executable and 2,420 carried production functions; no coverage gain or
current worktree freshness is established by inspecting this artifact.

The [subsequent complete local gate attempt](current-ef601-gate.md) also fails.
No new CI head or full parity success is represented by these receipts.
