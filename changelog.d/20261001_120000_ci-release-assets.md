---
bump: patch
---

### Fixed
- Release binaries are published again. The `publish-release-artifacts` job ran `rust-script` without installing it, so v1.15.0 shipped with no assets on any platform. New `scripts/check-workflow-tools.rs` fails CI when any workflow job runs a tool it does not install (#648).
- A failed release-asset upload now reports `gh`'s own error rather than only an exit status (#648).
- `cargo build` no longer warns that `src/main.rs` is present in multiple build targets. `link-assistant-router` builds from its own `src/bin/link-assistant-router.rs`, which includes the same entry point, and lint now fails on any Cargo warning (#648).

### Security
- The crates.io token is scoped to the two publish steps instead of every job. Manual release inputs reach shell commands through environment variables rather than template expansion (#648).

### Changed
- CI runners are pinned to `ubuntu-24.04` and `macos-26` rather than the moving `-latest` aliases. Test and coverage jobs stop when a run is cancelled, and the hourly delivery and daily release reconciliation runs no longer overlap (#648).
