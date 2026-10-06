---
bump: patch
---

### Fixed
- Stop retaining upstream request payloads in the soak fixture while preserving recording for replay and feature assertions.
- Measure soak resident memory on macOS, fail explicitly when RSS measurements are unavailable, and preserve resource and accounting diagnostics on Linux and macOS without raising the 64 MiB growth budget.
