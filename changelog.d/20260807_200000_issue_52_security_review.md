---
bump: minor
---

### Security

- Ran a deliberate security review over the surface added by [#47](https://github.com/link-assistant/router/issues/47), [#49](https://github.com/link-assistant/router/issues/49), [#50](https://github.com/link-assistant/router/issues/50) and [#51](https://github.com/link-assistant/router/issues/51) ([#52](https://github.com/link-assistant/router/issues/52)), and wrote the pass down — threat model, every checklist item, **and what was found to be fine** — in `docs/security/review-2026-08.md`. Four findings were fixed, each with a regression test in `tests/security_review_test.rs` or beside the code:
  - The admin listener now sends `Content-Security-Policy` (`frame-ancestors 'none'`, `script-src 'self'`, `form-action 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer` on **every** response — API, embedded UI assets, and the auth middleware's own refusals — because the console keeps its credential in `localStorage` and its revoke/rotate actions are one click (`src/security_headers.rs`).
  - Login transcript excerpts are now redacted before they are truncated, so a login that fails *after* `claude setup-token` printed the paid-account credential can no longer return it in an error string; the pasted authorization code is removed too (`login_url::redact_secrets`, `login_url::redact_value`).
  - The login and chat session registries are now bounded: terminal login sessions are evicted after a 300 s retention window and an expired session drops its PTY (killing the child), while chat sessions — keyed by an *unauthenticated* platform user id — are pruned on every message with a 1 h idle TTL and a 512-entry cap that evicts strangers before authenticated conversations.
  - `/v1/usage` and `/v1/accounts` now require an admin credential on the network-facing proxy port, where `ENABLE_METRICS` defaults to on; they disclosed token ids, labels and credential filesystem paths to unauthenticated callers. `/metrics` stays open on purpose (aggregate counters only).

### Added

- Added a `Dependency Audit` CI job running `cargo audit` and `npm audit --audit-level=high` over the admin console toolchain. It deliberately does not gate `build`, so a newly published advisory against an unchanged tree raises a red check instead of blocking an unrelated release.
