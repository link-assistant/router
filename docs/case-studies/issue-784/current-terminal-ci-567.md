# Terminal CI at published 567e1dd0b

[PR #785](https://github.com/link-assistant/router/pull/785) remains a draft.
All seven workflows for published head
`567e1dd0b072a2bfd736a9025ba245a630aaff7d` have completed. The
[CI/CD run](https://github.com/link-assistant/router/actions/runs/42518964289)
has 59 jobs: 18 failures, seven cancellations, nine successes and 25 skips.
The six supplemental workflows skipped. No run was cancelled by this task.
The tested merge is `cfd80ffbf6a81e70bbcc584de875a17cfcc62d75`; its tree
`75cf48cfbe29770ccdce6bc9d1da8d1e5c4dc427` equals the published head's tree.

The [whole-container manifest](evidence/ci-567e1dd0/manifest.json) maps all
162 retained originals to their former task paths, lengths and SHA256 values.
The task-only retainer moved the closed, owned, single-link files without
copying 40,779,042 existing bytes. It verified complete gzip readback, every
ZIP member's length, SHA256 and CRC, and whole-container SHA256 after moving.
All 24 published artifact ZIPs (431 members) and the complete whole-run ZIP
(216 members) are retained. These checks establish evidence integrity only.

There are 25 original nonpassing job responses, but only 24 complete job logs.
Forward translation shard 5, job `128848041746`, was cancelled at the original
60-minute job limit. Its individual log API returned `BlobNotFound`; a fresh
`gh run view --job ... --log` returned `log not found`. The whole-run ZIP has
no forward translation shard 5 member. All original error responses, retry
stderr and full ZIP bytes remain retained. Do not attribute a particular test
failure to that unavailable log or call the complete log collection successful.

Specific observed failures include:

- Parity job `128848041449`, log lines 895–896: stale native
  `account_routing_policy` evidence and 441 gaps, including 151 partial and 290
  unsupported entries. Inventory consistency does not establish parity.
- TypeScript: missing owned-definition matrix sidecar at log line 464.
- Forward freshness: stale generated meta files and missing Rust, JavaScript
  and TypeScript outputs, log lines 267–554. Reverse freshness separately
  reports a differing forward inventory at line 297.
- Profile-matrix and owned-profile-matrix jobs were cancelled before their
  producers completed; their artifact upload steps found no draft directories.
  The ordinary profile log records cancellation at line 287 and missing drafts
  at 301; the owned profile log records these at 282 and 296.
- Translation shard 1 records a failed strict TypeScript child for Qwen at
  line 1820. The old TAP exception omits the child's compiler output; no exact
  TypeScript diagnostic can be recovered from that log.
- Translation shard 6 records a missing ActivityPub target at line 1991. Node
  truncated its refusal-array exception after 10,074 characters; the omitted
  1,484,216 characters are unavailable. The retained original is the complete
  downloaded log, not the complete original in-process refusal array.

The retained failure index joins the complete available logs to their exact
lines. Original deadline-audit artifacts independently identify overruns; a
Node test exit code alone does not qualify an over-deadline case. In particular,
the selected ASCII source preparation case took 72,034.167616 ms against its
unchanged 60,000 ms limit. Other actual project compilation and source proof
failures remain unresolved. The receiving repairs and optional complete child
diagnostics documented separately do not establish that these large projects
or a fresh CI cycle pass.

The retainer's first attempt failed before moving files because it expected the
Git database tree response rather than the REST commit response's nested tree.
Its full failure log and complete original script are retained in the task
logs; the corrected second attempt completed. No local Rust tool ran. No
deadline, compiler bound, parity check or JavaScript prerequisite was relaxed.
