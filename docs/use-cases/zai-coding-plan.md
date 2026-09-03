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
  --models <comma-separated-model-ids-available-to-this-key> \
  --subscriber-id primary \
  --acknowledge-intermediary-risk \
  --api-key-stdin
```

The warning is intentional. Without `--acknowledge-intermediary-risk`, an
enabled record is rejected. A JSON/import record which omits `enabled` remains
disabled. Router permits only one enabled Coding Plan subscriber and encrypts
the key at rest; list/show/API output is redacted.

A normal z.ai pay-as-you-go API key is not Coding Plan. Configure it separately
as `kind=openai-compatible` against its documented standard API endpoint and
terms. Router never guesses which quota class a key belongs to.

## Client policy

The safe allowlist is reviewed code, not z.ai's remote tool list:

| Signed Router client | Default | Exposed identity | Native z.ai protocol |
| --- | --- | --- | --- |
| Claude Code | allowed | `claude-zai-<model-id>` and `anthropic-zai-<model-id>` | Anthropic Messages |
| Codex | allowed | `z.ai/<model-id>` | OpenAI Responses |
| OpenCode | allowed | `z.ai/<model-id>` | OpenAI Chat Completions |
| Gemini CLI, Grok CLI, Qwen Code | denied | none | available only after one exact second acknowledgement |
| Agent, Cursor, SDK/curl, unidentified client | always denied | none | no override |

For example, accepting the separate risk for Gemini CLI changes only that cell:

```bash
pass show z-ai/coding-plan-key | router providers add \
  --name z-ai-personal --kind z.ai-coding-plan \
  --base-url https://api.z.ai --models <available-model-id> \
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

Router checks z.ai's documented non-inference
`GET /api/monitor/usage/quota/limit` operation before catalog exposure and
dispatch. A removed, expired, rejected, or unreachable key immediately removes
only GLM entries and makes stale selections fail locally. No inference probe is
used and no other provider is selected as fallback.

z.ai does not document a free dynamic model-catalog operation. The provider's
explicit operator configuration is therefore its catalog source, validated by
the free health operation. Router preserves those identifiers and does not
intersect them with a reviewed or hardcoded model-name table. A future model
can be configured without a Router source change. The reviewed boundary is the
provider/client/protocol policy, not recognition of a model name.

The exact client-visible registry selects the credential and fixed endpoint:

| Request | Upstream base |
| --- | --- |
| Claude alias over Messages | `https://api.z.ai/api/anthropic` |
| OpenCode alias over Chat Completions | `https://api.z.ai/api/coding/paas/v4` |
| Codex alias over Responses | `https://api.z.ai/api/v1` |

Router sends only the configured canonical model id upstream, preserves the
requested alias in the response, and records both identities in the audit
event. It never derives ownership by stripping an arbitrary prefix.
Streaming and tool calls use the same final authorization. Claude Code
`/api/services/anthropic/v1/messages/count_tokens` applies the same mapping locally and never calls a
forbidden provider.

## Claude Code model discovery

Claude Code **2.1.255 or newer** is required. `router with claude` and
`router clients setup claude` set
`CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1`, force nonessential startup
traffic on for discovery, and clear higher-priority credentials. When z.ai is
the only compatible live catalog, Router maps Claude Code's Default,
opus/sonnet/haiku families, subagents, and resumed sessions to one exact
currently advertised z.ai alias. With a native Anthropic catalog those pins
stay clear and gateway discovery remains authoritative. An explicit z.ai
command-line model wins and is propagated to the same subagent boundary.
Router validates every selected alias locally against the current signed
client/provider registry, so a built-in or cached choice cannot silently select
another credential.

Claude Code reads the gateway catalog at startup and may retain
`~/.claude/cache/gateway-models.json`. Restart Claude Code after changing the
credential, model list, or acknowledgements. A cached model can remain visible,
but Router still rejects it before any inference connection. `router clients
doctor claude` reports an actionable error for older versions.

Catalog responses remain successful when the allowed set is empty and include
a z.ai degradation reason after a failed health check. This lets a client
refresh without affecting healthy Claude, ChatGPT, or ordinary API providers.

## Remove access

```bash
router providers remove z-ai-personal
```

Removal makes every GLM alias unroutable immediately. Restart clients to clear
their picker cache; Router's final dispatch check is already authoritative.
