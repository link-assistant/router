Router now defaults routed geolocation headers to removal and requires explicit per-request consent before forwarding supported location metadata. It also hardens the existing client privacy defaults and documents the limits of those controls. This draft remains unfinished: universal tool/account privacy and the complete JavaScript-first parity requirements have not been verified.

Fixes #784

## Behavior and reproduction

Before this change, clients could forward geolocation and ingress network metadata without an explicit location-sharing request. The Router request path now parses and validates the consent control, strips it before upstream forwarding, rejects ambiguous values, and removes location and ingress network headers by default. The explicit location opt-in does not authorize forwarding ingress identity headers. Provider-specific, retry, streaming, management, and persisted-policy routes retain regression coverage. Client configuration and documentation distinguish routed request controls from direct vendor traffic, account settings, source-IP visibility, OAuth, MCP, telemetry and retention.

This does not establish a universal vendor/account geolocation guarantee. The remaining acceptance inventory and investigation are in [the case study](docs/case-studies/issue-784/README.md). No required sub-issues were identified. No existing feature was intentionally removed.

## Current coordinated repair batch

Published head `82bff66b3eaec603e296f1d888fe909dad4743c8` was tested as merge `a3154a334b5fd6916b1f1c5c9d114bed665fefc4`. [Run 42895668515](https://github.com/link-assistant/router/actions/runs/42895668515) finished at 2026-11-10 21:51:29 UTC: 20 failed, nine cancelled, 21 successful and 25 skipped jobs. All applicable workflows are terminal. Every available nonpassing log and all 41 complete artifacts were read and retained before this next batch. Forward bin 9 has a retained GitHub 404 BlobNotFound evidence gap after direct and CLI fallback attempts; this is not grounds to skip a check. No run was cancelled by this task. The [complete terminal review](docs/case-studies/issue-784/ci-82b-terminal-20261110.md) records every failure, original bounds and complete evidence custody.

The reviewed source batch through `73b2b85e7d1380a71958402db749ed80a4d775a7`:

- Uses the existing private source-origin CST transport for complete project source batches. Both independent CST builds, serialization/reparsing, original bounds, reconstruction and semantic checks remain required. Complete-production candidate-first ABBA outputs match across 397 modules and 419 certificates; mean time falls from 36491.233 to 30176.567 ms, a measured 17.3% decrease. The 12-case focused cohort passes in both engines. The broader 40-case Node cohort retains one original deadline failure; broader Bun is unrun. [Complete evidence](docs/case-studies/issue-784/project-source-origin-cst.md).
- Shares a fresh TypeScript program across separately scoped complete runtime-source modules during source preparation. The final seven-case cohort passes in both engines and passes the independent Node deadline audit. A separate common-guard runtime candidate fails Bun and is withdrawn; all original generated sources and receiving tests are restored exactly and its complete negative evidence is retained. [Scope and qualification](docs/case-studies/issue-784/runtime-common-guard-negative.md).
- Reproduces and installs the actual selected-Git compiler registration: all 1936 complete sources, six original bootstrap substitutions, full predecessor history and 493 genuine Git objects. Both original receiving files pass all 16 cases in Node and Bun within unchanged deadlines. [Registration evidence](docs/case-studies/issue-784/current-runtime-binding-registration.md).
- Preserves all failed and passed evidence. Identified inactive duplicates are retired only after complete immutable Git or archive readback and process/inode checks, with exact custody and reclaimed-space receipts.

The earlier exhaustive sixteen-bin Node/eight-bin Bun isolation and all original tests remain mandatory. The latest canonical packet contains 2873 complete nested outputs, 320408245 decoded bytes. Its compiler input is stale against this batch; its outputs are not installed. This source batch adds zero newly executable application functions. The latest strict inventory still has 441 draft parity gaps and 12426 carried Rust items.

## Validation and limitations

Lockfile-installed TypeScript is **5.9.3**, Node **20.20.2**, local Bun **1.4.4**; CI pins Bun 1.4.3. Strictness, complete original test files, case/child/job deadlines and raw compiler source bounds remain unchanged.

- Current registration: all 16 original cases pass in each engine, with complete independent source/deadline evidence.
- Final runtime source-preparer cohort: all seven cases pass in Node and Bun; the original history case takes 51626.710/60000 ms in Node and 54836.44/60000 ms in Bun.
- Latest whole local gate at `73b2b85e7d1380a71958402db749ed80a4d775a7`: all ten lint commands, 259 native Node cases, deadline-auditor controls, declarations, native freshness and strict compilation of 167 native TypeScript files pass.
- The original Bun native suite fails three persistence cases, including two unchanged 5000 ms deadlines. The original nine-case native TypeScript file completes all assertions but its regeneration case takes **69340.814828/60000 ms**, failing the independent deadline audit. Its compiled runtime suite separately passes Node and Bun.
- The memory observer stops and reaps the owned gate during parity acceptance after 104 assertions, at **2867978240 bytes** in this **3135369216-byte** container. Nine later TypeScript commands, strict parity and all forward/reverse checks are unrun in this attempt. [Complete gate evidence](docs/case-studies/issue-784/current-runtime-binding-full-gate.md). No complete green gate is claimed.

**Still required:** fresh same-SHA green CI and complete local gate; genuine current canonical/owned/profile generation and strict compilation; owned reverse freshness; strict parity and every original case/child/job deadline; raw private compiler source bound; universal tool/account privacy acceptance. Finished CI still reports 441 draft parity gaps and one validation error, missing owned matrix input, stale inventory, original long-running compiler cases and job cancellations. Pre-existing main failures remain mandatory. No missing secret or human access requirement was identified; no credential skip or manual-action workaround was introduced. Rust remains gated until every JavaScript stage passes for the same SHA. No Rust tool runs locally.

Main `eb2dad1c0a18394dc1aad46413e11401e74eb502` was freshly fetched and is already an ancestor. The issue has no comments or required sub-issues. All seven PR conversation comments, zero inline comments and zero reviews were refreshed and read. GitHub's PR diff endpoint refuses this change set because it exceeds 300 files; local diffs are used for review. The PR remains draft and unmerged. This feedback checkpoint establishes no completion or release readiness.
