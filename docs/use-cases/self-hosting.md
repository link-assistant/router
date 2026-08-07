# Self-hosting: the router as an internal infrastructure component

Issue #45 states the purpose of this system directly:

> the general purpose of the system is usage as an internal component of
> personal or corporate infrastructure, for testing, experimenting and general
> coding tasks.

This document covers that scenario: where the process runs, what it needs on
disk, and — most importantly — **who can reach the endpoint that mints tokens**.

Every claim below is asserted by
`experiments/issue-45/test-deployment-hardening.sh` (**16 passed, 0 failed**),
which needs no subscription: all of it concerns the router's own auth surface,
so no request reaches an upstream.

## The one thing to get right

`POST /api/tokens` mints `la_sk_…` tokens that spend your subscription. **When
`TOKEN_ADMIN_KEY` is unset, that endpoint is open** — anyone who can reach the
port can mint themselves a working token, and list every token you have issued:

```console
$ curl -X POST http://router:8080/api/tokens -d '{"ttl_hours":1,"label":"anyone"}'
{"token":"la_sk_…","ttl_hours":1,"label":"anyone", …}      # 200, no credential sent
```

The default bind address is `0.0.0.0`, so in a container with a published port
this is reachable from outside the host. Set an admin key:

```bash
TOKEN_ADMIN_KEY="$(openssl rand -hex 32)"
```

With it set, issuing, listing and revoking all require it as a Bearer
credential; a missing or wrong key is `401`, and a rejected revoke is a **no-op**
— an outsider cannot cancel a running task's token:

| Request | Result |
| --- | --- |
| `POST /api/tokens` with no key / a wrong key | `401` |
| `GET /api/tokens/list` with no key | `401` |
| `POST /api/tokens/revoke` with no key | `401`, and the token stays valid |
| any of the above with `Authorization: Bearer $TOKEN_ADMIN_KEY` | `200` |

### The two secrets are not interchangeable

| Secret | Held by | Grants |
| --- | --- | --- |
| `TOKEN_ADMIN_KEY` | the operator | minting, listing, revoking task tokens |
| `la_sk_…` task token | one task | proxied inference, within that token's TTL and budget |

They do not substitute for each other: a task token presented to
`/api/tokens/list` is `401`, and the admin key presented to `/v1/messages` is
`401` (rejected at authentication, so it never reaches an upstream). The vendor
credential is a third thing that never leaves the process.

## Deployment shapes

### Local process

```bash
export TOKEN_SECRET="$(openssl rand -hex 32)"
export TOKEN_ADMIN_KEY="$(openssl rand -hex 32)"
export ROUTER_HOST=127.0.0.1          # personal machine: do not listen publicly
link-assistant-router serve
```

`ROUTER_HOST` is honoured as given — bound to `127.0.0.1` the port is reachable
only from the same machine.

### Docker

The image defaults to `ROUTER_PORT=8080` and `CLAUDE_CODE_HOME=/data/claude`.
Mount the subscription **read-only** and keep router state on its own volume:

```bash
docker run -d --name router \
  -p 127.0.0.1:8080:8080 \
  -e TOKEN_SECRET="$TOKEN_SECRET" \
  -e TOKEN_ADMIN_KEY="$TOKEN_ADMIN_KEY" \
  -e DATA_DIR=/data/router \
  -e AUDIT_LOG=/data/router/audit.jsonl \
  -e CLAUDE_CODE_HOME=/data/claude \
  -v "$HOME/.claude:/data/claude:ro" \
  -v router-data:/data/router \
  ghcr.io/link-assistant/router serve
```

`-p 127.0.0.1:8080:8080` publishes to the host's loopback only; drop the
`127.0.0.1:` prefix **only** once `TOKEN_ADMIN_KEY` is set.

The router starts and serves `/health` with **no subscription mounted at all**,
so it can be deployed before credentials are provisioned; requests then fail at
the upstream rather than at startup.

The mount can stay read-only across token expiry: the router exchanges the
`refreshToken` in the credential file for a new access token in memory and
never writes the file back. The image carries no Claude CLI, so the one thing
it cannot do with a read-only mount is a **first-time login** — for that, use
the `with-claude-cli` image variant with a writable mount:

```bash
docker run -it --rm --entrypoint claude \
  -v claude-home:/data/claude \
  ghcr.io/link-assistant/router:with-claude-cli /login
```

### Corporate host

Nothing external is required — no database, no message broker. State is JSON
under `DATA_DIR` and, when `AUDIT_LOG` is set, an append-only JSONL file:

| Path | Contents | Backup? |
| --- | --- | --- |
| `$DATA_DIR` | issued-token records (id, label, expiry, budget, usage) | yes — losing it loses revocation state |
| `$AUDIT_LOG` | one line per proxied request | ship to your log collector |
| `$CLAUDE_CODE_HOME` | the vendor session; read-only unless you log in from the container | never — it is the vendor's |

`STORAGE_POLICY=memory` keeps tokens in memory only, for ephemeral test
deployments where nothing should survive a restart.

`TOKEN_SECRET` signs the tokens, so it is the trust boundary between
deployments: change it and every previously issued token stops validating, and
a token minted by one router is not valid on another.

## Suggested topology

```
developer laptops ──┐
CI jobs ────────────┼──► router (one per team)  ──► vendor subscription
scheduled agents ───┘        │
                             ├─ /metrics  ──► Prometheus
                             └─ audit.jsonl ─► log collector
```

One token per task keeps the audit trail attributable — see
[per-task-tokens.md](per-task-tokens.md) and
[audit-and-monitoring.md](audit-and-monitoring.md).

## Checklist before exposing the port

- [ ] `TOKEN_SECRET` set to a random value, not a default.
- [ ] `TOKEN_ADMIN_KEY` set — otherwise `/api/tokens` is open.
- [ ] `ROUTER_HOST=127.0.0.1`, or a published port restricted to loopback,
      unless the admin key is set and TLS terminates in front.
- [ ] `AUDIT_LOG` pointed somewhere durable.
- [ ] The subscription directory mounted **read-only**.
- [ ] Tokens issued with a `--max-requests` budget and a short TTL.
