# Emergency any-token mode (issue #645)

An explicit, bounded, non-destructive switch that lets clients holding an old,
unknown, expired, revoked, foreign or malformed Router token keep working
while an operator repairs the real token store — for example after the
rollback described in [issue #644](https://github.com/link-assistant/router/issues/644),
where a live Claude run token verified but its durable record was absent.

It is a **break-glass tool for your own deployment**. Prefer the targeted
repair, [`router tokens import`](../token-recovery.md), whenever you can reach
the store that issued the token.

## Turning it on

| Flag | Environment | Default | Meaning |
|---|---|---|---|
| `--emergency-accept-any-token` | `EMERGENCY_ACCEPT_ANY_TOKEN` | off | Accept any non-empty client token on client routes. |
| `--emergency-allow-non-loopback` | `EMERGENCY_ALLOW_NON_LOOPBACK` | off | Acknowledge serving the mode on a non-loopback listener. Without it the router refuses to start in emergency mode unless every listener is bound to loopback. |
| `--emergency-duration-minutes` | `EMERGENCY_DURATION_MINUTES` | `60` | Minutes after which the mode switches itself off; must be `1..=1440`. |

```bash
# Loopback-only, one hour, then normal checks resume automatically:
router --host 127.0.0.1 --emergency-accept-any-token

# Refused at startup: 0.0.0.0 is not loopback and nothing acknowledged it.
router --host 0.0.0.0 --emergency-accept-any-token
# ...acknowledged, and shortened to 15 minutes:
router --host 0.0.0.0 --emergency-accept-any-token \
  --emergency-allow-non-loopback --emergency-duration-minutes 15
```

The switch is never persisted: nothing is written to configuration, the data
root or a deployment manifest, and `router deploy` strips the three variables
from the environment it hands to the deployed server. A restart without the
flag comes back with normal checks.

## What it changes — and what it does not

| Surface | Behaviour while on |
|---|---|
| Client routes (inference, model discovery, usage, run lease) | Any non-empty token in `Authorization: Bearer`, `x-api-key` or `x-goog-api-key`, with a `la_sk_`, `at-` or any other shape, is admitted. |
| No credential at all | Still `401`: the mode accepts any *token*, not anonymous callers. |
| Management routes (`/api/management/*`) | Unchanged: normal administrator authentication. An emergency token cannot mint, rotate or revoke anything. |
| Consumer subscription entitlement | Unchanged: the client/provider matrix and request-evidence rules still apply. The client binding is inferred from the request (user agent, `x-goog-api-key`, Codex headers), then from the `at-` carrier. |
| Upstream credentials | Unchanged: they must still be valid. |
| Token store | Never read for authority, charged, renewed, revoked or revived. Admitted requests get synthetic claims with id `emergency-bypass-<fingerprint>`, so budgets, rate limits and per-token model pins do not apply to them — and a revoked token is still revoked the moment the mode ends. |

## Seeing that it is on

* `router doctor` prints `emergency_auth : WARNING ON for N min`.
* Every client response carries `x-link-assistant-emergency-auth` with the
  remaining time.
* `GET /api/management/emergency-auth` (admin) reports whether it is active,
  when it expires and how many requests it admitted, by the check they would
  otherwise have failed.
* `/api/management/metrics` exports
  `link_assistant_emergency_auth_active` and
  `link_assistant_emergency_auth_bypassed_total{reason="..."}`.
* Each admitted request is logged at `WARN` as
  `EMERGENCY AUTH BYPASS` with the reason and a 12-hex-digit SHA-256
  fingerprint of the token — never the token itself. Each request is counted
  once, however many routes it passes through.

## Turning it off

Any of these, whichever comes first:

1. the configured duration lapses;
2. `POST /api/management/emergency-auth/disable` with an admin token — the
   very next request is checked normally;
3. restarting without the flag.

## Authentication diagnostics (issue #644)

Independently of the mode, `GET /api/management/auth/diagnostics` (admin)
counts authentication failures by reason, so a `401` after a rollback can be
told apart from any other:

| Reason | Meaning |
|---|---|
| `missing_credential` | No token in any carrier. |
| `invalid_prefix` / `malformed` | Not a Router token. |
| `signature_invalid` | Signed with another `TOKEN_SECRET`. Importing records cannot fix this; the secret must match the issuer's. |
| `expired`, `revoked` | The record's own state. |
| `missing_record` | Signature fine, durable record absent — the rollback case; fix with `router tokens import`. |
| `binding_mismatch`, `insufficient_scope`, `model_policy` | Record present, request not permitted. |
| `request_budget`, `token_budget`, `rate_limit` | Budget or rate exhausted. |
| `run_lease_unrenewable` | The run's lease cannot be renewed. |
| `unsupported_lease_endpoint` | Wrapper heartbeat against a server older than run leases (404/405); the token stays valid until its expiry. |

The same counts are exported as `link_assistant_auth_failures_total{reason}`.
Diagnostics carry reasons, token ids and fingerprints only, never token text.
