# Rust CI repairs after manual-lane admission (2026-11-13)

The [2026-11-13 maintainer instruction](https://github.com/link-assistant/router/pull/785#issuecomment-6864697228)
asks for automated translation checks to be skipped temporarily (kept in code),
manual changes to be finished, and every CI/CD check to pass. Since commit
`569e64124`, the [manual development lane](manual-development-20261111.md)
lets same-SHA Rust CI run once all four active JavaScript stages pass. That
was the first time this branch's Rust jobs actually ran. They found problems
that had built up while Rust CI was blocked, most of them already present on
`main`. AGENTS.md forbids local Rust tools, so CI logs were the only Rust
evidence for every repair below.

## Findings and repairs

| CI finding (run, job) | Root cause | Repair | Commit |
| --- | --- | --- | --- |
| `cargo fmt --check`: 471 hunks in 142 files (run 43510353675) | Rust sources edited while Rust CI was blocked were never formatted | [`experiments/issue-784/apply-rustfmt-check-log.mjs`](../../../experiments/issue-784/apply-rustfmt-check-log.mjs) replays the CI diff exactly. Context and removed lines are checked against the local file, and secret-masked `***` values are matched and restored. Any mismatch aborts. Result: 471/471 hunks applied; the formatting step passes in run 43512061296 | `a90a2c5e7` |
| Changelog Fragment Check: 993 pending fragments > 40 | Releases have been blocked since `v1.24.1` (2026-10-10) because the default branch was red. The guard could not tell this apart from the issue #337 defect (a release that does not remove what it collected) | The guard now compares pending fragments with the latest reachable release tag. Survivors fail the check; fragments that are only new produce a warning. Unit tests are included, and the behaviour is documented in `changelog.d/README.md`. Local simulation: 0 of the 993 pending fragments existed at `v1.24.1`. Passes in run 43512410015 (job 132190478251) | `f837b8f27` |
| Dependency Audit: 31 RustSec findings | `Cargo.lock` pinned vulnerable `rustls`, `rustls-webpki`, `quinn-proto`, `tokio`, `zstd`, `rustix` and others | Twelve lock entries moved to fixed releases, with crates.io index checksums. RUSTSEC-2026-0387 (`crypto-bigint` 0.5, which has no compatible fix) is ignored with a justification: every router JWT key is an HMAC secret | `f8556a8d5`, `478eab270` |
| `cargo check` (lib): `INGRESS_NETWORK_HEADERS` not found | This PR's account override filter (`account_routing_policy.rs`) uses a re-export that is gated by `#[cfg(test)]` | The re-export is now unconditional | `7c79251a4` |
| `cargo check` (lib test): 19 errors | (a) generated fixture tests `provider_model_id` / `weighted_capacity` shadow the functions they call; (b) `deploy_seed_tests.rs` never imported `json!`; (c) seven unused `serde_json` imports, all present on `main` | (a) `scripts/regenerate-js-first.mjs` now calls fixture functions through `super::`, and `policy.rs` plus its manifest hash were updated the same way (the generator itself is under the suspended translation lane and fails before writing; see below); (b) import added; (c) imports removed | `7c79251a4` |
| `cargo fmt --check`: two hunks (run 43514108981, job 132194104826) | Removing an unused `use` from `safety_identifier.rs` and `token_reservation.rs` left two consecutive blank lines | Extra blank line removed in both files | follow-up to `7c79251a4` |
| Ubuntu tests with `-D warnings` (run 43514108981, job 132194852517): three unused imports | (a) once fixtures call `super::<fn>`, the generated `use super::*;` in `policy.rs` is unused; (b) `activitypub.rs` and `gonka.rs` import `json` at module level although only their tests use it (both present on `main`) | (a) the generator template and `policy.rs` drop the glob import, and the manifest records the new size and hash (12200 bytes, `a8504db6…`); (b) `json` is imported inside each test module | follow-up to `7c79251a4` |
| Windows tests: checkout `Filename too long` (97 paths) | 336 committed paths are longer than 200 characters (the longest is 327, the same on `main`). Under `D:\a\router\router\` they exceed MAX_PATH | `git config --system core.longpaths true` runs before checkout on Windows | `8b3e5017d` |

`node scripts/regenerate-js-first.mjs --check` throws `Reverse concrete source
host operations changed` both before and after the edit. That belongs to the
automated-translation lane the maintainer suspended, so the generated
`policy.rs` change was made by hand. It is the exact transformation the
generator now emits: each of the 58 fixture assertions calls `super::<fn>`.
`parity/js-first-translation.json` records the new `policy.rs` size and hash.

## Checks run locally (no Rust tools)

- `node --test scripts/test/manual-development.test.mjs`: 7/7 pass.
- `node scripts/check-manual-development-workflows.mjs`: passes.
- `node scripts/check-js-first-workflows.mjs` and its test file give identical
  results before and after the Windows step (33/39 tests pass, 6 fail). This
  strict checker is part of the suspended lane and fails on `main` as well.

## Status

The CI outcomes for the latest head are recorded in the PR description. Every
remaining Rust job failure blocks completion; none is waived.
