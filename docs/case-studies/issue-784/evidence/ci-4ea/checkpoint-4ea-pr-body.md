Router now defaults routed geolocation headers to removal and requires explicit per-request consent before forwarding supported location metadata. It also hardens the existing client privacy defaults and documents the limits of those controls. This draft remains unfinished: universal tool/account privacy and the complete JavaScript-first parity requirements have not been verified.

Fixes #784

## Behavior and reproduction

Before this change, clients could forward geolocation and ingress network metadata without an explicit location-sharing request. The Router request path now parses and validates the consent control, strips it before upstream forwarding, rejects ambiguous values, and removes location and ingress network headers by default. The explicit location opt-in does not authorize forwarding ingress identity headers. Provider-specific, retry, streaming, management, and persisted-policy routes retain regression coverage. Client configuration and documentation distinguish routed request controls from direct vendor traffic, account settings, source-IP visibility, OAuth, MCP, telemetry and retention.

This does not establish a universal vendor/account geolocation guarantee. The remaining acceptance inventory and investigation are in [the case study](docs/case-studies/issue-784/README.md). No required sub-issues were identified. No existing feature was intentionally removed.

## Current coordinated repair batch

The complete previous cycle is [run 42849964395](https://github.com/link-assistant/router/actions/runs/42849964395), published head `a598d2b01b5a8e47bbf6bb5a8f90b317d90ce5de`, tested merge `36bae8efffda560e89b2003648e8beaecc7c4143`. All 59 jobs completed; all 24 nonpassing job logs and all 26 complete artifact ZIPs were collected and inspected before this next push. This task did not cancel a run. The [terminal review](docs/case-studies/issue-784/ci-a598-terminal-20261110.md) records each failure with original log lines, full deadline audits and byte custody. Intentional nested auditor failures are negative controls, not stage regressions.

The batch through `4ea091242db0a51a07415c8c04a23a6db0b8c04b`:

- Repairs the Schemars candidate's outdated edit-count assertion by checking the complete Clone source composition, inverse, source hashes and CST boundaries.
- Preserves all five nullable cases and four complete parent sources while batching fresh analyses and strict ES2022 checks with library checking retained and original deadlines unchanged.
- Joins complete original operation and Default prerequisite source histories, including their historical pins, native measurement substitutions, full inverse/CST equations and refusal controls.
- Refreshes the 20 stale canonical outputs from the complete actual CI producer. Every output byte and the complete Rust/Cargo/compiler/profile/TypeScript input vector were checked; full physical input captures before and after installation match. No generated output was manually edited.
- Retains a finite complete base64 CPU diagnostic and all original CI evidence. That diagnostic establishes no production speedup. Only inactive task-owned redundant copies already preserved in immutable Git were retired, with custody and reclaimed-space receipts.

The actual new canonical inventory has 162 executable top-level production functions out of 2578, with 2416 carried production functions. Compared with the old checked-in inventory this adds four functions; the preceding CI artifact already reported the same 162. The 165-function overall total includes test sources. Inventory counts establish neither complete behavioral parity nor deadline qualification.

## Validation and limitations

Focused checks preserve whole files, strictness and original deadlines:

- Schemars: six cases pass in both Node and Bun.
- Nullable: five cases pass in both engines; four failed local drafts remain retained.
- Operation history: two cases pass in both engines.
- Default prerequisite history: three cases pass in both engines; the original and intermediate complete failures remain retained.
- Refreshed generated outputs: both complete original reconstruction/recorded-gain files pass 55 Node cases, with the independent deadline audit passing and no skips.
- Installed TypeScript **5.9.3** strictly compiles the complete original generated-output configuration.

The focused output checks ran on the complete physical source batch based at `6ace572ba53f048b4fca77c5133694c24020470e`; those exact output bytes are now committed. They are not a same-SHA complete gate result for `4ea091242db0a51a07415c8c04a23a6db0b8c04b`.

**Failed/incomplete:** the full independent semantic reviewer hit the unchanged container memory guard after 14.23 seconds, and its missing result remains unqualified. The latest complete local gate attempt at `619e356569fdafd369d9f1fad41766f86041d59c` passed lint, both 259-case native suites and the initial strict TypeScript stages, then hit the memory guard during the original complete native TypeScript file. Its later TypeScript commands, strict parity, forward and reverse stages were unrun. The [full gate report](docs/case-studies/issue-784/current-619e-complete-gate.md) records that exact boundary.

**Still required:** fresh same-SHA green CI and the complete local gate; complete independent semantic review and canonical regeneration; genuine complete owned/profile matrices and reverse-owned freshness; strict parity and all original test/child/job deadlines; the issue's universal tool/account privacy acceptance criteria. The complete preceding CI cycle failed these requirements, including failures already present on main. No missing secret or manual access was identified, so no credential-dependent skip or manual-action workaround was introduced. Rust remains gated behind every required JavaScript stage for the same SHA. No Rust tool ran locally.

Latest fetched `main` is `eb2dad1c0a18394dc1aad46413e11401e74eb502` and is already an ancestor of this branch. Fresh issue comments, PR conversation comments, inline comments and reviews are unchanged. The PR remains draft and unmerged; this feedback checkpoint does not establish completion or release readiness.
