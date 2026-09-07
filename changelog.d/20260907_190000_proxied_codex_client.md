---
bump: minor
---

### Added
- Add a default-off `--allow-proxied-client codex` / `PROXIED_CLIENT_OVERRIDES=codex` contract for trusted fixed proxies using Codex-bound tokens on the canonical Codex Responses route without the native CLI fingerprint. Canonical catalog marker compatibility is unchanged; proxied inference is provider-scoped, warned at startup, and identified in audit records.
