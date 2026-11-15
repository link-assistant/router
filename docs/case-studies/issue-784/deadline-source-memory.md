# Deadline auditor source retention

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
The complete local gate at `02bf28e5` exhausted a 512 MiB heap before the
forward cases started. Its deadline reporter retained a TypeScript source file,
program, checker and lexical helper closures for every preselected test file.

The auditor now computes each complete file's exact expression spans, call
spans, literal names and lexical deadline conclusions during its fresh parse.
It retains those records and the complete original source, releasing compiler
module graphs between files. Observation matching and final physical source identity
checks remain mandatory. All original bounds, whole files, concurrency and
deadlines remain unchanged. Optional source progress is disabled by default.

The finite regression audits 96 complete files in a child limited to a 128 MiB
heap. The original auditor aborts with heap exhaustion; the repaired auditor
passes, retains all source bytes and unobserved finite deadlines, and rejects
one deliberately overdue observation. Repeated observations have independent
deadline records. All ten controls pass through the actual independent audit;
all 58 related shard and workflow controls also pass. Node is 20.20.2 and the
lockfile-installed TypeScript compiler is 5.9.3.

Preparing all 697 actual forward files, 11,324,176 bytes, then rechecking their
complete source identities passes in 63.237 seconds. Heap use at completion is
95,697,176 bytes. This diagnostic executes zero test cases. It does not qualify
forward behavior, runtime parity or a complete gate.

The original local gate passes lint, 259 native Node cases, 259 native Bun
cases and 121 acceptance cases. A native TypeScript case breaches its unchanged
60-second deadline; strict parity fails with 441 draft gaps and a source-check
heap failure. The container guard stops reverse testing at 2,867,879,936 sampled
cgroup bytes, leaving its later commands unrun. No green stamp or Rust result
exists. The current published head's entire CI cycle is still running.

The [complete observation archive](https://github.com/link-assistant/router/blob/e88183bb894b9ea62c9d6ae170c3fc099047685b/docs/case-studies/issue-784/evidence/deadline-memory-20261109.tar.gz?raw=true)
and [member receipt](evidence/deadline-memory-20261109.json.gz) preserve failed,
interrupted and successful attempts, full original sources and exact commands.
The initial smaller fixture did not reproduce heap exhaustion and had an
incorrect byte-count assertion. Its direct runner also lacked the child-reaping
wrapper required by the existing descendant-cleanup test. Both failed attempts
remain retained; the final complete controls use that wrapper. Only inactive
task-owned copies are retired after full archive readback.
