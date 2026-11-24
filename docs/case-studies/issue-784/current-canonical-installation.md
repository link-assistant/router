# Complete canonical output checkpoint

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
This checkpoint installs the complete actual canonical generator output from
[run 42610701304](https://github.com/link-assistant/router/actions/runs/42610701304).
It does not complete issue #784 or qualify the full gate, runtime parity,
profile matrices, reverse generation or Rust behavior.

The producer tested merge `a74e300516ee0dbc068e170412be99a470227ce5`, whose
parents are current main `eb2dad1c0a18394dc1aad46413e11401e74eb502` and published
head `ec6005a8358428a560bb7c685d52a32b174a74f6`. Its entire Git tree equals that
published head's tree. Artifact 13672361496 contains all 2,873 computed outputs,
318,860,481 decoded bytes. The complete 58,476,520-byte ZIP has SHA-256
`67d3324f679e37b79a845f5be40bbabe98ec7b348fb5d04c30541557400dd172`.
The ZIP was inspected in bounded memory and discarded; the installed output
bytes are retained in this commit. No ZIP custody is claimed.

Before installation, complete current physical input vectors independently
match the artifact: 865 Rust files, three Cargo inputs, 963 compiler inputs,
739 profile inputs and all 132 installed TypeScript files, version 5.9.3.
Every archive member, nested gzip CRC, full output length/hash, safe path and
complete output census was checked. Installation repeats that review against
the pinned review receipt, updates 271 files and adds 54 files, then reads back
all 2,873 complete outputs. The complete input vectors captured after installation
are identical to those captured before it. No generated output was hand-edited.

The old inventory covers 847 Rust sources; the current corpus contains 865.
Reported executable production functions increase from 155 to 158. The three
same-source gains are `activitypub::validate_activity`,
`bridge_request::untranslatable_responses_state` and
`subscription_usage_normalize::empty_usage`. Two WebSocket functions retain
their complete body hashes at shifted source spans; they are neither gains nor
losses. One additional executable fixture function is separate from production.
The current inventory still reports 2,420 carried production functions and
12,431 carried items overall; preserved source grants no executable authority.

The finite application observation file in `experiments/issue-784/` executes
all three newly generated production functions against their actual generated
modules and verifies original source hashes. Its three complete cases pass in
Node 20.20.2 and Bun 1.4.4 (CI pins Bun 1.4.3). They cover both ActivityPub actor
routes, required-field errors, all 16 missing/null/non-null continuation-state
combinations, all six usage providers and malformed-value refusals. These are
observations against explicit expected behavior, not independent Rust or whole
application parity.

The complete canonical strict TypeScript command passes with the installed
5.9.3 compiler and a 512 MiB diagnostic heap, in 13.585 seconds. Earlier 256 and
384 MiB attempts exhaust their heaps and remain retained. The original complete
semantic reviewer refuses the old baseline's different source census. Its
current-corpus Node attempt exhausts 256 MiB; a 768 MiB attempt and a separate
Bun attempt reach the unchanged container guard. Independent semantic review
and fresh original producer qualification remain unfinished. No bound,
assertion, original deadline, strictness or source selection was weakened.

The entire published CI cycle is terminal: 11 successes, 15 failures, eight
cancellations and 25 skips. All 22 available failed/cancelled logs are retained.
Cancelled forward shard 7 has no log from either job endpoint and is absent
from the fully CRC/hash-checked 127-member whole-run ZIP. Its internal failure
is unknown. The initial recovery selector also retained other jobs' step-7
members; these are labeled by their exact archive paths and never presented
as shard 7. All six supplemental workflows are terminal and skipped while draft.
Missing owned-matrix output, 441 strict parity gaps, original semantic refusals,
the fixed private-compiler byte bound, deadline breaches and reverse freshness
remain mandatory failures.

The [canonical observation packet](evidence/current-canonical-installation.tar.gz)
and adjacent receipt retain every original input capture, review, installation,
initial TypeScript/review failure, and the withdrawn lexical-root experiment.
The [current CI directory](evidence/current-ec600-ci/custody.json.gz) maps all 95
retained observations to original paths and complete hashes; compressed raw
JSON must be decoded when restoring those original paths. Additional checks
after the packet are retained separately in the next verification record.
The unchanged original reviewer is still the required semantic boundary.

Only inactive task-owned copies were retired after complete archive readback.
The first packet attempt exceeded its reserved archive size and temporarily
crossed the 500 MB evidence cap; its source copies were untouched. That exact
incomplete task archive was removed, the failure retained, and the output writer
now refuses excess bytes before writing them. Two earlier-snapshot archives
retain all 34 complete original snapshots, saving 3,138,619 logical bytes.
No foreign process, cache or build directory was removed. No local Rust tool
or subagent ran.
