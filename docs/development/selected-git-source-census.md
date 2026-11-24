The source fixture producers now select Rust/Cargo tree entries before asking
Git for object sizes. This follows the existing compiler registry builder in
`prepare-isolated-project-compiler.mjs`. A complete metadata census preserves
source membership; one bounded `cat-file --batch-check` then sizes every
selected object. Existing callers still validate all four fields, source paths,
object identities, file/total bounds, physical bytes and complete source bodies.
No source, hash, ownership, verdict or encoded-result cache is introduced.

The isolated receiving measurement on source head
`a7d10d2c811b13590e465145889640e5227bdefc` observed 2.11 seconds for a complete
size census, compared with 0.123 seconds for complete metadata and 0.024 seconds
for the 865 selected sizes. These substep timings do not establish a complete
test or application speed improvement. The whole original lifecycle test
remained red before this change: its deterministic producer case returned
correct results after 63.94 seconds in Node and 63.44 seconds in Bun, exceeding
the original 60-second bound. Its complete Node CPU profile and failed duration
audits remain retained.

`prepare-selected-git-census.mjs` derives three complete source copies from
the pinned original source archive. Its language sequence replaces only the
actual native Git census expressions. Its repository sequence inserts the
shared helper import at the native import boundary, preserving shebangs, and
selects gzip level one for the two static producers. Compression may change
archive bytes and their corresponding byte/hash fields; complete decoded
canonical bytes, source rows, historical universes and inverses remain required.
The original real-source archive generator keeps its existing settings.

Both sequences retain full before/intermediate/after source, native selections,
serialized/reparsed CSTs and complete inverses. The actual strict-source copy
producer independently derives the entire new strict sibling from the updated
original in a temporary source mirror; its complete result must match exactly.
Unknown current sources and changed original producer inputs refuse.

Prepare and review with `node tools/translation/prepare-selected-git-census.mjs
--emit`, install only the exact actual outputs, and require `--check`. Complete
`selected-git-size-records.test.mjs`, `strict-static-source-refresh.test.mjs`
and the unchanged original `static-source-lifecycle.test.mjs` under both Node
and Bun, retaining all original deadlines. Continue the other original static
consumers, full generation, export freshness and strict parity. This is a
source checkpoint; whole-file timing qualification and the complete gate remain
open. Rust stays in CI after all eight same-SHA JavaScript stages pass.
