# Node 20 module-view allocation investigation

The source change at `1319e283fd2a306c8870fc541990361fc8bf536c` preserves the
complete old module-view implementation and derives its guarded token copies
through native bindings and the serialized/reparsed CST in both directions.
The [contract and receiving results](../../development/module-token-layout.md)
describe the finite memory improvement and its observer boundary.

Both complete receiving files pass on Node 20.20.2 and Bun 1.4.4: 17 cases per
engine. Node's independent source-deadline audit also passes, using the installed
TypeScript 5.9.3. The complete corpus comparison covers all 567 tracked
`rust/src` Rust files. The Node and Bun corpus fingerprint is
`257f229f67000f0f30b9ea9752a4859c6a45e27106697ad0af33c8fbbbbe088b`.
The five new cases include full original/current values, frozen descriptors,
fresh identities, configuration/Unicode/literal cases, complete observer
traces and source-producer refusals. The original receiving file, deadlines,
resource bounds and common-intrinsics bootstrap contract remain unchanged.

The installed guarded module has SHA-256
`5e69449066578d02ac0d3f758a6298b1502c09e032262ea96cdfe5d6a83e10ef`.
Its complete producer proposal has SHA-256
`d3b2bcb35a6cffcd9cc182b95139cbbb47a5fd2086629227841b62c5fd892077`.
The finite eight-file, 47,824-token Node 20 probe retains heap deltas of
14,819,416 bytes originally and 5,664,408 bytes with the actual guarded module.
These are diagnostic heap deltas after explicit GC, not whole-compiler or
executable-function gains. Node 26's separate hypothesis probe showed little
difference; the claim is specific to the measured Node 20 case.

## Complete generator attempt

On the clean source SHA above, the actual complete production command was:

```sh
experiments/issue-784/toolchain/node20/bin/node --max-old-space-size=2048 \
  scripts/translate-router.mjs --retain-output-text --owned-core-definitions --progress
```

The unchanged command failed to finish. Its owned resource observer stopped the
process group after 98.656832 seconds at 2,868,031,488 sampled cgroup bytes,
above the 2,866,933,760-byte guard in the 3,135,369,216-byte container. It exited
143 during `derive-namespace-context`, after constructing the 397-module
`rust/src/lib.rs` graph. It wrote no generated outputs. The complete CLI corpus
contained 864 tracked Rust sources. There is no complete generation result,
coverage increase or repaired matrix from this attempt.

The existing strict generated TypeScript project subsequently passed with the
installed 5.9.3 compiler and a 768 MiB diagnostic heap. This project includes
`ts/generated/rust-draft` and `ts/generated/rust-project`; it does not typecheck
every JavaScript implementation file or qualify the complete TypeScript stage.
That CI stage still encounters a missing owned-definition matrix.

## Resource observations

Cgroup totals include anonymous memory, file-cache pages and kernel memory.
The two read-only `POSIX_FADV_DONTNEED` diagnostics preserve the complete files,
avoid global cache drops and execute no Rust tool. The evidence-page observation
changed total sampled cgroup memory from 1,753,018,368 to 1,571,614,720 bytes.
The separate tracked-worktree observation changed it from 2,039,676,928 to
1,528,901,632 bytes. These observations are not exact per-file reclamation,
reclaimed disk, a compiler memory peak or a successful generation attempt.
The tracked-source diagnostic excludes observed open/mapped files, symlinks,
hard-linked files, foreign-owned files and paths outside this worktree. It
records protected process observations and terminal zombies separately.

Complete originals are under `ci-logs/issue-784-restart-2`: the producer proposal,
source review, all receiving logs and raw Node deadline evidence, all three
finite allocation comparisons, `token-layout-owned-generation.log`, its memory
receipt, strict TypeScript output and both file-page observations. The published
`007dc7f3a` CI cycle was still running when this source draft was committed; its
results do not qualify `1319e283f`. No changed heap literal, relaxed deadline,
inventory-only parity claim or JavaScript bypass authorizes Rust execution.

## Local gate fingerprint

The complete local gate was attempted on clean
`579511eee1cd9de9aa01ce51b73b5c4145d0526f`, with Node 20.20.2, installed TypeScript
5.9.3 and an inherited 768 MiB diagnostic heap. The actual command remained
`node scripts/check-js-first-local.mjs`. The cgroup observer stopped its process
group after 27.649860 seconds at 2,868,326,400 sampled bytes. It exited 143 while
fingerprinting, before logging the first stage. All seven stages remain unrun
for that attempt; there is no green gate stamp.

The gate's regular-file content hashing now uses one 64 KiB buffer rather than
allocating a whole buffer per file. It retains the exact previous path, mode,
UTF-8 link-target, deletion and content-length framing. File growth or premature
EOF refuses the fingerprint. This bounds temporary content-buffer allocation;
it does not limit operating-system file caching or establish a successful gate.

The complete `check-js-first-local.test.mjs` file runs against both modules with
only its three import targets and original resource URL rebound. Against the
unchanged module from `579511eee`, 9 cases pass and the new bounded-read
regression fails. Against the current module all 10 pass. The regression also
compares the complete fingerprint against the previous algorithm for binary,
Unicode, executable, symbolic-link, empty, deleted and untracked inputs. Existing
stamp invalidation, full stage discovery and source deadlines remain tested.
The two runs took 27.07 seconds together with a 1,768,607,744-byte sampled cgroup
peak and no resource stop. Their complete logs and module/test hashes remain in
`gate-fingerprint-before.log`, `gate-fingerprint-after.log` and
`gate-fingerprint-before-after.json` under the investigation evidence directory.
The complete syntax lint also passes for 1,757 JavaScript files in 98.80 seconds,
with a 1,592,250,368-byte sampled cgroup peak. It is a focused check; the complete
gate was not yet run at that checkpoint.

The complete gate was then attempted on clean
`c19d20c9ee083a3b0e0de62b259777cd1de7aca1`, with the same Node, installed
TypeScript, inherited diagnostic heap and full original command list. Its
observer stopped it after 28.802209 seconds at 2,867,630,080 sampled cgroup
bytes. It again exited 143 before the first stage: all seven stages remain
unrun and no green stamp exists. The bounded-read regression is qualified;
complete-gate resource behavior is not repaired. Complete originals are
`fingerprint-full-local-gate-start.json`, `.log`, `-driver.log` and `-memory.json`.

After every local Node process finished, the task-owned temporary toolchain was
checksum-verified and removed. `fingerprint-node-cleanup.json` records no active
process references and 125,124,608 bytes of distinct file allocation removed.
This cleanup touches neither repository sources nor Rust or worker build caches.

## Separate Bun generation attempt

The actual complete command was also attempted under Bun 1.4.4 on clean
`e8c50e93ffb0ada99f26c3a2f6f92da446fc40b4`. The first process stopped at the same
resource guard after 0.507 seconds, before logging any stage, with a starting
cgroup total of 2,815,172,608 bytes. The recorded state was dominated by file
cache. A separate hint on inactive tracked-file pages changed the observed total
from 2,834,223,104 to 1,105,645,568 bytes without removing files or changing the
guard. This is a cache observation, not disk reclamation or exact process memory.

One retry started at 1,093,287,936 bytes with identical sources, arguments and
guard. It discovered all 864 Rust sources and constructed the 397-module library
graph, then stopped during `derive-namespace-context` after 82.182824 seconds at
2,878,156,800 sampled cgroup bytes. It exited 143 and wrote no outputs. The
`token-layout-bun-generation*` originals preserve both attempts separately;
`pre-bun-generation-retry-pages.json` preserves the complete cache-hint selection.
Neither the missing owned-definition matrix nor Node CI generation is qualified.

## Completed preceding CI cycle

All seven workflows for published head
`007dc7f3a3a882d17ab87d2a53067ebb236f948f` finished. The required
[pipeline run](https://github.com/link-assistant/router/actions/runs/42364504470)
started at 10:34:08 UTC on 2026-11-07 and failed at 11:34:36 UTC. Its checkout
was merge SHA `ef0435374243c0a12a274d0d58e916ce388bfe8b`. These results predate
the token-layout and fingerprint changes; they do not qualify those changes.

| Stage | Complete result |
| --- | --- |
| Lint, native Node and Bun | Passed; both native suites passed 259 cases. |
| TypeScript | Failed: the owned-definition matrix `owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json` is missing. The three existing profile trees separately passed strict TypeScript 5.9.3. |
| Strict parity | Failed: stale `rust/src/account_routing_policy.rs` source hash, 441 draft gaps and 12,345 carried items; runtime parity remains false. |
| Profile matrix | Failed: the neutral worker aborted at its original 2,048 MiB V8 heap limit; retained-definition generation remained unrun. |
| Reverse translation | Cancelled at the unchanged 15-minute limit after 76 passing cases; later Bun and regeneration commands remained unrun. |
| Forward translation | Cancelled at the unchanged 60-minute limit; the complete retained TAP contains 11 failures and no terminal qualification. Later canonical and owned-definition freshness commands remained unrun. |
| Aggregate, Rust and release | The JavaScript aggregate failed; Rust and release stayed skipped. Six supplemental workflows were skipped, supplying no qualification. |

The entire workflow log and all three ZIP artifacts were downloaded after every
run became terminal. Every ZIP member was read, CRC-checked and hashed. The full
forward TAP has 6,201 lines and SHA-256
`553cef1b5e9dd2671fc6e3fd5dfd8ca17695e32afe46dec97fa9db3e592beb8a`.
Its eight `actual-gain-families.test.mjs` failures share the unchanged setup
assertion at line 78: the inventory's generation compiler hash for
`tools/translation/translate.mjs` is stale. Replacing that hash would not
regenerate or authenticate the stored outputs. Complete regeneration remains
required and unfinished.

Three further failures appear in the retained TAP but not the workflow stream:
the adoption CLI child's original deadline sends `SIGTERM` (TAP line 5403),
the complete literal-text corpus case exceeds 60,000 ms at 96,259.44 ms
(line 6055), and the complete three-build provenance case exceeds 60,000 ms at
119,618.08 ms (line 6149). The original child and case deadlines remain intact.
These failures are not established as repaired by the focused allocation check.

Evidence is under `ci-logs/issue-784-checkpoint-007dc7f3a`: complete workflow logs,
artifact ZIPs, `completed-artifact-verification.json` and every complete failed
TAP block in `completed-forward-failures.json`. The companion raw job logs in
`ci-logs/issue-784-restart-2` locate TypeScript's missing file at
`storage-typescript-completed-job.raw.log:456`, parity at
`storage-parity-completed-job.raw.log:891`, the heap abort at
`storage-profile-completed-job.raw.log:257`, and reverse cancellation at
`storage-reverse-completed-job.raw.log:653`. No missing secret or human-only CI
prerequisite was identified; skipping these failures would hide unmet checks.
