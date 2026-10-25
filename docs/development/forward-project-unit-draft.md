# Forward project synchronization source draft

`planForwardProjectUnitSynchronization` and
`applyForwardProjectUnitSynchronization` share full Rust-to-JS/TS generation
and the supported forward-derived JS/TS inverse families. Their CLI is
`scripts/sync-router-project-unit.mjs`. This is unverified source, with no
claim of complete Router translation or runtime parity.

The explicit manifest has exactly these fields:

```json
{
  "schema": "router-forward-project-unit-v1",
  "id": "project",
  "entry": "rust/src/lib.rs",
  "authority": "auto",
  "javascript": "js/src/project.mjs",
  "typescript": "ts/src/project.mts",
  "meta": "tools/translation/unit-meta/project.json",
  "inverse": "return-expressions"
}
```

Language authority can be `auto`, `Rust`, `JavaScript` or `TypeScript`. Inverse
selection is `return-expressions`, `literals`, `scalar-bodies`, `control-bodies`
`imperative-bodies`, `range-bodies` or `floating-bodies`. Distinct canonical paths and
physical `js/src` and `ts/src` locations are required. No unchecked, runtime-only
or force-overwrite mode exists.

Each proposal captures the entire actual Rust source universe, Cargo and
workspace inputs, manifest, both targets and current Git revision. A bounded
`ls-tree` plus one deduplicated `cat-file --batch` reads full original committed
blobs; UTF8, ordinary file modes, object identities, sizes and source limits are
checked. Deleted native files remain part of change detection. This source data
exists only in the current invocation; neither hashes nor a saved previous
proposal grant source, type, ownership or executable permission.

Auto direction requires exactly one changed language relative to Git HEAD, or
initial Rust-only source. Concurrent native/JS/TS edits, deletion of the selected
target, and unchanged units with multiple present languages require explicit
reconciliation. Explicit authority cannot overwrite changes in another language.
Commit a synchronized common baseline before a later automatic edit cycle.
Runtime files do not decide language authority and must match their current
registered implementations before installation.

Rust authority invokes the complete original forward compiler with genuine
current macro/derive/Cargo inputs. The review retains its actual semantic status,
refusals, executable declarations, generated methods, unresolved items and module
and binding diagnostics. A partial result remains partial. JS or TS authority
normalizes only registered runtime import spans and invokes the selected fresh
whole-project inverse checker. The paired target must be absent or match its
complete old/new compiler output after runtime relocation.

Runtime packaging uses ordered language then repository substitutions. The
language sequence reparses complete native source after serialized/reparsed CST
transport; repository rules relocate actual static/export/dynamic/type module
edges. Literal text and trivia elsewhere remain unchanged. Original quote style
is retained so inverse relocation can restore complete bytes. Only registered
relative runtime sources and explicit Node builtins are supported. The actual
transitive implementation/declaration closure and licenses/notices are copied
under `js/runtime` and `ts/runtime`, with original count/byte bounds and fresh
source checks. Existing modified runtime files refuse reconciliation rather
than being overwritten. Scalar-only modules do not materialize a runtime tree.

Complete original native, paired target and metadata outputs retain inverses,
modes and CST equations. Installation reissues the entire proposal, requires
exact equality, rechecks complete inputs and outputs, atomically replaces files,
reads them back and retains the original guarded rollback behavior. Existing
transaction, CLI and export implementations are complete source copies with
ordered substitution histories. The facade and committed exporter retain the
new API, CLI, runtime dependencies and original entrypoints in order.

Independent regression source covers both inverse authorities, full formulas,
literals, native regeneration, initialization, Git direction, missing/deleted
sources, conflicts, forged/stale/Cargo/revision proposals, links, closed
manifests, Unicode/deduplicated Git blobs, strict target cases, export inventory,
repeated imports, type queries and runtime closure/refusals. All are unrun. No
compiler, source planner, helper, preparer, CLI, test, experiment, Rust tool or CI
has executed. Broader inverse constructs, whole production coverage, opaque
async/resource ownership and every other open requirement still need drafting.

The current full forward project path uses the existing flat semantic DATA
storage API to avoid requiring the expanded metadata representation for an
entire Router source set. Private checking and all original executable/refusal
results remain required. This source integration has not executed or been
benchmarked and does not broaden semantic admission.
