# Native entry protection for staged source mutations — source proposal

L04 remains OPEN. Complete writer/function denominator is UNKNOWN. No tests,
parser/CST/compiler/receiving calls or project code were executed. All runtime,
platform, performance and resource qualification is UNRUN. The common parent
files are proposed as complete afterimages; this worker has not installed them.

## Concrete boundary and resulting draft

Logical source names alone missed an existing case/Unicode alias entry or the
physical endpoint of an authored/unmanaged symlink declaration. Reusing the
direct-write inode veto would reject a distinct legitimate hard-link entry even
though replacing that entry leaves protected source bytes/inode intact.

The proposed additive `assertProtectedStagedMutationTargets` instead observes
actual parent device/inode plus the exact native Buffer leaf spelling. Existing
components must appear byte-exactly in a bounded native directory enumeration.
The protected side follows declared symlinks and records their own entries,
physical endpoints and existing ancestors; the mutation side follows intermediate
links but treats a final link as the entry actually unlinked/renamed/replaced.
Thus two exact hard-link entries remain distinct. An unlisted final symlink may
be replaced without touching its protected target; changing a protected symlink
endpoint or removing an existing protected-source ancestor refuses.

Missing names use their actual existing parent identity and unresolved tail.
Exact missing aliases refuse. Ambiguous ASCII case and non-ASCII missing-tail
equivalence refuse instead of inferring filesystem normalization. Existing names
with no exact native spelling also refuse. This deliberately leaves compatibility
closure OPEN for alternate existing case/Unicode spellings, unreadable directory
listings, unsupported Buffer dirent APIs, non-roundtrip path strings, followed
nonUTF8 symlink targets and per-call resource excess. Unfollowed final symlinks
do not need target decoding. No platform-wide case/normalization rule is guessed.

The proposal preserves the original direct-alias module byte-for-byte as its
prefix; the staged observer is additive. Native directory reads use explicit
Buffer encoding and a one-entry internal buffer. [Node filesystem documentation](https://nodejs.org/api/fs.html#fsopendirsyncpath-options)
and the [Node22 implementation source](https://raw.githubusercontent.com/nodejs/node/v22.16.0/lib/internal/fs/dir.js)
supply API source context only; they do not qualify the receiving Node/Bun host
or constitute execution evidence.

## Actual mutation integration

The common `.allow` keeps original staged equal-byte/mode no-op semantics. It
preflights changed names in256-row batches without inventing a new total public
API count cap. `.allowMutationPaths` gains physical entry observation while
retaining unconditional logical protection and poisoning after caught failure.
The direct-write method and its original inode-alias logic remain unchanged.

The common installer previously called its own mkdir/write/chmod/link/rename/
unlink/rmdir operations directly after initial output admission. Its afterimage
now admits each actual mutation, including exact temporary, backup, quarantine,
rollback, cleanup and missing parent names. Each original operation/order and
source/identity/readback check remains. In-place stage chmod uses the direct
inode-aware veto; staged entry replacement does not. Link admission guards the
created entry, rather than treating its read-only source name as a deletion.
Captured primitive names are used by both the guard and actual filesystem call;
mutable public row fields cannot substitute a different target between them.
All independent closers run after exact falsy/frozen primary failures.

The original public generic unit writer had a related intent problem: it could
check a fresh row path, capture a different full target, then guard a later path
read before renaming the captured target. Its proposed afterimage uses the
captured canonical policy root for actual generic IO and derives admission names
from captured full paths, including rollback. Ordinary symlink roots continue to
address that same canonical repository. Mutable root/path reports cannot select
an unguarded repository or target. These are operational source-write checks;
they grant no native namespace, owner, type, executable or source-adoption proof.

## Explicit observation costs and closing

Each observation bounds paths4096, protected names8193, nodes32768, API/walk work
262144, retained entry DATA16MiB and directory entries262144. Symlink hops bound256,
individual link bytes65536, pending components65536, individual native entry
bytes65536 and missing endpoint bytes65536. Missing-name comparison work separately
bounds total compared bytes16MiB. Original input string-array validation also
has its existing bounded path counts/lengths; the retained DATA count is not an
absolute process heap bound.

Every opened native directory gets an independent close attempt, even after an
admission budget or opaque read failure. Metadata rows and followed link bytes
are rechecked. Each closing directory scans at most its captured entry count
plus one and rejects an unknown name immediately; its own byte budget is16MiB,
independent of exhausted admission work. After that budget fails, later directory
closers still attempt open/close and path epoch checks. No successful result can
survive a failed closer. Counters are invocation-local and all indexes clear on
exit. A failing native close is reported, not claimed to have released the OS
resource. There is no persistent verdict/source/hash cache.

Root-relative paths anchor at the captured canonical root, so ordinary operations
do not enumerate unrelated temporary-directory or home-directory ancestors.
Explicit symlink targets outside the root may require those observations and
can refuse when their epochs change. Indexes are rebuilt for each actual
admission: cumulative cost grows with policy paths and mutation count. This is
explicitly unqualified for throughput and whole-operation peak resources. Node
pathname calls do not atomically lock the final observation to the following
OS mutation; hostile concurrent substitution remains an unsupported race boundary.

## Complete source chronology and independent cases

[Nine complete parent pairs](../../tools/translation/source-profiles/protected-staged-entries-20261102/manifest.json)
retain exact ACA/51/c122 revision/blob/path origins: common unit, additive alias
module, direct/unit history composition, generic/helper fix, and three complete
prior history cases. The [finite whole-source proposer](../../tools/translation/protected-staged-entries-20261102-history.mjs)
retains full before/after/inverses and exactly language then repository CST/meta
substitutions. A named successor requires its complete predecessor and actual
current physical source equal to the complete afterimage. Existing ACA/51 source
snapshots stay immutable; historical `.after` stays historical and `.currentAfter`
reaches the appended successor. Unassigned paths/changed bytes cannot inherit it.

[Actual entry/sink cases](../../tools/translation/test/protected-staged-entries-20261102.test.mjs)
cover distinct hard links, declared/intermediate/final symlinks, source ancestors,
missing policy-self, ambiguous missing names and conditional existing-case
platforms. They exercise the actual common installer and original generic writer
with mutable/getter path reports, rather than substituting a toy installer.
[Native directory failure cases](../../tools/translation/test/protected-staged-entries-20261102-closing.test.mjs)
retain exact opaque primaries, independent handle/metadata closing, metadata
budget refusal and inherited iterator non-invocation. [Whole-source cases](../../tools/translation/test/protected-staged-entries-20261102-history.test.mjs)
retain all nine exact equations and original direct/unit chronology. All UNRUN.
Standalone writers and remaining source-role/producer/platform inventory still
need census; none of these finite cases becomes a production denominator.
