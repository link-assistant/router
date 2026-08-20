---
bump: minor
---

### Fixed
- `accounts list` no longer calls a revoked refresh chain `refreshable` and healthy. The check asked only whether a refresh token *existed*, and a revoked refresh token is still a non-empty string on disk — so a chain the upstream had already refused with `invalid_grant` was indistinguishable from a live one, and every request it served returned 401 while the column stayed green (issue #245). An account whose current credential has been refused now reports `rejected` and unhealthy, agreeing with `doctor` instead of contradicting it.

### Added
- A terminal refusal is recorded durably, keyed to a SHA-256 fingerprint of the credential rather than the credential itself. `accounts list` runs as its own short-lived process and performs no refresh, so without a record that outlives the refresh there was nothing for it to consult; `doctor`, which does perform the refresh, now writes down what it learns. The fingerprint is also what expires the record: once a holder rotates the chain forward, the file no longer matches, the verdict stops applying, and the account reports recoverable again with no restart and no manual step — the rule the refresh ladder already follows.
- The refusal is scoped per account, not per provider. The evidence the ladder keeps alongside it is per-provider, which is right for routing a vendor away and wrong for a per-account report: every account in a Claude pool shares that key, so one revoked chain would otherwise have condemned its healthy neighbours.
