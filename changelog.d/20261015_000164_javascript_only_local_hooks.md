### Fixed
- Remove automatic local Cargo formatting, Clippy, test and cache-cleanup hooks while preserving the existing generic pre-commit checks. Rust verification remains in gated CI.
- Install locked JavaScript package dependencies before the complete forward and profile-matrix checks. The workflow audit now rejects missing, unlocked or late dependency installation, including the existing lint and UI dependency boundaries.
- Add workflow-order and installed-hook regressions. The complete three-file receiving group passes 31/31 cases in both Node and Bun, and the actual structural audit passes all 14 workflows. All existing same-SHA gates, test commands and deadlines remain unchanged. These focused checks do not establish a complete green gate; no local Rust or new CI checks ran.
