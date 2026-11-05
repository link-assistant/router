# Complete peer edit-set dispatch source draft — 2026-11-01

This additive bulk draft routes all seven nonempty Rust/JS/TS edit combinations
to the appropriate existing complete source checker. It does not broaden any
checker domain, add an authority override or certify complete synchronization.
All implementation/profile/case source remains UNRUN. No tests, parser,
translator, preparer, compiler, Rust tool, benchmark, CI or review query ran.

## New explicit unit kind and direct entrypoints

`tools/translation/complete-peer-dispatch-20261101.mjs` is a complete additive
copy of the paired dispatcher. It exports `inspectCompletePeerDispatchEdits`,
`planCompletePeerDispatch({root, manifestPath})` and
`applyCompletePeerDispatch(serialized, options)`. Earlier module sources, public
APIs, descriptor schemas and unit kinds are unchanged.

The new enclosing schema is `router-complete-peer-dispatch-20261101-v1`, with
the original closed fields `schema`, `baselineRevision`, `units`. Each unit still
has exactly `id`, `planner`, `manifestPath`, `nativeRoot`, `watched`. Set
`planner` to the new explicit `forward-project-complete` value to enable the
complete observed edit-set routing. Original `owned`, `forward-project` and
`forward-project-paired` values retain their original boundaries.

The new kind uses the same original closed auto-authority forward project
manifest. Complete current/Git source bytes and modes select the changed-language
set. The resulting DATA selects which actual producer executes; it grants no
compiler, source, type, ownership, overwrite or installation permission.

| Actual changed languages | Complete fresh producer |
| --- | --- |
| Rust | Original `planForwardProjectUnitSynchronization` |
| JavaScript | Original `planForwardProjectUnitSynchronization` |
| TypeScript | Original `planForwardProjectUnitSynchronization` |
| JavaScript + TypeScript | Existing `planPairedSyncReconciliation` |
| Rust + JavaScript | Existing `planTripleSyncReconciliation` |
| Rust + TypeScript | Existing `planTripleSyncReconciliation` |
| Rust + JavaScript + TypeScript | Existing `planTripleSyncReconciliation` |

An empty changed-language set for this new kind retains deterministic
**bookkeeping no-op**: no compiler is invoked, no generated freshness/parity is
certified and no output/metadata churn is produced. The older paired kind still
uses its original checked no-op. Topology additions/deletions/renames refuse
before any edit-set route, retaining bounded complete DATA review.

Every child and the enclosing operation must name the same exact full current
or ancestor commit. Every actual entry/dependency/native mapping/Cargo source
must appear in the current watch closure; ordinary current native census and
complete committed Rust universe remain joined. Cargo edits cannot become a
native authority hint: the selected actual checker independently applies all
its original Cargo and dependency restrictions.

## Full private checks and authored-source protection

The original single-language planner retains its original direction and
overwrite protections. The paired checker separately runs each genuine original
inverse over an unchanged complete native/Cargo baseline, requires exact whole
canonical Rust and both target agreement, and independently forward reproduces
both authored changed physical peers.

For native-plus-target routes, the triple checker loads the complete exact
committed original native/Cargo baseline. Every changed JS/TS target independently
uses the actual original inverse producer on that baseline. Each whole native
after map must exactly equal the authored current Rust map. Current native is
then independently compiled; every authored changed physical target must be
reproduced exactly. Only an unchanged target may receive its checked projection.
Authored current native and changed targets are never normalized or overwritten.

The dispatcher verifies the child's actual root, current revision, complete
baseline coordinate, all current source inputs and actual reconciled outcome.
Public metadata, hashes, source equations and classification flags are never
substituted for these complete original private checker calls. General semantic
equivalence and arbitrary trivia remain outside the canonical inverse domains.

All units retain the shared `assertPairedSyncChildAfterAgreement` guard. Every
consumer of a changed generated path must independently propose identical full
before/after bytes and mode. No-op observations cannot authorize a dependency
write. Different complete output rows conflict; exact identical rows merge once.
All authored changed paths, including paths discovered by later units, remain
protected across the whole batch. Bulk and child manifests cannot be outputs.

This permits independently checked mixed routes in one physical source universe:
for example, one child can select Rust+JS and another Rust+TS, both preserving the
same exact authored native edit and updating only their unchanged peers. A
native-only child can also regenerate its own peers alongside a triple child.
An unchanged child consuming a native output proposed by another child refuses
unless it independently agrees to that complete output. No speculative disjoint
native source-map merge is attempted.

## Immutable source recipe and retained operation guards

The complete original paired dispatcher is preserved unchanged under
`tools/translation/source-profiles/complete-peer-dispatch-20261101/originals/paired-sync-dispatch-20261101.mjs.txt`.
The standard source-profile location is already carried by existing compiler
and export source selectors; no selector or generic text-file bypass is added.

`complete-peer-dispatch-20261101-source-equations.mjs` derives the entire new
source from that immutable original using unique exact source selections. It
requires the actual original module to remain byte-identical, requires the
complete actual new source to match the recipe, applies serialized/reparsed CST
substitutions in fixed language then repository order, and retains the whole
inverse restoring every original source byte. The source author is itself
UNRUN; a source recipe is not semantic permission or verified freshness.

The complete copied planner retains every existing ordinary-parent/source check,
current native and committed source census, device/inode/mode/mtime/ctime
directory identities, bounded directory iteration, exact source identities,
all-exit closing validation, primary-error preservation and current HEAD guard.
Original paired/triple runtime/dependency/private source checks close on all
their exits too. Source maps remain invocation-local DATA and no source, owner,
verdict, result or failure cache persists across calls.

Original bounds remain 128 units, 4,096 captures/census entries, 8 MiB per source,
64 MiB complete raw retained source DATA and 192 MiB whole JSON wire size. Exact
baseline/current/output/meta/CST data count under their original limits; repeated
wire occurrences do not receive a shared-DAG discount. Every original compiler,
inverse and runtime bound remains mandatory. These source guards are not
measured peak-memory, throughput or complete performance qualification.

`applyCompletePeerDispatch` retains the original
`installFreshAsyncSourceProposal`: reissue every selected full producer, compare
the exact complete serialized proposal, guard all original inputs/current HEAD,
then perform original per-file atomic replacement/readback and guarded rollback.
Authored rows with unchanged before/after bytes are never writes. Existing
transaction limits remain: per-file atomicity is not whole-batch atomic
visibility, and ordinary rollback is not a durable crash-recovery journal.

## Independent complete case source and gaps

`tools/translation/test/complete-peer-dispatch-20261101.test.mjs` independently
writes the expected producer and native-output behavior for all seven nonempty
edit combinations. Every combination uses a real two-manifest batch over one
complete native universe, performs original compiler generation to establish
the common baseline, authors source bytes independently, runs the real selected
checker paths, preserves authored files, and checks fixed Unicode/string/u64
behavior through actual JS and strict typed targets. After a committed common
baseline it checks the unchanged batch again.

Other complete source cases cover deterministic bookkeeping no-op, mixed
Rust+JS/Rust+TS routes, native-only plus triple routes, stale dependent consumer,
different paired native outputs, triple native conflict, Cargo/topology/missing
peer/native trivia refusals, original API/domain preservation, closed new kind,
forged/later-source/baseline proposals, copied cold project, linked ancestors and
the complete immutable original/CST source recipe. Whole translation cases
retain 60,000 ms and typed target children 20,000 ms. The existing translation
glob schedules the complete file; no original command, deadline, case, partition
or matrix member changes.

These are independent source expectations, not execution receipts. The positive
operation family is still the original literal inverse; every other inverse
family and production caller needs its own qualification. The copied projects
still import this repository's compiler, so exported standalone receiving
qualification remains OPEN. General rename/deletion installation, topology
refactors, arbitrary trivia/semantic equivalence, owned-unit concurrent paths,
combined disjoint native edit compilation, durable recovery, platform/runtime
packaging, full export freshness and whole production coverage remain OPEN.

The coordinator may integrate new exports and the complete unchanged dependency/
source-profile closure through the established facade/entrypoint/export source
equations. This worker edits no earlier/shared files. No broad synchronization
receipt, function denominator, draft-completion or parity count changes here.
All execution remains UNRUN, local Rust tools remain forbidden, and all eight
unchanged same-SHA JavaScript gates still precede fatal Rust CI.
