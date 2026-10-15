### Fixed
- Remove automatic local Cargo formatting, Clippy, test and cache-cleanup hooks while preserving the existing generic pre-commit checks. Rust verification remains in gated CI.
- Install locked JavaScript package dependencies before the complete forward and profile-matrix checks. The workflow audit now rejects missing, unlocked or late dependency installation, including the existing lint and UI dependency boundaries.
- Add workflow-order and installed-hook regressions. This source-only candidate is unverified: no Node, Bun, Rust or CI checks were run for this change. All existing same-SHA gates, test commands and deadlines remain unchanged.
