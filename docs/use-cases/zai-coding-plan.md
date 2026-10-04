# Experimental z.ai GLM Coding Plan routing

This mode connects one person's z.ai GLM Coding Plan to that same person's
Router-managed Claude Code, Codex, or OpenCode client. It is a distinct
credential class, disabled by default, and is never inferred from an API key.

z.ai names those tools as supported, but its published documents do not
explicitly approve sending a personal Coding Plan credential through an
intermediary proxy. Until written clarification is recorded here, Router calls
this mode **experimental and risk-accepted**, not generally supported. Review
the [usage policy](https://docs.z.ai/devpack/usage-policy) and
[subscription terms](https://docs.z.ai/legal-agreement/subscription-terms):
policy violations can restrict or ban the subscriber account.

## Configure one personal credential

Choose a `subscriber_id` that exactly matches the `principal_id` in the
Router-managed client tokens which may use this key. Managed single-account
setups use `primary`:

```bash
pass show z-ai/coding-plan-key | router providers add \
  --name z-ai-personal \
  --kind z.ai-coding-plan \
  --base-url https://api.z.ai \
  --subscriber-id primary \
  --acknowledge-intermediary-risk \
  --api-key-stdin
```

The warning is intentional. Without `--acknowledge-intermediary-risk`, an
enabled record is rejected. A JSON/import record which omits `enabled` remains
disabled. Router permits only one enabled Coding Plan subscriber and encrypts
the key at rest; list/show/API output is redacted.

Adding or importing an enabled Coding Plan record first validates its key with
the authenticated model catalogue and only then promotes the staged encrypted
record under the provider-store lock. HTTP errors, HTTP-200 error bodies,
malformed replies, timeouts, and uncertain persistence leave the previous
record byte-for-byte authoritative. Add `--if-absent` to keep an existing name
instead of replacing it; local and remote commands return the same
machine-readable `promoted` or `already_present` outcome without key material.

A normal z.ai pay-as-you-go API key is not Coding Plan. Configure it separately
as `kind=openai-compatible` against its documented standard API endpoint and
terms. Router never guesses which quota class a key belongs to.

## Client policy

The safe allowlist is reviewed code, not z.ai's remote tool list:

| Signed Router client | Default | Exposed identity | Native z.ai protocol |
| --- | --- | --- | --- |
| Claude Code | allowed | exact vendor model ID | Anthropic Messages |
| Codex | allowed | exact vendor model ID | OpenAI Responses |
| OpenCode | allowed | exact vendor model ID | OpenAI Chat Completions |
| Gemini CLI, Grok CLI, Qwen Code | denied | none | available only after one exact second acknowledgement |
| Agent, Cursor, SDK/curl, unidentified client | always denied | none | no override |

For example, accepting the separate risk for Gemini CLI changes only that cell:

```bash
pass show z-ai/coding-plan-key | router providers add \
  --name z-ai-personal --kind z.ai-coding-plan \
  --base-url https://api.z.ai \
  --subscriber-id primary --acknowledge-intermediary-risk \
  --acknowledge-unsupported-client gemini --api-key-stdin
```

The CLI prints an account-ban warning and the audit event records
`gemini:z.ai-coding-plan`. Replacing the record without that option revokes the
exception immediately. `grok` and `qwen` require their own options; one never
enables another or a future client.

Every request needs all of: a signed immutable `client_kind`, the configured
subscriber principal, that client's real protocol evidence, a currently
healthy key, and an exact advertised model identity. A User-Agent alone grants
nothing. Admin, generic, manual, legacy, shared, or differently bound tokens
cannot spend Coding Plan quota.

## Discovery, health, and routing

Router fetches z.ai's authenticated, non-inference
`GET /api/anthropic/v1/models` endpoint. That live result is the source of
truth for catalog exposure, health, and dispatch; a provider edit or credential
change invalidates the cached identity immediately, successful results refresh
after five minutes, and a failed refresh retries after fifteen seconds. Legacy
stored `models` values are not used as a healthy-provider catalog. No inference
probe or hardcoded GLM name/version list is used.

For Codex-bound catalogue requests, Router retains reasoning fields only when
the exact live model row supplies them. It does not supplement all z.ai-owned
models with one `low`/`high`/`max` profile or a shared default. A model with no
reasoning metadata remains visible as inventory, while the corresponding
capability is absent; Router never changes `model_reasoning_effort` based on an
owner-wide guess.

`router with codex` lists such a row in its process-local catalog with an empty
supported-effort list and the user's own configured effort as the row default,
so Codex keeps that effort at startup and when `/model` switches to it. The row
description says the metadata is unavailable. A z.ai-only catalog whose GLM
rows omit metadata therefore launches `--version`, an explicit `--model`, and
the interactive TUI, instead of refusing every model as v1.14.3 did (issue
#628). Only a row whose metadata contradicts itself, such as a default that is
not among its supported levels, is left out, with a warning naming it. Claude capability identities follow the same exact-row rule,
and a Claude launch that requires missing metadata fails with the affected
model ID.

A failed refresh degrades only z.ai and does not clear healthy subscription or
ordinary-provider catalogs. Exact same-ID collisions across providers return an
explicit conflict; Router neither selects by provider order nor manufactures a
qualified alias. Vendor aliases returned as their own exact IDs remain their
own selectable rows.

The exact client-visible registry selects the credential and fixed endpoint:

| Request | Upstream base |
| --- | --- |
| Claude Code Messages | `https://api.z.ai/api/anthropic` |
| OpenCode Chat Completions | `https://api.z.ai/api/coding/paas/v4` |
| Codex Responses | `https://api.z.ai/api/v1` |

Router sends the exact live model ID upstream unchanged. Native request
identity headers, response JSON, response metadata, and SSE frames are relayed
without Router aliases or fields. Router still changes the source IP,
destination authority, TLS/HTTP connection fingerprint, credential, and
transport framing inherent to proxying; it does not claim transport-level
invisibility.
Streaming and tool calls use the same final authorization. Claude Code
`/api/services/anthropic/v1/messages/count_tokens` applies the same live-model
policy locally, then returns an explicit unavailable error because z.ai does
not expose a proven exact non-inference counter. It never starts inference.

## Claude Code model discovery

Claude Code **2.1.255 or newer** is required. `router with claude` and
`router clients setup claude` set
`CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1`, force nonessential startup
traffic on for discovery, and clear higher-priority credentials. Claude's
gateway discovery supplies exact native Claude IDs. For `router with claude`,
Router also builds a process-local `modelPicker` from the client-authorized live
catalog, adding every exact GLM ID that Claude's discovery filter removes. Each
ID appears once and reaches Router unchanged. Router never invents a prefix,
writes Claude's model cache, or maps GLM onto Opus, Sonnet, or Haiku. When z.ai
is the only compatible catalog, main and subagent fallback use the newest exact
live model (by the provider's `created` timestamp), and the family variables
behind Claude's `Default (recommended)` row are pinned to the same model, so
Default never describes an unauthorized Opus (issue #630). An explicit `--model`
wins at every one of these boundaries.
Router validates every selected exact ID locally against the current signed
client/provider registry, so a built-in or cached choice cannot silently select
another credential.

Claude Code reads the gateway catalog at startup and may retain
`~/.claude/cache/gateway-models.json`. Restart Claude Code after changing the
credential, provider, or acknowledgements. A cached model can remain visible,
but Router still rejects it before any inference connection. `router clients
doctor claude` reports an actionable error for older versions.

Catalog responses remain successful when the allowed set is empty and include
a z.ai degradation reason after a failed health check. This lets a client
refresh without affecting healthy Claude, ChatGPT, or ordinary API providers.

## An exhausted plan

z.ai answers an account with no balance or resource package with HTTP 429 and
an Anthropic-shaped `rate_limit_error`, for example
`{"error":{"code":"1113","message":"[1113][Insufficient balance or no resource package. Please recharge.][<request id>]","type":"rate_limit_error"},"type":"error"}`.
Clients retry a 429, so Claude Code used to wait silently forever (issue #657).
Router reads the business code
([z.ai error codes](https://docs.z.ai/api-reference/api-code)) and, for an
account state that only the operator or the next billing period can change
(1113, 1309, 1310, 1311, 1314, 1315 and 1316–1321), answers with a
non-retryable **402**: Anthropic `billing_error` on Messages and
`insufficient_quota` on Chat Completions and Responses. The message names
z.ai's reason and the code, and the body carries `upstream_code` and
`upstream_request_id`. The `x-router-upstream-error-code` header carries the
code as well. Short-window limits (1302, 1305, 1308, 1313) and every other
refusal are relayed unchanged as before.

The account is then recorded as exhausted until z.ai serves a request for it
again:

- `/health/subscriptions` lists z.ai under `degraded_providers` with
  `state: "exhausted"`, the reason and `upstream_code`. The
  `link_assistant_subscription_healthy{provider="z.ai"}` gauge reads `0`.
- `router doctor` and `deploy --status` print a `provider_exhausted` line.
- `router usage` shows z.ai as `exhausted` with the reason as its limit
  reason.
- `/api/models` keeps the GLM rows, since z.ai still lists them, but marks
  each one `router_available: false` with `router_unavailable_reason`, and
  lists z.ai under `degraded_providers`.
- `router with claude` labels those rows `(unavailable)` in its `/model`
  picker. If the saved, explicit or fallback model is one of them, it prints a
  warning before launch naming the reason and a servable alternative. A fresh
  profile is never pointed at an unavailable row while a servable one exists.

The state is kept in `data/provider-exhaustion.json` (owner-only) until z.ai
serves a request again or the provider is replaced or removed, so it survives
a restart. `router doctor` and
`deploy --status` read that file offline and print one line per exhausted
account, for example
`provider_exhausted provider=z-ai-personal upstream_code=1113 observed_at_unix=… reason="…"`;
`router doctor` then exits 1.

A request whose headers do not prove the token's bound client is never sent to
z.ai. When that client is one the plan permits and the cached z.ai catalog
lists the requested model, Router
answers **403** `permission_error` saying so. It used to answer a 404 claiming
no subscription advertises the model, which contradicted `/api/models` for the
same token.

## Remove access

```bash
router providers remove z-ai-personal
```

Removal makes every z.ai model unroutable immediately. Restart clients to clear
their picker cache; Router's final dispatch check is already authoritative.
