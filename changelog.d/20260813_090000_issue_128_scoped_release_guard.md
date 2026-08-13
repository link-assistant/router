---
bump: patch
---

### Fixed
- An orphan tag from an earlier run no longer blocks the current release's Docker images: the release run's `check-github-releases.rs` guard is now scoped to the version it just published (`--release-version`), while unrelated historical orphans are reported as warnings (`--historical-orphans warn`)
- Pre-existing release drift is reported *before* the GitHub release is created, so the run can no longer leave a published release without images
- The guard's message now names the remediation for each orphan tag (create the release or delete the tag)

### Changed
- The scheduled `verify-releases` workflow keeps failing hard on any default-branch tag without a GitHub Release
