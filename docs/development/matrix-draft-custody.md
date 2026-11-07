# Retain already checked matrix drafts

`ROUTER_MATRIX_DRAFT_DIRECTORY=js/node_modules/.matrix-drafts` opts check mode
into complete DATA retention. The original matrix workers still finish every
profile and their original private checks. The session independently validates
the complete staged output census, source inputs and physical output bytes,
then reports every original missing, stale and unexpected checked-in file.
Retention never updates those checked-in files or changes the failing status.

One fresh attempt contains each complete output compressed separately and a
manifest with original inputs, complete plans, byte lengths and SHA256 hashes.
Every compressed file is decoded and compared before the manifest is written.
Capture failures remove only that attempt. Symbolic links, escaping paths, alternative
output directories and files exceeding the original byte bounds are refused.
Inputs are independently reread after capture. Existing deadlines include this
work; generation and validation are not moved outside their original bounds.

The profile CI job uploads these files even after a freshness failure. The
workflow audit permits only its exact non-executable artifact uploader; both
mandatory freshness commands, all stages and the same-SHA Rust gate remain
unconditional. A missing draft remains a failure. Default invocation has no
retention side effect.

`node scripts/prepare-matrix-draft-workflow.mjs --check` derives the complete
current workflow from the immutable historical workflow using the existing
`language` and `repository` phases. Both whole YAML CSTs are serialized and
reparsed at each boundary, and the full inverse is checked. The original
fixed-nine producer and its archive stay exact; its original regression runs
against all fourteen complete historical files in a receiving fixture. A
separate regression qualifies the current workflow extension and rejects an
unreviewed source change. This distinguishes the caller-selection baseline
from later callee artifact retention.

Captured plans and bytes are unqualified data. Their public metadata, hashes,
archival custody and source reconstruction grant no type, ownership or
executable authority. Reviewing or installing a draft still requires the
original source and compiler joins, independent behavioral checks, complete
freshness regeneration and the full JavaScript gate at the resulting head.
