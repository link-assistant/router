# Router development instructions

Implement and verify behavior in JavaScript first. Read [the workflow](docs/development/javascript-first.md) before choosing checks. JavaScript is the development source for the portions covered by the checked-in parity manifest; the current Rust implementation also contains substantial native behavior. Do not claim complete translation or parity while strict checks report missing, partial or carried code.

## Checks and generation

Run the complete local JavaScript gate with `node scripts/check-js-first-local.mjs`. Resolve the full set of failures together, rerun the gate and inspect every stage. Inventory validation alone does not establish parity. Rust verification requires the complete gate, including strict parity, forward translation and reverse regeneration checks, to pass for the current SHA and file contents.

Do not run a full local Cargo build, Clippy run or Rust test suite. Prefer Node and Bun checks. An explicitly needed targeted Rust exception must use `scripts/bounded-rust-build.sh`, a current green gate stamp and its shared target outside every worktree. The wrapper defaults to a plan, limits concurrency, memory, CPU, time and disk, disables debug symbols and incremental artifacts, and refuses insufficient free space. CI verifies broader Rust behavior only after the JavaScript gate.

## Coordination and publication

Workers use isolated worktrees and draft commits only in their own worktrees. Only the designated push gate owner may integrate commits, push a branch or create/update its pull request. The owner checks the entire combined change and collects the entire completed CI failure set before dispatching one coordinated repair batch. Do not push speculative follow-ups, cancel an existing CI run, or bypass a failed JavaScript gate to start Rust.

For issue #759 the user explicitly authorized `gpt-6.1-sol` workers; `/root/push_gate` is the sole push and pull request owner. The user’s initial warning on 2026-10-10 UTC reported about 18 GiB free and 96% used. A later filesystem observation at 2026-10-10 19:58:46 UTC reported about 29 GiB free and 94% used; disk remains constrained, and this change does not lift the no-build instruction. Do not clone more repositories or run local builds. Stream and compress new evidence, keep it below 500 MB, and clean only temporary artifacts created by this task. Do not remove the user's existing root target directory or caches. Recheck disk before any authorized resource-intensive exception.

## Repository conventions

Use the term **links network**, or **network** where context makes it clear, for Router's token structure. Follow the detailed terminology rule in CONTRIBUTING.md in identifiers and all human languages. Keep files below 1000 lines. Preserve the testing tiers, credential requirements and changelog fragment process. Add targeted behavioral tests for changes, preserve public contracts and document limitations without treating unimplemented behavior as complete.
