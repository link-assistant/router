---
bump: patch
---

### Fixed
- The `router` command is now included in the release archives. It was added to the manifest in v0.92.0 and built correctly, but the packaging step copies binaries by a hand-written list that was not updated — so the canonical command reached only users who install with `cargo install`, and was missing from all eight published archives, which is the path the README documents. The published-archive smoke test now runs `router --version` as well, and a test asserts the packaging list against the manifest, so a binary declared but not shipped fails the build rather than the download.
