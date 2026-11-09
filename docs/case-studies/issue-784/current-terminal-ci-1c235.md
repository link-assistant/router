# Terminal CI at published 1c235248

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
All seven workflows for `1c235248e1b584875c3ec2b9c1bd2d94a859943c`
are terminal. The [main run](https://github.com/link-assistant/router/actions/runs/42536508655)
has 59 jobs: 17 failed, 10 passed, seven were cancelled and 25 skipped.
The six supplemental workflows skipped under their existing draft policy.
This task did not cancel a run. Tested merge
`afe800e74ed2c04b52fec97ccf7a97796b61157b` and the published commit have the
same tree, `580ecff1a496c3213aa996e92c661f3ea268d1fe`.

The [published whole-container manifest](https://github.com/link-assistant/router/blob/910e8dadfbf3f92490f2db19ed47c39d98af7077/docs/case-studies/issue-784/evidence/ci-1c235248/manifest.json) identifies
every original intermediate and terminal observation, all 24 nonpassing job
responses, 23 complete job logs, all 24 artifact ZIPs and the whole-run ZIP.
Every complete original and ZIP member was read back and hash/CRC verified.
The artifacts occupy 34,137,954 bytes; 21 original deadline-audit members were
inspected. The whole-run ZIP contains 216 verified members. Moving the
containers preserves their complete bytes without duplicate local copies.

The [local retirement receipt](evidence/ci-1c235248-local-retirement.json.gz)
keeps the complete original manifest, remote directory metadata and immutable
links to 142 fully verified published files. The repository's `*.log` rule
excluded 15 small collection transcripts from that publication; their complete
bytes are embedded and verified in the receipt. All original gzip job streams
and artifact ZIPs are published. The first retirement attempt correctly refused
the directory mismatch before changing files. After explicit custody of those
15 transcripts, only the 142 inactive, owned, exact published copies were
retired: 37,965,925 logical / 38,178,816 allocated bytes. No source or test was
deleted. The unavailable shard log remains unavailable.

Cancelled forward shard 2, job `128901874825`, has no available whole job
log. Its API response is `BlobNotFound`; a second exact-job attempt also
fails, and the whole-run ZIP contains no matching member. Those original
responses are retained. Complete log collection remains unsuccessful; the
missing log grants no qualification. Passing deadline-control fixtures
intentionally contain negative audit cases; those are not CI failures.

Line references below identify complete `current-1c235-job-JOB.log.gz`
members in the manifest. The full failure index retains all available errors
and original deadline-audit details, including every failed completion event.

| Job | Actual remaining failure |
| --- | --- |
| Parity `128901874545` | Line 889: stale account-routing evidence and 441 strict gaps: 151 partial, 290 unsupported; 847 sources and 12,345 carried functions. |
| TypeScript `128901874766` | Lines 444, 457: missing owned matrix sidecar `profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json`. |
| Forward freshness `128901874906` | Lines 470–559: stale/missing canonical Rust, meta, JavaScript, TypeScript, JSON-edit candidates, fixtures and complete inventory. |
| Reverse freshness `128901874812` | Lines 293, 302: forward inventory differs from the captured definition. |
| Forward 1 `128901874967` | Lines 862, 1751: complete receiving/portable subprocess deadlines. Lines 1820, 2990, 3885, 3927: borrowed Result residual refusal, historical issuer mismatch, stale capabilities source identity and obsolete Schemars relocation assertion. Other original deadline failures remain in the audit. |
| Forward 2 `128901874825` | Cancelled after its job limit; unavailable whole log as recorded above. |
| Forward 3 `128901874918` | Line 3413: original deadline audit fails despite TAP passes: sequence stream 63,510 ms and static lifecycle 81,692 ms against 60,000 ms. |
| Forward 4 `128901874854` | Lines 1981, 3242: original Qwen parent/deadline failure. Audit also records external defaults, Schemars, lifetime-refusal, release and proof-byte cases exceeding 60 seconds. |
| Forward 5 `128901874959` | Lines 1057, 1656, 3082: portable corpus and original safe-number parent fail; original audit also reports derive-context deadline failure. |
| Forward 6 `128901874747` | Lines 2666–2700: proof-byte callback subprocess `ETIMEDOUT`. Lines 2899, 2948, 3627: complete JSON and nine-parent unit-match cases exceed original deadlines. Original RunState and proof-stream cases also exceed their limits. |
| Forward 7 `128901875013` | Lines 1056, 1081, 1115: all three actual CSV owners fail; parse_csv also takes 969,473 ms against 900,000 ms. Lines 2264, 2290, 2315, 2350: original event, tuple/recursive token, VK timestamp and in-band failure declarations are absent. Seven actual failed completion events are distinct from deadline breaches in schema, derive, reverse corpus and vector cases. |
| Forward 8 `128901874909` | Eight actual-gain cases fail their shared hook. The whole private compiler exceeds its unchanged 4 MiB raw-source bound; current source identities, missing inventory inputs and complete proof/portable subprocess checks also fail. |
| Reverse Node 2 `128901874929` | Line 502: whole runtime-import parent exceeds its 60-second limit; audit observes 76,401 ms. |
| Reverse Bun 2 `128901874925` | Line 295: same complete parent exceeds 60 seconds; audit observes 60,771 ms. |
| Reverse Node 3 `128901874773` | Line 475: original JSON scalar folds take 61,842 ms against 60,000 ms. |
| Reverse Node 7 `128901875140` | Line 441: actual ASCII runtime import takes 190,311 ms against 60,000 ms. |
| Reverse Node 8 `128901875006` | Line 460: actual base64 paired runtime takes 112,673 ms against 60,000 ms. |
| Fully green `128919466046` | Line 146: required JavaScript dependencies failed; Rust remains locked. |

Profile jobs `128901874782` and `128901874997` were cancelled at their
unchanged one-hour limits; lines 287/282 record cancellation and 301/296
record the absent draft directories. Reverse Node 1/5 and Bun 1/5 were
cancelled at their original job limits. These six cancelled jobs and forward
2 account for all seven cancellations. None is a pass.

The coordinated local batch repairs the demonstrated record-binding defect,
checks static residual origins, preserves historical/current source cases
and corrects the actual Schemars dispatcher assertion. Focused binding,
lifetime and getter files pass as separately recorded; original capabilities,
application and Core receiving checks remain unqualified. The actual compiler
registry was regenerated and independently reproduced. Newly executable
production functions measured by this batch: zero.

No missing secret or human-only access cause was established. No original
test file, source equation, strictness, deadline, bound or required gate was
removed or relaxed. Generation, semantic failures, original deadlines, strict
parity and the complete issue-wide privacy acceptance remain unfinished.
