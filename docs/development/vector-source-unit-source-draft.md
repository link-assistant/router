# Physical vector source unit transaction draft

SOURCE ONLY. No implementation, source unit planner/installer, CLI, parser,
translator, preparer, tests or experiments ran. No local compiler or Rust tool
ran. CI feedback is uninspected; full drafting and all requirements remain OPEN.

The explicit owned-vector unit wraps the freshly rechecked bool/integer vector
source proposal in the existing complete source transaction. The transaction
module is a complete copy of the existing checked JSON field adoption module;
its original APIs remain intact. The bounded plan/apply CLI is copied from the
existing forward string unit CLI. No hand-built alternative installer is used.

A manifest names one JavaScript or TypeScript authority, the complete script
paths, runtime/declaration roots, actual physical Rust function bindings,
explicit script dependencies and a separate review output. All actual native
source files, package/workspace Cargo inputs, script sources, source manifest and
installed runtime/declaration closure are captured. The original Rust package
layout maps physical rust/src paths to the existing logical src API without
changing its complete byte provenance. JS/TS remain at js/src and ts/src paths
when those physical roots are selected by the manifest.

Fresh Git blobs and the original actual source tree select authority and reject
simultaneous language/native edits. Runtime source must equal the exact current
candidate runtime closure; it is not installed from metadata. Rust bindings must
join actual captured physical source. Native/virtual/script path collisions,
missing source, symlinks, unknown manifest fields and overlapping review targets
refuse. The native proposer checks every selected function and its full graph
before any physical source transaction can be constructed.

The proposal contains complete original/after/inverse Rust and paired source
outputs plus bounded review metadata. Planning closes the original source-tree,
Cargo, all captured physical inputs, Git head and review target checks on success
and failure, retaining the primary error. Apply uses the unchanged installer,
which reruns the complete actual producer, compares the whole serialized plan,
uses its existing bounded no-follow reads, atomic replacement/readback and
rollback behavior. It never consumes saved semantic/source verdicts as permits.

Four complete compiler/CLI equations retain language then repository stages,
full originals, CST inverses and both preparation roots. Independent unrun
source covers both authorities, physical roots, plan/apply/inverses, conflict
edits, stale source/revision, runtime corruption, links, source namespace changes,
tampering and CLI/manifest refusals. The CLI uses the original fresh-worker
memory/time/output bounds. No dependencies or generated artifacts were installed
while authoring this draft.

This is a drafted primitive-vector transaction, not full Router synchronization,
verified receiving behavior, runtime parity or release readiness. Shared
transaction race/failure qualification, broader f64/text/JSON/native collection
families, complete production and namespace coverage, reusable compiler export,
performance and all CI obligations remain OPEN. Rust stays CI-only after eight
same-SHA JavaScript gates.

Draft commands, not executed:

```sh
node scripts/sync-router-owned-vectors.mjs --manifest path/to/vector-unit.json --plan /tmp/new-vector-plan.json
node scripts/sync-router-owned-vectors.mjs --manifest path/to/vector-unit.json --apply /tmp/new-vector-plan.json
```
