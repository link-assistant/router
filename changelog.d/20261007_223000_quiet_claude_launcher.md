---
bump: patch
---

### Fixed
- Keep ordinary `router with claude` and `with-router claude` launches quiet while preserving model selection, unavailable-model and billing explanations, privacy warnings, connection failures, and child outcomes in private, bounded launcher logs. Explicit `--verbose` and structured results retain diagnostics, and Claude keeps its inherited terminal streams.
- Retain sanitized launcher diagnostics in the shared operational log without duplicating verbose output. Open the launcher log first so operational-log initialization failures stay silent and durable for ordinary Claude launches.
