# Concurrent paired edit reconciliation source draft — 2026-11-01

This additive draft implements one previously refused synchronization operation:
both authored JS and TS peers change from the same exact native baseline and
independently reproduce the same complete canonical Rust and paired projections.
It does not lift any original planner refusal or add a force/authority option.
Every new implementation and case remains UNRUN. No parser, translator,
preparer, test, compiler, benchmark, Rust tool, CI query or review query ran.

## Files and direct integration

- `tools/translation/paired-sync-reconcile-20261101.mjs` provides
  `planPairedSyncReconciliation({root, manifestPath})` and
  `applyPairedSyncReconciliation(serialized, options)`.
- `tools/translation/paired-sync-reconcile-20261101-support.mjs` supplies bounded
  invocation-local physical source capture, closing, Git HEAD and wire-size DATA
  helpers. It issues no compiler proof and accepts no saved semantic receipt.
- `tools/translation/test/paired-sync-reconcile-20261101.test.mjs` contains
  complete independent case source directly in the existing translation glob.

The planner directly consumes the original closed
`router-forward-project-unit-v1` manifest used by
`planForwardProjectUnitSynchronization`, including its existing `baselineRevision`
coordinate. `authority` must already be `auto`. No manifest is rewritten, no Git
coordinate is modified, and no public authority override or alternative checker
is accepted. Existing exported APIs and all earlier source files remain intact.

Callers can import this new module immediately. For an explicit paired
reconciliation request, use these two entrypoints with the existing project
manifest. The earlier `paired-sync-bulk-20261101.mjs` still refuses concurrent
units; it was not edited. Automatic bulk adoption would require the coordinator
to author a full source-equation profile that imports this planner and invokes
it only for the exact concurrent JS/TS classification, retaining every other
topology/native/Cargo/conflict refusal and the complete bulk closing transaction.
That integration must rerun actual producers, rather than accepting the prior
bulk inspector's DATA as a compiler permit.

## Complete fresh checking path

The original physical Rust layout selects the production root and exact
workspace/package Cargo input paths. The operation captures all current Rust
sources and source directory names/identities, complete Cargo bytes, both current
peers, the actual manifest and the original metadata output. It freshly reads
complete Git blobs at one full current or ancestor commit, including every
committed Rust file under the production root.

Every current Rust source and Cargo input must match the exact committed bytes
and ordinary mode. Current/committed native path universes must be identical.
Any native addition, deletion, rename, body edit, mode edit or Cargo edit refuses
before paired reconciliation. Both committed peers must exist with unchanged
ordinary modes. Both current peers must be changed or both unchanged; the
single-peer operation stays with the existing single-authority planner.

The fixed `language` then `repository` pipeline performs:

1. Compile the actual entire original native universe using the original
   `translateProject`, production profile and freshly issued actual
   `loadJsonMacroSourceProof` / `loadDeriveDependencyProof` inputs. Relocate both
   complete target modules through the existing registered runtime mapper.
   Both results must exactly reproduce their committed Git peer bytes. A stale
   committed paired baseline cannot supply an editing permit.
2. Normalize both current authored peers with that original runtime mapper.
   Select the manifest's existing complete inverse producer. Call it separately
   for JavaScript and TypeScript, each against the same unchanged original
   native source map and freshly issued dependency proofs. Each inverse runs
   its genuine source, ownership, checked declaration/body/binding, CST/meta,
   unsupported-source and original-source closing checks. No private checker
   is replaced by a detached serialized result.
3. Join each actual inverse result to every original native input and its
   complete native edit inverse. Apply each candidate's edits to a separate
   complete original source map. The two resulting entire Rust maps must be
   exactly equal, including untouched files/trivia. Both complete emitted
   canonical JS and TS sources must also be exactly equal across candidates.
   A single differing native file or either differing projection is a conflict.
4. Independently compile the agreed entire native map again with the original
   forward compiler and freshly issued dependencies. Require the full executable,
   refused, method and generated-method census to match the original. Require
   both entire canonical target sources to equal the two independently checked
   inverse candidates' targets. Runtime relocation back to physical `js/src`
   and `ts/src` must exactly reproduce both authored current peer bytes.
5. Retain complete original native output inverses, full serialized/reparsed
   Rust CST equations and full unchanged authored JS/TS CST equations. Require
   every current registered runtime implementation/declaration/notice source
   selected by the authored targets to match the original complete runtime
   closure. The operation never installs a missing or changed runtime implicitly.

All thirteen existing manifest inverse names dispatch to their unchanged actual
producers: literals, return-expressions, scalar-bodies, control-bodies,
imperative-bodies, range-bodies, floating-bodies, standard-floating-bodies,
standard-numeric-bodies, text-predicates, composite-bodies, owned-format-bodies
and owned-composite-bodies. Dispatch presence does not qualify all thirteen
families or prove production coverage. New independent positive source covers
literals and return formulas; other family qualification remains OPEN.

The paired authored files are never output rows. Reconciliation writes only
the agreed changed native files and complete review metadata. Even harmless
extra trivia is refused when it does not already equal the exact canonical
physical projection. This conservative canonical boundary supports semantic
agreement that the original real inverse checkers reproduce; it does not claim
general equivalence of arbitrary JS/TS programs or normalize authored text.

An unchanged pair follows the full actual original compiler/baseline/runtime
checks but returns deterministic no-op with no outputs and no metadata churn.
After applying reconciled native edits, establish a new synchronized common
baseline before a later independent editing cycle. Until then the original
native change is intentionally visible and refuses a new reconciliation.

## Failure, resource and transaction boundaries

The source capture checks every existing ancestor before reading or enumerating
below it. Linked ancestors, linked source files, special files, malformed UTF8
and nonordinary modes refuse through the original complete source reader and
additional identity guards. Native directory enumeration uses bounded iterative
directory reads; it does not first allocate an unbounded child listing.

Closing checks run on every exit, including primary failures. They rejoin every
complete captured file's bytes/device/inode/mode/size/mtime/ctime, every captured
directory identity and original child-name census, current HEAD, registered
runtime sources and actual macro/derive source loaders. Same-name directory
replacement refuses. All closing validators run despite preceding closing
errors. A primary thrown value is rethrown unchanged; later closing failures
cannot replace it. Caught source-capture errors latch the current source scope
as failed; restoring files cannot recover that scope. Nothing survives to the
next operation as source, owner, verdict, result or failure authority.

The wrapper adds no persistent cache. Source maps are invocation-local complete
DATA; they never replace the original private issuers. Repeated candidates each
run the actual original inverse and original compiler checks. Complete retained
native/baseline/current/projected/candidate/metadata source strings are charged
conservatively, including repeated generated source occurrences, against 64 MiB.
Sources remain bounded to 8 MiB; files and census entries remain bounded to
4,096. Original more restrictive source/compiler limits remain effective.

A separate incremental visitor checks the complete JSON wire representation,
including duplicated DAG/string occurrences, CST equations and all metadata,
against 192 MiB without a full-result stringify. It refuses getters, proxies,
cycles and unsupported object types. Metadata's exact wire size plus its newline
must also fit the 8 MiB file bound before constructing that string. These are
source guards, not measured memory/CPU/throughput qualification.

`applyPairedSyncReconciliation` uses the existing
`installFreshAsyncSourceProposal`: reissue this entire producer, compare exact
complete serialized bytes, guard original inputs and the same current HEAD,
then install native/review output rows with the original per-file atomic
replacement/readback and guarded rollback. Saved or forged metadata and public
flags/hashes never authorize an output. Existing transaction race/rollback
limitations remain: per-file atomicity is not batch atomic visibility, and
ordinary rollback is not durable crash recovery. No delete records or new
persistent transaction journal were introduced.

## Independent case source and remaining gaps

The complete source file covers:

- Actual unchanged baseline reproduction and deterministic no-op.
- Two matching Unicode literal edits, complete native inverses, preserved
  authored peers, direct JS behavior, strict typed target behavior, a committed
  second editing cycle and fixed native integer/string expectations.
- Return-expression agreement using a separate independently source-authored
  Rust crate's complete canonical target text, with four fixed Boolean vectors
  supplying independent expected semantics.
- Different literal/scalar edits, noncanonical additional trivia, one-peer
  edits, concurrent native/Cargo changes, explicit authority, stale committed
  peers, native additions/deletions/renames and missing targets.
- Forged native outputs, later source/revision changes, a separate copied cold
  project, same-name directory replacement, caught/restored source-read failure,
  exact duplicated-wire accounting and unsafe getter/proxy/cycle refusal.

All translation cases retain their 60,000 ms whole-case deadline; typed target
children retain 20,000 ms. The existing glob schedules the entire file. No
original gate command, deadline, case, partition or matrix member was replaced.
Future authorized execution must retain complete Node/Bun/raw evidence and all
strict TypeScript/forward/reverse/freshness checks. No Rust is executed locally;
all eight unchanged same-SHA JavaScript gates still precede fatal Rust CI.

Copied-project cases use fresh physical project sources and no saved verdict.
They still import the compiler from this repository and therefore do not qualify
a standalone exported receiving installation. Facade/entrypoint/export source
equations, copied standalone compiler closure, all inverse families' production
cases, platform/runtime packaging, broad JS/TS grammar, general semantic
equivalence, arbitrary trivia preservation, owned-unit concurrent reconciliation,
topology installation and durable recovery remain OPEN.

This source contributes a concrete partial S01/S02/S03/S05 and V04 path. No
70-row closure count, actual function denominator, full draft-completion claim,
runtime parity or verification status changes on this partial source alone.
No commit or push is implied; the coordinator owns the serialized commit slot,
root ledgers, publication and all future verification.
