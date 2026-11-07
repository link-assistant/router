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
gate after this fingerprint change remains unrun at this checkpoint.
