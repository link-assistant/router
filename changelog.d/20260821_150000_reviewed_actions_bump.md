---
bump: patch
---

### Changed
- CI moves to `actions/download-artifact` v8.0.1 and `docker/setup-buildx-action` v4.3.0. v8 carries two deliberately stricter defaults: a digest mismatch now fails the run instead of logging a warning, and downloads are no longer force-unzipped without checking their `Content-Type`. Both suit the release job that uses it — it fetches published artefacts, where a silent hash mismatch is exactly what should stop a release.
- The Node `DEP0005` deprecation notice that had kept this pinned to v7 is silenced at the step rather than avoided by staying behind. v8's bundled unzip chain still calls the deprecated `Buffer()` constructor (upstream `actions/download-artifact#484`, still open), and these artefacts are zips so `skip-decompress` cannot side-step the extraction path; `NODE_OPTIONS: --no-deprecation` on that one step keeps the release log clean while the stricter checks stay on.
- The regression guard now asserts that *every* artifact download silences the notice, instead of refusing v8 by commit. It enforces the property that was actually wanted — a quiet release log — rather than the version that happened to deliver it.
