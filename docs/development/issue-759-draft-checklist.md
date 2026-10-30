# Countable source-draft checklist for issues #759 and #772

Tracking baseline: implementation checkpoint `b9e239a5b`, 2026-10-31.
This documentation update does not resume implementation. Work remains paused.
The [handoff](issue-759-handoff.md) records publication and resume constraints.

## Scope, counts and evidence

The 14 areas in [the requirements ledger](bulk-draft-requirements.md) are split
below into **70 numbered draft requirements**, five per area. These are acceptance
bundles, not equally sized tasks or a count of functions. This replaces an
unbounded narrative worklist with a baseline that can be counted. It does not
claim that every production construct has already been inventoried.

Initial accounting: **0/70 closed as source drafted; 70/70 open for closure
review**. Existing implementation is substantial. Zero closed means no bundle
has yet received the complete source evidence required below, not zero code
written or an estimate of remaining engineering effort. Do not report this as
0% implementation or translation coverage. No numeric estimate of partially
drafted work is supported. Every initial status is `OPEN`; existing evidence
links are review starting points, not closure receipts.

Use only these source statuses:

- `OPEN`: incomplete, or complete source evidence has not been reviewed.
- `DRAFTED`: every clause has implementation and independent case source, with
  the receipt below. Execution may still be UNRUN.

Report `DRAFTED / 70` and the open IDs at each checkpoint. Keep verification
separate: `UNRUN`, or dated pass/fail evidence for the exact SHA and scope. Do not
deduce verified behavior from a `DRAFTED` status. Historical results do not
qualify this checkpoint.

Before closing any row, replace its `OPEN` status with a link to a receipt in
this file. A receipt records:

1. Requirement ID, source-review date, commit and covered inventory entries.
2. Concrete implementation paths and symbols; existing code may satisfy them.
3. Applicable language rules, repository rules, CST/meta serialization/reparse,
   private semantic checks, forward JS/strict TS, reverse Rust and synchronization
   paths. For an inapplicable lane, explain why using the inventory; do not omit it.
4. Actual production caller sources, independent positive/edge/refusal case
   paths and CI-only Rust oracle source where behavior needs comparison.
5. Remaining limitations. Any missing clause keeps the row OPEN; runtime limits
   must cover the actual application domain or be an explicit unresolved gap.
6. Execution status, initially UNRUN, and deferred full verification obligations.

No placeholders, preserved opaque bodies, generated API counts, source hashes,
candidate counts or promises to implement later satisfy a row. Behaviorally
matching native library internals may remain untranslated behind an explicit
compatibility contract. Untranslated application behavior remains a gap.

Rows intentionally cross-reference shared dependencies. One implementation may
close several rows if each has evidence; do not implement duplicate machinery
just to satisfy the accounting. No closure requires running code during the
source-only phase. Draft scripts and cases now; execute only when authorized.

## 01 — Physical layout and scope (ledger area 1)

Starting evidence: physical `rust/src`, `js/src`, `ts/src`, the handoff and
[layout/CI policy](javascript-first.md).

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| L01 | OPEN | Record a committed, source-reviewed inventory of production modules/functions, entrypoints, Cargo features and platform variants. Classify tests, generated files, application code and explicitly untranslated dependency internals separately. Retain baseline paths/revision; do not reuse an old function denominator. |
| L02 | OPEN | Assign every production inventory entry to one or more numbered rows and a real implementation/adoption path; list each unresolved construct, binding and feature gap. Draft an inventory reconciliation mechanism so unassigned/new entries cannot silently disappear. |
| L03 | OPEN | Finish layout-aware imports, package/build/publish entrypoints, CLI/tool paths and documentation for all three physical source trees; eliminate active assumptions that application source is root `src`. |
| L04 | OPEN | Declare authored versus generated ownership for all three trees and meta/source assets, generation destinations and overwrite protections; draft stale/missing/wrong-root cases. |
| L05 | OPEN | Draft copied-repository layout/adoption instructions and independent relocation/package/import cases that exercise actual `js/src`, `ts/src`, `rust/src` and translator paths without depending on the original checkout. |

## 02 — Ordered reusable substitution rules (ledger area 2)

Starting evidence: [rule contract](translation-rules.md),
[rule API](translation-rule-api.md) and [compatibility core](compatibility-core.md).

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| R01 | OPEN | Register every application syntax/operation family from L01/L02 in extensible rule tables, using exactly language then repository sequences; each missing registration is assigned, never silently carried. |
| R02 | OPEN | Implement shared language substitutions for inventoried expressions, declarations, control flow and type/ownership/effect constraints, with inverse/refusal source cases; repository spelling cannot grant semantic authority. |
| R03 | OPEN | Implement repository bindings, facade adoption, imports, hygiene, formatting and output conventions for those families, separate from language semantics; include shadowing/ambiguity/conflicting-name cases. |
| R04 | OPEN | Drive applicable forward/reverse registrations, target declarations and bulk caller proposals from shared operation descriptions or source-derived templates; preserve independent oracle expectations and original APIs. |
| R05 | OPEN | Draft complete rule-composition/discovery orchestration and dependency/conflict handling, including nested original-span edits, idempotence, complete inverses and bounded refusal; one rule must not erase another's needed source evidence. |

## 03 — CST and checked meta boundary (ledger area 3)

Starting evidence: [rule API](translation-rule-api.md), committed
`tools/translation/source-profiles/` and `tools/translation/extensions/source-links.mjs`.

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| C01 | OPEN | Carry original Rust source through lossless CST serialization/reparse on every forward lane, retaining tokens/trivia/delimiters/spans and malformed-input refusal. |
| C02 | OPEN | Carry original JS and TS source through the same lossless boundary on every reverse lane, including written type syntax, comments, templates and complete module source. |
| C03 | OPEN | Define/extend checked semantic meta schemas, serializers/reparsers, independent checkers and both interpreters for every new operation; distinguish transported source from semantic authority. |
| C04 | OPEN | Retain genuine private parser/source/type/caller receipts through emission and closing checks; draft stale/forged/mutated/caught-failure cases, with no authority from public flags, names or hashes and no new persistent verdict caches. |
| C05 | OPEN | Draft exact source-inverse and complete canonical reproduction paths for all lanes and composed histories, including mixed Rust/JS/TS source equations and source/export dependency pins. |

## 04 — Application operations and compatibility core (ledger area 4)

Starting evidence: [core contract](compatibility-core.md),
[collection ledger](primitive-collection-synchronization-bulk-draft.md) and
[join adoption](owned-text-vector-kernel-adoption-source-draft.md).

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| O01 | OPEN | Complete inventoried scalar/text/formatting/JSON/codec operations with matching native/JS implementations, strict TS declarations, errors, numeric/Unicode semantics and actual caller mappings. |
| O02 | OPEN | Complete inventoried collection/iterator operations: construction, mutation, lookup/order, nested aggregates, callbacks/captures and borrowed results. Finish genuine native join-kernel routing, preserving ownership and resource behavior. |
| O03 | OPEN | Complete inventoried Option/Result/early-return/Try/error-conversion operations and callback/local/branch/loop composition, retaining evaluation order, move/loan lifetimes and explicit error variants. |
| O04 | OPEN | Complete inventoried shared-state/async/network/HTTP/stream contracts with matching cancellation, ordering, backpressure, termination and error semantics; framework internals may remain behind qualified facades. |
| O05 | OPEN | Complete inventoried filesystem/process/environment/time/platform operations with matching resource lifecycle and failure contracts; list native implementation boundaries and application domains explicitly. |

## 05 — Source binding and namespace closure (ledger area 5)

Starting evidence: [throughput plan](translation-throughput-plan.md),
`router-core-json-updates.mjs` and namespace/producer profiles under `tools/translation/`.

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| B01 | OPEN | Resolve original modules/imports/reexports/aliases/visibility and qualified function/type references across the inventoried source set; preserve ambiguity and shadowing refusals. |
| B02 | OPEN | Resolve actual attributes/cfg/features/platform selections and macro/derive/include producers used by that set, retaining original generated-source provenance rather than guessed expansions. |
| B03 | OPEN | Resolve actual type/trait/impl/method/generic/default-context ownership needed by callers; qualified facade bindings must be joined to their actual implementation and dependency configuration. |
| B04 | OPEN | Close cross-module helper/caller/result/field/constructor relationships, including nonasync and async effects, argument-duration borrows, reference lifetimes and whole-body ownership checks. |
| B05 | OPEN | Draft complete-scope unresolved-binding diagnostics and source/adoption refusal cases; every unresolved producer/owner maps back to L02 instead of blanket namespace admission. |

## 06 — Forward Rust → JS/TS (ledger area 6)

Starting evidence: [throughput plan](translation-throughput-plan.md),
[flat path](flat-output-translation.md) and forward-family modules under `tools/translation/`.

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| F01 | OPEN | Lower all inventoried expressions, statements, branches/loops/matches, returns and helper calls through checked meta to executable JS and strict TS; preserve effects and refusal domains. |
| F02 | OPEN | Lower inventoried records/enums/constructors/fields/generics/traits and aggregate/reference ownership through matching target abstractions, including mutation and drop/resource obligations. |
| F03 | OPEN | Lower inventoried async/state/network/streaming application callers through O04/O05 contracts with complete control flow, cancellation and error paths. |
| F04 | OPEN | Draft complete project-driver/dependency/import/runtime packaging for canonical and neutral/Unix/Windows outputs, owned definitions and all production entrypoints; do not manually patch generated outputs. |
| F05 | OPEN | Provide actual whole-function/module production source cases for all inventoried families plus a future census mechanism distinguishing executable, partial, refused and carried bodies with reasons. |

## 07 — Reverse JS/TS → Rust (ledger area 7)

Starting evidence: reverse owned/canonical lanes under `tools/translation/` and
[collection ledger](primitive-collection-synchronization-bulk-draft.md).

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| V01 | OPEN | Define the editable JS/TS application subset from L01, including JS type witnesses and written TS types; retain dynamic/coercion/unknown-source refusals and useful diagnostics. |
| V02 | OPEN | Map all corresponding scalar/core/collection/error/aggregate operations through checked meta and ownership replay into Rust and strict TS, across every active reverse lane. |
| V03 | OPEN | Map corresponding async/state/network/resource operations and whole production callers back to Rust, with complete dependency/type/import emission and native contracts. |
| V04 | OPEN | Implement both paired-target edit directions, canonical Rust reproduction and JS↔TS projection consistency; distinguish canonical source changes from exact restoration of untouched source/trivia. |
| V05 | OPEN | Draft independent whole-module reverse cases for all inventoried families, including unsupported JS/TS, ownership conflicts, tampered witnesses and roundtrip error/effect preservation. |

## 08 — Synchronization and freshness (ledger area 8)

Starting evidence: synchronization modules under `tools/translation/` and
[flat synchronization](../case-studies/issue-759/current/flat-sync-delivery-772.md).
That case study is historical; current behavior needs its own evidence.

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| S01 | OPEN | Complete actual Rust-edited and JS/TS-edited synchronization entrypoints through CST/meta and both rule sequences; retain authored-source overwrite protections. |
| S02 | OPEN | Complete exact baseline/direction/conflict handling for independent, identical and concurrent differing changes, including paired JS/TS conflicts, renames/deletions and dependency edits. |
| S03 | OPEN | Complete source-reader/closing/failure protocols and bounded atomic installation/rollback/recovery; stale/restored/caught-failure inputs must invalidate private facts and preserve primary errors. |
| S04 | OPEN | Draft deterministic fresh output orchestration for source banks, canonical/platform/owned/reverse assets, runtime/type mirrors, meta and export profiles; no manual expected-hash replacement or stale generated acceptance. |
| S05 | OPEN | Draft end-to-end copied-project edit/sync/second-edit/conflict/recovery cases in both directions and no-op/idempotence checks, without relying on original checkout caches. |

## 09 — Native Router feature parity (ledger area 9)

Starting evidence: actual `rust/src` production modules, `js/src`, `ts/src` and
the historical 441-gap record in [the continuation](issue-759-continuation.md).
That historical gap count is not a current inventory.

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| P01 | OPEN | Map every inventoried CLI/configuration/account/authentication/credential/provider/model-selection operation to matching target behavior and independent production contract cases. |
| P02 | OPEN | Map every inventoried endpoint/routing/proxy/header/protocol/error/stream feature to matching target behavior, including cancellation, termination, ordering and platform variants. |
| P03 | OPEN | Map every inventoried storage/network-token operation, policy/authorization/quota/usage/subscription/lifecycle/state behavior to matching target implementations and failure cases. |
| P04 | OPEN | Map every inventoried client/session/login/process/tunnel/deploy/service/logging/telemetry capability to matching target behavior, explicit external boundaries and platform cases. |
| P05 | OPEN | Reconcile the complete feature/route/entrypoint manifest against L01/L02 and all historical parity gaps; every application gap needs implementation/case source, with no unsupported feature counted as parity. |

## 10 — Independent case source (ledger area 10)

Starting evidence: `tools/translation/test`, `js/test`, `rust/tests`,
and [readonly-helper cases](owned-text-vector-native-readonly-text-source-draft.md).

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| T01 | OPEN | Draft independently expected semantic vectors for every inventoried operation and complete production caller family, shared across JS/TS and native oracle source without generating expectations from implementation tables. |
| T02 | OPEN | Draft boundary/error/refusal vectors for Unicode, numeric limits, malformed input, source identities, stale/forged receipts, coercion, resource caps and unsupported domains. |
| T03 | OPEN | Draft ownership/evaluation-order/lifetime/mutation/branch/loop/callback/alias cases, including later-argument move/restore and nested borrowed results in real callers. |
| T04 | OPEN | Draft async/cancellation/stream/order/state/platform and resource-cleanup cases, including independent real route/CLI/storage contracts and controlled external-service fixtures. |
| T05 | OPEN | Draft complete Node/Bun/strict lockfile TypeScript and CI-only Rust harness coverage mapping, whole-file scheduling, original deadlines/raw evidence and explicit skipped-work accounting. |

## 11 — Deferred failure repair and performance sources (ledger area 11)

Starting evidence: historical failure descriptions in the continuation,
[flat path](flat-output-translation.md), source-history and receiving drafts.
Do not inspect new CI feedback during drafting.

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| Q01 | OPEN | Draft shared-source-history/fixture/native-parser/derive/binding repairs for recorded failure classes and independent regressions; preserve full originals and provenance. |
| Q02 | OPEN | Draft invocation-local allocation/CPU/lifecycle improvements for recorded metadata/retained-storage/source-check bottlenecks; preserve guards and avoid persistent source/owner/verdict caches. |
| Q03 | OPEN | Draft complete actual native join-helper→kernel emission routing through genuine private checked body/caller evidence, plus full-capacity independent cases without reducing original bounds/deadlines. |
| Q04 | OPEN | Draft canonical/platform/owned/reverse/export freshness and strict TypeScript repair paths with complete source equations, original producers and all unchanged commands. |
| Q05 | OPEN | Draft a later complete-cycle failure collector/classifier and repair worklist preserving raw failures and SHA/workloads; newly discovered failures reopen affected rows instead of being hidden or assumed repaired. |

## 12 — JavaScript-first CI (ledger area 12)

Starting evidence: [CI partition contract](parallel-javascript-gate.md),
`.github/workflows` and `scripts/check-js-first-local.mjs`.

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| J01 | OPEN | Account for all eight unchanged JavaScript stage IDs/commands and every original matrix member/profile/engine, preserving fail-fast false, deadlines and raw test evidence. |
| J02 | OPEN | Require success for all JavaScript stages at the same immutable SHA before any Rust job executes; skipped/cancelled/missing work cannot unlock Rust. |
| J03 | OPEN | Keep all required Rust CI checks fatal after the JS gate, with native edge/oracle coverage and explicit skipped-work handling; no local Rust invocation or commit-hook Rust tool. |
| J04 | OPEN | Connect complete forward/reverse/freshness/strict parity/export/receiving and production-case jobs to the original partitions, preserving credentials/platform boundaries and bounded resources. |
| J05 | OPEN | Draft workflow/source-equation/partition audits and positive/negative gate cases for failed/missing/mismatched-SHA JS stages and fatal Rust outcomes; workflow presence alone is not verification. |

## 13 — Reusable delivery and adoption (ledger area 13)

Starting evidence: `scripts/export-router-translator.mjs`,
[reusable guidance](reusable-translation-guidance/README.md) and export source drafts.

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| E01 | OPEN | Include the full compiler/rule/CST/meta/parser/schema/runtime/type/source-profile dependency closure in a standalone export with explicit source provenance and unchanged size/resource limits. |
| E02 | OPEN | Carry upstream reference/pin/license/notice obligations for copied approaches and dependencies; document local changes and distinguish reused source from reimplementation. |
| E03 | OPEN | Draft independent receiving-repository cases that import the full compiler, translate real source in both directions, synchronize edits, and retain semantic/source/failure checks without original checkout access. |
| E04 | OPEN | Draft reusable installation/layout/core-binding/extension/adoption instructions and automation; make repository-specific rules replaceable without weakening reusable language rules. |
| E05 | OPEN | Draft receiving closure/freshness/platform/resource diagnostics and limitations, plus contribution guidance covering layered rules, independent cases, JS-first gating and no unsupported full-sync claim. |

## 14 — Resource, coordination and publication discipline (ledger area 14)

Starting evidence: `AGENTS.md`, [publication policy](bulk-draft-publication.md)
and [handoff](issue-759-handoff.md). Draft completion here concerns durable
guidance/tooling; future compliance and successful runs remain separate evidence.

| ID | Status | Source-draft closure criterion |
| --- | --- | --- |
| D01 | OPEN | Preserve source-only drafting/no experiments/no CI-feedback inspection policy until complete bulk draft, continued prohibition of local tests/compilation until authorized, and no local Rust tools in any phase. |
| D02 | OPEN | Record single coordinator/publisher, no restarted workers, hook disabling for conflicting Rust tools, standing push authorization and coherent checkpoint cadence without weakening JS-first CI. |
| D03 | OPEN | Document bounded disk/memory/time/evidence handling, one heavy workload, no unnecessary dependency trees/clones, precise Router-owned cleanup and preservation of others' active work. |
| D04 | OPEN | Complete checkpoint/handoff/PR templates recording exact source SHA, open IDs, unrun/failed/passed scope, reproduction paths, cleanup and explicit paused/resume status. |
| D05 | OPEN | Define truthful final delivery: all 70 source receipts before draft-complete claim; independently completed coverage/parity/freshness/receiving/performance and same-SHA JS→Rust CI evidence before verified completion or release claims. |

## Work order on a later explicit resume

1. Close L01/L02 by source review first. This is the scope closure blocker:
   without mapping every actual production entry, a fixed list can conceal gaps.
   Review existing sources for receipts before writing replacement machinery.
2. Batch B01–B04, R01–R05 and C01–C05 prerequisites with O01–O03 actual callers.
   Use source occurrence/caller counts only to prioritize, never as coverage.
   Include F/V/S/T/E dependencies in each family draft rather than postponing
   reverse paths or receiving source until after forward-only work.
3. Finish O04/O05, F02/F03, V03 and P01–P05 as complete application families.
   Put native framework internals behind matching facades where appropriate;
   do not attempt wholesale framework translation as a prerequisite.
4. Close remaining project synchronization, packaging, freshness, case, CI,
   performance and delivery source rows. Review all 70 receipts and L02 mapping
   for orphan entries and limitations. Do not start tests merely because the
   checklist document exists or an individual family is drafted.
5. Only after all source rows close, enter the separately authorized verification
   phase. Current local execution prohibitions persist. Collect complete CI
   feedback then; JS must pass before Rust CI. Reopen rows on discovered missing
   implementation. Draft completion never promises verification will pass.

## Scope changes and checkpoint reporting

Keep these 70 IDs stable. Decompose a row into child tasks without counting them
again in the 70-row numerator. Use the L01 inventory for the eventual real
function denominator. If inventory review discovers a requirement outside all
70 criteria, append a numbered requirement with its reason, affected source and
denominator change; do not silently exclude it or rewrite historical counts.
An explicit feature exclusion must remain documented and cannot qualify the
original full-Router objective without user agreement.

At each checkpoint record: `source SHA; DRAFTED N/70; open IDs; inventory
mapped/total or not yet inventoried; new receipts; known gaps; execution UNRUN
or exact evidence; CI not inspected during drafting; next dependency batch`.
Report 14/14 areas partial only as a broad summary, not as 100% draft progress.

## Closure receipts

None recorded at this documentation checkpoint. All 70 rows remain OPEN for
evidence review and missing implementation. Work remains paused; this checklist
and handoff update authorize no automatic implementation or test execution.
