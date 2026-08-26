---
bump: patch
---

### Fixed
- A release removes the fragments it collected. Two collectors existed and only one deleted: `collect-changelog.rs` cleaned up but is wired to the manual dispatch job, while the automatic release on merge runs `version-and-commit.rs`, which collected and never removed. Every release therefore re-collected every fragment ever written and republished the whole archive as its own release notes — 154 pending fragments and a 145 KB section for a single version by v0.120.0, which is why release bodies were being truncated to fit GitHub's limit (issue #337).
- The 153 fragments that had accumulated are removed. Their content is already in `CHANGELOG.md`, many times over, so nothing is lost — and leaving them would have had the next release repeat the whole thing.
- `check-changelog-fragment.rs` fails when `changelog.d/` holds more fragments than one release should ever collect. This went unnoticed for eight months and roughly 150 releases because nothing counted (issue #337).
