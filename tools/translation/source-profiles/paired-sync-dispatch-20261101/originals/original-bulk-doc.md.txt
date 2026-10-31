# Additive paired synchronization bulk draft — 2026-11-01

All implementation and independent case sources in this batch are UNRUN.
No tests, parsers, translators, preparers, compilers, Rust tools, benchmarks,
generation, CI queries or review queries ran. Ordinary source reads and source
writes were used. This is a partial S01/S02/S03/S05 contribution; none of those
rows closes on this source alone. No full Router synchronization, freshness,
runtime parity, production coverage, receiving qualification or release claim
is supported.

The coordinator delegated this bounded source family under the user's latest
authorization for three GPT-6.1-sol medium workers. That authorization overrides
the older work-alone prose for this delegation only. The coordinator retains
all integration, source-ledger edits, serialized commits, publication and future
verification ownership. This worker touched only new prefixed files.

## Implementation and direct entrypoints

`tools/translation/paired-sync-bulk-20261101.mjs` exports:

- `inspectPairedSyncEdits(rows)`: deterministic closed DATA inspection of complete
  baseline/current bytes and modes. It reports single-language edits, unchanged
  inputs, concurrent edits, byte-exact unique rename candidates and unmatched
  additions/deletions. It emits no compiler or installation authority.
- `planPairedSyncBulk({root, manifestPath})`: fresh bulk planning around the
  actual `planUnitSynchronization` and
  `planForwardProjectUnitSynchronization` entrypoints. Their existing private
  checker/proposal paths remain responsible for semantic, ownership, caller,
  inverse and supported-source admission. Unsupported sources still refuse.
- `applyPairedSyncBulk(serialized, options)`: the existing
  `installFreshAsyncSourceProposal` reissues the complete bulk producer before
  any write, compares complete serialized proposals, checks the same current
  revision, uses the existing atomic per-file replacement/readback and guarded
  rollback, and preserves independently changed outputs.

These functions are directly importable now; existing APIs are untouched. There
is no public force/override flag, alternative semantic issuer or stored result
cache. The invocation-local capture map stores complete raw source DATA only;
the original actual planners still issue their own private facts afresh.

## Bulk description

The enclosing manifest is closed JSON:

```json
{
  "schema": "router-paired-sync-bulk-20261101-v1",
  "baselineRevision": null,
  "units": [{
    "id": "project",
    "planner": "forward-project",
    "manifestPath": "translation/project-unit.json",
    "nativeRoot": "rust/src",
    "watched": [
      {"path": "rust/src/lib.rs", "language": "Rust"},
      {"path": "js/src/project.mjs", "language": "JavaScript"},
      {"path": "ts/src/project.mts", "language": "TypeScript"},
      {"path": "Cargo.toml", "language": "Rust"},
      {"path": "rust/Cargo.toml", "language": "Rust"},
      {"path": "Cargo.lock", "language": "Rust"}
    ]
  }]
}
```

`null` selects the current full commit. An explicit baseline must be one full
locally available ancestor commit in the current object format. Every child
manifest must name that exact baseline or implicitly select the same HEAD.
The child manifest remains the complete existing owned/forward manifest; the
bulk descriptor does not duplicate or weaken its semantic contract. `planner`
is exactly `owned` or `forward-project`.

Every actual child entry, declared project dependency and native mapping must
appear in `watched` with its correct language. Forward projects also require
the existing physical-layout API's complete workspace/package Cargo inputs.
The layer freshly enumerates the ordinary native source tree, joins every
current `.rs` file and every committed `.rs` file from the full exact Git blob
capture, and therefore observes deleted native files. Native path universe
changes are retained rather than silently disappearing from direction selection.
Directory names are closed again before returning. Child planners separately
capture all their runtime/compiler/dependency inputs on translating operations.

The unchanged result is deliberately only **bookkeeping no-op** for the captured
watched source universe. It does not execute a compiler and does not certify
fresh generated assets, runtime closure, full dependency discovery, semantic
agreement among peers or parity. Explicitly materialize/synchronize all source
peers with existing APIs before establishing the common bulk baseline. Missing
declared inputs in both baseline and current source refuse. Source additions or
deletions require topology reconciliation, including initial paired creation.

## Direction, conflict and source equations

Direction compares complete source bytes and ordinary modes against the same
Git baseline. Multiple edits within one language remain one direction. Changes
in different languages refuse, including textually identical JS and TS edits:
cross-language equality is not semantic equivalence. Explicit authority inside
a child manifest retains its original overwrite protections. A differing
concurrent edit is never selected away.

The inspector identifies a rename only when one removed source and one added
source in the same language have exactly equal full bytes and modes, and the
pair is unique in both directions. Ambiguous identical files, changed bytes,
mode differences and cross-language moves remain additions/deletions. Rename
classification is DATA only; bulk planning refuses every topology mutation.
Conflict errors retain their bounded complete DATA review and unit ID for
review without granting an installation or semantic permit.
There is no implicit `unlink`, source resurrection, module-path rewrite or
dependency-edge inference.

Bulk plans collect all actual child inputs and complete outputs, rejecting
different proposals for one output path. Output paths and input rows are sorted
with deterministic ordinal comparison. A generated output cannot overwrite the
bulk or child manifest. If any unit independently authored a path, every bulk
output for that path must retain its exact current bytes. This last check spans
the complete batch, including overlaps discovered by later units.

Every emitted Rust/JS/TS source retains an additional serialized/reparsed CST
equation via `transportConcreteSourceEquations`. Existing source is the complete
`before` and `inverse`. Initialization carries explicit absence and a complete
serialized/reparsed target CST with exact byte reconstruction. JSON metadata
retains its ordinary complete original inverse; it is never interpreted as a
semantic permit. Original child language/repository pipelines and their complete
private semantic checks are still mandatory; this wrapper introduces no third
translation phase and no alternative compiler.

Capture and closing compare full current bytes plus device, inode, size, mode,
mtime and ctime. Native directory and ancestor capture also closes device,
inode, mode, mtime and ctime, so replacement with identical child names refuses.
Every existing source-parent prefix is checked before leaf reads or native
enumeration; linked ancestors refuse. Directory readers stop at the bound
without first materializing an unbounded directory listing. All captured rows,
native directory censuses and current HEAD
are closed on success and on error. Closing validators continue after another
closing failure. A primary thrown value is rethrown unchanged; subsequent
closing errors cannot mask it. A failed operation has no continuation or reusable
verdict, even if a caller restores the files and catches its exception. A new
invocation must start over. The wrapper cannot detect edits and restorations
that occur entirely before its first capture or after its closing boundary.

Bounds are 128 child manifests, 4,096 captures/native entries per bounded
operation, 8 MiB per source and 64 MiB retained complete source DATA. Exact
baseline and generated bytes count toward the aggregate bound. A separate
incremental visitor limits the entire serializable result to 192 MiB before
the installer may stringify it, counting repeated DAG/string occurrences,
full source equations, all metadata, JSON escaping and all other wire fields.
It refuses cycles, getters, proxies and unsupported object types without
allocating a full-result JSON string. The existing
Git/CST/translator/transaction bounds remain in effect. These are source limits,
not executed performance or peak-memory evidence.

## Independent case source and unchanged scheduling

`tools/translation/test/paired-sync-bulk-20261101.test.mjs` independently expects byte/mode no-op,
all three edit directions, same-language dependencies, paired and native/target
conflicts, unique/ambiguous renames, deletion/addition, Unicode normalization
differences, forged DATA/proposals, sparse/getter/proxy rows, missing sources,
omitted Cargo inputs, linked native trees, cold copied-project no-op, a committed
common baseline, a second edit and preservation of independently authored files.

Actual source-to-source cases build their own temporary Git repository and use
the original forward planner/installer once to establish the initial baseline.
No expectations are generated from the new direction tables. Those cases then
exercise the bulk wrapper through its actual Rust and JS/TS inverse paths.
Copied-project cases use a separate filesystem root and no retained source map.
They do not yet qualify a compiler exported without the original repository.

The complete case source is directly in the existing translation test glob.
No original command, test file, matrix member, concurrency or deadline was
replaced. Each actual translation case retains its 60,000 ms deadline. Future
authorized execution must retain complete raw Node/Bun evidence and all existing
strict TypeScript/forward/reverse/freshness/receiving obligations. Rust execution
remains CI-only after all eight same-SHA JavaScript stages pass.

## Remaining integration and limitations

No shared-source integration edit is required to import and call these three
new functions. Publication through the established facade/export APIs is still
OPEN. If desired, the coordinator must author a complete source-equation profile
for `tools/translation/source-synchronization.mjs` and
`tools/translation/translator-entrypoints.mjs` that adds these exact exports,
then extend the current `paired-core-export-bundle.mjs` dependency closure and
source inventories with this module and its unchanged actual dependencies.
Retain full original sources, fixed language/repository phases, CST inverses,
all existing entrypoints/licenses/bounds and independent cold export cases.
No facade, export source or freshness ledger was edited by this worker.

Semantically equivalent concurrent edits need a private fresh candidate planning
operation inside the actual source planners, followed by full reissue of every
edited authority against the same complete baseline/dependency universe and
agreement of complete canonical Rust and both projected targets. No such
operation currently exists. Do not implement it by rewriting the manifest in
place, modifying Git baselines, passing a public authority override, accepting
public hashes/flags, comparing only emitted text, or treating this DATA
inspector as private compiler authority. Until that operation is drafted, the
concurrent refusal is required and S02 stays OPEN.

Renames and deletions need an exact topology-aware inverse/dependency/module
operation plus a bounded installer with explicit delete records and guarded
rollback/recovery. The existing installer accepts complete string outputs only;
this wrapper deliberately does not send `null` as a generated source. Complete
rename/deletion installation and crash recovery remain OPEN under S02/S03/S05.
Ordinary rollback is not a durable crash-recovery journal, and atomic per-file
replacement is not atomic visibility for the whole batch. Existing transaction
race/rollback limitations are inherited rather than claimed solved.

No-op does not reissue semantic evidence, and full exported/cold receiving
qualification, platform/runtime freshness, strict TypeScript evidence,
production adoption counts, all inventoried caller families and the complete
eight-stage gate remain OPEN. No drafted-row count or coverage denominator is
changed by this partial contribution. Execution remains UNRUN throughout.
