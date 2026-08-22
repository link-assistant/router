---
bump: patch
---

### Changed
- Local builds no longer accumulate an unbounded `target/` directory. A debug build links 38 integration-test binaries plus three `[[bin]]` targets and evicts nothing, so ordinary edit-build-test cycles reached 512,539 files and 61 GB — 42 GB of it the incremental cache alone. `.cargo/config.toml` now disables incremental compilation locally (matching `CARGO_INCREMENTAL=0`, which CI already sets) and emits line tables rather than full DWARF, which keeps backtraces working across all 41 linked binaries.
- CI compiles through sccache with the GitHub Actions cache backend. The existing `actions/cache` step is keyed on `Cargo.lock`, so a single dependency bump misses the whole `target/` directory; sccache keys on each compilation unit and still hits. A rate limit makes the build continue uncached rather than fail, so it cannot block a release.

### Added
- A `post-commit` hook prunes build artifacts the commit's own build did not use, so the cache stays bounded without anyone remembering to clean up. It requires `cargo-sweep` (`cargo install cargo-sweep`) and does nothing when that is absent — pruning a cache is never a reason to reject a commit. The stamp/sweep order is load-bearing and easy to invert: stamping after a build marks that build's own output stale, so `scripts/sweep-build-artifacts.sh` sweeps against the previous stamp before writing a new one.
