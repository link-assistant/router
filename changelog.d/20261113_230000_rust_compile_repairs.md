---
bump: patch
---

### Fixed
- Configured account header overrides can no longer fail to compile outside tests: the reviewed ingress/network header list is now re-exported for non-test code, so overrides keep dropping `forwarded`/`x-forwarded-*` headers in release builds.
- Generated JavaScript-first policy fixtures call the function under test through `super::`, so a fixture whose id equals the function name (`provider-model-id`, `weighted-capacity`) no longer shadows it, and the fixture module drops its now-unused glob import; `scripts/regenerate-js-first.mjs` emits the same form.
- Removed unused `serde_json` imports, moved the test-only `json!` imports of `activitypub.rs` and `gonka.rs` into their test modules, and imported `json!` in the deploy seed tests so the library and its tests build with `-D warnings`.
- The scalar-count oracle integration test now covers `validate_openai_user_value` (absent, `null`, Unicode string and wrong type), which also keeps the path-included module free of dead code under `-D warnings`.
- The Lint job's `cargo check` and `cargo clippy` steps pass `--keep-going`, so one CI run reports compile errors from every target instead of stopping at the first crate.
- The logical-JSON oracle test parenthesizes `false || { … }` object values, which `json!` otherwise reads as a bare `false` literal and rejects; the ASCII reverse oracle allows `unused_parens` in the generated witness module it includes, as it already does for the other generated-code lints.
- The verification-area test resolves `tests/` from `CARGO_MANIFEST_DIR` instead of `file!()`, which became workspace-relative when the crate moved to `rust/` and made every area report "is not a test target".
- `scripts/verify-contracts.rs` depends on the router package at `../rust` (the repository root is now a virtual workspace manifest), and `scripts/record-vendor-fixtures.rs` finds its cassettes under `rust/tests/fixtures/vendor/` when run from the repository root.
- `build.rs` folds its nested `git rev-parse` success check into a `let` chain, which Rust 1.98's `clippy::collapsible_if` requires before any other target can be linted.
