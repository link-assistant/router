# Complete sparse Git source bank: source draft

`createCompactSparseGitSourceBank` joins a physical compact source vault to a
real committed Git source-DATA repository. It retains every complete source blob
and logical path; selected hot files become ordinary physical modules. Other
paths have genuine skip-worktree flags and remain actual committed Git blobs.
This extends the prior explicit raw materializer/unborn index without replacing
those APIs or pretending an unborn index satisfies a committed source reader.

The bank uses its own real compiler-DATA commit with deterministic fixed bank
author/committer dates, not the original application revision. The original
inventory/HEAD receipt remains separate DATA. No public commit ID, flag, metadata
pin or source hash supplies a private namespace/type/ownership/compiler verdict.
The original source readers still independently reissue actual physical/index/
HEAD/skip-state checks. APIs with no sparse fallback still need physical source
before opening epochs. Missing inputs cannot be acquired/restored inside a live
semantic epoch; a fresh child must restart and discard every old fact.

## Transfer and physical closure

The collector watches the complete original physical vault, reconstructs its
full closed encoded model and partitions decoded source occurrences into64MiB
leases. Each actual fast-import blob batch has at most128 sources and a1MiB
ordinary raw target; a single complete SDK source can use its existing32MiB
file domain. Length-delimited binary input prevents embedded command injection.
Delta search is disabled, pack size is limited16MiB, hooks/maintenance/config
inheritance are disabled and child IO/time limits remain explicit. Git blobs are
immediately read back with real cat-file and compared against complete original
bytes, including empty and arbitrary binary content.

The full actual index uses explicit original modes and object IDs, then write-tree,
commit-tree and update-ref produce a real complete bank commit. Every cold bit is
set using actual update-index. Hot files are written from complete actual Git
blob bytes with exclusive no-follow descriptors, not checkout filters or line-
ending conversion. Their full bytes/modes must match the original decode lease;
only then are their skip bits cleared. Final index/cold/hot census is exact.

The entire input vault, generated Git object store/index/refs/config and hot
namespace are retained and reclosed as full physical bytes and precise original
identities. Every closer runs on error; exact original falsy primaries survive.
All retained raw references and temporary metadata clear on every exit. No
compiler/verdict cache exists. On failure the caller-owned output remains for
guarded cleanup/evidence; no possibly replaced tree is recursively removed.

## Resources and unresolved adoption

**Input artifact plus every actual bank/Git/hot file jointly stay within64MiB.**
Each batch reserves its conservative worst raw/zlib/index overhead before writes,
and actual complete physical bytes are recounted after transfers. This is not
one independent64MiB budget per artifact. Full logical source limits remain the
explicit compact256MiB/16384-path contract; original APIs keep their own stricter
limits. The operation has20 seconds, each Git child at most10 or the remaining
seconds. Complete raw source and encoded snapshots are invocation-local; peak
RSS/CPU/fit is UNQUALIFIED. Bounds may honestly refuse a real full compiler.

The next receiving manager must choose the full actual module/import/profile/
fixture/native/SDK closure, materialize required physical dependencies before
private source epochs, account for the actual application and results in the
same original aggregate, and restart source-acquisition failures without retained
facts. That end-to-end integration, strict TS, both translation directions,
sync/conflict/recovery and production/platform behavior remain OPEN/UNRUN.
No original command, case, source profile, deadline or JavaScript-first gate is
weakened. E01/E03 remain OPEN;11/70 DRAFTED,59 OPEN.

## Independent case source and retained references

Eight whole source cases draft both actual Git object formats, real existing
selected-reader sparse fallback, exact cold/hot bytes and flags, equal-content
blob sharing, arbitrary binary/empty/command-looking data, CRLF attributes,
corrupt/unknown/control paths, selection accessors/duplicates, restored-source
poisoning, every falsy primary and deterministic independent bank commits.
The real Rust-shaped sources are DATA; no Rust/parser/compiler runs in these
cases. Every new implementation, export, Git bank and case remains UNRUN now.

Git source/API review used the primary manuals for
[fast-import](https://git-scm.com/docs/git-fast-import),
[update-index](https://git-scm.com/docs/git-update-index) and
[checkout-index](https://git-scm.com/docs/git-checkout-index). The implementation
uses exact-size blob streams and real skip flags; raw hot writes preserve bytes
without checkout conversion. Documentation review is not execution evidence.

The complete five-file packet is
[complete-source-draft.json.gz](complete-source-draft.json.gz), SHA256
`d3421a418de00c116022b5485a5b9b653e92b297c6b0086f4baac5a1137e7288`, 25580 decoded/8373 packed bytes. Earlier storage,
transfer, Git enumeration and SDK packets remain immutable. The additive sparse
facade and explicit CLI perform no work on import.
