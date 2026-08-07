---
bump: minor
---

### Security

- The `/api/tokens*` admin surface is **closed by default**
  ([#49](https://github.com/link-assistant/router/issues/49)). Previously
  `is_admin_authorised` returned `true` whenever `TOKEN_ADMIN_KEY` was unset, so
  a deployment that had not configured an admin key answered `200` to an
  unauthenticated `POST /api/tokens` — anyone who could reach the port could
  mint a token that spends the subscription and list every token already issued.
  The default bind address is `0.0.0.0`, so in a container with a published port
  that was reachable from outside the host. An unauthenticated admin request is
  now `401`.
- The flat `TOKEN_ADMIN_KEY` is compared with a constant-time digest comparison
  instead of `==`, so a wrong key no longer leaks how many bytes matched.

### Added

- Admin access is now modelled as a **scoped token** rather than a flat shared
  secret. An admin credential is an ordinary `la_sk_…` JWT carrying
  `"scope": "admin"`, validated on the same code path as every other token, so
  it has an identity (`sub`), an expiry, a record in `tokens list`, and full
  revocation semantics.
- `tokens issue --admin` (CLI) and `{"scope": "admin"}` on `POST /api/tokens`
  (HTTP) mint one.
- Rotation in a single step — mint the replacement and revoke the credential
  that asked for it: `tokens rotate <sub>` (CLI) and `POST /api/tokens/rotate`
  (HTTP). The flat key has no subject to revoke, so it cannot rotate itself and
  gets `400`.
- When no admin credential is configured, the router generates one on first
  start, prints it once (`Admin token (shown once, store it now): la_sk_…`) and
  persists its record — a fresh deployment is usable without being open.
- `--allow-anonymous-admin` / `ALLOW_ANONYMOUS_ADMIN` explicitly restores the
  historical open behaviour for deployments that depend on it. It warns at
  startup, and `doctor` reports the admin surface as `OPEN` when it is set.

### Changed

- The flat `--admin-key` / `TOKEN_ADMIN_KEY` keeps working unchanged as a
  bootstrap and compatibility credential — it is the only way to provision the
  first credential in a deployment configured entirely from the outside.
- `tokens list` gained a `scope` column (`client` for ordinary tokens).

### Documentation

- README gained an *Admin access* section and rows for `/api/tokens/rotate`,
  the `scope` field and `--allow-anonymous-admin`;
  `docs/use-cases/self-hosting.md` and `docs/use-cases/remote-login.md` now
  describe the closed default and the bootstrap token instead of the open one.
