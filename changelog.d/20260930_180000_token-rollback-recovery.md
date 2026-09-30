---
bump: minor
---

### Added
- `router tokens import` restores token records missing after a rollback, data-root switch or restore from another data root, deployment root, deploy checkpoint or token file. It is additive by default, reports conflicts field by field, and `--replace` is explicit and backed up. It never revives a revoked record or lowers recorded usage (#644).
- Protected `GET /api/management/auth/diagnostics` and `link_assistant_auth_failures_total{reason}` separate missing records, signature, expiry, revocation, binding, budget, model-policy and unsupported run-lease failures without token values (#644).
- Explicit, bounded, loopback-by-default emergency any-token mode (`--emergency-accept-any-token`). Admin status and disable endpoints, a doctor warning, a response header, metrics and fingerprint-only logs cover it. It is never persisted and leaves the token store untouched (#645).

### Fixed
- A wrapper against a server without the run-lease endpoint reports it as unsupported rather than as an authentication failure (#644).
