---
bump: patch
---

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.
