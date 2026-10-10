# Account routing controls

Ordinary quota responses cool only the requested model on the selected account. Full model identifiers match exactly, so a `gpt-5` cooldown leaves `gpt-5-mini` available. Anthropic's explicitly named `opus`, `sonnet` and `haiku` windows continue to block that family. Credential-wide vendor windows, authentication failures (401/403), and terminal quota codes (`insufficient_quota`, `usage_limit_reached`, `quota_exhausted`, `billing_hard_limit_reached`, `credit_balance_too_low`) block every model on the account. A quota response without a requested model also blocks the account.

Recognized [thinking suffixes](thinking.md) share the base model's cooldown: `gpt-5(high)`, `gpt-5(low)` and `gpt-5` all use the `gpt-5` entry. Malformed or unrecognized suffixes remain literal model identifiers. Use the base model when resetting a thinking-enabled request's cooldown.

Errors delivered inside SSE or Codex WebSocket responses update the same cooldown state. Stream bytes stay unchanged. An empty or interrupted SSE body may fail over before its first byte reaches the client. Once any output starts, the request is never replayed; the existing stream termination handling reports incomplete streams.

Vendor utilization windows and `ACCOUNT_PAUSE_AT_PERCENT` remain account-wide. Cooldown resets preserve pauses, window readings, request counts, credential evidence and session bindings.

| Setting / CLI flag | Default | Meaning |
| --- | --- | --- |
| `POOL_RETRY_ROUNDS` / `--pool-retry-rounds` | `0` | Additional rounds after eligible credentials in a round are exhausted (0–16). Requires `POOL_FAILOVER=pre-first-byte`. |
| `POOL_MAX_RETRY_CREDENTIALS` / `--pool-max-retry-credentials` | `0` | Maximum distinct credentials in each round. Zero adds no cap; `POOL_FAILOVER_MAX_ATTEMPTS` still limits each round. |
| `POOL_MAX_RETRY_INTERVAL_SECS` / `--pool-max-retry-interval-secs` | `30` | Maximum accepted wait for an eligible account's cooldown to expire between rounds. A longer required wait ends retrying. |
| `ACCOUNT_MAX_COOLDOWN_SECS` / `--account-max-cooldown-secs` | `691200` | Maximum observed cooldown, including vendor resets. Bounded to eight days; zero disables observed cooldowns. |
| `SESSION_AFFINITY_SUBAGENTS` / `--session-affinity-subagents` | `true` | Bind a new child session to its parent's account when the parent has an active binding. |

Retry sends, response inspection on retries and waits share `POOL_FAILOVER_BUDGET_SECS`, measured from the first attempt. The first attempt retains the configured connect, first-byte and idle-read timeouts, including disabled timeouts for long reasoning turns. Explicit account pins remain strict. Default rounds preserve the existing one-round attempt limit; retrying cannot extend the failover budget.

These limits also apply when [per-account routing policies](use-cases/account-routing-policy.md) are active. An initial cooldown wait consumes a retry round, and an explicit account `request_retry` caps the total attempts across rounds. Model aliases use their actual upstream model's cooldown. Policies with `disable_cooling` or a matching `relay` rule retain their cooling opt-out, including errors received inside streams.

Retries on the same account retain signed thinking and encrypted reasoning history. A switch to another account removes history bound to the original account. Thinking configuration is checked against the selected account's current capabilities on every retry, preserving the client's original controls before any account-specific clamp or drop.

Parent identifiers are accepted from `x-parent-session-id`, `x-codex-parent-session-id`, `x-parent-thread-id`, or `parent-session-id`, then from `context`, `metadata`, or root JSON fields named `parent_session_id` or `parent_thread_id`. Headers take precedence. An existing child's own binding takes precedence over a newly supplied parent. Explicit caller-token account pins take precedence over both. `SESSION_AFFINITY_TTL_SECS=0` disables all session affinity. With failover enabled, a temporarily unavailable parent account permits a detour without rebinding the child.

## Management endpoints

These endpoints require the same admin authentication as other management routes. They are available on management listeners even when metrics are disabled. Runtime changes apply to this running pool; configure the environment for changes that must survive restart. Cooldown state persists in the configured data directory.

The combined listener permits management access from loopback by default. These controls also follow the shared authentication lockout policy; see [management access configuration](security/management-access.md) for remote access and recovery settings.

```sh
curl -X PATCH "$ROUTER_URL/api/management/routing" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"strategy":"fill-first"}'

curl -X POST "$ROUTER_URL/api/management/routing/cooldown/reset" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"account":"primary","model":"gpt-5"}'
```

Strategy values use the existing aliases for `round-robin`, `weighted-round-robin`, `fill-first`/`priority`, and `least-used`. Responses return the canonical strategy. Only new sessions use a changed strategy; existing bindings remain on their accounts.

Reset `{}` clears all cooldowns, `{"account":"primary"}` clears every cooldown on that account, and adding `"model"` clears only that exact model/family entry. A model reset cannot lift an account-wide cooldown. To clear a vendor family entry, pass its family key (for example `opus`). Responses return `{"cleared":N}`. Unknown accounts return 404; invalid strategy/reset scope returns 400; an unconfigured pool returns 409.

Both successful changes append JSONL audit records when `AUDIT_LOG` is configured. Records include the admin token ID when available, the operation, its path and changed values. They never include bearer tokens or upstream credentials.
