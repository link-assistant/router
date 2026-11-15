# Manual development policy and completed strict CI review

The maintainer's 2026-11-11 instruction (no longer available; [repeated on 2026-11-13](https://github.com/link-assistant/router/pull/785#issuecomment-6864697228))
asks to temporarily suspend automated translation checks and finish translation
manually. The [development contract](../../development/manual-translation-development.md)
records the exact active and suspended checks. The complete strict workflow,
original compiler receiving files, deadlines and source bounds remain intact.
The separate development lane does not certify parity. Since 2026-11-13 it
admits same-SHA Rust CI only after all four active stages pass (see the
development contract); this record describes the earlier blocked state.

## Terminal published cycle

[Run 42991919031](https://github.com/link-assistant/router/actions/runs/42991919031)
tested published head `124edb33e096a2c018caf449214005ad555d8bdd` and GitHub merge
source `98a1ba6077bebe53a748477bd46dfc70b55ea641`. It ran from 09:03:14 to
10:25:35 UTC: **75 completed jobs, 40 failures, seven cancellations, three
successes and 25 skips**. Native Node, native Bun and lint passed. No subsequent
repair was pushed during that cycle and no run was cancelled by this task.

All 46 available nonpassing logs are retained whole. Cancelled translation-14
job `130426612966` still returns HTTP 404 after a fresh retry. The whole-run
`gh run view --log` fallback fails with “too many API requests needed to fetch
logs”; both original failures are retained. Thus the workflow cycle is terminal,
but complete availability of all 47 nonpassing logs is **not** claimed.

The [failure index](evidence/manual-development-20261111/ci/current-124-terminal-error-index.json.gz)
joins original line numbers with all 36 Node audit reports and six Bun shard
receipts. Fifteen genuine Node cases exceed their original deadlines, including
full-root `qwen_model_is_managed` at 1,871,905 ms / 60,000 ms and `safe_number`
at 2,011,179 ms / 60,000 ms. A separate expected 10 ms auditor-control failure
is not a sixteenth application failure. Other compiler source/target failures
and incomplete/cancelled whole files remain explicit in the complete logs.

Representative original failures:

| Job | Original log evidence | Treatment |
| --- | --- | --- |
| parity `130426613019` | Lines 886–891: canonical comparison failure, 441 draft gaps, one validation error, 12,426 carried items, `runtimeParity=false` | Strict parity remains unqualified; temporarily suspended |
| translation-freshness `130426613193` | Lines 304–316: 13 stale paths, including macro runtime, project semantic records, associative storage and inventory | Not installed or certified; temporarily suspended |
| profile-matrix `130426613007` | Line 3251: original 60-minute cancellation | Deadline unchanged; temporarily suspended |
| owned-profile-matrix `130426613267` | Line 5786: actual nonblocking fd-3 `writeSync` throws `EAGAIN` | [Shared trace repair](matrix-trace-repair-20261111.md), independently tested; full matrix still unqualified |

All **41** artifacts were inspected. Forty deadline artifacts retain every ZIP
member's identity, CRC/hash verification and selected complete original JSON and
stderr records. The remaining 58,857,506-byte canonical ZIP was streamed through
all 2,873 nested outputs: **320,950,599 decoded bytes**, with exact manifest,
inventory, SHA-256, CRC and census joins. Its complete original manifest and
member receipts are retained; ZIP and output bytes were inspected and discarded.
No custody of those discarded payloads, installation, independent semantic
qualification or current-tree freshness is claimed. This uninstalled draft
reports 12,412 carried items and 163 executable top-level production functions;
it supplies no measured new production gain or full runtime parity.

## Local development verification

The first complete manual invocation stopped at the resource guard before any
stage ran: 33.122 seconds, sampled cgroup peak 2,874,957,824 bytes. Its whole
empty output and resource receipt remain retained. Fingerprinting the large
tracked corpus filled the container's file cache; the Node process used about
76 MiB RSS at the stop. The guard, source selection and deadlines were unchanged.

The retry used recorded `POSIX_FADV_DONTNEED` advice only for owned, single-link,
closed worktree files. An initial inactive-file pass observed total cgroup use
changing from 2,871,422,976 to 1,879,461,888 bytes. Two subsequent complete
fingerprints advised only actually completed prefixes. No files were deleted,
no global cache was dropped, and no test clock was paused.

The complete retry **passed in 365.039 seconds**, sampled total cgroup peak
**2,667,782,144 bytes** under the unchanged 2,866,933,760-byte stop threshold:

- All 1,938 JavaScript source syntax checks and 78 shared asset comparisons.
- All seven complete manual policy cases and three real-pipe trace cases in
  Node; all three complete trace cases in Bun.
- Both complete **260-case native runtime suites**, Node and Bun.
- All ten original deadline-auditor cases and their independent parent audit.
- Public/native strict declaration checks, **167 existing native TypeScript
  files with lockfile TypeScript 5.9.3**, compiler declaration checks and UI build.

Node was 20.20.2. Local Bun was 1.4.4; CI remains pinned to 1.4.3, so local
results do not substitute for the new CI head. Both source fingerprints matched
52,119 paths / 1,790,037,753 content bytes at local head `749e2b78c4e44e181a880e2b2e04f9317ce797c9`
plus the then-current authored changes. The exact tree hash and deliberate false
`strictParity`, `fullGatePassed` and `rustAllowed` values are in the retained
[manual receipt](evidence/manual-development-20261111/local/manual-development-complete-local-retry.receipt.json).
Later custody/documentation additions are outside that checked tree; published
CI must verify the final commit separately.

The finite static source census remains diagnostic only: 343 compiler files /
4,707,545 bytes exceed the unchanged 4,194,304-byte private-source limit by
513,241 bytes. Duplicate bodies, single-use names and import counts do not prove
safe deletion or authorize externalization. No source-size repair or production
coverage gain is claimed. Automated compiler qualification is now suspended.

## Custody and remaining requirements

The [custody manifest](evidence/manual-development-20261111/manifest.json.gz)
maps 226 complete inactive original files into permanent storage, checks every
byte count/hash before and after moving, and retains both failed and successful
local attempts. Moving these records avoids another evidence copy. The measured
logical evidence total after retention was 494,549,554 bytes, below 500 MB; an
earlier full-gate cap overrun remains separately recorded.

The latest fetched `main`, `eb2dad1c0a18394dc1aad46413e11401e74eb502`, is already
an ancestor. GitHub's diff endpoint still refuses this 300-plus-file PR with
HTTP 406; its complete refusal is retained. This is not represented as a completed
whole-PR diff review. The coordinated source changes and workflow scalar inverses
were reviewed separately. Rust results, strict translation/parity, universal
client/account/IP privacy and final-head qualification remain unfinished.
PR #785 stays draft and issue #784 stays open.
