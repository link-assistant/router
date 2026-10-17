# Contributing to meta-language

This repository contains the Rust core for a self-describing meta language over
a links network. Contributions should keep the public API small, tested, and
aligned with the issue requirements.

[`docs/vision.md`](docs/vision.md) is the authoritative vision and architecture
specification. Read it before changing the grammar, parsing, semantics,
translation, dependency or acceptance code: a change that contradicts it must
update the vision in the same pull request rather than add a competing
description elsewhere. Requirements come from the sources registered in
[`parity/issue-195-sources.json`](parity/issue-195-sources.json) and are tracked
row by row in [`parity/issue-195-requirements.json`](parity/issue-195-requirements.json);
see [AGENTS.md](AGENTS.md) for the rules that automated contributors follow.

## Development Setup

1. Install Rust with `rustup`.
2. Install the standard tooling:

   ```bash
   rustup component add rustfmt clippy
   cargo install rust-script
   ```

3. Install the repository's git hooks. The pre-commit hook cleans the
   regenerable caches of this worktree on every commit, including
   documentation-only commits, and still runs a hook that `pre-commit install`
   wrote (see [docs/cache-cleanup.md](docs/cache-cleanup.md)):

   ```bash
   node scripts/install-dev-hooks.mjs
   node scripts/install-dev-hooks.mjs --check
   ```

4. Build and test. Long builds and test runs can go through the cleanup
   wrapper, which bounds their parallelism and cleans up afterwards even when
   they fail or are interrupted:

   ```bash
   cd rust
   export CARGO_BUILD_JOBS=2 RUST_TEST_THREADS=2 CARGO_INCREMENTAL=0
   node ../scripts/with-cache-cleanup.mjs --event test -- cargo check --all-targets --all-features
   node ../scripts/with-cache-cleanup.mjs --event test -- cargo test --test unit <filter>
   ```

   `node scripts/clean-caches.mjs` prunes the caches to the disk budget at any
   time, and `node scripts/clean-caches.mjs --full` removes all of them.

## Code Standards

- Model structural data as links and references to links.
- Keep external parser terminology at API boundaries and translate it into the
  links-network model internally.
- Prefer explicit metadata links or typed metadata over side tables.
- Add focused tests for each new behavior.
- Keep Rust tests under `tests/`; CI rejects `#[test]`, `#[cfg(test)]`, and
  `mod tests` markers under `src/`.
- Use Rust documentation comments for public APIs.
- Keep generated experiments in `experiments/` and real usage examples in
  `examples/`.

## Local Checks

Run the targeted checks for the change before pushing (see
[AGENTS.md](AGENTS.md#local-checks-and-resources) for what not to run
locally); CI runs the full suites:

```bash
cargo fmt --check
CARGO_BUILD_JOBS=2 CARGO_INCREMENTAL=0 cargo check --all-targets --all-features
RUST_TEST_THREADS=2 cargo test --test unit <filter>
RUST_TEST_THREADS=2 cargo test --test integration <filter>
(cd ../js && node --test tests/<area>*.test.js)
rust-script scripts/check-no-src-tests.rs
rust-script scripts/check-file-size.rs
rust-script scripts/check-crate-size.rs
```

The issue #195 delivery diagnostics can also inspect live merge enforcement
and reject stale delivered dependencies. Pull request CI runs only the offline
checks; the live merge-enforcement report and `--live` registry comparison run
on `main` as non-blocking post-merge reports:

```bash
cd js
npm run check:issue-195:merge-enforcement
npm run check:dependencies:delivery
```

The dependency delivery check is separate from inventory integrity: a recorded
compatibility reason explains a stale pin but does not verify its upgrade.
The delivery check also needs the `package-lock.json` of a clean installed
candidate, supplied with `-- --consumer-lock /path/to/consumer/package-lock.json`.
It checks the dependency versions that the installed package resolves,
including nested copies; repository overrides alone do not establish delivery.
An item behind its current stable release passes only at its newest compatible
release, with the holders recorded by `npm run dependencies:refresh`. Each
holder must itself be delivered, and an external holder must be at its newest
release.
`-- --live` also refreshes the audit from the registries in memory, using `gh`
and `cargo`. It fails when the recorded audit is outdated or the registries
cannot be reached. Live mode is the default when `CI` or `ACCEPTANCE_CHECKPOINT`
is set, and `-- --offline` turns it off. The clean-consumer acceptance job runs
the live check against the lockfile of the installed npm artifact.

[`js/tests/issue-195-acceptance-gate-mutations.test.js`](js/tests/issue-195-acceptance-gate-mutations.test.js)
mutates the artifact behind each gate the vision lists under gate-mutation
tests and observes that gate fail, while the unmutated artifact passes it. A
change that weakens one of those gates fails that test. The proof obligation
and conformance oracle gates are
[`js/scripts/issue-195-proof-obligations.mjs`](js/scripts/issue-195-proof-obligations.mjs)
and [`js/scripts/issue-195-oracle-mapping.mjs`](js/scripts/issue-195-oracle-mapping.mjs).

## Development Order

Work JavaScript first: draft and debug a whole batch of changes in JavaScript,
then port the batch to Rust, by self-translation wherever the translator can do
it. Grammars come from the automated pipeline, in bulk over every catalog
language. Extend behavior through decorators stored as shared links data, not
through special cases in host code. Make bulk changes and push once per batch.
See [AGENTS.md](AGENTS.md#development-order) for the full rules.

## CI Order and Failure Reporting

The Rust workflow runs only after every JavaScript job passes.
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) calls `js.yml` first,
then `rust.yml`, which needs it. When JavaScript fails, the Rust jobs show as
skipped rather than failed. `js.yml` and `rust.yml` have
no push or pull request triggers of their own; they still run standalone for a
release or a manual dispatch. The issue #195 acceptance workflow follows the
same order: `native-rust` needs `native-javascript`, and `rust-suite` needs
`javascript-suite`.

Each job reports every failure in one run, not just the first:

- `cargo test` always runs with `--no-fail-fast`, in the workflows and in the
  scripts they call.
- Every check or test step after a job's first check has
  `if: ${{ !cancelled() }}`. Setup and publish steps keep the default, so they
  still stop at a failure.
- `cargo fmt`, `cargo clippy` and `cargo doc` run as separate steps.

[`js/tests/ci-workflow-structure.test.js`](js/tests/ci-workflow-structure.test.js)
enforces this order and these rules.

## Changelog

User-facing changes need a fragment in `changelog.d/`:

```markdown
---
bump: minor
---

### Added
- Short description of the change.
```

Use `major` for incompatible API changes, `minor` for new backward-compatible
features, and `patch` for fixes.
