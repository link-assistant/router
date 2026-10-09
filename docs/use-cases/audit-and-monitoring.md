# Use case: auditing and monitoring per-task usage

> **Goal** — answer "which task token made which request, against which
> subscription, and how many requests and upstream-reported tokens has it
> spent?" both live and after the
> fact.

This is the observability half of [per-task-tokens.md](per-task-tokens.md).
Nothing here requires a client change; the router records what it already knows
when it authorises a request.

## Three views, three retention models

| View | Endpoint / file | Retention | Best for |
| --- | --- | --- | --- |
| Prometheus counters | `GET /api/management/metrics` (admin only) | in-memory, resets on restart | dashboards, alerts |
| JSON snapshot | `GET /api/management/usage` (admin only) | in-memory, resets on restart | per-token inspection, scripts |
| Audit trail | `--audit-log <file>` (JSONL) | durable, append-only | forensics, compliance |
| Persisted budgets | `tokens list` | durable token store | quota enforcement |
| Subscription health | `GET /api/management/health/subscriptions` (admin only) | live | uptime checks, paging |

## Is the router serving what it advertises?

`/api/health` answers whether the *process* is up. It is wired to both the liveness
and readiness probes in `deploy/k8s/router.yaml`, so it deliberately stays `ok`
when a subscription dies: restarting the container cannot mint a new OAuth
token, and failing the probe would crash-loop a deployment that is still serving
its other providers.

Subscription health is a separate question with a separate answer:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/api/management/health/subscriptions \
  -H "Authorization: Bearer $ROUTER_ADMIN_TOKEN"
```

`200` means every configured subscription can serve. `503` names each one that
cannot, and why:

```json
{
  "status": "degraded",
  "healthy_providers": ["codex"],
  "degraded_providers": [
    { "provider": "claude", "reason": "refresh token is no longer valid (invalid_grant): …" }
  ]
}
```

A subscription whose catalog has not been refreshed yet, for example the
catalog kept from before a restart, is listed under `starting_providers` and
answers `200`; only a refresh that fails or a rejected credential makes it
degraded. Router also waits up to 20 seconds for the first refresh of every
subscription before it accepts connections, so the first `/api/models` a client
sees already lists the subscription's models.

Only subscriptions this deployment is actually configured for are reported, so
"claude was never set up here" and "claude is currently unavailable" cannot
render identically. The same state is scrapeable:

```
link_assistant_subscription_healthy{provider="claude"} 0
link_assistant_subscription_healthy{provider="codex"} 1
```

A revoked credential needs a human to re-authenticate — `router auth claude` —
so this is the signal worth paging on.

## Live per-token counters

Every authorised request is attributed to its token id (the JWT `sub`) and the
label the token was issued with. The detailed counters are available only from
the admin-gated `/api/management/usage` endpoint:

```bash
curl -s http://127.0.0.1:8080/api/management/usage \
  -H "Authorization: Bearer $ROUTER_ADMIN_TOKEN" | jq .token_calls
```

```json
{
  "550e8400-…": { "label": "issue-45-solver", "requests": 42 }
}
```

The count increments once per *authorised* request — the same unit
`--max-requests` budgets. Persisted `used_tokens/max_tokens` in `tokens list`
instead comes from actual vendor response usage and survives restarts.
`/api/management/metrics` exposes aggregate totals and status codes only; it
never emits token ids, token labels, or account names, and remains on the
management listener.

## Durable audit trail

The audit log is **off by default**. Enable it with a path:

```bash
router serve --audit-log /var/log/link-assistant/audit.jsonl
# or
AUDIT_LOG=/var/log/link-assistant/audit.jsonl router serve
```

One JSON object per line is appended as each request is authorised:

```json
{"time":"2026-08-07T12:00:00.123456+00:00","token_id":"550e8400-…","label":"issue-45-solver","provider":"codex","surface":"anthropic","path":"/api/services/anthropic/v1/messages","model":"catalog-model-id"}
```

| Field | Meaning |
| --- | --- |
| `time` | RFC 3339 timestamp of the authorisation |
| `token_id` | Router token id — the JWT `sub`, **not** the token string |
| `label` | Label the token was issued with |
| `provider` | Upstream that served it: `anthropic`, `codex`, `gemini`, `qwen`, `gonka`, `crater`, `openai-compatible` |
| `surface` | Client-facing dialect: `anthropic`, `openai_chat`, `openai_responses` |
| `path` | Request path as the router saw it |
| `client_kind` | Signed managed-client binding, when present |
| `subscription_override` | Exact cross-provider bridge used, when present |
| `proxied_client_override` | Native identity accepted through an enabled trusted-proxy contract, such as `codex` |
| `model` | Model the client asked for, when the body carried one (omitted otherwise) |

### What the log deliberately does not contain

- the `la_sk_…` token string,
- any vendor credential or `Authorization` header,
- prompt or completion content.

A unit test (`events_never_carry_the_token_string_or_credentials`) asserts the
first two. The file is therefore safe to ship to a shared log collector.

This content policy applies only to the optional audit log. The default request
log is a diagnostic record of complete exchanges and therefore includes prompt
and completion content. It partially masks long credentials and fully masks
short ones, but operators with access to `$DATA_DIR/requests` can read message
content and should protect and retain that directory accordingly.

Consumed local denials also retain their redacted `client_response_body`, so
the file preserves Router's explanation when routing stops before upstream I/O.
A known subscription model with unusable provider credentials returns HTTP 503 /
`account_unavailable`; a model absent from the catalogs returns HTTP 404 /
`not_found_error`, and an invalid Router token returns HTTP 401 /
`authentication_error`. Only contacted upstreams have upstream phases. Response
body records reflect what the caller consumed, including partial consumption;
metadata and safety identifiers remain redacted alongside credentials.

### Rotation

Each write re-opens the file in append mode, so an external rotator
(`logrotate`, `copytruncate`, a container log driver) can move the file
underneath a running router without a restart. A failed write is logged as a
warning and dropped — auditing never takes the proxy down.

## Example queries

```bash
# requests per label, from the audit log
jq -r .label audit.jsonl | sort | uniq -c | sort -rn

# which upstream a task actually used (useful when bridging is enabled)
jq -r 'select(.label=="issue-45-solver") | [.surface,.provider,.model] | @tsv' audit.jsonl | sort -u

# tokens that are close to their budget
router tokens list
```

```promql
# Prometheus: aggregate request rate over 5 minutes
rate(link_assistant_requests_total[5m])
```

## Management diagnostics

All diagnostic endpoints use the existing management listener/IP policy and
require an administrator credential. Request ids are Router's `request_id` in
the operational log and `correlation_id` in `requests.lino`.

| Method and path under `/api/management` | Result |
| --- | --- |
| `GET /logs/requests/{id}` | `{id, records}` with the retained redacted phases, decoded from links notation or legacy JSON logs; 404 if the id is no longer retained |
| `GET /logs/errors` | `{enabled, files: [{name, bytes}]}`, oldest first |
| `GET /logs/errors/{name}` | Downloadable JSON with `id`, upstream `status`, redacted `body`, `complete`, and `truncated` |
| `DELETE /logs` | Clears retained request/error files; preserves operational and audit logs |
| `PATCH /logging` | Accepts `{"debug": true}` or `{"debug": false}`; returns `{debug, ttl_secs}` |
| `GET /usage/queue` | `{accounts: [{name, in_flight, queued}], in_flight, queued, unassigned}` |
| `GET /server/latest-version` | `{current_version, latest_version, update_available, release_url}` from the latest stable GitHub release |

Error capture is **off by default**. Set `ERROR_LOG_DIR` to enable it, and
optionally set `ERROR_LOG_MAX_BYTES` (default 10 MiB) to bound all capture files
in that directory. Zero disables writes. On Unix, captures use owner-only files
and directories (0600/0700). They evict the oldest files before a new file would exceed the
budget. Use a dedicated error directory. Its files can contain prompt content;
they are never added to metrics.

Only upstream HTTP 4xx/5xx bodies consumed by Router are captured. Capture
does not read ahead or change the response returned to the client. The body
buffer is limited to the smaller of 1 MiB and the configured total budget.
Incomplete or oversized bodies are represented by an omission marker, so a
partial JSON document cannot bypass credential redaction. Captures are
finalized when the upstream body finishes or is dropped. Clearing captures
also invalidates buffers already in flight. Ordinary request logging continues
during and after clearing; an active exchange may subsequently write new phases.

Debug mode lasts for `LOG_DEBUG_TTL_SECS` (default 300, valid range 1–86400).
Turning it off or waiting for expiry restores the original filter, including
`RUST_LOG` directives. A later toggle replaces the previous lease. Changes and
expiry are recorded in the optional audit log and the operational log. The
existing console opt-in still applies.

Active request counts include response streaming until consumption or
cancellation. `unassigned` counts exchanges that have not selected an upstream
account. Router dispatches immediately and has no application request queue,
so `queued` is always zero. The version endpoint performs a bounded read-only
GitHub check, returns 502 on a failed check, and never updates the server.

```bash
curl -s "$ROUTER_URL/api/management/logs/requests/$REQUEST_ID" \
  -H "Authorization: Bearer $ROUTER_ADMIN_TOKEN"
curl -s -X PATCH "$ROUTER_URL/api/management/logging" \
  -H "Authorization: Bearer $ROUTER_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' -d '{"debug":true}'
```

## Related

- [per-task-tokens.md](per-task-tokens.md) — issuing and scoping the tokens
  these views attribute traffic to.
- The router also exports overall counters (`link_assistant_requests_total`,
  `…_errors_total`, and per-status series) — see the main
  [`README.md`](../../README.md).
