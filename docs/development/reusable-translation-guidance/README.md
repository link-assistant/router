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
Router's standing push authorization is local to its task and is not exported by
these templates. Follow the receiving user's actual publication authorization.
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
The templates also preserve six-hour source checkpoints, fatal Rust CI failures
and conditional use of the receiving user's standing publication authorization.
The [compatibility-core contract](../compatibility-core.md) describes paired
library abstractions with intentionally untranslated internals and automated CST
adoption. Adapt that pattern only within the receiving maintainer's authorization;
retain fresh whole-function checking and actual producer/freshness qualification.
Track every requested requirement and continue independent source review while CI
runs, preserving the tested head. Inspect pinned upstream implementations before
adding machinery and retain reproducible upstream defects for authorized reporting.

## Current Router examples

Router's current physical source roots are `js/src`, `ts/src` and `rust/src`;
[the language layout](../language-layout.md) distinguishes them from historical
logical labels. Adapt these paths to the receiving repository rather than copying
old `packages/` labels into current physical loaders.

[Historical assembler recovery](../native-portable-historical-layout.md) retains
complete genuine and mixed source packets, restores the actual original frozen
literal and hash assertion, then applies the current layout through separate
native-selected CST phases and full inverses. It does not repin the oracle to
an accidentally migrated literal. [Private analysis retention](../owned-core-private-analysis-retention.md)
uses actual lexical bindings to remove one redundant copy of already private DATA,
while preserving original callback, intrinsic, lifetime and source checks. Its
full receiving controls remain separate from application coverage, complete
regeneration, performance deadlines and strict runtime parity. These are reusable
source-equation patterns, not permission to admit unsupported source or skip the
receiving project's complete qualification.

## Existing standard templates

`standard-guidance.patch` is an exact additive patch for the two older guidance templates and the workflow scaffold
under `docs/case-studies/issue-759/standard/`. Baseline source provenance is Git
commit `62c4ce09c82ce53c39cecba7a978157bf4f12077`; the structural test reads current
HEAD blobs and requires their exact complete SHA256 pins, without needing ancestor
history in a shallow checkout. It is staged outside the case
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

The compiler's CST-like meta-language extension belongs to that exported source
closure. Its forward and reverse adapters must consume serialized and reparsed
concrete source before the independent semantic checks. Qualify exact comments,
whitespace, punctuation, delimiter groups, Unicode spans and source edits in the
receiving environment, then execute the emitted JavaScript and strict-compiled
TypeScript. A concrete tree proves source fidelity only; it cannot supply missing
grammar, types, ownership or runtime parity. Copying the compiler does not establish
that the receiving repository's complete code can be translated.

## Respect an explicit bulk-draft phase

When the user requires the entire source batch before testing, keep a complete
requirement ledger and draft implementations, forward/reverse mappings, runtime
declarations, regression source and documentation together. Automated source
writing may construct draft files; it does not qualify them. Defer tests,
benchmarks, verification compiler runs, exploratory execution, freshness
regeneration until that complete draft exists. Treat publication authorization
separately: when the receiving user explicitly permits periodic source pushes
while deferring feedback, publish only coherent checkpoints at their cadence
and do not inspect CI status, logs, artifacts or review feedback or begin CI
repairs until the complete draft exists. Do not infer this exception for a
receiving project. Preserve every same-SHA JavaScript gate before fatal Rust CI.
Keep all original verification obligations and deadlines for the later phase.
Record partial source coverage and unverified changes explicitly; neither a
rule catalogue, an output proposal nor a source/CST inverse establishes runtime
parity or full synchronization. Preserve the receiving user's local-tool and
resource restrictions, including CI-only Rust when requested.

The [shared local and compatibility substitution examples](local-source-substitutions.md)
show how separate family rules can reuse bounded lexical source selection and
real language/repository CST substitutions. Their receiving/export, target and
native oracle cases are source drafted and unrun; they certify no receiving
coverage, parity or complete synchronization.
