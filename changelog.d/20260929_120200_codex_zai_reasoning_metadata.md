---
bump: patch
---

### Fixed
- `router with codex` launches on a z.ai-only catalog whose rows carry no reasoning metadata. Such a row is listed with no supported-effort list and the user's configured reasoning effort as its default, so Codex keeps that effort at startup and on `/model` switches and Router invents no capability facts. Only self-contradictory metadata still omits a row, and an explicitly selected row with contradictory metadata is refused by name (#628).

### Added
- A real Codex fixture with a z.ai-only catalog that lacks reasoning metadata, covering `--version`, explicit model selection, interactive startup, and an inference whose captured request proves the exact model and configured effort Codex sent (#628).
