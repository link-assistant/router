---
bump: patch
---

### Changed
- CI pins `actions/download-artifact` v8.0.1 and `docker/setup-buildx-action` v4.3.0. The v8 major carries two deliberately stricter defaults: a digest mismatch now fails the run instead of logging a warning, and downloads are no longer force-unzipped without checking their `Content-Type`. Both suit the release job that uses it, which fetches plain digest files and verifies published artefacts — a silent hash mismatch there is exactly what should stop a release.
- The release-workflow guard pins the same `download-artifact` commit the workflow does. The guard caught this drift when only the workflow moved, which is what it exists for; the two now agree again.
