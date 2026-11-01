# Dependent whole-source substitution batch

SOURCE DRAFT / UNRUN. This extends the existing rule pipeline and nested source
edit composer; it does not grant parser, namespace, ownership or executable
permission. R01–R05 application-family/adoption closure remains OPEN. This batch
reduces repeated orchestration work and does not implement missing application
operations merely by registering their names.

`createDependentRulePipeline` accepts selected full descriptors
`{id,phase,requires,conflicts,apply}`. Discovery is explicit through `describe()`;
no module import scan, callback registration or missing-rule fallback runs.
Both phases retain their original names/order: language, then repository.
Dependencies determine stable ordering within each phase. Missing/duplicate/self
references, cycles, explicit selected conflicts and dependencies from language
back to repository refuse before any callback. The actual original pipeline
still rejects asynchronous functions/results and preserves primary exceptions.
Declaration metadata is snapshotted; no semantic result cache crosses runs.

The scheduler visits each dependency edge once. Sorted ready queues preserve
original declaration order as a deterministic tie break, with at most1024
insertions instead of repeated scans of every pending rule and its dependencies.
Limits are1024 descriptors and1MiB complete graph-string metadata. These are
source-derived algorithm bounds, not measured performance results.

`proposeDependentConcreteSourceBatch` is a real consumer for complete
Rust/JS/TS source-copy proposals. Input files carry exact full original and
current source; selected rules carry original-span templates. Every rule's edits
are collected against that same original image before source changes occur.
Explicit parent source references retain nested edits exactly once; crossing,
duplicate or dropped-child edits refuse. Dependency order never licenses one
rule to erase another rule's original preimage. Rule scheduling traces and
interval/rule ownership stay in the returned whole proposal.

The original template composer yields nonoverlapping root edits. The batch
applies those through the actual lossless CST substitution API, serializes and
reparses the result, and transports complete before/after source equations with
full inverses. CST language rules apply the composed byte edits; CST repository
rules retain unselected physical layout. The outer repository rule packages the
atomic proposal. Requested rule phases organize preparation dependencies;
neither phase grants semantic authority. There are still exactly two phase
names, even when several individual rule trace entries share one phase.

Full current source must equal the entire original or entire resulting after
image. The latter permits a precise idempotent no-op replay. Hash matches,
partial new source and unrelated authored changes do not count. No files are
installed; any failing file yields no partial returned batch. Keep all fresh
independent semantic/source/type/ownership and production caller checks in the
actual translator before adoption. CST reconstruction is not grammar/typing or
translation coverage.

The source-only future CLI `scripts/prepare-dependent-source-batch.mjs` reads
an explicit JSON plan with `{files:[{path,language,before}],rules}`. It captures
actual tracked current files under the original selected-source closing/failure
operation and emits the complete proposal. It never overwrites source. Do not
execute it until the complete bulk draft and execution authorization exist.
Copied repositories resolve their own script-relative root. Bounds:256 files,
2MiB original/current/output per file,16MiB combined input source,8192 edits,
8MiB final source and64MiB complete serialized proposal. Existing CST/template
bounds may refuse earlier. Native compilation remains CI only after eight green
same-SHA JavaScript stages.

Five scheduler cases and four whole source-batch cases are drafted, including
an actual tracked-file preparer proposal. They cover stable dependency ordering,
constructor mutation, exact primary values, accessors/proxies/promises, the1024
rule chain, mixed Rust/JS/TS, nested changes, idempotence and stale/crossing/
duplicate/missing/dropped-child refusals. Existing Node forward globs and Bun
forward discovery schedule the complete two new `.test.mjs` files without
changing commands, partitions or deadlines. Every case remains UNRUN.

Stable exports are appended to `bulk-source-family-proposals.mjs`; its earlier
whole source and all five complete additions are retained in the source packet.
SHA256 `e1fcb1db42fa218854c10d6df2de7dd7b6f4ebb5a297957e34b9f80ab59f8db7`
(58,633 decoded/9,131 packed bytes). This is archival source DATA, not an executed
history proof. Checklist remains10/70 DRAFTED,60 OPEN; current executable
translation coverage is unmeasured.
