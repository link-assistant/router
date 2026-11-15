# Complete local gate at 619e35656

The required `node scripts/check-js-first-local.mjs` was attempted at
`619e356569fdafd369d9f1fad41766f86041d59c` for
[PR #785](https://github.com/link-assistant/router/pull/785). It remains failed.
The resource guard stopped the owned process tree during the complete native
TypeScript test file. The launcher collected every owned descendant and
exited 143 after 465.217598 seconds. No green stamp was written or local Rust
tool invoked. This attempt does not qualify subsequent commits.

The initial fingerprint completed all 51,362 files and 1,899,296,316 bytes.
Tracked source and HEAD remained unchanged through the attempt. Node was
20.20.2, the repository's lockfile TypeScript was 5.9.3 and Bun was 1.4.4.
Local Bun results do not qualify CI's pinned 1.4.3 environment. All original
case deadlines, command lists and strictness remained unchanged.

| Stage | Passed | Failed or interrupted | Unrun |
| --- | --- | --- | --- |
| Lint | All ten commands | None | None |
| Node runtime | All 259 cases | None | None |
| Bun runtime | All 259 cases | None | None |
| TypeScript | Deadline controls, both package type checks, native freshness and strict native compilation | Complete native TypeScript test file interrupted after four passing assertions | Nine later commands |
| Parity | None | None | Acceptance cases and strict parity |
| Forward translation | None | None | All five commands |
| Reverse translation | None | None | All five commands |

Native freshness compared 11,586,409 bytes with no changed or unexpected
outputs; strict native compilation checked 167 files. The complete native
TypeScript file's first four assertions passed. Its fifth assertion and the
rest of that file remain unqualified. Independent audit `complete-hlshoI`
records that the interrupted child never produced `case-deadlines.json`;
the missing receipt is a failure, not deadline qualification. The successful
deadline-control suite intentionally retains its own negative-control failures.

The sampled cgroup use reached 2,866,995,200 bytes, just above the unchanged
2,866,933,760-byte guard and below the 3,135,369,216-byte container cap.
The parent used 512 MiB Node old space; children retained the recorded 768 MiB
setting. The adviser touched only closed pages after completed fingerprint
prefixes. Active test clocks were never paused. No unchanged second attempt
was made after this resource failure.

The [complete packet](evidence/current-619e-complete-gate.tar.gz) retains all
90 original members: the entire gate log, resource and page-advice receipts,
all twelve complete closed audit directories, and fresh issue/PR/all-comment
snapshots. The [independent readback receipt](evidence/current-619e-complete-gate.json.gz)
pins each complete member's bytes and SHA-256. The packet is 945981 bytes,
SHA-256 `5c5820452fb8cc832fca96969dce983faee98177057bae439ea251a03e86f78a`.
Raw originals remain retained. Task evidence was 480090656 bytes after packing,
below the 500 MB cap.

Fresh `main` remains `eb2dad1c0a18394dc1aad46413e11401e74eb502`, already an
ancestor without conflicts. The issue still has no comments or required
sub-issues. All seven PR conversation comments are read; there are no inline
comments or reviews. The [entire prior published CI cycle](ci-79f-terminal-20261110.md)
is terminal and its complete failure set is retained. No current failure
requires an identified human-only secret or access change.

The reviewed compiler batch preserves the original class-birth and project
progress histories, joins genuine Display analysis contexts, shares bounded
operation-local scalar size measurements, losslessly compresses the entire
static archive within its original export bound and refreshes the complete
isolated compiler registry. Receiving evidence is separate from this failed
full gate. Original deadline failures, complete production generation, owned
and profile matrices, generated freshness, strict parity and universal
client/account privacy remain unfinished. No production-function gain or
release readiness is claimed; keep the PR draft and unmerged.
