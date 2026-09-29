---
bump: patch
---

### Fixed
- On a z.ai-only catalog, Claude Code's `Default (recommended)` row no longer describes an unauthorized Opus. `router with claude` pins `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL` and `ANTHROPIC_DEFAULT_HAIKU_MODEL` to the newest authorized GLM model, keeps an inherited family value only when it names an authorized row, and leaves the native family rows alone when Anthropic is in the catalog (#630).
