---
bump: patch
---

### Fixed
- Launch Codex with simultaneous ChatGPT and z.ai Coding Plan catalogues by applying z.ai's documented provider-level reasoning profile to dynamically discovered GLM IDs, while explicitly omitting only unrelated entries whose capability metadata is unavailable.
- Let `router usage` use a selected server's administrative credential and return a redacted all-configured view, including multi-account means, contributor counts, partial/unavailable state, and every distinct reset time without exposing account identities.

### Changed
- Refresh every Rust lockfile dependency to the latest version compatible with the repository's Rust 1.89 baseline; the npm lockfile and security audit were already current.
