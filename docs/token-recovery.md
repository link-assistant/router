# Recovering token records after a rollback (issue #644)

Router tokens are signed JWTs; the store keeps only their metadata, keyed by
the token id. A client token is accepted when **both** hold:

1. its signature verifies against this deployment's `TOKEN_SECRET`, and
2. the data root the server is using holds its record (not revoked, not
   expired, within budget).

Upgrading, rolling back, adopting a deployment or restoring a backup can
switch the data root the server reads. A token issued against another root
then verifies but has no record, and every request of that session gets
`401` — `missing_record` in `GET /api/management/auth/diagnostics`.

## Repair: `router tokens import`

```bash
# See what would change; nothing is written:
router tokens import --local --from /srv/router-1.14.3 --dry-run

# Copy every record this store lacks, leave every existing one untouched:
router tokens import --local --from /srv/router-1.14.3

# Only the affected run token:
router tokens import --local --from /srv/router-1.14.3/data --id 6f1c...
```

`--from` accepts a data directory (`tokens.lino` and/or `tokens.bin`), a
deployment root whose `data/` holds them, a `router deploy` checkpoint under
`.state-backups/<id>/` (`tokens.json`), or a single `.lino`, `.bin` or `.json`
token file. The source is only read.

Guarantees:

* **Additive by default.** A missing record is copied with every field — id,
  label, issue time, expiry, sliding window, revocation, ephemeral flag, run
  lease, account, client and principal binding, scope, GitHub repositories,
  request and token budgets, usage, reservations, rate window and model
  policy. Records already present are never modified; ones that differ are
  listed with the differing fields, and the command exits `2`.
* **Live.** Each record is written under the store's own cross-process lock, so
  a running server keeps serving and accepts the imported token on the next
  request, no restart needed.
* **Idempotent and restartable.** Re-running changes nothing that was already
  imported and finishes anything an interruption left out.
* **No rotation, no secret change.** Tokens keep their exact values. If the
  source was issued with a different `TOKEN_SECRET`, its tokens stay
  `signature_invalid` — start the server with the issuer's secret instead.
* **No token values.** Records hold none, so the report cannot leak any.

### Explicit replacement

`--replace` also overwrites records that differ, after exporting the current
records to `<data dir>/token-import-backups/tokens-<time>-<id>.json` (mode
0600). Even then a record revoked on either side stays revoked, and recorded
usage and reservations never decrease. Every field that changes, including any
widened limit or later expiry, is listed in the report.

## Old servers and run leases

A wrapper whose server predates the run-lease endpoint (a 404/405 on the
heartbeat) logs that the endpoint is unsupported and keeps using the token
until its expiry; it is not treated as an authentication failure.

## When the store cannot be reached

[Emergency any-token mode](security/emergency-auth.md) keeps clients working,
without touching any record, while the store is repaired.
