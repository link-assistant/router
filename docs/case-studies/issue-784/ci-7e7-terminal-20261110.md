# Complete terminal CI review for 7e7fb7a3c

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
[Run 42768550440](https://github.com/link-assistant/router/actions/runs/42768550440)
tested head `7e7fb7a3c7c294092abf2e974af42dbc58fca6be`, created
2026-11-10 06:26:44 UTC and completed 07:48:47 UTC. Its 59 jobs finish with
eight successes, 18 failures, eight cancellations and 25 skipped jobs. The six
supplemental workflows are also terminal and skipped. No run was cancelled by
this task. Rust remains skipped behind the same-commit JavaScript gate.

Every available failed/cancelled job log was read. GitHub returns
`BlobNotFound` for translation shard five even after completion; the official
whole-run ZIP also lacks that shard's original log. This is an explicit
evidence gap, not a passing or fully observed shard. All 136 available ZIP
members pass CRC and SHA-256 checks. The complete
[available log ZIP](evidence/ci-7e7-complete-available-logs-20261110.zip) is
2531546 bytes, SHA-256
`de2f5f0701283a2eb69282b98fb148a028dc9fcfbad1ac1ce442bf0c00fb9c1d`.

All 25 artifacts were downloaded, authenticated against the exact head/run,
and read completely, including every member CRC and SHA-256. The bulk artifact
contains 2874 complete members. Its original member bytes remain in the local
54415600-byte archive, SHA-256
`4013f112ed9a3c410a9f83da1db9ce315e090927250d6b0dfbf408276774a2a1`;
its ZIP container is deliberately not retained. The other 24 complete original
ZIPs remain locally compressed. These payloads have not been installed as
current outputs: the unpublished compiler source batch differs from this run.

The [complete review packet](evidence/ci-7e7-terminal-review-20261110.json.gz)
contains the original terminal snapshots, every artifact/member inventory,
the complete failure index, resource receipts and unavailable-log responses.
Its 13 complete members were reopened and checked. It is 441328 bytes,
SHA-256 `8fef68dbd407a2afd3b336421d41f1ae9b7b4df88db7394b13e94cafd73c8d7f`.

| Area | Observed failure and required work |
| --- | --- |
| Parity | Log 129670694772:882–885: the canonical check exceeds its unchanged 1200000 ms child deadline. The report has 441 draft gaps and 12431 carried items; acceptance's 121 passes do not establish parity. |
| TypeScript | Log 129670695002:463: missing genuine owned matrix `80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0`. Deadline-fixture failures in its artifacts are expected negative controls, not additional production failures. |
| Forward freshness | Log 129670694768:299–304: six stale actual canonical outputs, including the library meta, JS/TS products and inventory. Generate them genuinely; do not update inventory hashes alone. |
| Reverse freshness | Log 129670694947:284: the owned-definition corpus differs from the current forward inventory. |
| Matrices | Both normal and owned matrix jobs reach their original 60-minute job limits. |
| Translation 1 | Real repository builds exceed 60000 ms; owned CLI source is stale; complete Debug/PartialEq child times out. Its audit also finds five original deadline breaches. |
| Translation 2 | Actual `parse_csv`, `split_repository_list` and `parse_usize_csv` source expectations fail; the first runs for 1562504 ms against 900000 ms. Actual ActivityPub and static-source lifecycle also exceed their original limits. |
| Translation 3 | `safe_number` refuses implicit shared-f64 method use. Complete private compiler closure exceeds its original 4 MiB admission bound. Three original deadlines also fail. |
| Translation 4 | Assertions pass, but four original source-declared deadlines fail in private freeze, complete current wrappers and static release. |
| Translation 6 | Complete guarded proof-byte source history differs. |
| Translation 7 | Derive/native CLI histories differ; provider/affinity, JSON return flow, proof/Core stream, serialization projection and genuine ClientKind source exceed original limits. Several native child checks also time out. |
| Translation 8 | Nineteen actual-gain cases fail the stale physical-source inventory hook; concrete syntax, original Option owner, core parse/unit-match cases exceed original limits. The byte-operation regression omitted the explicit namespace progress opt-in. The job is cancelled at its original limit. |
| Reverse Node | Shards 2/4/5 have five total unchanged 60000 ms audit breaches; shard 6 fails its conditional static-string loan case at 61881 ms. Shards 1/7 are cancelled. |
| Reverse Bun | Shard 3 regeneration exceeds its original 5000 ms limit at 82560 ms; shard 4 complete runtime-import parents exceeds 60000 ms at 61635 ms; shard 5 native nullable exceeds 5000 ms at 5265 ms. Shards 1/7 are cancelled. |

The local coordinated repairs retain complete proof-byte, derive and native
CLI histories and explicitly opt the byte-operation callback into namespace
diagnostics. Their whole-file Node/Bun evidence is recorded separately;
the native CLI comparison still fails its original Node child deadline.
None of these changes resolves the remaining semantic, admission, generation,
deadline, parity or universal privacy requirements. No secret or manual-access
blocker was found, and no required check was weakened or skipped.

## Evidence storage and resource custody

The task's evidence remains below its 500000000-byte allocation limit.
Storage reductions retain complete payloads and explicitly distinguish their
containers. No active file, worker directory, build cache or lock was removed.

- The two `older-ci-complete-members-*-20261110.tar.xz` archives and adjacent
  receipts retain all 261 original members from 26 inactive older ZIPs. Every
  original CRC and full member hash was checked before and after writing.
  The ZIP containers are not retained. Replacing 61587367 bytes with
  28854164 bytes reclaims 32733203 logical bytes.
- The `complete-ci-duplicates-retired-20261110.json.gz` and
  `complete-ci-large-duplicates-retired-20261110.json.gz` receipts identify
  54 inactive working duplicates, totaling 28302615 bytes. Every complete byte
  is retained in the named base64 evidence packet, and was decoded, compared
  and rechecked before unlinking.
- `inactive-diagnostic-container-custody-20261110.json.gz` maps seven old
  diagnostic wrapper paths to denser XZ containers. Complete decoded bytes
  were streamed and independently reopened with exact length/SHA-256 checks;
  original compressed container bytes are not retained. This reclaims
  14156064 bytes. Three previously tracked paths are replaced with their
  explicitly mapped dense containers in this commit.

All retirement helpers check task ownership, regular-file identity, link count,
open file descriptors and final hashes. Collection retains complete data under
finite memory, decoded-size, path and disk bounds. The first bulk collection
refused its 40 MiB container bound; the inactive partial was identified and
retired. The successful retry uses a 64 MiB evidence-container bound while
preserving the compiler's limits and deadlines. It takes 87.47 s and peaks at
1819041792 sampled cgroup bytes; the remaining collector takes 38.25 s and
peaks at 1712017408. Neither reaches the unchanged 2866933760-byte guard.

Git unexpectedly started an automatic repack after an earlier local commit.
The resource receipt identifies the task-owned Git/pack process chain. Only
that pack child was terminated after cgroup use approached the container cap;
Git cleaned its partial output and all three processes finished. Subsequent
mutations disable hooks, automatic GC and automatic maintenance explicitly.
No local Rust tool ran, and no full-gate success is claimed.
