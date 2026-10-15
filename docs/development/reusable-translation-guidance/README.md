# Reusable translation contribution guidance

These additive templates carry the current rule, synchronization, verification,
resource and publication contract without repository names or agent identities.
They are policy scaffolding, not proof that a receiving project implements complete
translation or runtime parity. Incomplete carried/native code remains explicit.

Merge `CONTRIBUTING.template.md` and `AGENTS.template.md` into the receiving project's
own contribution and agent instructions. Preserve terminology, testing tiers,
credentials, release rules and existing public contracts. Supply actual commands,
versions, source ownership and fixed budgets. Explicit stricter user instructions
always take precedence, including a prohibition on every local Rust-backed tool.
Three active workers is a default resource policy, not permission to delegate when
the user or environment does not authorize it. Reduce concurrency under tighter limits.

## Required sequence

Declare `language` then `repository` rule sequences, with checked serialized/reparsed
meta in both directions. Automate source-of-truth synchronization and read-only
freshness checks. Run complete focused JavaScript files and strict TypeScript for
rapid feedback, add meaningful Rust regression source, then run the complete gate
on the integrated immutable SHA. Rust CI depends on every same-SHA JavaScript stage.
One heavy workload and one publication owner remain separate resource responsibilities.
Measure before optimizing and retain complete failed/pass originals and limitations.

## Existing standard templates

`standard-guidance.patch` is an exact additive patch for the two older guidance templates and the workflow scaffold
under `docs/case-studies/issue-759/standard/`, pinned by the structural test to Git
commit `62c4ce09c82ce53c39cecba7a978157bf4f12077`. It is staged outside the case
allocation. It has NOT been applied to that case directory. Review its context and
the case storage allocation before any adoption; later changed templates require
an updated patch. Copying these standalone files needs no historical source lookup.

The existing workflow scaffold requires immutable-SHA JavaScript checks before
its Rust job and disables CI cancellation. Its pinned setup action does not pin the
Bun runtime. The staged patch adds a required explicit `bun-version` caller input
and passes it to setup; reviewed callers must choose the exact tested supported
version, rather than a moving alias or range. A required input alone does not enforce
the caller's version policy. Router's own pinned runtime is unchanged.

The scaffold's 15-minute JavaScript and 30-minute Rust limits are finite example
budgets, not proof of sufficiency for a receiving workload. Assess actual complete
workloads and setup overhead when adopting the scaffold; retain every mandatory
check and same-SHA dependency. Do not raise an established failing deadline to hide
an implementation problem. Adopting repositories must wire every other Rust-capable
job to the gate and retain the full CI failure batch. Neither a template nor a
structural check executes semantics.

## Offline compiler export

`tools/translation/export-bundle.mjs` exports the committed compiler closure and
production entry points. Its manifest does not claim to include these contribution
instructions or the case-study scaffold. Copy this guidance separately and adapt it
to the receiving project; compiler export success grants no policy, source-proof or
parity authority. Generation and verification must still run in that project.
