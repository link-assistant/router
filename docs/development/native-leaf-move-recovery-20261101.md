# Durable interrupted native leaf relocation source draft — 2026-11-01

This additive batch drafts durable preparation, finite interrupted-state
classification, explicit finish/rollback and idempotent terminal recovery for
the earlier conservative native leaf move. Every implementation, source history
and independent case is UNRUN. No test, parser, translator, preparer, compiler,
benchmark, Rust tool, CI query or review query executed. No earlier/shared source
is edited and no broad synchronization/recovery receipt is closed.

## Public operation and narrower qualified scope

`tools/translation/native-leaf-move-recovery-20261101.mjs` exports:

- `planDurableNativeLeafMove({root, manifestPath})`.
- `applyDurableNativeLeafMove(serialized, options)`.
- `recoverDurableNativeLeafMove({root, manifestPath, transactionPath, direction})`,
  where direction is explicitly `finish` or `rollback`.

The original closed `router-native-leaf-module-move-20261101-v1` request is
unchanged. New creation independently reconstructs/rechecks the complete move
from committed source, then invokes the actual original leaf planner and requires
exact original revision/input/output/move agreement. Additional source inputs
record absent root/crate `build.rs` producers; any such producer refuses.
Both selected root/crate Cargo manifests are independently parsed through the
complete original private TOML parser graph. An absent `package.build` or exactly
`false` is supported; strings, `true`, inherited tables and other values refuse
before any transaction creation. Complete manifest bytes/modes, package presence
and exact build-directive presence/value are receipt DATA and are freshly reissued
on every recovery, with source identities closed. No build script is executed.
The additive `native-leaf-move-recovery-20261101-cargo.mjs` retains the complete
original parser, intrinsic/source/size/depth guards and original entry points.
Its extra bounded parse-only DATA entry issues no dependency/package/standard-unit,
namespace, ownership or semantic token. The original module remains unchanged.
Once original parser source records are acquired, both live intrinsic and source
identity closing checks are attempted after compile/parse/data failures as well
as success; closing failures preserve the primary parser failure. Independent
malformed-manifest plus source-closing-failure case source remains UNRUN.

The durable subset retains the flat root-plus-one-leaf, fixed library/Cargo,
same-directory, unchanged leaf bytes, ordinary scalar function, actual checked
namespace/consumer and exact JS/TS projection restrictions. It additionally
requires the complete current HEAD baseline: request, review, runtime and source
inputs must be committed exactly. Explicit older ancestors and unrelated HEAD
changes refuse. Initial source inputs have one hard link; all mutable paths
share one filesystem, and inode/device/mode identities must be exactly
representable as safe integers. General Cargo/build/configuration producers,
complex/native topology and broader application scopes remain unqualified.
Actual private checked bodies are restricted to scalar literals/variables,
scalar let/if/unary/binary expressions and calls to the complete admitted
same-project function set, under fixed 100,000-cell/128-depth bounds. Host,
filesystem and resource IR refuses even with a scalar return type; a source file
read cannot silently become invalid merely because the file moved.

Directory fsync and no-follow APIs are mandatory. The source implementation
explicitly permits only Linux/macOS with `O_DIRECTORY` and `O_NOFOLLOW`, probes
every relevant mutable parent before mutation, and propagates any unsupported
directory-sync/hard-link/filesystem failure. It never treats a missing or failed
directory sync as success. This does not qualify every Linux/macOS filesystem;
network/virtual filesystems, cross-device operations and other platforms may
refuse. Hardware power-loss behavior and platform durability have not executed.

The API requires an exclusive or cooperating writer for its project paths and
recovery artifacts throughout each operation. Observed external differences are
retained. Node pathname checks followed by rename/unlink are not an atomic
conditional replacement against arbitrary uncooperative processes. No lock,
cryptographic receipt authentication or adversarial filesystem isolation claim
is made. This boundary applies particularly to root/review replacement and
parent-anchor removal; the public source/destination removal path adds explicit
quarantine protection described below.

## Receipts are DATA; every recovery reissues the real compiler checks

`native-leaf-move-recovery-20261101-proof.mjs` is a complete additive copy of the
original leaf proof path. It reads fresh exact Git blobs at the current full
commit, verifies current request/Cargo/runtime/paired bytes, constructs the
complete before and allowed after source universes, and invokes the original
module graph, original privately sealed module-path selection, source views,
private checked-source/target-binding facades and original full project compiler
independently for both universes. All original refusal, complete admitted
function/export, logical source-path mapping, scalar signature, whole function
source, JS/TS reproduction, runtime, CST/meta and closing checks remain.

During interruption the physical Rust tree may intentionally be invalid or have
two aliases of the same leaf. It therefore supplies no borrowed saved verdict.
Recovery reconstructs both complete candidate universes from actual Git source,
fresh Cargo and original rule/CST pipelines, then requires every actual source,
backup/stage and namespace carrier to match an exact allowed compiled image and
operational inode/mode state. Any unknown producer, current source, consumer,
ownership origin, Cargo/HEAD change or unresolved checker scope refuses.

The journal stores complete original/expected bytes, modes, canonical request,
coordinates, bounded source equations and operational inode identities. These
public data are compared with the newly compiled complete source plan. They do
not carry a private type/owner token, compiler verdict, semantic namespace or
permission. Source hashes, receipt flags, phase names and filenames alone never
authorize an operation. Private compiler facts are freshly issued inside each
call and discarded afterward; no source/verdict/result/failure cache crosses
operations.

## Durable parent anchor, prepared data and finite states

A unique parent-level `<transactionPath>.anchor.json` is written exclusively,
fsynced and followed by parent-directory fsync **before** the private transaction
directory is created. The initial intent records an unbound directory identity.
After mkdir/chmod, the actual mode-0700 directory inode is captured, its parent is
synced, and a complete bound anchor is staged/fsynced and atomically replaced.
Both involved directories are synced. An absent directory with a valid unbound
intent can be freshly validated and resumed or canceled; an existing unbound
directory cannot acquire ownership merely from its name and is retained.

Original leaf/root/review backups are exact hard links, and complete after-stage
files are exclusive writes. Each file and containing directory is synced. Actual
after-stage inodes are recorded in a fsynced anchor update before a private
`prepared.json` and before **any public source mutation**. A private `intent.json`
retains the original data as well. Rollback intent/direction and any new complete
before-stage inode are durably anchored before reverse mutations. The parent
anchor, rather than redundant per-phase verdict files, is the durable record.

Every source transition is limited to the following independently recognized
physical states. Each present leaf name has the exact recorded original inode,
bytes and mode; each root/review image has a recorded original/stage inode and
freshly reproduced full source bytes.

| State | Original leaf | Destination | Root declaration | Review |
| --- | --- | --- | --- | --- |
| 0 | Present | Absent | Before | Before |
| 1 | Present | Present | Before | Before |
| 2 | Absent, quarantined | Present | Before | Before |
| 3 | Absent, quarantined | Present | After | Before |
| 4 | Absent, quarantined | Present | After | After |

Finish follows 0→1→2→3→4; rollback follows the reverse sequence. At most five
bounded iterations include terminal cleanup. Public destination creation is an
atomic no-overwrite hard link. Public removals rename into a unique owned
quarantine slot and inspect the captured inode/body. If an unexpected regular
replacement was captured, restoration uses a no-overwrite hard link and leaves
the captured copy intact; a reappeared public name is never overwritten. Unknown
or nonordinary captured contents remain available for manual recovery.

Every installed source is read back and fsynced, and all affected directory
entries are synced before the next transition. Before/between mutations,
observations close full current bytes, inode/mode, read-time size/mtime/ctime/link
counts, complete source/private directory names and parent identities, including
same-name replacement or change/restore within an observation. Unknown aliases,
files, symlinks or mixed states refuse. Every closing validator runs despite a
preceding closing failure; primary thrown values are preserved unchanged.
Descriptor/directory close errors cannot replace an earlier write/fsync/read
failure; all available closing validators are still attempted.

When the terminal state is verified, each private backup/stage/receipt is
revalidated before removal. Unknown replacements are retained; cleanup is never
recursive. The parent anchor remains after the last private receipt and through
private-directory rmdir plus parent fsync. Thus an interrupted empty or already
removed directory still has complete ownership/intent evidence. Only afterward
is the exact parent anchor revalidated, removed and its parent synced. This
closes the former last-receipt/rmdir evidence gap.

Rollback direction, once durably selected, cannot be switched back to finish.
Once the private directory is gone, only the already selected terminal direction
can finish anchor cleanup. After all artifacts are gone, repeating that same
direction reissues the private before/after compiler proof and returns no-op only
for the exact terminal source/modes/universe. Recovery is tied to the original
HEAD; it is not a rebase/migration mechanism or a new permission to revert a later
committed project. The original standalone leaf API handles its own committed
no-op separately.

## Unknown preparation and failure retention

An operation does not reuse private facts after catching a source failure.
Instead it preserves the primary error and reports bounded directory/anchor
paths for a separate explicit recovery call, which starts all source/compiler
checks afresh. No implicit best-effort mutation proceeds under a caught failure.

Preparation may fail before the new directory inode is durably bound, or leave
an uncommitted `anchor.next`/after-stage/rollback-stage whose inode was never
recorded. Such a partial artifact cannot become owned from its filename or
matching bytes. It is retained and automatic progress refuses. Where the source
is verified unchanged, rollback can report `retainedPreparation` and
`complete: false`; it does not pretend the directory was cleaned. Corrupt/missing
anchors, unknown replacements and unsupported durability likewise retain data.
Automatic cleanup of these unrecorded preparation states remains OPEN.

The fixed I/O helper validates exact artifact bytes/inodes/modes, probes actual
sync support and does not silently downgrade to ordinary writes. Ordinary file
operations can still have a check/rename race under an uncooperative writer;
detected conflicts retain their contents, and the exclusive-writer contract is
required for the supported operation. Source bodies outside the two recompiled
images can never be admitted by editing a receipt or its public flags.

## Resource, source-history and independent case boundaries

Original limits remain: 8 MiB per source/receipt, 64 MiB aggregate retained source
DATA, 4,096 source/census entries and 192 MiB complete serialized-wire bound. All
receipt bodies, decoded complete data, repeated occurrences and observed backup/
stage bytes count conservatively; shared DAG references receive no discount.
Large otherwise valid projects can therefore refuse before progress rather than
expand the bounds. Stages, hard-link backups and the finite journal slot set are
bounded; they are durable transaction DATA, never persistent compiler caches.
These guards are not measured peak-memory, throughput or storage qualification.

Complete unchanged original planner/installer/private TOML parser sources are retained under
`source-profiles/native-leaf-move-recovery-20261101/originals/`.
`native-leaf-move-recovery-20261101-source-history.mjs` requires the actual
originals still to match, transports all three original/authored adaptations through
fixed language then repository CST substitution sequences, and retains every
original byte in a full inverse. This records authored source history, not an
automatic generator or verified freshness; `freshnessQualified` remains false.
The standard source-profile export boundary carries the original text snapshots.

The complete independent test source covers forward preparation/intent/backups/
stages, all public source transitions, private receipt/directory cleanup, parent
anchor cleanup, post-rmdir sync failure, every reverse transition, durable
direction, terminal idempotence, unsupported sync, malformed/forged receipt and
backup data, changed Cargo/HEAD/build producer, committed custom package build
sources without any default `build.rs`, unknown files, external root and
quarantine replacement, and exact source-history/CST restoration. A separate
operation trace expects file/directory fsync ordering before public mutation and
after directory/anchor removal. Fixed bool/u64 consumer behavior is checked in
actual JS and strict typed targets. These are future deterministic syscall-fault
cases, not evidence of real power-cut/crash or multi-process durability testing.

Whole cases retain 60,000 ms and typed children 20,000 ms. Unsupported platforms
assert the explicit refusal branch; they do not qualify the positive durability
path. No original test, command, deadline, partition or matrix member changes.
All cases remain UNRUN. General deletion/moves, external producers, multi-file
or cross-device transactions, arbitrary authored concurrent edits, exported
receiving qualification, adversarial concurrent writers, preparation-orphan
automation and broad production recovery remain OPEN. The coordinator owns
facade/export integration, root ledgers, serialized commits and publication.
No broad S03 closure/parity claim is made; local Rust tools remain forbidden and
all eight same-SHA JavaScript gates still precede fatal Rust CI.
