---
bump: patch
---

### Fixed
- Configured account header overrides can no longer fail to compile outside tests: the reviewed ingress/network header list is now re-exported for non-test code, so overrides keep dropping `forwarded`/`x-forwarded-*` headers in release builds.
- Generated JavaScript-first policy fixtures call the function under test through `super::`, so a fixture whose id equals the function name (`provider-model-id`, `weighted-capacity`) no longer shadows it, and the fixture module drops its now-unused glob import; `scripts/regenerate-js-first.mjs` emits the same form.
- Removed unused `serde_json` imports, moved the test-only `json!` imports of `activitypub.rs` and `gonka.rs` into their test modules, and imported `json!` in the deploy seed tests so the library and its tests build with `-D warnings`.
