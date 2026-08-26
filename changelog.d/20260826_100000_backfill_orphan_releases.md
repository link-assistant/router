---
bump: patch
---

### Fixed
- A version that shipped without a release page is published by the next release run instead of staying missing. The pipeline creates the release page last, so anything that refuses it leaves a tag, a crate and container images with nothing to point a user at — and no later run revisited it, because each run only ever published its own version. The scheduled audit that fails on such a tag can report it but cannot create what is missing, so the report had nowhere to go but a human. v0.116.0 shipped that way.
