---
bump: patch
---

### Fixed
- Releases build again. `cargo audit` failed on `chacha20 0.10.1`, which had been yanked and reached the tree through `reqwest`; every release run on `main` failed at the Dependency Audit gate until it was updated to `0.10.2`. Nothing about the router changed — the crate was withdrawn upstream — but the gate is what stops a release, so it stopped every release.

### Changed
- Every dependency is current, in all four of the places this repository keeps them. Rust: `lino-objects-codec` 0.4.1 → 0.7.0 and `links-notation` 0.14.0 → 0.16.1, which carry the readable-format and empty-reference fixes made upstream at link-foundation/lino-objects-codec#45 and link-foundation/links-notation#288; `uuid` 1.24 → 1.26; `flate2` 1.1.9 → 1.1.10. The admin console: `@chakra-ui/react`, `@vitejs/plugin-react` and `vite`. The images: `rust` 1.97.1 → 1.98.0, and current digests for `oven/bun`, `debian` and the tunnel's `alpine`. CI: all nineteen pinned Rust toolchains move with the builder image rather than drifting from it.
- GitHub Actions were already pinned to the latest commit of every action; only their trailing version comments were stale (`# v7` for what is v7.0.1), which is what makes an audit read them as behind. The comments now say which release each SHA is, and no pin changed.
- `release_workflow_test` reads the toolchain the workflow pins instead of hard-coding it, so a routine upgrade no longer fails a test that is not about the upgrade.
