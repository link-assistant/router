---
bump: patch
---

### Changed
- CI change detection: a pull-request push whose own delta touches only non-build files (for example reverting a `.gitkeep` task-details commit) no longer reruns the full pipeline. crates.io publishing keeps OIDC trusted publishing with the token-secret fallback from #800.
