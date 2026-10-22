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

The [scalar and JSON delivery](../case-studies/issue-759/current/scalar-json-delivery-772.md)
adds executable behavior through the actual rule producers: reverse Unicode
scalar counts, checked integer ordering, seven generated roundtrip witnesses,
and two formerly refused production JSON validators. All five complete functions
in `safety_identifier.rs` now execute in focused JavaScript and strict TypeScript
checks, compared with three before this change. This module result is not a new
global census. A source-derived bounded interpreter batch retains every ASCII
case and reduces the same exhaustive case from 108.34 seconds (failed deadline)
to 26.24 seconds under its original 60-second deadline.

The final results cover 72 distinct cases across 13 complete files in both Node
and Bun, plus complete native/CST source review and six producer freshness
checks. Intermediate failures remain retained. The prior published head's
complete CI cycle is collected: three terminal runs, 34 primary terminal jobs,
all nine ran job logs and all three artifacts. Shared source-history failures
are repaired locally; complete CI, canonical/profile regeneration, native parity
and whole-Router synchronization remain open. See the
[operation documentation](scalar-json-translation.md) for commands and boundaries.

The [storage and guarded-source checkpoint](../case-studies/issue-759/current/storage-and-guarded-delivery-772.md)
retains the complete failed full-generation attempt: field storage completed,
but standalone processing exhausted the unchanged 2 GiB heap after 1,287 seconds.
No outputs or new global census were produced. The existing native retained
storage path passes all 13 focused cases in both engines and is ready for a full
retry. Actual guarded-producer composition repairs frozen composer/scanner
comparisons and regenerates two scope modules without changing original pins.
Its 18 focused cases pass in both engines; the broader Node source-plan family
still has two original deadline failures. Keep these failures and the full
reverse-project performance frontier open.

The [flat retained-output path](flat-output-translation.md) is now generated
from the actual byte/native implementations, with the complete CLI and matrix
closure. Its nine focused cases pass under Node and Bun, including exact
16 MiB UTF16 retention under a 96 MiB heap. It addresses the old detacher's
observed allocation failure; full-corpus qualification remains required.
The ASCII/scalar synchronization repair retains authored Rust input protection.
Its complete 14-case suite passes both engines with unchanged deadlines; the
[delivery record](../case-studies/issue-759/current/flat-sync-delivery-772.md)
retains full failed attempts, final source equations and the now-complete
six-run CI cycle at `4b22bd09b`.

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
