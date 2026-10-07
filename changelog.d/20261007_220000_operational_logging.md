---
bump: patch
---

### Fixed
- Persist server and launcher operational diagnostics, process lifecycle and supervised child exits by default in owner-only rotating files under the Router data directory. Keep ordinary client launches quiet, with `--verbose` as an explicit console opt-in, and forward SIGTERM to supervised clients.
- Retain safe HTTP error status/classes without copying upstream error bodies or URL credentials into operational logs.
