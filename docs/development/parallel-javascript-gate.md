# Run complete JavaScript checks in independent processes

Keep all eight same-SHA stages and their original mandatory commands. The
translation stage has three fixed members: the complete forward test suite,
canonical regeneration/freshness, and owned-definition regeneration/freshness.
The profile stage has two fixed members: all canonical profiles and all
owned-definition profiles. Each existing command runs exactly once; profiles
and test files are not filtered or reduced.

Both matrices set `fail-fast: false`, retaining every member's result and full
failure stream. Checkout and SHA verification run in every member. The
60-minute job windows, test case deadlines and original commands remain
unchanged. The complete Node deadline/raw artifact is always uploaded by the
translation test member, including after a failed test. Other members do not
pretend to produce Node case receipts.

The existing `complete` job still requires the same eight stage IDs and rejects
any unsuccessful result. A failed or cancelled matrix member keeps its stage
red and Rust blocked. Rust failures remain fatal once every JavaScript stage
passes. Collect every matrix member before publishing the next coordinated
repair; parallel scheduling does not authorize cancelling unfinished work.

Generate the workflow through native YAML scalar/range selections and separately
declared language/repository substitution rules:

```sh
node scripts/prepare-parallel-js-gate.mjs --emit
node scripts/prepare-parallel-js-gate.mjs --check
```

The proposal retains complete serialized/reparsed native YAML CST for both
phases, full byte inverses, the five original complete commands and eight native
edits. It writes nothing. The source-history reader independently reverses the
parallelism edits and the two earlier storage-command edits to the immutable
reviewed archive. Neither a source proposal nor that archive grants Rust
permission or records a successful CI run.

The gate auditor recognizes only these exact fixed partitions. Missing,
duplicated, dynamic, excluded or extra members, cancellation-on-first-failure,
unreviewed conditions and lost failed-test evidence are refused. Keep the
original whole workflow-policy test file and its deadlines, and run the new
partition/source-history controls in both Node and Bun. Actual remote CI remains
required; a local model of scheduling is not a completed GitHub run or a measured
speed improvement.
