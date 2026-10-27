# Periodic source checkpoints during bulk drafting

The user's 2026-10-27 instruction permits a source checkpoint push every few
hours while every remaining requirement is being bulk drafted. Aim for one
coherent checkpoint about every three hours during active work. This overrides
the earlier requirement to defer CI-triggering pushes and to collect/repair the
published head's complete CI cycle before another drafting push.

The coordinator works alone and remains the only publisher. Review the complete
source batch, its original source/rule histories and requirement ledger before
committing. Disable conflicting execution hooks for commits and pushes under the
existing user authorization. No local tests, compilation, verification parsers,
translator/preparer/generation runs, benchmarks or experiments are authorized.
Automated source writing, bounded source/SCM/disk reads and normal Git operations
remain allowed. Keep task-owned data small and avoid dependency/build trees.

Push the existing branch normally with no force update. Read only Git ref and
transport information needed to publish the source; do not inspect CI statuses,
check summaries, logs, artifacts or review feedback, wait for CI completion,
cancel runs or begin CI-driven repairs until every requirement is fully source
drafted. Independent source review and implementation continue after a push.
Record the exact source SHA and push time, local execution as unrun and CI as
not inspected. A source checkpoint does not establish passing checks, executable
coverage, complete translation, freshness, parity or release readiness.

CI may run because of a checkpoint. Preserve every original workflow, command,
matrix member, deadline and required stage: all eight JavaScript gates must
pass for the same immutable SHA before any Rust job executes, and Rust failures
remain fatal. Do not weaken a gate or skip a failure to make a drafting push
look verified. The periodic publication exception grants no merge or release
readiness. After the entire source draft is present, inspect the complete CI
results and coordinate shared repairs without changing original workloads or
bounds. The current prohibition on local tests and compilation remains until
the user changes it; all local Rust tools remain prohibited for this task.

This permission is specific to the current Router task. Export reusable guidance
about respecting a receiving user's explicit phase and publication policy, not
Router's authorization itself.
