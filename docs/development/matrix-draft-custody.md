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

The ordinary and owned profile CI jobs upload these files even after a freshness
failure. The workflow audit permits only its exact non-executable artifact uploader; both
mandatory freshness commands, all stages and the same-SHA Rust gate remain
unconditional. A missing draft remains a failure. Default invocation has no
retention side effect.

The two original matrix commands run in separate unconditional jobs:
`profile-matrix` and `owned-profile-matrix`. Each preserves its original
60-minute limit, complete immutable checkout, SHA assertion and locked install.
Neither waits for the other to succeed. Their distinct artifact names prevent
collisions; the aggregate requires all eight original stages and the additional
owned stage to succeed before Rust. This repairs the serial failure path in
which ordinary freshness failure prevented the owned check from starting.
It does not qualify either generated matrix or waive any original check.

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

The complete workflow/local-control/profile-TypeScript files pass together under
Node 20.20.2 (47 cases and the independent original-deadline audit) and Bun
1.4.4 (45 cases; its import cache avoids two duplicate cases). Installed
TypeScript remains 5.9.3. Earlier complete attempts remain evidence: the new
stage regression first fails against the serial job; the first two-file Node
selection passes its cases but fails the audit because a complete imported test
file was not explicitly selected. Selecting all three files fixes that scope.
Before syntax reuse, two original Bun cases exceed their unchanged 5000 ms
defaults at 6520.52 and 10221.22 ms. A private 32-entry/8 MiB cache of immutable
YAML syntax for identical complete source text reduces repeated parsing. Every
current policy assertion still runs. Both original cases then pass at 1821.57
and 2714.70 ms. No assertion, test file or deadline was removed or increased.
These focused results do not establish a green complete local gate or CI.

The read-only investigation scripts under `experiments/issue-784` compare
complete captured compiler/profile/TypeScript/Rust/Cargo inputs with physical
current files, stream every original stored and decoded member and compare
each decoded inventory to its original plan. The current-input snapshot has
been exercised; full custody investigation awaits a genuine completed CI
artifact. Matrix index bytes are not present in the first custody format.
The investigation neither reconstructs that missing index nor installs files.
