# Explicit Git source baselines for committed-edit synchronization

This implementation, complete source equations and independent regression source
is drafted and unrun. Full translation, runtime parity, freshness, receiving
qualification and whole-Router synchronization remain unfinished.

The two complete unit planners and the forward-project planner now accept an
optional top-level `baselineRevision` in their existing descriptors. Its value
must be one full locally available commit ID in the current Git object format,
and an actual ancestor of the current HEAD. Symbolic/abbreviated refs, null,
missing objects, trees/blobs/tags and unrelated history refuse. Without this
field, the original HEAD comparison and explicit-authority rules remain.

Choose the complete committed source checkpoint from the last synchronized
projection set. Every plan freshly reads all selected baseline blobs and every
current complete source, then uses the original direction/conflict/deletion and
authority rules. A JavaScript, TypeScript or Rust edit remains visible after it
has been committed. Concurrent edits in multiple languages still refuse; this
field cannot authorize overwriting them. After a complete reviewed application
and a subsequent source commit, explicitly advance the descriptor baseline to
that new source checkpoint. The synchronizer does not advance history itself.

`baseRevision` remains the current planning HEAD and guards apply freshness;
`sourceBaselineRevision` separately records the comparison coordinate in the
plan/review/receipt. Complete fresh retranslation, language/repository phases,
serialized/reparsed CST, original semantic/type/ownership/target checks, fixed
source/deadline bounds, atomic replacements and external-edit-safe rollback
remain. Baseline storage is original Git source history, not a retained compiler
verdict or a source/hash/owner/result cache. No objects are fetched; inherited
Git overrides and replacement-object aliases cannot replace the actual history.

Five complete native-owner source equations retain complete originals and full
inverses. Independent unrun cases cover both unit APIs, all three committed edit
directions, current-head defaults, concurrent commits/deletion, stale manifests
and heads, invalid/local/ancestor/object-format boundaries, replacement refs,
fresh JS/strict TS behavior and the actual forward-project literal inverse.
Every wider source/native/production/sync/freshness/parity/delivery requirement
remains unfinished. No local test, compiler, translator or CI feedback was run
or inspected for this draft.
