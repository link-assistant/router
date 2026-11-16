# Native plus target edit reconciliation source draft — 2026-11-01

This additive draft supports concurrent Rust + JavaScript, Rust + TypeScript,
and all-three edits when every actual checked inverse reproduces the exact
authored current Rust source map and current native compilation reproduces every
authored changed physical target. All new implementation, source history and
independent cases remain UNRUN. No parser, translator, preparer, compiler, test,
benchmark, Rust tool, CI query or review query ran.

## Entry and unchanged original APIs

`tools/translation/triple-sync-reconcile-20261101.mjs` is a complete additive
copy of the original paired reconciler. It exports
`planTripleSyncReconciliation({root, manifestPath})` and
`applyTripleSyncReconciliation(serialized, options)`. No earlier implementation,
bulk dispatcher, facade or shared root source is edited.

The input is the same original closed `router-forward-project-unit-v1` manifest
with `authority: "auto"`, the original physical source/target/review paths,
existing inverse family and optional exact `baselineRevision`. There is no new
force, preferred authority, checker callback, native override or trust flag.
Standalone target-only, native-only and unchanged operations explicitly refuse
and remain with their original APIs. Both physical peers must already exist.

## Baseline and complete fresh agreement

The operation captures the complete current ordinary Rust source tree and native
directory census, both current target files, original metadata, actual manifest
and complete physical-layout Cargo/workspace inputs. It reads every complete
committed native/target/Cargo blob at one full current or locally available
ancestor commit using the original Git baseline API.

Current and committed native path universes must be identical. Native
additions/deletions/renames, source mode changes, missing peers and Cargo byte or
mode edits refuse. At least one actual native source and one physical JS/TS peer
must differ from the committed baseline. Committed Cargo remains the actual
current Cargo input to the original private dependency loaders.

The fixed language phase performs:

1. Independently compile the entire committed original native map through the
   original `translateProject`, production profile and fresh actual macro/derive
   dependency proofs. Relocate both whole target sources with the original
   registered runtime mapper. Both committed physical target baselines must be
   reproduced byte-for-byte; a stale or hand-edited committed peer refuses.
2. Normalize each actual authored changed target's registered runtime edges.
   Invoke the manifest's actual original complete inverse producer separately
   for each changed target, always over the committed original native map.
   The producer runs its genuine declaration/body/binding, source, type,
   ownership, CST/meta, unsupported-source and original inverse checks. Source
   maps or Git blobs never replace that fresh private compiler admission.
3. Join every direct producer result to its entire original input universe and
   complete native edit inverses. Reconstruct its whole native after map. It must
   equal the actual authored current native map exactly, including every file,
   untouched suffix, byte and trivia character. With two changed targets, their
   whole paired emissions must also agree exactly. Any differing candidate or
   additional authored native change refuses rather than normalizing Rust.
4. Independently compile the actual current native map through the original
   forward compiler, with freshly issued actual dependencies again. Preserve
   the complete executable/refused/method/generated-method census. Both whole
   canonical target sources must equal every independently checked inverse
   candidate. After physical runtime relocation, every authored changed target
   must match its complete generated projection exactly.

The repository phase requires the actual complete runtime
implementation/declaration/notice closure to exist and match the original
registered runtime sources. It preserves full serialized/reparsed CST equations
for each baseline-to-authored native edit, target baseline-to-final projection,
and current-to-final target operation. Full native original bytes and current
authored bytes therefore remain available for exact source restoration/review.

Authored native files and authored changed target files are never output rows.
Only an unchanged peer may receive its fully checked generated projection;
review metadata is the other output. Each output retains the complete current
source as its inverse. In the all-three case, only review metadata is written.
Even harmless extra native or target trivia refuses if it differs from the
original inverse's exact canonical source reproduction. No semantic merge,
manual patch or original-source overwrite is attempted.

All thirteen original inverse dispatch names remain available under their
original domains. New independent positive cases cover the literal family in
all three edit combinations. Dispatching the other original families does not
qualify them for real production coverage; they still require their own
complete source cases and future execution evidence.

## Original source history, closings and bounds

The complete unchanged original paired planner is retained under the standard
exported source-profile path:
`tools/translation/source-profiles/triple-sync-reconcile-20261101/originals/paired-sync-reconcile-20261101.mjs.txt`.
It is source DATA and is never imported as an executable replacement.

`triple-sync-reconcile-20261101-source-history.mjs` captures that complete
original, requires the actual original planner still to be byte-identical,
transports the full original and current authored additive copy through
serialized/reparsed CST, applies complete language then repository copy
substitutions, and retains an inverse restoring every original source byte.
This is history of the current authored adaptation, **not generator freshness**:
it does not derive a new implementation from compiler semantics or certify an
unchanged expected output. Its flags explicitly retain `freshnessQualified:
false` and no semantic authority. The actual reconciliation implementation is
the complete separately reviewed module.

The existing source-capture helper is reused without modification. It checks
ordinary bounded source files and every existing ancestor before reading,
complete UTF8 bytes, device/inode/mode/size/mtime/ctime, directory identity and
bounded child-name census. Caught source-read failures latch the current
operation as failed. Every captured source, directory, current HEAD, runtime
and actual macro/derive loader closes on all exits. Closing validators continue
despite other closing errors; the primary thrown value is preserved unchanged.
Restoring bytes does not recover a failed operation's private facts.

Invocation-local complete source DATA retains the original 8 MiB per-file,
64 MiB aggregate raw source and 4,096 capture/census limits. Committed/current
source, complete generated/candidate targets, candidate native edits, relocated
copies and metadata are conservatively charged. The existing incremental wire
visitor counts every complete JSON occurrence, including repeated DAG/string
references and full CST/meta, against 192 MiB. Review metadata's exact wire bytes
plus newline must fit 8 MiB before construction. All original compiler/runtime
bounds remain mandatory. These limits are source guards, not measured resource
or performance qualification. No cache survives across operations.

The original `installFreshAsyncSourceProposal` reissues this complete producer,
requires exact full serialized equality, checks all current inputs and the same
HEAD, installs only unchanged-peer/review output rows, reads them back and
retains original guarded rollback. Saved hashes, metadata, flags or source
equations issue no write or compiler permission. Existing per-file atomicity and
rollback limitations remain: whole-batch atomic visibility, durable crash
recovery and a persistent transaction journal are not provided.

## Independent source and open integration

`tools/translation/test/triple-sync-reconcile-20261101.test.mjs` contains full
independent cases directly under the existing translation test glob. Positive
cases cover Rust+JS, Rust+TS and all-three agreement, exact authored-source
preservation, only unchanged-peer outputs, full native/CST inverses, fixed
Unicode/string/native-u64 expectations, actual JS/strict typed target behavior,
and another editing cycle after a committed common baseline.

Negative/source cases cover different native/target values, an extra authored
native comment, disagreement by the second edited target, unchanged/native-only/
script-only API boundaries, stale committed targets, changed Cargo/topology/
modes, missing peers, unsupported target structure, explicit authority, forged
output, later authored source, exact ancestor coordinates, stale revision,
copied cold project, linked ancestors and complete original source restoration.
Whole translation cases retain 60,000 ms; typed target children retain 20,000 ms.
No original case, command, deadline, matrix member or stage is replaced.

The copied project still imports this repository's compiler; it does not qualify
an independently exported receiving installation. Bulk dispatch for these new
Rust-plus-target combinations, root facade/entrypoint/export integration,
standalone receiving closure, all other original inverse-family qualification,
general semantic equivalence, arbitrary native/target trivia, Cargo changes,
topology refactors, owned-unit reconciliation, durable recovery, platform/runtime
packaging and full production coverage remain OPEN. The coordinator may
integrate the new exports and complete dependency/source-profile closure later;
no shared-source changes are made by this worker.

This is a concrete partial S01/S02/S03/S05/V04 contribution. It changes no broad
receipt count, function denominator, runtime parity or verified-completion
claim. All execution remains UNRUN, local Rust tools remain prohibited, and all
eight unchanged same-SHA JavaScript gates still precede fatal Rust CI. The
coordinator owns serialized commits, root ledgers and publication.
