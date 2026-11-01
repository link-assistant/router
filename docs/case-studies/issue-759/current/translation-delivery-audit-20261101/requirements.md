# Complete known requirements and source evidence

Baseline: `ba7b1d9f99f9be16628fe433a097b1b8ff036f43`, November1,2026.
This documents the **known explicit requirements** and their decomposition. It
is not a claim that the incomplete L01/L02 work already enumerates every actual
production function, generated item, feature/platform combination or runtime
edge. That exact application inventory remains an explicit blocker.

## Three overlapping levels of scope

1. **Nine original issue requirements** define the outcome, including external
   templates/audits and controlled measurement. They remain authoritative.
2. **Seventy local source-draft acceptance bundles** organize implementation and
   policy work. Eight are DRAFTED,62 OPEN. They are not equally sized, and their
   source status does not replace issue-level runtime/upstream delivery.
3. **Subsequent user constraints and the new audit deliverables** refine how
   the work proceeds and what must be recorded. They map into existing outcome
   requirements instead of being counted as newly implemented compiler features.

Do not add9+70+constraints and call that a percentage. These lists overlap.
A task-completion claim must satisfy their union, not only the easiest local
source receipts. If the actual inventory discovers a distinct requirement
outside the existing criteria, add a numbered row and record the denominator
change under the checklist's existing scope-change rule. Do not silently
exclude it or rewrite historical8/70 snapshots.

## Original issue759 requirements, fully expanded

Original bodies and dates are preserved in [issues.json](evidence/issues.json).
Historical delivery below refers to the frozen original
[case study](https://github.com/link-assistant/router/blob/ba7b1d9f99f9be16628fe433a097b1b8ff036f43/docs/case-studies/issue-759/README.md),
not a new inspection of upstream CI or pull-request feedback.

| Original ID | All required clauses | Already delivered evidence | Still required and local mapping |
| --- | --- | --- | --- |
| I01 Case study | Compare formal-ai1188, meta-language201, relative-meta-logic and Router749 plus link-cli, links-notation, start and calculator; retain relevant logs/data and pinned sources; reconstruct chronology; distinguish green/red/cancellation causes; document translation/parity boundaries, components and solutions; add bounded diagnostics when cause evidence is missing. | Historical scoped study reports4,184 workflow runs, pinned comparison sources and declared complete selected evidence capture within its budget; this current audit adds commit cadence, source-delivery analysis and a requirements/forecast record. These are historical/source claims. | Current causal/measurement follow-up, all remaining diagnosis/tooling and complete issue closure remain. E02/E05/Q02/Q05/D04 plus the original nine-row acceptance ledger apply. No fresh CI logs are read during drafting. |
| I02 Native JS Router | Native Node20+/Bun configuration, routing, cooldowns, accounts/tokens, compatible OpenAI/Anthropic endpoints, CLI and every documented operation; full Rust parity; feature manifest/checker in both language gates; independent shared fixtures/goldens; keep wrapper/downstream compatibility. | Native subsets, policy operations, manifests and test/harness source exist. Historical443 features/62operations/368routes are a dated inventory, not current complete support. | L01/L02/O01–O05/F01–F05/P01–P05/T01–T05/J04/E03. Every partial/unsupported contract must stay a visible gap until actually implemented and independently qualified. |
| I03 JS first and automated translation | Develop covered changes in JS first; generate Rust through meta-language; preserve deterministic regenerate-and-diff; report missing constructs upstream with minimal examples; keep native/manual exceptions small, explicit and in the parity manifest. Later requests add both Rust→JS/TS and JS/TS→Rust editing/sync. | Physical trees, ordered substitutions, CST/meta/checker/interpreter subsets, owned-core adapters, finite forward/reverse and synchronization paths exist. | R/C/B/F/V/S/E bundles and actual all-caller parity; current Rust is not wholly generated from native JS. Source transport, preserved bodies and API catalog rows do not count as translated behavior. |
| I04 Bulk agents and sole push owner | Parallel full-batch drafting; workers commit and never push; one owner collects the full finished CI failure population and publishes one coordinated repair, preserves current runs and local JS checks in the ordinary verification phase; contribution/agent guidance and hive-mind support report. | Written guidance, serialized commits, current3source workers and sole Root publisher; historical Hive Mind issue3043 and draft3044 proposal exist. | D01–D05/Q05/J01–J05/E04. Latest source-only exception allows periodic pushes without reading CI or running checks. Runtime scheduler enforcement and full later cycle evidence are not proved by a proposal. |
| I05 Minimal local load | JS-only default, exceptional Rust shared/bounded target, no incremental/debug growth, limited jobs/CPU/memory/time/disk and safe cache pruning; no20–30GiB target per worktree. Later task instruction prohibits every local Rust tool. | Bounded reusable wrapper, explicit no-local-Rust task policy, task-owned cleanup rules, shared existing worktree/dependencies and no current builds. | D03/Q02/E05 and controlled I07 measurements; no global host/RSS savings claim. Current phase also prohibits local JS tests and heavy experiments. |
| I06 JS gates before all Rust | All required JS stages and matrix members succeed for the same SHA; no independent push/PR Rust trigger, path-filter or skipped/cancelled/partial bypass; exact checkout, fatal Rust results, branch-required checks, protected running writers/concurrency and independent source audits. | Eight stage definitions, structural audits, failure/SHA cases and CI-only native-oracle guards are drafted; J01/J05 source receipts exist. | J02/J03/J04, actual remote required-check/rules behavior and complete current green/fatal results. This audit does not query those remote states. |
| I07 Measure the result | Controlled before/after typical-feature PR: exact pushes, complete green/failed/cancelled run populations, actual CI minutes, first complete green latency and peak local RSS/disk; distinguish command samples, process-tree peaks and billed time. | Dated historical metrics, measurement tooling and source/resource receipts exist. This audit measures only Git metadata cadence and batch-path composition. | Q02/Q05/E05 plus the original I07 ledger. Exact full-PR push count, billed minutes, current full-green latency and controlled after-load remain unknown; Git commit count cannot fill them. |
| I08 Reusable adoption everywhere | Qualified reusable gate/parity/translation/regeneration/agent standard; apply to both Rust/JS pipeline templates and Hive Mind best practices; deduplicated adoption issues in formal-ai, meta-language, relative-meta-logic, link-cli, links-notation, start and calculator. | Reusable standard bundle; captured template issues196/230, Hive Mind3043; historical draft PRs197/231/3044 and seven project adoption/audit issues are recorded in the original study. | E01–E05/J02–J04 and actual upstream application/receiving/required-rule qualification. A copied bundle, issue or draft patch is not completed adoption; do not refile the same issues. |
| I09 Audit all mentioned repositories | Compare Router and each named repository against native parity/generation/gate/concurrency/load/agent/template/security/link/release/default-branch/stale-PR practices; deduplicate existing issues; include concrete evidence, minimal reproductions, workarounds and testable acceptance. | Historical source-pinned audits and eight deduplicated issue references are captured: Router760, meta-language221, relative-meta-logic187, formal-ai1191, link-cli111, links-notation339, start197, calculator254. | E02/E04/E05/Q05 and the original I09 ledger. Historical issue findings are not proof of current defects or current fixes. Remaining correction/adoption/configuration/PR dispositions need actual evidence later. |

The original instruction also asks for one coherent execution/delivery and
preserved missing evidence, bounded verbose diagnostics, entire-codebase fixes
where a shared issue recurs, and upstream reports where warranted. Checkpoint
rollovers #761→#771→#775 were explicitly authorized later; they do not waive
any unfinished outcome above.

## Every local source-draft acceptance bundle

Each full closure criterion below comes from the frozen
[technical requirement baseline](evidence/technical-requirements-baseline.json).
The “already present” column describes source, not passing behavior. The final
column states missing source closure or the remaining verification distinction.
The authoritative current receipt document remains the
[checklist](../../../../development/issue-759-draft-checklist.md).

### L — Physical layout and actual scope

Source starting point: [draft-inventory/README.md](../../../../development/draft-inventory/README.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| L01 — **OPEN** | Record a committed, source-reviewed inventory of production modules/functions, entrypoints, Cargo features and platform variants. Classify tests, generated files, application code and explicitly untranslated dependency internals separately. Retain baseline paths/revision; do not reuse an old function denominator. | 1,512 path records, Cargo/platform notes and lexical anchors exist. | Review actual production items, generated producers, cfg/test distinctions and a current stable function/feature denominator. |
| L02 — **OPEN** | Assign every production inventory entry to one or more numbered rows and a real implementation/adoption path; list each unresolved construct, binding and feature gap. Draft an inventory reconciliation mechanism so unassigned/new entries cannot silently disappear. | A source-only reconciler reports changed/unassigned paths and existing family worklists. | Assign every actual entry to concrete shared rules, implementation, reverse and case paths; reconcile orphan/new entries. |
| L03 — **OPEN** | Finish layout-aware imports, package/build/publish entrypoints, CLI/tool paths and documentation for all three physical source trees; eliminate active assumptions that application source is root `src`. | Three physical language trees and layout-aware helpers exist. | Finish active import/CLI/package/publish/relocation closure; distinguish logical crate src coordinates from actual root-src assumptions. |
| L04 — **OPEN** | Declare authored versus generated ownership for all three trees and meta/source assets, generation destinations and overwrite protections; draft stale/missing/wrong-root cases. | Guarded ownership and exact current-equation sources now cover major generators. | Close every tree/meta/source-asset overwrite/stale/wrong-root path, including full receiving and reverse contexts. |
| L05 — **OPEN** | Draft copied-repository layout/adoption instructions and independent relocation/package/import cases that exercise actual `js/src`, `ts/src`, `rust/src` and translator paths without depending on the original checkout. | Receiving/layout fixture sources exist. | Complete independent relocated/copied package/import cases using actual full compiler and all three source trees. |

### R — Ordered reusable substitution rules

Source starting point: [translation-rules.md](../../../../development/translation-rules.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| R01 — **OPEN** | Register every application syntax/operation family from L01/L02 in extensible rule tables, using exactly language then repository sequences; each missing registration is assigned, never silently carried. | Many finite operation descriptions and stable proposal APIs exist. | Tie registrations and explicit missing families to the complete L01/L02 inventory; declarations alone are not coverage. |
| R02 — **OPEN** | Implement shared language substitutions for inventoried expressions, declarations, control flow and type/ownership/effect constraints, with inverse/refusal source cases; repository spelling cannot grant semantic authority. | Checked scalar/control/ownership and selected collection/async rules exist. | Complete every actual inventoried language family and matching inverse/refusal source; do not use repository spelling as permission. |
| R03 — **OPEN** | Implement repository bindings, facade adoption, imports, hygiene, formatting and output conventions for those families, separate from language semantics; include shadowing/ambiguity/conflicting-name cases. | Facade/import/hygiene/formatting adopters exist. | Finish source-qualified binding composition, scoped aliases, shadowing and conflicts across real callers. |
| R04 — **OPEN** | Drive applicable forward/reverse registrations, target declarations and bulk caller proposals from shared operation descriptions or source-derived templates; preserve independent oracle expectations and original APIs. | Shared descriptors/templates drive several native/runtime/type/reverse families. | Cover all registered application families and bulk caller mappings from real sources, while preserving independent expectations. |
| R05 — **OPEN** | Draft complete rule-composition/discovery orchestration and dependency/conflict handling, including nested original-span edits, idempotence, complete inverses and bounded refusal; one rule must not erase another's needed source evidence. | Fixed-point/layered composition and complete source equations exist. | Finish finite dependency ordering, nested original-span edits, conflict/idempotence and whole inverse orchestration across families. |

### C — CST and checked meta boundary

Source starting point: [concrete-source-equations.md](../../../../development/concrete-source-equations.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| C01 — **OPEN** | Carry original Rust source through lossless CST serialization/reparse on every forward lane, retaining tokens/trivia/delimiters/spans and malformed-input refusal. | Lossless Rust CST transport and numerous full histories exist. | Ensure every actual forward lane closes full original source/CST; retain original oversized/malformed source refusals explicitly. |
| C02 — **OPEN** | Carry original JS and TS source through the same lossless boundary on every reverse lane, including written type syntax, comments, templates and complete module source. | JS/TS native parser and edited-target CST paths exist. | Complete every reverse lane, written type/template/comment preservation and whole-module source proof. |
| C03 — **OPEN** | Define/extend checked semantic meta schemas, serializers/reparsers, independent checkers and both interpreters for every new operation; distinguish transported source from semantic authority. | Checked semantic schemas/interpreters cover subsets and new owned operations. | Add missing operation semantics, serialization/reparse and independent interpretation without promoting transported source to authority. |
| C04 — **OPEN** | Retain genuine private parser/source/type/caller receipts through emission and closing checks; draft stale/forged/mutated/caught-failure cases, with no authority from public flags, names or hashes and no new persistent verdict caches. | Private parser/source/type/flow/source-failure issuers are substantial. | Finish live proof propagation through new projections/emission/closing and all caught/stale/forged cases; no saved verdict cache. |
| C05 — **OPEN** | Draft exact source-inverse and complete canonical reproduction paths for all lanes and composed histories, including mixed Rust/JS/TS source equations and source/export dependency pins. | Whole-source inverses and selected paired semantic inverses exist. | Complete exact source/canonical reproduction and mixed-language/export histories for every supported lane. |

### O — Application operations and compatibility core

Source starting point: [compatibility-core.md](../../../../development/compatibility-core.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| O01 — **OPEN** | Complete inventoried scalar/text/formatting/JSON/codec operations with matching native/JS implementations, strict TS declarations, errors, numeric/Unicode semantics and actual caller mappings. | Scalar/text/format/JSON/codec libraries and scalar170 reader source exist. | Finish actual caller composition, numeric/Unicode/errors and both-direction/native contract cases across the inventory. |
| O02 — **OPEN** | Complete inventoried collection/iterator operations: construction, mutation, lookup/order, nested aggregates, callbacks/captures and borrowed results. Finish genuine native join-kernel routing, preserving ownership and resource behavior. | Vector/iterator/copied-record families and native join emission source exist. | Complete aggregate mutation/order/callback/capture/borrowed results and all actual collection callers. |
| O03 — **OPEN** | Complete inventoried Option/Result/early-return/Try/error-conversion operations and callback/local/branch/loop composition, retaining evaluation order, move/loan lifetimes and explicit error variants. | Finite Option/Result/callback/Try families exist. | Finish scoped/block/control composition, borrowed fallback and all error/move/loan/evaluation paths; captured candidates do not prove originals. |
| O04 — **OPEN** | Complete inventoried shared-state/async/network/HTTP/stream contracts with matching cancellation, ordering, backpressure, termination and error semantics; framework internals may remain behind qualified facades. | Selected async/network/HTTP/state/stream contracts are drafted. | Complete real handlers, cancellation, ordering, backpressure, termination and matching native boundaries. |
| O05 — **OPEN** | Complete inventoried filesystem/process/environment/time/platform operations with matching resource lifecycle and failure contracts; list native implementation boundaries and application domains explicitly. | Filesystem/process/environment/time and persistent backend subsets exist. | Finish lifecycle/error/platform contracts and actual caller mappings without treating native internals as application translation. |

### B — Source binding and producer closure

Source starting point: [translation-throughput-plan.md](../../../../development/translation-throughput-plan.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| B01 — **OPEN** | Resolve original modules/imports/reexports/aliases/visibility and qualified function/type references across the inventoried source set; preserve ambiguity and shadowing refusals. | Module/import/reexport/type role resolvers and source views exist. | Finish actual alias/visibility/source ownership across the entire inventory; ambiguity remains refusal. |
| B02 — **OPEN** | Resolve actual attributes/cfg/features/platform selections and macro/derive/include producers used by that set, retaining original generated-source provenance rather than guessed expansions. | Cfg/derive/macro/include source families and producer contexts exist. | Complete actual selected feature/platform/producer closure and genuine generated-source provenance. |
| B03 — **OPEN** | Resolve actual type/trait/impl/method/generic/default-context ownership needed by callers; qualified facade bindings must be joined to their actual implementation and dependency configuration. | Selected nominal/generic/trait/impl/method ownership is checked. | Complete required real caller ownership/default/trait contexts and qualified facade implementation/dependency joins. |
| B04 — **OPEN** | Close cross-module helper/caller/result/field/constructor relationships, including nonasync and async effects, argument-duration borrows, reference lifetimes and whole-body ownership checks. | Owned Text/JSON helper closures and selected cross-module domains exist. | Finish actual helper/result/field/constructor/async relationships with full-body argument-duration borrows and lifetimes. |
| B05 — **OPEN** | Draft complete-scope unresolved-binding diagnostics and source/adoption refusal cases; every unresolved producer/owner maps back to L02 instead of blanket namespace admission. | Refusal/meta and source-adoption diagnostics exist. | Map every unresolved owner/producer to the current inventory and retain complete-scope independent refusal cases. |

### F — Forward Rust to JavaScript and TypeScript

Source starting point: [flat-output-translation.md](../../../../development/flat-output-translation.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| F01 — **OPEN** | Lower all inventoried expressions, statements, branches/loops/matches, returns and helper calls through checked meta to executable JS and strict TS; preserve effects and refusal domains. | Executable scalar and selected aggregate/control/helper lowering exists. | Finish all inventoried expression/statement/match/loop/call/return bodies and effects in both targets. |
| F02 — **OPEN** | Lower inventoried records/enums/constructors/fields/generics/traits and aggregate/reference ownership through matching target abstractions, including mutation and drop/resource obligations. | Nominal/record/carrier/collection subsets are drafted. | Complete actual aggregates/generics/traits, mutation, drop and reference ownership emission. |
| F03 — **OPEN** | Lower inventoried async/state/network/streaming application callers through O04/O05 contracts with complete control flow, cancellation and error paths. | Finite async/HTTP/network/source proposals exist. | Lower whole stateful/streaming/async application bodies through matching contracts, including cancellation and failures. |
| F04 — **OPEN** | Draft complete project-driver/dependency/import/runtime packaging for canonical and neutral/Unix/Windows outputs, owned definitions and all production entrypoints; do not manually patch generated outputs. | Canonical/three-profile/owned drivers and packaging sources exist. | Finish complete current dependency/import/runtime packaging, entrypoints and all fresh outputs within original limits. |
| F05 — **OPEN** | Provide actual whole-function/module production source cases for all inventoried families plus a future census mechanism distinguishing executable, partial, refused and carried bodies with reasons. | Historical censuses, full-owner attempts and partial inventory reporting exist. | Complete actual whole-function/module cases and a current executable/partial/refused/carried census with exact reasons. |

### V — Reverse JavaScript and TypeScript

Source starting point: [translation-rule-api.md](../../../../development/translation-rule-api.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| V01 — **OPEN** | Define the editable JS/TS application subset from L01, including JS type witnesses and written TS types; retain dynamic/coercion/unknown-source refusals and useful diagnostics. | Typed portable/owned editable subsets exist. | Define every required editable JS/TS application construct from the actual inventory; dynamic/coercion/unknown witnesses refuse. |
| V02 — **OPEN** | Map all corresponding scalar/core/collection/error/aggregate operations through checked meta and ownership replay into Rust and strict TS, across every active reverse lane. | Scalar/owned/carrier/collection reverse subsets exist. | Finish corresponding operations in all active reverse lanes with checked ownership and Rust/strict-TS emission. |
| V03 — **OPEN** | Map corresponding async/state/network/resource operations and whole production callers back to Rust, with complete dependency/type/import emission and native contracts. | Selected async/resource reverse plans exist. | Complete real async/state/network/stream callers and their native imports/types/resource contracts. |
| V04 — **OPEN** | Implement both paired-target edit directions, canonical Rust reproduction and JS↔TS projection consistency; distinguish canonical source changes from exact restoration of untouched source/trivia. | Literal/format/helper/copied-record exact paired target edits exist. | Finish both target directions and canonical Rust/JS/TS consistency, including unique edits after expansion. |
| V05 — **OPEN** | Draft independent whole-module reverse cases for all inventoried families, including unsupported JS/TS, ownership conflicts, tampered witnesses and roundtrip error/effect preservation. | Independent reverse/source/forgery cases exist. | Cover every actual family, whole modules, unknown JS/TS, ownership conflicts, error/effect and tampered witness behavior. |

### S — Synchronization and fresh output custody

Source starting point: [forward-output-ownership-20261101.md](../../../../development/forward-output-ownership-20261101.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| S01 — **OPEN** | Complete actual Rust-edited and JS/TS-edited synchronization entrypoints through CST/meta and both rule sequences; retain authored-source overwrite protections. | Source-capturing synchronizers and guarded installation exist. | Finish Rust- and JS/TS-edited entrypoints across all actual source trees/runtimes with authored overwrite protection. |
| S02 — **OPEN** | Complete exact baseline/direction/conflict handling for independent, identical and concurrent differing changes, including paired JS/TS conflicts, renames/deletions and dependency edits. | Paired/triple conflict/reconciliation and move/recovery subsets exist. | Close independent/identical/divergent edits, paired conflicts, rename/delete/dependency changes and exact baselines. |
| S03 — **OPEN** | Complete source-reader/closing/failure protocols and bounded atomic installation/rollback/recovery; stale/restored/caught-failure inputs must invalidate private facts and preserve primary errors. | 301-path forward custody, selected reads, rollback and partial-recovery source now exist. | Close all relevant source-reader/install/closing domains and receiving cases; cooperating-writer/late-failure limits stay explicit. |
| S04 — **OPEN** | Draft deterministic fresh output orchestration for source banks, canonical/platform/owned/reverse assets, runtime/type mirrors, meta and export profiles; no manual expected-hash replacement or stale generated acceptance. | Original/current equations, fixed producers, bootstrap and storage orchestration exist. | Finish deterministic fresh canonical/platform/owned/reverse/runtime/type/meta/export output generation from current inputs. |
| S05 — **OPEN** | Draft end-to-end copied-project edit/sync/second-edit/conflict/recovery cases in both directions and no-op/idempotence checks, without relying on original checkout caches. | Two-cycle/conflict/recovery case sources exist for subsets. | Finish actual copied-project end-to-end edit/sync/second-edit/no-op cases in both directions, without original caches. |

### P — Native Router runtime parity

Source starting point: [issue-759-continuation.md](../../../../development/issue-759-continuation.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| P01 — **OPEN** | Map every inventoried CLI/configuration/account/authentication/credential/provider/model-selection operation to matching target behavior and independent production contract cases. | Native JS CLI/config/account/provider/credential/model subsets exist. | Map every actual operation to complete matching native behavior and independent production cases; wrapper fallback is not parity. |
| P02 — **OPEN** | Map every inventoried endpoint/routing/proxy/header/protocol/error/stream feature to matching target behavior, including cancellation, termination, ordering and platform variants. | Endpoint/proxy/protocol/header/stream subsets exist. | Complete all inventoried routes and failure/cancellation/order/platform variants; historical368 routes are not a new census. |
| P03 — **OPEN** | Map every inventoried storage/network-token operation, policy/authorization/quota/usage/subscription/lifecycle/state behavior to matching target implementations and failure cases. | Storage/token/policy/quota/usage/subscription/state subsets exist. | Finish complete actual state/lifecycle behavior, errors and independently expected contracts. |
| P04 — **OPEN** | Map every inventoried client/session/login/process/tunnel/deploy/service/logging/telemetry capability to matching target behavior, explicit external boundaries and platform cases. | Client/session/login/process/service/logging/deploy subsets exist. | Complete every inventoried capability and declared external/platform boundary. |
| P05 — **OPEN** | Reconcile the complete feature/route/entrypoint manifest against L01/L02 and all historical parity gaps; every application gap needs implementation/case source, with no unsupported feature counted as parity. | Feature/route/operation manifests retain explicit partial/unsupported statuses. | Reconcile all historical gaps and current entries against actual implementation/cases; do not credit unsupported features. |

### T — Independent case source

Source starting point: [issue-759-draft-checklist.md](../../../../development/issue-759-draft-checklist.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| T01 — **OPEN** | Draft independently expected semantic vectors for every inventoried operation and complete production caller family, shared across JS/TS and native oracle source without generating expectations from implementation tables. | Numerous shared target/native vectors and actual-row edge sources exist. | Cover every operation and whole production caller with independent expectations, not implementation-generated goldens. |
| T02 — **OPEN** | Draft boundary/error/refusal vectors for Unicode, numeric limits, malformed input, source identities, stale/forged receipts, coercion, resource caps and unsupported domains. | Numeric/Unicode/source identity/coercion/refusal boundaries are drafted. | Close all actual families' malformed/error/resource/forgery/unsupported domains, including complete original cases. |
| T03 — **OPEN** | Draft ownership/evaluation-order/lifetime/mutation/branch/loop/callback/alias cases, including later-argument move/restore and nested borrowed results in real callers. | Ownership/order/alias/loan/control cases exist for finite families. | Cover actual complete callers, nested callbacks/borrows, later-argument effects and branch/loop cleanup. |
| T04 — **OPEN** | Draft async/cancellation/stream/order/state/platform and resource-cleanup cases, including independent real route/CLI/storage contracts and controlled external-service fixtures. | Async/stream/state/platform/route fixture source exists for subsets. | Complete cancellation/backpressure/termination/error/cleanup and controlled external-service contracts. |
| T05 — **OPEN** | Draft complete Node/Bun/strict lockfile TypeScript and CI-only Rust harness coverage mapping, whole-file scheduling, original deadlines/raw evidence and explicit skipped-work accounting. | Original Node/Bun/TS partitions and several CI-only Rust oracles exist. | Map every complete case/harness/target to the actual gate and preserve skipped-work/deadline/raw evidence obligations. |

### Q — Deferred repairs and performance

Source starting point: [translation-throughput-plan.md](../../../../development/translation-throughput-plan.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| Q01 — **OPEN** | Draft shared-source-history/fixture/native-parser/derive/binding repairs for recorded failure classes and independent regressions; preserve full originals and provenance. | Many source-history/parser/derive/binding repair sources exist. | Close all recorded failure classes with independent regressions and complete unchanged source evidence. |
| Q02 — **OPEN** | Draft invocation-local allocation/CPU/lifecycle improvements for recorded metadata/retained-storage/source-check bottlenecks; preserve guards and avoid persistent source/owner/verdict caches. | Invocation-local factoring, streaming and lifecycle sources exist. | Complete shared allocation/CPU fixes under original guards; no current benchmark or full-workload performance result is claimed. |
| Q03 — **DRAFTED** | Draft complete actual native join-helper→kernel emission routing through genuine private checked body/caller evidence, plus full-capacity independent cases without reducing original bounds/deadlines. | Complete native join-to-kernel emission routing and independent full-bound source are receipted. | Source DRAFTED only; actual runtime/full production adoption and current resource qualification remain separate. |
| Q04 — **OPEN** | Draft canonical/platform/owned/reverse/export freshness and strict TypeScript repair paths with complete source equations, original producers and all unchanged commands. | Freshness/strict-TS/reverse/export repair sources exist. | Finish actual full producer/current source equations and complete current outputs; no manual expected-hash repair. |
| Q05 — **OPEN** | Draft a later complete-cycle failure collector/classifier and repair worklist preserving raw failures and SHA/workloads; newly discovered failures reopen affected rows instead of being hidden or assumed repaired. | Complete-cycle collectors/retained historical failure worklists exist. | Finish later authorized complete current-cycle classification/repair and reopen rows on real failures; current feedback stays uninspected. |

### J — JavaScript-first and fatal Rust CI

Source starting point: [parallel-javascript-gate.md](../../../../development/parallel-javascript-gate.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| J01 — **DRAFTED** | Account for all eight unchanged JavaScript stage IDs/commands and every original matrix member/profile/engine, preserving fail-fast false, deadlines and raw test evidence. | All eight stage IDs/commands, matrices/engines and independent accounting source are receipted. | Source DRAFTED; actual green same-SHA evidence is not established by this receipt. |
| J02 — **OPEN** | Require success for all JavaScript stages at the same immutable SHA before any Rust job executes; skipped/cancelled/missing work cannot unlock Rust. | Same-SHA JS-before-Rust guards and audits exist. | Close every entry/reusable/release/supplemental path, skipped/cancelled/filter bypass and actual required-check enforcement. |
| J03 — **OPEN** | Keep all required Rust CI checks fatal after the JS gate, with native edge/oracle coverage and explicit skipped-work handling; no local Rust invocation or commit-hook Rust tool. | Rust failures remain fatal; no-local-Rust policy and native oracle scheduling source exist. | Complete all native edge/harness/skipped-work source obligations and later gated fatal results; no hook bypass may waive CI. |
| J04 — **OPEN** | Connect complete forward/reverse/freshness/strict parity/export/receiving and production-case jobs to the original partitions, preserving credentials/platform boundaries and bounded resources. | Canonical/profile/owned/reverse/receiving stage connections exist for subsets. | Finish all mandatory current freshness/strict-parity/export/production consumers under original partitions/credentials/resources. |
| J05 — **DRAFTED** | Draft workflow/source-equation/partition audits and positive/negative gate cases for failed/missing/mismatched-SHA JS stages and fatal Rust outcomes; workflow presence alone is not verification. | Independent gate/workflow/source-equation failure/SHA/audit case sources are receipted. | Source DRAFTED; current execution and remote required rules remain unverified. |

### E — Reusable delivery and adoption

Source starting point: [reusable-translation-guidance/README.md](../../../../development/reusable-translation-guidance/README.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| E01 — **OPEN** | Include the full compiler/rule/CST/meta/parser/schema/runtime/type/source-profile dependency closure in a standalone export with explicit source provenance and unchanged size/resource limits. | Compiler export selector and source-profile closure drafts exist. | Include and independently receive every current parser/rule/schema/runtime/type/source dependency within original bounds. |
| E02 — **OPEN** | Carry upstream reference/pin/license/notice obligations for copied approaches and dependencies; document local changes and distinguish reused source from reimplementation. | Pinned upstream sources/notices and historical comparison bundle exist. | Review the complete current copied/reimplemented closure, licenses and exact source-change attribution. |
| E03 — **OPEN** | Draft independent receiving-repository cases that import the full compiler, translate real source in both directions, synchronize edits, and retain semantic/source/failure checks without original checkout access. | Independent copied-repository receiving cases exist for finite profiles. | Qualify full current compiler, real source both directions and two edit cycles without original checkout access. |
| E04 — **OPEN** | Draft reusable installation/layout/core-binding/extension/adoption instructions and automation; make repository-specific rules replaceable without weakening reusable language rules. | Reusable standards, layout/core binding guidance and upstream draft proposals exist. | Finish actual replaceable repository-rule installation/adoption automation and original issue8 delivery follow-through. |
| E05 — **OPEN** | Draft receiving closure/freshness/platform/resource diagnostics and limitations, plus contribution guidance covering layered rules, independent cases, JS-first gating and no unsupported full-sync claim. | Resource/receiving/freshness limitations and contribution guidance are documented. | Complete all current closure diagnostics/platform/receiving source obligations without an unsupported full-sync claim. |

### D — Resources coordination and truthful publication

Source starting point: [bulk-draft-publication.md](../../../../development/bulk-draft-publication.md).

| ID / source status | Complete closure criterion | Already present | Remaining / acceptance distinction |
| --- | --- | --- | --- |
| D01 — **DRAFTED** | Preserve source-only drafting/no experiments/no CI-feedback inspection policy until complete bulk draft, continued prohibition of local tests/compilation until authorized, and no local Rust tools in any phase. | Source-only/no-CPU-intensive-experiment/no-local-Rust guidance is receipted. | DRAFTED policy; all current new tests/compilation/translation/receiving/performance remain UNRUN. |
| D02 — **DRAFTED** | Record single coordinator/publisher, no restarted workers, hook disabling for conflicting Rust tools, standing push authorization and coherent checkpoint cadence without weakening JS-first CI. | Single publisher, exact serialized commits, standing push and current3worker policy are receipted. | DRAFTED policy; latest explicit source-only worker authorization overrides older work-alone instructions. |
| D03 — **DRAFTED** | Document bounded disk/memory/time/evidence handling, one heavy workload, no unnecessary dependency trees/clones, precise Router-owned cleanup and preservation of others' active work. | Disk/memory/evidence/time and Router-owned cleanup rules are receipted. | DRAFTED policy; no measured current whole-workload fit or global host load claim follows. |
| D04 — **DRAFTED** | Complete checkpoint/handoff/PR templates recording exact source SHA, open IDs, unrun/failed/passed scope, reproduction paths, cleanup and explicit paused/resume status. | Checkpoint/handoff/PR templates and open-count/source-SHA reporting are receipted. | DRAFTED local delivery guidance; this audit adds detailed historical cadence/requirements/forecast records. |
| D05 — **DRAFTED** | Define truthful final delivery: all 70 source receipts before draft-complete claim; independently completed coverage/parity/freshness/receiving/performance and same-SHA JS→Rust CI evidence before verified completion or release claims. | Truthful source-versus-verified completion and all-required-evidence policy is receipted. | DRAFTED policy; full original issue delivery still requires actual parity, reverse/freshness/receiving/performance and fatal gated Rust results. |

## Subsequent constraints and delivery nuances

These are current instructions or existing project contracts, not additional
claims of implemented features. Earlier contradictory worker/CI instructions
remain historical; the latest explicit task instruction takes precedence.

| ID | Requirement or constraint | Source/effect on work and completion |
| --- | --- | --- |
| U01 | Bulk draft every known requirement before tests/experiments. | Current user/AGENTS policy. Author implementation and independent cases; run none. Missing source is a reason to continue, not a completion claim. |
| U02 | No local Rust compilation or tools. | Cargo/rustc/rustfmt/Clippy/rust-script and Rust-backed hooks remain prohibited in every task phase. Native evidence comes from gated CI only. |
| U03 | No current local testing, compiler/translator/preparer trials, benchmarks or CPU-intensive workloads. | Bounded source/SCM reads and automated source authoring remain allowed. This requested commit-time analysis uses metadata arithmetic only. |
| U04 | Eight unchanged same-SHA JS stages precede fatal Rust CI. | lint, node-tests, bun-tests, typescript, parity, translation, profile-matrix, reverse-translation. Missing/skipped/cancelled work is not success. |
| U05 | JS and TS are both first-class targets and edit sources through meta/CST. | All applicable forward, reverse and paired-projection directions need complete contracts; TS syntax alone is not strict/native parity. |
| U06 | Exactly ordered language then repository substitution sequences, extensible by additional rules. | Separate general semantics from Router facade/import/format/quality bindings. No manual generated-body fix as the ordinary translation path. |
| U07 | Use the CST extension in actual source paths. | Serialize/reparse tokens, trivia, delimiters and spans; fresh semantic/type/ownership checks remain independent. |
| U08 | Prefer automated translation and bulk drafting. | Shared descriptors/templates/actual source kernels and whole-family regeneration; independent expectations must not be generated from the same implementation table. |
| U09 | Prioritize frequent blockers and larger complete gains toward80%. |80% is a goal, not a measurement. Use complete real caller dependencies, not first-refusal frequency or API counts as coverage. |
| U10 | Matching compatibility core and explicitly untranslated native internals are allowed. | Native frameworks/libraries may stay behind behavioral contracts; untranslated application behavior cannot be hidden as a completed facade. |
| U11 | Reuse actual best approaches from the named upstream repositories. | Preserve pins/licenses/notices and distinguish source reuse, adaptation and reimplementation; historical badges do not qualify current Router. |
| U12 | Physical ./js/src, ./ts/src and ./rust/src. | Layout, scripts, packages, publishing, source/meta ownership and copied receiving must use actual mapped coordinates. |
| U13 | Fully automated ongoing Rust/JS/TS synchronization. | Direction, baselines, conflict/rename/delete, dependencies, exact paired targets and canonical Rust all remain required. |
| U14 | Up to three GPT-6.1-sol medium source workers. | Latest November1 authorization supersedes older one-/two-worker restrictions. Do not restart historical workers or create a fourth research worker. |
| U15 | One publisher; workers only commit. | Root serializes exact reviewed path sets and alone pushes/updates PRs. Shared integration worktree is an explicit disk-saving task exception. |
| U16 | Commit at least every6h during active work; coherent source pushes roughly every3h. | The October27 source-only exception permits checkpoints without feedback inspection. Commit timestamps do not prove continuous active sessions or exact push counts. |
| U17 | Standing push authorization; do not repeatedly ask. | Normal non-force publication with reviewed source and honest UNRUN status. Preserve protections; a checkpoint is not release/merge qualification. |
| U18 | No current CI status/log/artifact/review-feedback inspection or repair from it. | Preserve running CI, do not cancel. Later authorized verification collects the full terminal failure set and repairs shared causes together. |
| U19 | Native Rust edge coverage should help translation. | Author independent boundary/order/ownership/native-oracle cases now; schedule only behind the same eight JS gates and report as UNRUN. |
| U20 | Preserve whole original tests, workload limits and deadlines. | Node/Bun, strict repository TypeScript5.9.3, whole files and all callbacks/refusals. No smaller corpus, swallowed failure or higher cap to obtain a pass. |
| U21 | Keep local resource use small. | No new dependency/build/worktree copies, one heavy task only when authorized; disk remains constrained. Metadata/source authoring is bounded. |
| U22 | Cleanup only identified Router/task-owned inactive data. | User allows task Rust cache/build removal regardless of age; preserve active/other-user files, locks and complete recovery evidence. |
| U23 | Investigate slow work and optimize shared causes. | Preserve semantics/source/authentication; actual timing/RSS improvement remains unmeasured until an authorized complete workload runs. |
| U24 | No persistent cross-invocation source/hash/owner/verdict caches. | Public names/flags/digests/CST or saved DATA do not issue semantic authority; invocation-local factoring still needs complete closing. |
| U25 | Preserve genuine original source/type/owner/namespace/flow receipts. | Whole body, caller, dependency and lifetime joins survive current projections and emission; caught/restored source failures remain poisoned. |
| U26 | Complete original/intermediate/current histories and inverses. | No hash-only replacement, fabricated combined trace or old installed fence over new after bytes. Current producer equations must be explicit. |
| U27 | Exact primary errors and every closer. | Falsy/frozen thrown values survive cleanup; unknown artifacts remain, late partial recovery is reported honestly. |
| U28 | Keep public APIs/refusals and normal source domains. | New opt-in copies must retain complete originals. Small fixtures are not substitutes for20k/8MiB/64MiB opaque production ingress. |
| U29 | Preserve actual whole owners and module/dependency universes. | An extracted successful function does not prove its original module translated. Function-only safe readers remain inert snapshots. |
| U30 | Full export and copied-repository qualification. | All current compiler/parser/rule/runtime/type/source prerequisites and both edit cycles must work without original checkout access. |
| U31 | Keep contributing/agent/handoff rules aligned. | Record latest phase/worker policy, exact SHA, open counts, source domains and limits. Keep files below1,000lines and use links-network terminology. |
| U32 | Merge meaningful checkpoints and open continuations when explicitly requested. | Historical #761/#771 rollovers preserved requirements in #772/#775. They did not certify parity or authorize bypassing same-SHA gates. |
| U33 | Count only actual qualified application behavior as executable progress. | Preserved Rust, wrappers, declarations, candidate methods and native-only baselines never count. Historical percentages remain dated. |
| U34 | Stop/checkpoint/handoff only under the current task instruction. | Earlier explicit pauses/checkpoint stops were respected as dated events. Current instruction is continued source work with the requested audit in parallel. |

Some U rows restate safeguards required by the existing compiler contracts;
they are not attributed as verbatim user quotations. The original issue,
latest user messages, AGENTS and contribution guidance determine precedence.

## New audit deliverables requested November1

| ID | New requested deliverable | Artifact and acceptance |
| --- | --- | --- |
| A01 | Deep analysis of all delivered versus unfinished requirements. | This document includes all9original umbrella requirements, all70criteria and34current nuances, with source evidence and explicit unknown scope. It does not pretend the uncompleted function inventory is complete. |
| A02 | Check development speed from time between commits. | Complete frozen Git metadata, separated ancestry windows, exact recent intervals, median/percentile/span statistics and interpretation limits in README/evidence. No commits-as-features extrapolation. |
| A03 | Fully document why it has taken this long. | Evidence-backed technical examples, process/architecture causes, resource/phase tradeoffs and explicit non-attribution where active-time/causal data is missing. |
| A04 | Give a clear realistic completion estimate. | Forecast work packages, assumptions, favorable/working/adverse scenarios, critical path, uncertainty and update triggers. No unsupported date/percentage guarantee. |
| A05 | Put a durable complete case in this repository. | This directory, raw metadata/issue snapshots, linked main checklist/handoff/case index and a coherent committed checkpoint. Later findings append a new dated update. |
| A06 | Keep source implementation moving while the audit is written. | Existing three workers retain disjoint source tasks; no fourth worker, tests, local Rust, CI inspection or extra dependency trees. Current new source remains UNRUN. |

A01–A06 are report/process deliverables under the original case-study/handoff
scope. Finishing this audit does not add6translated features or close6of the
70compiler/runtime criteria. Likewise, original external delivery obligations
remain open even if a local technical checklist eventually becomes complete.

## What must be reconciled before any full completion claim

- Every actual application item/feature/platform path must be mapped in L01/L02;
  the current1,512path snapshot is a starting inventory, not the exact function
  denominator. New/changed entries cannot silently inherit completed status.
- All applicable local source criteria and original issue1–9 completion tests
  must be satisfied. Reuse existing upstream issues; do not substitute refiling
  for implementation or old issue text for current source evidence.
- Source DRAFTED and verified behavior remain separate. The currently open
  corpus/alias/constant/callback work may reveal more prerequisites; report them
  as work, not as successful translation.
- Once the full draft and execution authorization exist, obtain current actual
  coverage, full native parity, reverse/sync/freshness/export/receiving and all
  required same-SHA JS→fatal Rust evidence. Reopen rows for missing work.
- Measurements not available in this audit stay null/unknown. This includes the
  current complete CI outcome, exact pushes, billed minutes, full-green latency
  and current whole-workload memory/resource improvement.
