---
bump: minor
---

### Added

- Optional persisted per-account routing policies, editable with `accounts policy`
  and admin management endpoints: smooth weighted round-robin, model prefixes,
  cooldown control, retry overrides, request-scoped error actions, safe header
  copies, live model aliases and wildcard exclusions.
- Alias authorization against upstream model grants and bounded JSON/SSE response
  metadata rewriting, preserving strict account pins and per-account HTTP isolation.
