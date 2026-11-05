# Checkpoint and handoff templates

Copy these sections into the receiving repository's own checkpoint and handoff.
Replace every bracketed field with actual source information. These templates
supply no publication, execution, merge or cleanup authorization. The receiving
user's current instructions govern. A source receipt records drafted material;
a verification receipt records an actual completed run against exact inputs.
Neither authoring this template nor creating a checkpoint qualifies translation.

## Source checkpoint template

- Objective: [complete original requested translation/synchronization scope].
- Current phase: [source drafting / separately authorized verification].
- Activity state: [active / explicitly paused by user / blocked with reason].
- Controlling instruction: [date, exact constraint, session/reference].
- Source commit: [full immutable SHA; branch names alone are insufficient].
- Worktree/branch: [actual paths and branch].
- Published commit: [full remote SHA or explicitly not published].
- Publication time/result: [UTC timestamp, destination and transport result].
- Publisher: [one owner]. Workers: [current names/models, disjoint paths].
- Commit slot: [current owner or free; serialize shared-index commits].
- Requirement ledger: [path, stable denominator and scope baseline].
- Draft accounting: [N/M source-drafted; M-N open; unweighted, not coverage].
- Remaining IDs: [all open IDs, or exact committed ledger section listing all].
- Scope changes: [new IDs/reason/denominator change, or none].

Describe each coherent source change in terms of its concrete problem, resulting
behavior and remaining domain. Link implementation, original producer inputs,
immutable before/after histories, independent case/oracle source and documentation.
Record ordered language/repository sequences and complete CST/checked-meta
serialization/reparse/inverse paths when applicable. Name actual production
callers separately from fixtures or migration candidates. State every deliberately
untranslated dependency boundary and unsupported application feature.

| Evidence kind | Exact SHA and input scope | State | Reproduction/receipt |
| --- | --- | --- | --- |
| Source review | [actual reviewed commit/paths] | [drafted/partial] | [source receipt] |
| Local JS/runtime cases | [actual head or no run] | [passed/failed/UNRUN] | [full command, deadline, raw receipt or deferred command] |
| Strict TypeScript | [actual compiler/lockfile/version scope] | [passed/failed/UNRUN] | [whole-file command and diagnostics] |
| Forward/reverse/freshness/parity | [complete actual scope] | [passed/failed/UNRUN] | [commands and full receipts] |
| Exported receiving/performance | [actual copied inputs/workloads] | [passed/failed/UNRUN] | [artifact paths, fixed limits and receipts] |
| CI JavaScript and native | [immutable CI SHA or uninspected] | [passed/failed/uninspected] | [only authorized inspected evidence] |

A source-only checkpoint records all deferred execution as UNRUN and deferred CI
feedback as uninspected. Do not query feedback to fill this table when inspection
is prohibited. Historical green evidence remains attached to its historical SHA.
When execution is authorized, retain failed and completed runs, original complete
files, strict compiler versions, workloads, deadlines and raw diagnostics. All
required JS stages must succeed for the same SHA before fatal native CI can run;
missing, skipped, cancelled or mismatched work does not count as success.

Record disk/memory constraints, last observation time and current task-owned
artifact paths. List exact cleanup performed and bytes recovered, or explicitly
none. Preserve other workers' active files/caches; record retained recovery paths
and uncommitted files. Never inherit this project's cleanup permissions elsewhere.

## Resume handoff template

Start with the objective, current phase, activity state and last controlling user
instruction. An explicit user pause needs its date/reason and the exact stop state;
a later explicit resume needs its date and constraints. Incomplete work alone is
not a pause request or a completion condition. Keep the original objective unless
the user explicitly changes it.

1. Repository coordinates: root/worktree, branch, draft PR/issues, full local and
   published SHAs, publication time, remote result and exact committed handoff.
2. Ownership: sole publisher, active worker models/path scopes, commit slot,
   pending live tool sessions and any writes already in progress. Identify the
   precise uncommitted paths; never stage another worker's unfinished batch.
3. Scope/accounting: inventory revision/selection and unresolved scope, complete
   open IDs, source receipt count/denominator, actual verified function denominator
   if one exists, and separate parity/freshness/performance/receiving status.
   Unknown measurements stay unknown. Preserved/opaque source is not executable.
4. Current implementation: latest complete batches, exact APIs/paths, original
   source/owner/type/effect prerequisites, real callers, new refusal domains,
   source histories and next required adoption. Distinguish canonical semantic
   reproduction from exact untouched source restoration and edited-target inverse.
5. Evidence: every actual passed/failed/UNRUN/uninspected scope with its SHA,
   compiler/runtime version, complete commands/deadlines and raw receipts. Record
   source-only restrictions before any suggested deferred command. A listed
   reproduction command is not permission to execute it.
6. Resources/recovery: task-owned data, disk observation, cleanup performed,
   retained backups/journals, known recovery boundary and outstanding sessions.
   Record exclusive-writer/platform assumptions and preserve unknown replacements.
7. Next batch: concrete unresolved IDs, genuine original source prerequisites,
   disjoint assignments, independent expected cases, source equations, receiver
   and native oracle needs, then exact review/commit/publication obligations.

Leave a clear continuation instruction consistent with the user's current phase.
Never mark a goal complete because a checkpoint exists or a budget is ending.
Never resume a paused task without the user's instruction. Neither template
closes a receiving repository's implementation, coverage or verification rows.
