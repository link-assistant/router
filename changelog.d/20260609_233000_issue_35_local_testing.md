---
bump: minor
---

### Added

- Added a per-token request budget: tokens can carry an optional `max_requests`
  cap with a persisted `used_requests` counter, enforced on every upstream
  forwarding path (Anthropic, OpenAI-compatible, Gonka) with an HTTP 429
  `rate_limit_error` once exhausted. Exposed via the CLI `tokens issue
  --max-requests`, the `POST /api/tokens` `max_requests` field, and a `used/max`
  column in `tokens list`.
- Added the issue #35 case-study package under `docs/case-studies/issue-35`,
  including a full requirement trace, online research with primary sources, an
  existing-components survey (LiteLLM virtual keys/budgets, Portkey, Kong AI
  Gateway, community Claude proxies), and redacted live end-to-end evidence.

### Fixed

- Fixed Claude MAX credential reading: the router now parses the real Claude Code
  `~/.claude/.credentials.json` layout, where the OAuth token is nested under a
  `claudeAiOauth` object (`accessToken`, `refreshToken`, `expiresAt`, `scopes`,
  `subscriptionType`), in addition to the previously supported flat layout.
  `doctor` now probes the credential file and reports whether a usable token was
  found.

### Changed

- Documented the nested credential layout, transparent header injection
  (`anthropic-version` default plus the `anthropic-beta: oauth-2025-04-20` flag),
  and the per-token request budget in `README.md`, and corrected the stale note
  claiming token revocations are lost on restart (records are persisted).
