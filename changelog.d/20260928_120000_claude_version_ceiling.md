---
bump: patch
---

### Fixed
- `router with claude` and `clients doctor claude` no longer reject Claude Code releases newer than 2.1.265 solely by version number. The 2.1.255 minimum for gateway alias support remains, Claude.ai-only operations stay fail-closed for every release, and the hermetic real-client capture (split auth and model discovery) now also runs against Claude Code 2.1.283 (#609).
