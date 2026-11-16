# Remaining work, sequencing and schedule model

Frozen source baseline: `5fa93ebf9e2b7b402338bb186c196b4a90e76bfe`.
This is engineering judgment based on source records, not measured task effort.
It accompanies the [commit-time report](README.md). Confidence is **low** until
production scope and actual whole-caller composition have been reconciled.

## Three distinct completion milestones

| Milestone | Required deliverable | Current position |
| --- | --- | --- |
| Complete source draft | All70 acceptance bundles have actual implementation/adoption and independent case source, complete reviewed receipts and no unassigned production requirements. |12 DRAFTED,58 OPEN. Source preservation, registration and proposals alone cannot close a row. |
| Fully verified Router translator/runtime/sync | All actual production code supported in the declared domain; matching JS/strict TS behavior, both source directions, edited inverses, conflicts/recovery, deterministic fresh outputs, complete JS gate and gated fatal Rust CI. | Current coverage, complete failure population and integration/performance status unknown. Verification remains deferred. |
| Reusable delivery | Whole compiler/runtime/type/provenance/license closure, copied-project and receiving qualification, applicable upstream/template/adoption work and contribution guidance. | Source exists in parts; complete receiving and external acceptance are not established. |

Full delivery includes all three. Merging a checkpoint or reaching70/70 source
receipts would not by itself establish the second or third milestone.

## Open acceptance scope

The authoritative clauses remain the
[70-row checklist](../../../../development/issue-759-draft-checklist.md).
This table groups all58 open bundles without creating a replacement scope.
Rows cross-reference shared work; their hours must not be summed independently.

| Area | Open IDs | Main missing closure and dependency | Budget packages |
| --- | --- | --- | --- |
| Layout and scope |L01–L05 | Current production body/feature/cfg inventory, complete assignment, actual layout/ownership/import/package/receiving closure. |W1,W6 |
| Layered rules |R01–R04 | All inventoried families registered; language semantics, repository binding and shared forward/reverse/TS/adoption descriptions. R05 source composition is drafted. |W2,W3 |
| CST/semantic boundary |C01–C05 | Every lane and family retains whole lossless source, checked meta, private source/type/owner reissue and edited/exact inverse closure. |W2,W3,W5,W6 |
| Compatibility operations |O01–O05 | Complete actual scalar/collection/error/callback/state/async/HTTP/platform behaviors and application domains. |W2,W3,W4 |
| Binding/namespace |B01–B05 | Modules/imports/visibility, real producers/cfg/macros, type/trait/method ownership and cross-module callers/effects with complete unresolved diagnostics. |W1,W3 |
| Forward translation |F01–F05 | All inventoried whole bodies/aggregates/resources lower to JS/strict TS with complete packaging and coverage source. |W2,W3,W4,W6,W7 |
| Reverse translation |V01–V05 | Editable JS/TS domains and written types, corresponding operations/effects, ownership replay and canonical/edited Rust/TS reproduction. |W3,W4,W5,W7 |
| Synchronization |S01–S05 | Both actual edit entrypoints, direction/conflicts/renames/deletions/dependencies, atomic installation/recovery, complete freshness and copied end-to-end cases. |W5,W6,W7 |
| Native feature parity |P01–P05 | Complete CLI/config/auth/provider/model, endpoint/proxy/stream, storage/policy/lifecycle and client/deploy/platform behavior reconciled to actual inventory. |W1,W4,W7 |
| Independent cases |T01–T05 | Complete family/whole-caller/module/project/platform/receiving edge and refusal source; independent native/target behavior expectations and harness mapping. |W2–W7 |
| Resources/performance |Q01,Q02,Q04 | Whole supported workload fit, meaningful resource/time/storage constraints and retained original deadlines; actual measurement remains later. |W6,W9 |
| CI delivery |J04 | Actual full required CI outcome/repair obligations beyond the existing gate, fatal Rust, partitions and deferred failure collector source receipts. |W9 |
| Export/reuse/upstream |E01–E05 | Whole reusable export, dependency/license/provenance, receiving qualification and actual upstream/adoption/deduplication obligations. |W6,W8,W9 |
| Resource/publication discipline |None | D01–D05 source-drafted; ongoing compliance and delivery evidence remain required. |All packages |

## Provisional work budgets

One **focused agent-role hour** means one hour of implementation, source review,
integration, case authoring, or later authorized verification/repair by one role.
It is neither CPU time nor human-equivalent/billable time. Git has not measured
these hours. Solo means one role; no additional workers are assumed or started.

The earlier November1 forecast allocated616–1,888 such hours across nine
packages. We retain those provisional budgets because the current source-only
history does not support a quantified earned-work deduction for175 commits.
This may overestimate already drafted portions or underestimate newly exposed
composition/runtime gaps. It is a scheduling scenario pending W1, not a claim
that every listed hour has been independently sized as remaining.

| Package | Remaining output to plan for | Hours low–high | Why the interval is broad |
| --- | --- | ---: | --- |
| W1 Inventory and assignment | Reconcile every actual production body, entrypoint, feature/cfg/platform/producer and explicit library boundary; assign each missing construct to source work and a receipt. |16–48 | Existing inventories help, but paths/lexical observations are not complete semantic/feature scope. Review may uncover additional families. |
| W2 Current family composition | Finish real common caller families using existing text/JSON/Option/formatting/mutable-scalar/loop/helper rules, both edit directions and actual source adoption. |24–96 | Much source is present. Whether it composes across all real callers is unverified; candidate output is not admission. |
| W3 Remaining reusable language/core | All uncovered control/aggregate/mutation/ownership/error/trait/generic/producer/import families and paired inverse/refusal paths. |80–240 | Family count/domain remain incomplete. Binding and lifetime gaps can require shared compiler changes. |
| W4 Router runtime/application parity | Matching actual auth/config/provider/routing/proxy/HTTP/stream/storage/state/lifecycle/platform behavior behind qualified native/target contracts. |180–540 | Largest uncertainty: endpoint/library declarations can conceal cancellation, backpressure, state transitions and failure semantics. Native library internals stay outside translation where valid. |
| W5 Reverse editing and sync | Complete editable JS/TS subset, Rust reproduction, paired projection, unique inverse edits and conflict/dependency/rename/deletion/recovery behavior. |80–240 | Nonunique expanded-source inverses, ownership replay and real project edits create a long integration tail. |
| W6 Packaging/resources/receiving source | Whole runtime/type/import/provenance closure, physical trees, canonical/platform/owned/reverse freshness, copied installation and bounded storage/resource behavior. |60–180 | Multiple producer/export/receiving paths must agree; original source/history and budget boundaries must remain intact. |
| W7 Complete independent case source/receipt review | Production and end-to-end contract cases, native oracles, platform/negative/recovery cases, complete harness assignment and all70 clause reviews. |80–240 | Broader integration cases beyond family tests; source review can reopen implementation work. |
| W8 Reusable/upstream follow-through | Required template/hive-mind/adoption/deduplication and receiving integration, existing issue follow-up and full provenance/license closure. |16–64 | Implementation effort only; external review/acceptance delays are unbounded by this allowance. |
| W9 Authorized verification and repairs | Complete JS/Bun/strict TS/freshness/export/receiving/resource checks, complete same-SHA JS→fatal Rust CI cycles, full failure classification and fixes. |80–240 | No current measured failure population, execution durations or repair rate. Substantial missing implementation can exceed this budget and reopen W2–W8. |
| Source milestone W1–W8 | Complete all source/adoption/case receipts; no current execution implied. |536–1,648 | Assumes finite stable scope and available source dependencies. |
| Full planned effort W1–W9 | Source, qualification and scoped reusable delivery. |616–1,888 | Provisional planning envelope; no proven upper bound. |

Family-specific independent cases belong in their family package; W7 covers
broader complete-application/harness/receipt work. Do not count the same cases
again when refining the estimate. All cross-area checklist references above
share these budgets, rather than multiplying them.

## Schedule arithmetic under current staffing

For one agent, divide planned focused hours by **actually available focused
hours/week**, then add unavailable periods, CI queues and external dependencies.
No speedup from historical workers is included.

| Available focused capacity | Source536–1,648h | Later verification80–240h | Total616–1,888h |
| --- | ---: | ---: | ---: |
|20h/week |26.8–82.4 weeks |4–12 weeks |30.8–94.4 weeks |
|40h/week |13.4–41.2 weeks |2–6 weeks |15.4–47.2 weeks |
|80h/week, if sustained |6.7–20.6 weeks |1–3 weeks |7.7–23.6 weeks |

The working summary rounds the40h/week total outward to **16–48 focused
weeks**, approximately four to eleven months of sustained40-focused-hour weeks.
This is deliberately conditional rather than an unsupported calendar due date.
The original six-to-sixteen-team-week estimate should not be repeated as the
current solo forecast. Nor should elapsed gaps be treated as focused capacity.
Continuous168h/week is not assumed: runtime/tool availability is not evidence
of uninterrupted productive work, and dependencies remain serial.

Source-before-verification is an enforced phase boundary. The local execution
prohibition remains until separately authorized, even after complete drafting.
If execution or required external acceptance remains unavailable, there is
**no finite unconditional full-delivery date**. That does not prevent continued
source work or completion of this reporting request.

These are scenario budgets, not probabilities. If existing source largely
composes, the actual effort can fall below the lower model. If additional
runtime/ownership/editing families are required, or full workloads exceed
original resource envelopes, it can exceed the upper model. There is no basis
to assign a percentage likelihood to either outcome from Git timestamps.

## Dependency order and milestone decisions

| Next milestone | Observable exit evidence | Provisional package budget | Estimate decision |
| --- | --- | --- | --- |
| Scope frozen and reconciled | L01/L02 actual source receipts and no unassigned production entry; classify framework internals explicitly. |W1:16–48h | Replace provisional family/runtime inventories; revise all remaining budgets before promising a date. |
| Common whole callers source-complete | Several real caller families have both directions, original domains, strict target/case source and receiving/sync adoption; source receipt review. |W2:24–96h, W3 as needed | Count complete families and residual blockers. Do not count raw operation or source-equation totals as executable coverage. |
| Runtime and reverse/sync source-complete | Actual application/feature map has matching target/native contracts, full error/effect paths, paired inverse edits and recovery source. |W3–W6 | Reconcile every P/F/V/S dependency; unsupported application behavior reopens scope. |
| All source drafted |70/70 reviewed receipts, complete independent cases/export/provenance/source ownership and no open implementation clause. |W7/W8 plus earlier packages | Only now declare drafting complete. Keep execution status explicit; this milestone alone does not authorize local tests. |
| Verified bounded Router and reusable closure | Authorized complete checks/measurements, complete same-SHA JS→Rust CI, receiving/edit/sync/resource evidence and required delivery acceptance. |W9 plus external dependencies | Replace forecast with actual exact-SHA evidence. Reopen missing implementation and requalify after repairs. |

## How to make the next estimate more accurate

At meaningful source checkpoints, record whole families/acceptance clauses
completed, actual caller adoption, unresolved dependency classes and staff
availability. Keep explicit session start/end/pause records going forward if
active effort attribution is desired; never manufacture them retrospectively
from commit gaps. Maintain source and verification states separately.

Once verification is authorized, retain original complete command/deadline and
failure population, actual resource/time measurements, and exact source SHA.
Measure newly executable production bodies, current parity and whole project
roundtrips independently. Use those observations to revise the budgets and
batch full fixes. No such measurement or CI inspection was performed for this
report, and the report does not weaken those future obligations.
