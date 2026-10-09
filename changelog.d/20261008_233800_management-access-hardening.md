---
bump: minor
---

### Security
- Restrict management on combined listeners to loopback unless `MANAGEMENT_ALLOW_REMOTE` is explicitly enabled; dedicated admin listeners retain their configured access.
- Ban a socket peer IP after five consecutive failed management authentications for 30 minutes, configurable with `MANAGEMENT_LOCKOUT_FAILURES` and `MANAGEMENT_LOCKOUT_SECS`. Loopback is exempt by default. Bans are shared across listeners, audited, reported by doctor, and return `429` with `Retry-After`.
- Refuse published example signing and administrator secrets before startup binds a listener or issues credentials. Document address trust, recovery, deployment and bot interactions.
- Rust `Cli` and `Config` struct literals must now include `management: Default::default()`; parser and configuration constructors supply the defaults automatically. This documented source-compatibility exception accompanies the minor security release.
