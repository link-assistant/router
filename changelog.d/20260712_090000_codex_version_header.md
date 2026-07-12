---
bump: minor
---

### Added
- Codex subscriptions now send a `version` header (default `0.144.1`, overridable via
  `CODEX_CLIENT_VERSION`) when proxying to the ChatGPT backend. The backend gates newer
  models (e.g. `gpt-5.6-luna`) behind a recent client version; without the header
  `POST /responses` returns `Model not found`. This mirrors the Codex CLI so newer models
  are usable through the router.
