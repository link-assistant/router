---
bump: minor
---

### Added

- Split request exchanges into SHA-256-keyed per-token directories with identity metadata and independent retention budgets.

### Changed

- Partially redact long credentials with one stable masking rule while continuing to fully mask short secrets.

### Security

- Keep unauthenticated traffic isolated and create request-log directories and files with owner-only permissions on Unix.
