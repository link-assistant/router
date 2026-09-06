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
traffic on for discovery, and clear higher-priority credentials. When z.ai is
the only compatible live catalog, Router maps only Claude Code's Default/main
turn and subagent boundary to the first exact currently advertised z.ai model.
It does not map that model onto Opus, Sonnet, or Haiku, because doing so creates
three duplicate, misleading family rows. Current Claude Code can show only the
selected custom default in `/model`; use `router with --model <exact-id> claude`
for another ID from a multi-model z.ai catalog. With a native Anthropic catalog
all family/default pins stay clear, preserving native family behavior; select a
z.ai ID explicitly when required. An explicit z.ai command-line model is also
propagated to the subagent boundary.
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

## Remove access

```bash
router providers remove z-ai-personal
```

Removal makes every z.ai model unroutable immediately. Restart clients to clear
their picker cache; Router's final dispatch check is already authoritative.
