# Complete-project owned-field storage draft

The full `node scripts/translate-router.mjs --progress` attempt reached the last
`project-serialize` end event and then exhausted its unchanged 2048 MiB heap.
Root retained the failed 1121.204-second run, approximately 2.489 GB peak RSS,
and no generated outputs. That event precedes completion of generated method
facades; it does not identify storage as the measured allocation site.

Both ordinary bulk planners currently pass `json(result.meta)` into the complete
compressed metadata planner. The owned-definitions planner already uses the
qualified `planCompressedProjectMetaUtf8ObjectStorage` and fixed
`serializeProjectMetaFieldUtf8`. This proposal selects those same APIs for the
complete project result, preserving the original `translateProject` import and
all refused/executable/namespace/CST fields. It does not select definition-only
translation or change project issuer identity.

`prepare-owned-field-bulk.mjs` proposes nine complete sibling sources: ordinary
and retained planners, their ordinary and isolated matrix callers, the isolated
session and worker, and `scripts/translate-router-owned-field-meta.mjs`. The
existing CLI, project module, storage helpers and original APIs stay unchanged.
The new CLI has the same arguments and reports as the old CLI. Its ordinary and
retained complete-project routes use field storage, and its profile route keeps
fresh sequential process isolation. The existing owned-definitions flag retains
its original separate definition-only semantics. No new cache or semantic
authority is introduced.

Language rules select the actual imported storage symbol and its native call,
remove only the complete project JSON argument, and supply the fixed field
serializer. Repository rules add that serializer import, exact sibling routes
and progress. The native checker joins the original/new storage callee to the
actual import declaration and the removed JSON call to the actual `json` import.
Every phase retains independently checked native spans, complete before/after
CST serialized and reparsed to identical source, phase inverses and a whole
inverse. Qualified retained, UTF8 and compressed helper equations are reproduced
against current physical sources; every captured input is reread before return
and after proposal transport.

Progress adds `project-returned` immediately after the genuine `translateProject`
call, then `owned-field-storage-start/end` and `owned-field-retain-start/end`.
Thus a future failure can distinguish returned generated facades, storage and
retention without editing the project module. These additional callbacks and
per-field JSON/Hash scheduling are an explicit new CLI contract. Arbitrary
legacy observer equivalence is **not** claimed. Root's ordinary read-only progress
printer remains the intended receiving workload. Original metadata logical
bytes, component bytes/hashes, decoded values, compression format, all storage
limits, source discovery, isolated worker heap literals and deadlines stay
required. A field beyond the original limits still refuses.

Root materialization and receiving sequence (unrun by this worker):

```sh
node tools/translation/prepare-owned-field-bulk.mjs --emit /private/tmp/router-owned-field-bulk-source-v1
# Review the full proposal and install only its exact nine afterimages.
node tools/translation/prepare-owned-field-bulk.mjs --check
node --test tools/translation/test/owned-field-bulk.test.mjs
bun test tools/translation/test/owned-field-bulk.test.mjs
node --test tools/translation/test/compressed-project-meta-storage.test.mjs tools/translation/test/project-meta-utf8-storage.test.mjs tools/translation/test/private-output-text.test.mjs tools/translation/test/isolated-matrix.test.mjs tools/translation/test/matrix-bulk.test.mjs
# Repeat those unchanged whole files under Bun, then use the original monitor:
node scripts/translate-router-owned-field-meta.mjs --progress
```

Receiving must retain the 2048 MiB parent heap / 3 GB aggregate monitor and all
existing per-child heap literals, test/CLI deadlines and storage bounds. The six
new cases compare complete old/new plans at one physical root and every emitted
byte, inline and three-component logical/storage inverses, nested mutations,
fresh physical source joins, source binding refusals and complete CLI outputs.
They do not filter implementation hashes or compare only selected fields.
The proposal is source-only and unmaterialized; these tests, full forward run,
strict typing, matrix workloads, reverse synchronization and the eight-stage
gate remain unrun. No heap improvement, repaired OOM or coverage gain is claimed.
