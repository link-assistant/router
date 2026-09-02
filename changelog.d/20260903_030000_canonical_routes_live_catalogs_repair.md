---
bump: major
---

### Added

- Add ownership-aware client status plus secret-free `clients repair`, dry-run, transactional snapshot, conflict-safe rollback, and resilient temporary Claude launches (#393).

### Changed

- Replace every legacy/overlapping public route with one classified namespace: `/api/health`, `/api/management/*`, and `/api/services/*`; split inference-only and management listeners and migrate every generated client endpoint (#391).
- Derive model discovery, collision aliases, bridge selection, client setup, and dispatch from lossless paginated provider catalogs, persisted by account and invalidated immediately with authorization changes; no production model-name fallback remains (#192).
- Project z.ai Coding Plan models dynamically from provider records while preserving the reviewed client/policy boundary, canonical upstream identity, native protocol endpoint, and current Claude gateway discovery contract (#390).

### Fixed

- Read pre-0.125.4 token stores whose newer optional binding fields are absent and preserve the associative decoder's diagnostic when legacy fallback also fails (#392).

### Removed

- Remove all legacy root, `/v1/*`, and overlapping `/api/*` aliases. See `docs/migrations/1.0.0-canonical-routes.md`; rerun managed client configuration after upgrade (#391).
