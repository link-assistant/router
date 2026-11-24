# Complete published 74f62 CI cycle

Published artifact ZIP copies now use the verified immutable links described in
the [local storage receipt](current-74f62-storage.md); all available complete job
logs and the complete whole-run ZIP remain local.

[Run 42560989296](https://github.com/link-assistant/router/actions/runs/42560989296)
is terminal for published source `74f62c037a21e4b3e4e3804dcf3d941d0aabfe19`.
Its 59 jobs comprise ten successes, 17 failures, seven cancellations and 25
skips. All six supplemental workflows are terminal and skipped. The independently
checked merge `1ceb354f3e6cf8c3ead0388b76eaaada5cc90e99` has exactly the published
head's tree and the expected main/head parents. Main `eb2dad1c0a18394dc1aad46413e11401e74eb502`
remains an ancestor of the current repair branch after a fresh fetch.

The [custody manifest](evidence/ci-74f62/manifest.json.gz) maps every original
path to 178 retained complete files, totaling 99,419,699 bytes. Files are moved,
not duplicated, and every complete destination is reopened and SHA-256 checked.
Original receipts retain their original paths; `storedAs` in the custody
manifest selects the actual adjacent file. The entire task evidence census is
456,565,923 bytes immediately after retention, below the 500,000,000-byte cap.

All 24 nonpassing job responses are retained, with 23 complete valid job logs.
Forward shard 5 (`128977139336`) reaches terminal cancellation but both direct
log attempts return `BlobNotFound`. Its exact job is also absent from the
fully CRC/SHA-256 checked 251-member whole-run ZIP. No shard-5 deadline artifact
exists in the complete artifact listing. Its actual leaf failures remain unknown;
this is an explicit diagnostic gap, not a passing or repaired shard. The complete
aggregate log confirms fatal handling of every failed/cancelled prerequisite.
No running workflow was cancelled by this task.

## Remaining actual failures

The [complete failure index](evidence/ci-74f62/current-74f62-final-failure-index.json.gz)
retains exact full-log line references, all 21 Node deadline reports and six Bun
coordinator receipts. It records 29 actual finite-deadline breaches. Control
fixture failures are kept distinct from parent failures. Important boundaries
include:

| Job | Actual failure and original log location |
| --- | --- |
| TypeScript `128977139143` | Line 463: missing owned-definition matrix sidecar `profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json`. |
| Parity `128977139157` | Strict check still reports 441 fatal gaps: 151 partial, 290 unsupported, two of 443 implemented features and 12,345 carried functions. |
| Canonical freshness `128977139179` | Lines 305–629: 271 stale and 54 missing outputs after complete generation; line 630 exits 1. Every path is indexed separately. |
| Both profile jobs | Original 60-minute job limits reached; complete logs report no matrix draft files to upload. Both remain unqualified. |
| Forward 1 `128977139178` | Lines 1726, 1930, 3117 and 3166: complete CST cost, stale owned-field predecessor, original JSON caller and unit-match deadline failures. |
| Forward 2 `128977139232` | Lines 955, 1844, 1913 and 2282: original child timeout, CST and ActivityPub deadlines, and the unchanged 4 MiB private-compiler raw-source bound. |
| Forward 3 `128977139316` | Line 1005: complete native-source history rejects stale owned-field prerequisites. The companion repair receives separately under Node; whole Bun qualification remains interrupted. |
| Forward 6 `128977139262` | Lines 1103, 1702, 3178, 3483 and 5329: project deadline, shared-f64 method refusal in the unchanged `safe_number` root, original encoding child timeout, stale tracked inventory and whole-owner corpus child timeout. |
| Forward 4, 7 and 8 | Independent whole-case deadline failures, stale compiler registration, original CSV semantics and checked-proof metadata refusals remain in the full index. |
| Reverse Node/Bun and freshness | Original job/case deadlines, scalar/reader/ASCII/base64 receiving costs and changed forward inventory remain fatal. |

No missing secret or human-only setup explains these code failures. None is
waived because it also occurs on main. Rust remains gated on all required
JavaScript jobs succeeding for the exact same SHA.

## Complete canonical draft, without current-source qualification

The complete 58,474,945-byte canonical artifact has SHA-256
`c2a245e654239f93dbd6d848b35794aafa051f075d8d948aeb42868d97a0bfe8`, matching
the API digest. All 2,874 outer ZIP members and all 2,873 nested gzip outputs
receive full CRC, size, SHA-256 and exact manifest-census checks. The outputs
contain 318,859,186 complete bytes; the actual inventory equals the plan's full
manifest. All five authority/parity flags remain false.

The complete published-input review checks 865 Rust inputs, three Cargo inputs,
961 compiler inputs, 733 source-profile inputs and all 132 installed TypeScript
inputs against 2,438 unique complete immutable Git blobs and actual dependency
bytes. Current source differs in eight declared inputs and adds a compiler
module outside the old census. These old outputs cannot be installed as fresh
current output without new actual generation and freshness verification.

The draft reports 2,578 production top-level functions: 158 executable and 2,420
carried. Remaining production categories are 2,278 module-binding refusals, 69
configuration, 39 unresolved/generic types, 25 unsupported, five mutation or
iteration, three syntax and one unresolved declaration/dependency. This measures
the published compiler's actual scope, not a gain from the current repair batch.
Current repairs establish zero newly executable production functions.

The [companion source repair](current-bulk-companions.md), [current registration](current-companion-registration.md)
and [failed complete local gate](current-companion-gate.md) retain their own
passed, failed and unrun observations. [PR #785](https://github.com/link-assistant/router/pull/785)
remains draft and unmerged. Complete generation, original deadlines, strict
parity, exact-head CI and the universal client/account geolocation acceptance
criteria remain unfinished.
