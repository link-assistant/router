---
bump: minor
---

### Added

- Added exact per-run model authorization, truthful served-model validation,
  field-level capability provenance, and `router models explain` diagnostics.

### Fixed

- Prevented explicit model selections from being widened or silently
  substituted across HTTP, streaming, WebSocket, resumed, and subagent traffic.
- Removed owner-wide synthesized z.ai Claude and Codex capability profiles;
  unknown per-model capabilities now remain unknown.
