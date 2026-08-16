---
bump: minor
---

### Changed

- The first-visitor admin claim — in the web UI, in Telegram and in VK — now
  mints an ordinary admin-scoped `la_sk_…` JWT with `sub`, `iat`, `exp`,
  `label` and `scope: "admin"` instead of an opaque `la_admin_…` value stored
  as a digest. There is one administrator credential model: the claimed
  credential lists, expires, revokes and rotates like any other token.
  The two-phase anti-bricking handshake is unchanged — the candidate is minted
  already revoked, so an undelivered mint authorises nothing — and the
  first-claim lock stays shared by the web UI and both chat channels.
- `POST /api/admin/bootstrap` and `POST /api/admin/rotate` accept an optional
  `{"ttl_hours": n}` body so the administrator can limit the credential
  lifetime (capped at one year). Rotation mints the replacement and revokes the
  previous credential by id under the claim lock.
- Confirming a claim retires the startup `bootstrap-admin` token by id, so the
  Tokens table, the CLI and the bots show it as revoked instead of leaving a
  row that looks active but answers `401`.

### Fixed

- An administrator credential now reaches the model surfaces as well as the
  admin API: `scope=admin` is a superset of client access, so the claimed
  credential and `TOKEN_ADMIN_KEY` no longer answer `401 invalid token` on
  `/v1/models` while succeeding on `/api/tokens/list`.

### Migration

- Deployments claimed by an earlier version keep their opaque `la_admin_…`
  credential; it continues to authorise, `doctor` prints a warning naming it,
  and the first `/api/admin/rotate` converts the claim into a JWT.
