---
bump: minor
---

### Added
- Admin-only management endpoints for retained request lookup, opt-in upstream error capture and downloads, clearing request/error logs, per-account active request counts, and checking the latest stable Router version.
- Runtime debug logging leases through `PATCH /api/management/logging`, with audit records and automatic restoration of the startup tracing filter after `LOG_DEBUG_TTL_SECS`.
