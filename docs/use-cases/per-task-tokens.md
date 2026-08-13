# Use case: one token per task

> **Goal** — every task, agent, CI job or teammate gets its own `la_sk_…`
> token, so usage can be attributed, capped and revoked independently, while a
> single subscription is issued once and never leaves the router.

This is the first requirement of
[issue #45](https://github.com/link-assistant/router/issues/45):

> Each task separate token (we can use universal tokens issuing, but user should
> be able to use each token in such way) — for audit/monitoring/security/isolation.

## Why one token per task

| Property | What a per-task token gives you |
| --- | --- |
| **Audit** | Every request carries a token id, so the JSONL audit log answers "which task did this?" after the fact |
| **Monitoring** | Admin-only `/v1/usage` exposes per-token request counts while public `/metrics` stays aggregate-only |
| **Security** | A leaked task token exposes one task's budget, not the subscription — the vendor OAuth credential never leaves the router |
| **Isolation** | `--max-requests` bounds the blast radius of a runaway agent; `--account` pins a task to one subscription in a pool |

## 1. Start the router

```bash
export TOKEN_SECRET=$(openssl rand -hex 32)
link-assistant-router serve
```

## 2. Issue one token per task

Via the CLI:

```bash
link-assistant-router tokens issue \
  --label "issue-45-solver" \
  --ttl-hours 24 \
  --max-requests 500
```

Or via the admin endpoint, which is what a CI job or an orchestrator will use:

```bash
curl -s -X POST http://127.0.0.1:8080/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"ttl_hours": 24, "label": "issue-45-solver", "max_requests": 500}' \
  | jq -r .token
```

Both return a token of the form `la_sk_eyJ…`. The `label` is the human name the
audit log and the admin usage snapshot will carry, so use something you can grep
for later — an issue id, a job id, a person, a service.

Issuing is **universal**: one endpoint issues every token. What makes a token
"per task" is the claims you attach to it, not a separate issuing mechanism.

## 3. Scope the token

| Flag / field | Effect |
| --- | --- |
| `--label` / `label` | Name shown in `tokens list`, admin-only `/v1/usage`, and the audit log |
| `--ttl-hours` / `ttl_hours` | Token stops working after this many hours; short TTLs make revocation mostly unnecessary |
| `--max-requests` / `max_requests` | Hard cap on forwarded requests; `429 rate_limit_error` after that. Omit for unlimited |
| `--account` / `account` | Strict pin to one account in a multi-subscription pool. Pinned requests fail rather than silently changing identity |

The budget is enforced for **every** upstream — Anthropic, Codex, Gemini, Qwen,
Gonka, Crater and generic OpenAI-compatible providers — so a task token cannot
escape its cap by being pointed at a different backend.

## 4. Hand the token to exactly one task

Every supported CLI takes its credential from a single environment variable or
config field, so a per-task token is a per-task export:

```bash
# task A
ANTHROPIC_BASE_URL=http://127.0.0.1:8080 \
ANTHROPIC_AUTH_TOKEN="$TOKEN_TASK_A" \
claude -p "fix issue 45"

# task B, same router, same subscription, separate budget and audit trail
ANTHROPIC_BASE_URL=http://127.0.0.1:8080 \
ANTHROPIC_AUTH_TOKEN="$TOKEN_TASK_B" \
claude -p "review PR 46"
```

See the per-CLI documents in [`README.md`](README.md) for the exact variable
each client reads.

## 5. Watch and retire the token

```bash
link-assistant-router tokens list          # id, label, expiry, used/max requests
link-assistant-router tokens show <id>     # one token's metadata
link-assistant-router tokens revoke <id>   # immediate, persisted across restarts
```

Usage and revocation live in the persistent token store, so both survive a
router restart.

Complete exchanges are grouped under
`$DATA_DIR/requests/<sha256-of-token-truncated>/requests.jsonl`. Every phase
includes `token_hash`, `token_id`, and `token_label`, so one task's client and
upstream traffic can be audited without scanning another task's records. The
configured request-log size limit applies independently to each token. Missing
or invalid credentials are written only to `requests/unauthenticated/`.

Request-log directories are retained after expiry or revocation so retiring a
credential does not erase its audit evidence. Operators may archive or remove
those directories according to their own retention policy.

For where the usage numbers surface, see
[audit-and-monitoring.md](audit-and-monitoring.md).

## Operational notes

- **Never share one token between two tasks.** The token id is the only
  attribution key the router has; sharing it merges two tasks into one series.
- **`TOKEN_SECRET` is the root secret.** Anyone holding it can mint tokens.
  Keep it out of the environment of the tasks themselves.
- **Revocation is by token id, not by label.** Labels are not unique on purpose
  — you may want `ci` on fifty tokens.
- **Tokens are opaque to the client.** No client ever needs the vendor OAuth
  token, the `anthropic-beta` flag, or an `anthropic-version` header; the router
  injects those itself.
