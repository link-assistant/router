---
bump: minor
---

### Added
- Configurable model catalog sources (`MODEL_CATALOG_SOURCES`) validated against the model-truth JSON Schema, refreshed every three hours by default (`MODEL_CATALOG_REFRESH_SECS`), with deterministic provider-scoped precedence and last-good retention.
- Repeatable `--local-model name=provider:upstream` entries over authorized live inventories and an admin-only effective model definitions endpoint at `/api/management/routing/model-definitions/{channel}`.

### Security
- Catalog fetches enforce the upstream private-network policy, guarded DNS, no redirects or environment proxies, 1 MiB document limits, bounded source counts and fetch durations. Definitions never grant subscription authority or widen token model allow-lists.
