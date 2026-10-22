# Continue the JavaScript-first translation work

The active continuation is [issue #772](https://github.com/link-assistant/router/issues/772).
It preserves every requirement of [#759](https://github.com/link-assistant/router/issues/759)
after the meaningful checkpoint in [#771](https://github.com/link-assistant/router/pull/771),
following merged [#761](https://github.com/link-assistant/router/pull/761).
Keep #759 open. Merging this checkpoint does not certify complete translation,
runtime parity, a green JavaScript gate or Rust verification.

The [complete prior ledger](issue-759-continuation-through-20261021.md)
is preserved byte for byte, including historical measurements, source proposals
and failed or unrun obligations. Its dated status is historical; this summary
and issue #772 identify the current continuation.

The completed implementation checkpoint is
`2018b7d021d5f601afbcd4394a69268345f6aa59`. Its source-equation/Core
effects/formatting/text batch passes all 41 cases across six complete files in
both Node and Bun. Its private DATA/source-history batch passes all 34 cases
across six complete files in both engines. Original deadlines are preserved.
These overlapping focused batches do not establish a whole-suite pass.

The complete final-PR and merge scope is now retained in the
[continuation case study](../case-studies/issue-759/current/continuation-772.md):
19 runs and 158 terminal jobs at final head
`5c3354948dc9186a22267d576d62b950cf41407d`, plus 14 runs and 162 terminal jobs
at merge `eb2dad1c0a18394dc1aad46413e11401e74eb502`. All 139 failed/cancelled
complete streams were retained and verified, with no collection errors.
The merge scope includes scheduled work and an external dynamic Dependabot job;
that job does not certify the Router gate or Rust runtime. New published SHAs
need their own results; skipped or cancelled work remains unqualified.

The last measured executable production baseline is 155/2,567 functions
(6.04%) against an older 847-source inventory. The refreshed fixture contains
865 Rust/Cargo inputs, but a fresh executable census is still required.
The recorded 441 parity gaps and `runtimeParity: false` remain open.

The next batch must finish current full compiler/export qualification,
canonical and neutral/Unix/Windows generation, owned definitions, strict
TypeScript 5.9.3, reverse freshness and strict parity. It must repair original
Bun derive-helper, source-lifecycle, retained-storage, Core and CatalogRecord
deadline failures without raising limits or reducing workloads. A metadata-copy
prototype was withheld from #771 after Bun found native error-message and stack
control differences. The next source-derived dispatcher preserves the complete
private implementation and native call text: its 30 metadata cases and five
typed-target controls pass in both engines. Node passes all 39 selected cases;
two original Bun derive cases still exceed 5,000 ms. The complete Bun batch
remains red; no controlled speed gain or application-coverage gain is claimed.

Follow [the throughput plan](translation-throughput-plan.md): qualify shared
operation families, generate their real callers and both directions together,
and count only whole independently checked and executed production functions.

Issue #772 carries the full case study, native Router feature parity,
bidirectional CST/meta translation, compatibility core, single-publisher
workflow, resource limits, same-SHA JavaScript-before-Rust gate, measurements,
reusable export/adoption and cross-repository audit obligations. Track actual
source changes, generated artifacts, checks and remaining gaps for each one.

The user's 2026-10-22 instruction authorizes prompt merge of #771 at this
meaningful checkpoint through normal repository protections. It supersedes
keeping this checkpoint draft until full parity is complete. It does not
waive required checks, permit an administrative bypass or unlock Rust early.
Continue alone; do not restart finished workers. Do not invoke local Rust tools.
Preserve the ordered language/repository substitution sequences, serialized
and reparsed CST boundaries, independent semantic validation and full inverses.
Keep physical `js/src`, `ts/src` and `rust/src`, original whole test files and
deadlines, one heavy workload, bounded evidence and careful task-owned cleanup.
