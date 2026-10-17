# Develop Router behavior in JavaScript first

Use JavaScript to express and test new behavior before changing Rust. This keeps fast feedback independent of compiling the Rust dependency tree. Router already publishes a JavaScript operations package, but that package alone is not a replacement for the complete Rust runtime. The parity manifest records what is generated, ported, partial, carried or missing. A green inventory check means the inventory is consistent; only its strict mode can establish complete parity.

## Draft with focused JavaScript checks

Run complete small Node/Bun test files and strict TypeScript checks while
implementing a batch. Read the corresponding Rust and generated bodies, collect
related failures and fix shared substitution rules before full regeneration.
Use separate reusable language and repository formatting/quality sequences as
described in [the rule-layer contract](translation-rules.md). Add matching Rust
edge-case test source when it defines an independent oracle, and report it as
unrun until CI executes it. Issue #759 prohibits all local Rust tests and builds;
the bounded exception below does not override this instruction. CI may execute
Rust only after every required JavaScript stage passes for the same SHA.

Keep a requirement-to-change-and-check record for the complete requested batch,
including unresolved gaps. While remote CI runs, continue source review and
independent drafting in assigned worktrees under the single-workload policy.
Preserve the published head, wait for all CI results and then integrate the
complete repair batch. Record upstream defects with exact versions, a minimal
reproduction, full failed output and any workaround before the designated owner
publishes an authorized report.

Compare reported case durations with their declared deadlines. Synchronous
Node tests can block timeout callbacks and still report a pass after a deadline
breach; a zero exit code does not qualify that case's performance. Retain the
complete report and fix the shared implementation without filtering tests,
raising limits or moving the original workload outside the case. A separately
bounded diagnostic is not the original test. Keep failed comparisons, source
differences, shared warmup and retained-context memory costs explicit; none
establishes a measured speed gain.

## Run the complete gate before Rust

Install the checked-in JavaScript package dependencies with `npm ci --prefix packages/javascript`. Node 20 or newer is required; install Bun for the native Bun test stage. Run `node scripts/check-js-first-local.mjs --stamp /tmp/router-js-first-gate.json` from the repository root. This orchestrates the actual repository lint, native Node and Bun tests, TypeScript checks, strict parity, forward translation checks and reverse regeneration checks. It writes a green stamp only after all stages succeed and the SHA and file contents remain unchanged. A current strict parity failure is a reason to finish the missing implementation, not to downgrade the gate.

Useful individual diagnostics are `node --test scripts/test/*.test.mjs`, `npm run native:test --prefix packages/javascript`, `npm run native:test:bun --prefix packages/javascript`, `npm run typecheck --prefix packages/javascript`, `node scripts/check-router-parity.mjs`, `node scripts/check-router-parity.mjs --strict`, `node scripts/translate-router.mjs --check`, `node scripts/regenerate-js-first.mjs --check` and `node scripts/check-js-first-workflows.mjs`. Individual diagnostics do not replace the complete gate. The broader package `npm test` command can exercise the Rust-backed integration surface. Use the native commands above for local JavaScript diagnostics; issue #759 prohibits local Rust execution.

Forward translation currently runs Rust → meta-language → JavaScript for the declared subset; reverse regeneration runs JavaScript → meta-language → Rust/TypeScript definitions. These limited paths do not yet generate the complete Router runtime. Forward generation must be deterministic and check mode must compare expected outputs with checked-in outputs without updating them. Reverse generation must operate on its declared JavaScript subset and record unsupported constructs as failures or explicit manifest limitations. Generated changes belong in the same review as source changes. Preserve hand-written native implementations until their behavior is covered by shared fixtures and the complete parity check.

Forward behavioral fixtures independently compile emitted TypeScript with the installed repository compiler, executing its complete strict CLI in the current Node or Bun engine. `ROUTER_TRANSLATION_TSC` remains an explicit mandatory override. Standalone bundles without repository dependencies retain the ambient `tsc` fallback; record the actual compiler version when comparing their observations. Compiler selection does not extend a test deadline or certify full parity.

Reverse regeneration also [bulk drafts independently checked native bodies](native-portable-body-drafts.md). Complete top-level and scoped lexical censuses retain every source span and refusal separately. Every module's checked program is serialized and reparsed before emitting TypeScript and uncompiled Rust projections; refused enclosing owners remain refused. The emitted TypeScript joins the existing strict native compilation.

The reverse stage runs every `tools/translation/js-to-rust/test/*.test.mjs` under Node with two test workers and under Bun before checking regeneration. CI installs pinned Bun 1.4.3 for this stage. New compiler test files are automatically included; the workflow audit rejects selecting only the legacy translator suite, filtering tests or ignoring an engine failure. The TypeScript stage retains its independent native TypeScript tests.

Generate the independent neutral, Unix-family and Windows-family outputs with `node scripts/translate-router.mjs --profile-matrix`. Every member translates the complete tracked Rust corpus into its own six output trees and inventory under `profiles/`. All member plans and output paths are validated before writing; canonical outputs keep their separate paths. The manifest records original Rust/Cargo inputs, compiler fingerprints, profile identities and retained refusals. These three explicit profiles have incomplete platform and feature coverage; complete runtime parity remains unproved.

Add `--progress` to canonical or `--profile-matrix` translation commands to write newline-delimited JSON diagnostics to stderr. Each bounded scalar record identifies the stage and monotonic elapsed milliseconds; source text and private proofs are omitted. Source-generated Default and Clone stages identify every original module before its generator work begins. Stdout and generated bytes are unchanged by the flag for the same compiler. The library APIs also accept an optional `progress(record)` callback. A callback error propagates before any regeneration-plan artifacts are written; it does not grant admission or change a refused item.

After generation, run `node scripts/review-translation-draft.mjs --baseline FULL_PREVIOUS_SHA --output /tmp/router-draft-review.json` to record the complete original Rust/Cargo and compiler input hashes, every generated output, item gains and losses, project methods and refusal categories. The baseline must contain the same original Rust/Cargo bytes; changed source, stale compiler hashes, incomplete discovery, forged item/count metadata and linked or escaping outputs are rejected. Use `--inventory profiles/PROFILE/parity/rust-source-inventory.json` to review a matrix member independently. Reports preserve `runtimeParity: false` and cannot replace behavioral checks or the complete gate. Existing report paths are never overwritten.

Both gates also check the original-source native affinity descriptor and the source-discovered serialization registry with `node tools/translation/serialization-schema/native-descriptor.mjs --check` and `node tools/translation/serialization-schema/bulk.mjs --check`, and compile both emitted TypeScript descriptors with their dedicated `check-descriptor-typescript.mjs` and `check-bulk-typescript.mjs` scripts. Forward test discovery includes `tools/translation/serialization-schema/*.test.mjs` alongside every existing compiler fixture. The current registry supports 88 bounded layouts and retains 453 refusals and 134 exclusions; these data descriptors do not lower complete serde trait bodies or establish runtime parity. After changing the original dependency source profiles, regenerate both registries with their explicit `--write` commands and retain the complete artifact comparison; check mode remains mandatory.

Both the local gate and CI require `node scripts/translate-router.mjs --profile-matrix --check` for deterministic profile freshness and `node scripts/check-profile-typescript.mjs` for independent strict TypeScript compilation. Canonical freshness and strict native parity remain separate mandatory commands. CI uses separate unconditional translation and profile-matrix jobs, each with a finite 60-minute limit and the same immutable SHA. The aggregate requires all eight CI stages to succeed; the local gate keeps its seven stages and every mandatory command. Cycle nine completed forward/canonical steps reached 719/752 seconds and matrix checks reached 2166 seconds; six combined translation jobs were interrupted at their 60-minute limit. These step intervals do not establish CPU or infrastructure causes.

The strict checker retains each native evidence runner’s 180-second bound and gives its complete canonical comparison 1200 seconds after seven embedded 600-second checks timed out. Acceptance executes three sequential complete checkers before CI runs a fourth. Each outer checker deadline includes all distinct cached test files in the current manifest and 180 seconds for inventory and fixture overhead. CI parity has a finite 240-minute limit, checked structurally against the four complete bounds plus 1200 seconds for other acceptance and 120 seconds for setup. A new evidence file increases each checker bound; the workflow audit rejects an insufficient enclosing limit. Genuine parity failures remain mandatory.

The complete compiler Node cohorts also require the [independent source-declared case deadline audit](node-case-deadlines.md). A synchronous Node pass after its declared timeout remains a failed duration qualification; preserve full TAP, source joins, raw receipts and the original limits. Its nine core controls and complete seven-case local and 23-case workflow integration suites passed receiving checks under both Node and Bun. This focused qualification does not establish that every compiler cohort, the full gate or CI has passed.

## Integrate one repair batch per completed CI cycle

During active issue #759 development, create reviewable checkpoint commits at
least once every six hours. Commit coherent source batches while larger
translation, generation or parity obligations remain open, and record passed,
failed and unrun checks. Workers commit in their assigned worktrees and the
coordinator integrates completed changes. This cadence preserves the publication
gate below and the same-commit JavaScript-first requirements for Rust CI.

Assign work to isolated worktrees, keep ownership explicit and send draft commits to one push gate owner. The owner integrates the complete batch, runs the full JavaScript gate, reviews generated diffs and publishes one tested head. Leave running CI intact. After CI finishes, collect failures from every required job, separate code defects from infrastructure or missing evidence, repair the complete failure set and rerun the gate before the next push. Repeated pushes while checks are still running obscure which head was verified and spend additional runner time.

For active issue #759, the user has given standing authorization for the designated push owner to push the coordinated repair batch and update its draft pull request without another approval request. Wait for the published head's entire CI cycle to finish, collect and handle every failure, and then publish the reviewed fixes promptly for fresh feedback. This authorization preserves the single publisher, honest failed/unrun evidence and same-SHA JavaScript gate before Rust execution.

Every CI job capable of compiling Rust must depend on the JavaScript gate. It must check the current head and strict parity, not accept an inventory-only result or a stamp from another SHA. Workflow structure checks guard bypass paths; they complement the behavioral tests. Publication belongs to the push gate owner, including PR updates. Preserve draft or blocked status when complete parity is unavailable.

## Keep local Rust exceptions bounded

Full local `cargo build`, `cargo test` and `cargo clippy --all-targets --all-features` are not the development default. Use CI after the complete JavaScript gate for broad Rust verification. For an explicitly necessary targeted exception, preview `bash scripts/bounded-rust-build.sh -- check --lib`. Execute only after a green current stamp with `bash scripts/bounded-rust-build.sh --execute --gate-stamp /tmp/router-js-first-gate.json -- check --lib`. A named integration target is also supported; library tests require a specific test filter.

The wrapper shares a locked target directory under the system temporary directory across worktrees, rejects targets inside any worktree, defaults to two Cargo jobs, turns off debug symbols and incremental compilation, and enforces a 600-second wall limit, a 300-second per-process CPU limit, 2 GiB aggregate sampled RSS (lowered for cgroup memory and CPU availability) and an 8 GiB target budget. It also reserves 8 GiB free space and stops if free space falls below the reserve. Sampling every 0.5 seconds can miss transient peaks; the disk check bounds observed file sizes, not filesystem allocation. Environment variables named in the wrapper can lower these limits; the free-space reserve can be raised. It never deletes caches. Review cleanup of shared artifacts separately. Explicit user authorization may permit removing identified existing build directories or caches regardless of artifact age; record reclaimed space and leave other paths intact. Never remove another worker's active build directory or lock. Cleanup does not authorize a new local Rust build.

Issue #759 is currently under an explicit no-local-build constraint because disk is nearly full. The wrapper's existence does not authorize a build during this task.

Local pre-commit hooks must not invoke Rust or automatically clean caches. Keep
source formatting, Clippy and Rust tests in gated CI. Commit-time syntax checks
provide quick diagnostics; they do not replace the complete JavaScript gate.
Disabling a conflicting local hook does not waive Rust verification. After the
same-commit JavaScript gate passes, Rust failures must fail CI; gated jobs and
steps must not hide them with `continue-on-error`. The workflow audit checks
this requirement independently of the developer's installed hooks.

## Measure archived cycles without inventing resource data

Use [the complete evidence packer](../../tools/evidence/README.md) to capture full failed and passed streams, input vectors, executed harnesses and source/report snapshots in a reusable XZ/TAR packet. Every selected original has a pinned length and SHA256, and every archive member is reopened and verified. Original sources and earlier packets remain intact; install the finished packet only within the task's fixed evidence allocation. Storage receipts never authorize semantic admission, Rust verification or publication.

Run `node scripts/measure-js-first.mjs docs/case-studies/issue-759/raw --output /tmp/router-js-first-measurements.json` over archived GitHub JSON. The command reads files without network access. It supports REST workflow run/job responses, gh run JSON and PR metadata, deduplicates observed run attempts, and totals job execution seconds only when valid start/end times exist. It records input paths and warns about missing jobs, timestamps and synchronize events.

The tool also accepts `.json.gz` archives using streamed decompression and streamed top-level arrays, a 32 MiB character bound per JSON value and a 512 MiB decoded expansion bound per file. First fully green latency stays null without a declared required-workflow set and complete same-head coverage; per-workflow first success requires an exact completion timestamp and is labeled separately. Cumulative execution seconds include parallel jobs and are neither elapsed feedback time nor billed minutes. Unique CI heads are a proxy rather than a push count; archived synchronize events provide stronger but still potentially incomplete evidence. Latest-attempt APIs do not reconstruct omitted prior attempts. RSS, target disk, billed minutes and monetary cost remain null without actual telemetry. Supply explicit `resourceSamples` objects with `peakRssBytes` and `peakTargetDiskBytes` from bounded executions when available, retaining collection method and sampling interval. Do not treat missing observations as zero or publish savings from incomparable workloads.

The [reusable standard bundle](../case-studies/issue-759/standard/README.md) contains policy, workflow and parity checker templates with synthetic fixtures. Adapt its placeholders to real repository commands and preserve the same strict gating contract. The newer [reusable translation guidance](reusable-translation-guidance/README.md) adds the layered translation, stricter-user, resource and coordinated publication requirements. Its pinned patch remains outside the case study and has not been applied to the archived standard templates; copy and qualify this guidance separately from the compiler export.

The explicit definition-only connector uses `node scripts/translate-router.mjs --retain-output-text --owned-core-definitions` and the same command with `--profile-matrix`. It runs the normal complete project and standalone pipeline, keeps its main artifacts and refusal inventories, and additionally materializes qualifying checked declarations under `rust-owned-definitions` for JavaScript and TypeScript. Per-project runtime trees keep their actual imports; complete source/CST/substitution/inverse evidence is stored as bounded, losslessly compressed packets. The matching four producer modules must come from the actual reviewed output of `node tools/translation/prepare-owned-definition-bulk.mjs --emit`; verify their freshness with `--check`. Do not hand-edit those generated modules.

After reviewing and installing the actual canonical and all three profile outputs, run `node scripts/regenerate-js-first.mjs --owned-core-definitions --write` and then add `--profile-matrix` for the independent profile reverse outputs. These definitions undergo independent discovery of their complete TypeScript counterparts and the normal checked source-document reconstruction. A packet, name, index or written type does not supply semantic authority. Physical Rust originals are counted separately from project occurrences and witnesses; a translated definition does not establish equivalent parent-module startup, imports or complete crate behavior.

The same immutable source commit must pass all existing checks plus `node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --check`, its `--profile-matrix` variant, `node scripts/regenerate-js-first.mjs --owned-core-definitions --check`, its `--profile-matrix` variant, and `node scripts/check-owned-definition-typescript.mjs`. The last command strictly checks actual `.mts` and `.ts` forward and reverse files in the canonical and all declared profile trees with the lockfile-installed TypeScript 5.9.3; the ordinary profile checker remains required. CI requires these commands in its existing unconditional same-SHA stages, and the complete local gate runs them too. Missing sidecars do not turn these checks into a no-op.

New task-owned observed evidence, including pending files, terminal streams and failures, has a 384 MiB monitor limit below the fixed 500,000,000-byte allocation. Preserve complete bytes with streaming compression and verified recovery before retiring only this task's terminal raw duplicates. Existing compiler, test, profile-plan, aggregate memory and job deadlines remain unchanged. Source readiness does not establish successful materialization: actual generation, independent artifact review, installation, freshness and the full same-SHA gate remain mandatory. These steps are unqualified until executed on the integrated sources.
