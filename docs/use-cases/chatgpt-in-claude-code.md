# Use case: ChatGPT (and Qwen, Gemini, LiteLLM…) inside Claude Code

> **Goal** — drive **Claude Code** (or any other Anthropic-dialect client) with
> a **ChatGPT/Codex**, Qwen, Gemini or generic OpenAI-compatible backend.

> **Consumer subscription bridges are disabled by default.** ChatGPT OAuth is
> native only to Codex. Claude Code → ChatGPT requires the exact
> `claude:codex` risk acceptance and a Router-managed Claude token. Gemini and
> Qwen consumer subscriptions remain denied until their terms are recorded.
> Ordinary API-key providers, including LiteLLM, are a separate credential
> class and do not use this consumer-subscription override.

This is the second compatibility scenario named in
[issue #45](https://github.com/link-assistant/router/issues/45): *"ChatGPT Pro
usage inside Claude Code and so on (in any agentic CLI …)"*.

## Why this needs a bridge

Claude Code speaks **only** the Anthropic Messages API — its
[settings reference](https://code.claude.com/docs/en/settings) exposes
`ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN`, and no OpenAI dialect. So
serving it from a non-Anthropic subscription requires translating
Anthropic → OpenAI on the way in and OpenAI → Anthropic on the way out.

That bridge is what `src/anthropic_bridge.rs` and `src/anthropic_stream.rs` do:

```
Claude Code ──POST /api/services/anthropic/v1/messages (Bearer la_sk_…)──► router
                                                      │ Anthropic → OpenAI
                                                      ▼
                                             Codex / Qwen / Gemini /
                                             OpenAI-compatible upstream
                                                      │ OpenAI → Anthropic
   Anthropic Messages JSON or SSE ◄───────────────────┘
```

The protocol adapter remains available, but a consumer subscription is reached
only after the signed client/provider entitlement check:

| `UPSTREAM_PROVIDER` | Bridged? | Notes |
| --- | --- | --- |
| `anthropic` | no | native pass-through, nothing to translate |
| `codex` (`chatgpt`, `openai-codex`) | opt-in | requires `--allow-subscription-bridge claude:codex` |
| `qwen` (`qwen-code`, `dashscope`) | denied | terms row is pending; no override enables it |
| `gemini` (`google`, `code-assist`) | denied | terms row is pending; no override enables it |
| `openai-compatible` | **yes** | LiteLLM, vLLM, any `/v1/chat/completions` gateway |
| `gonka`, `crater` | no | these keep the Anthropic-surface behaviour they already had |

## 1. Log in with the vendor CLI once

```bash
codex     # writes ~/.codex/auth.json
```

The router refreshes access tokens in memory. If OpenAI rotates the refresh
token, the router atomically persists the new chain link before serving it,
preserving unrelated fields in `auth.json`. A read-only Codex home uses an
owner-only recovery sidecar under `DATA_DIR/refresh-recovery`, reconciled when
the primary becomes writable. Refresh and login/import share one account lock;
if neither the lock nor durable persistence is available, the request fails
closed instead of leaving a spent refresh token on disk.

## 2. Start the router against that subscription

```bash
export TOKEN_SECRET=$(openssl rand -hex 32)
export UPSTREAM_PROVIDER=codex
router serve --allow-subscription-bridge claude:codex
```

Check the credential:

```bash
router doctor
```

## 3. Launch with a Claude-bound token

```bash
router with claude
```

For permanent setup use `router clients setup claude` and source the printed
environment file. Generic tokens from `router tokens issue`, admin tokens, and
legacy unbound tokens cannot spend the ChatGPT subscription.

## 4. Point Claude Code at the router manually

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8080
export ANTHROPIC_AUTH_TOKEN="$CLAUDE_BOUND_ROUTER_TOKEN"
claude
```

The placeholder above must be an already issued immutable Claude-bound token;
changing User-Agent or a label cannot create that authority.

## 5. Choose the upstream model

Claude Code sends an exact client-visible identity. Router resolves an
operator-configured bridge model only after validating it against the healthy
account's current catalog; without one it deterministically selects a
protocol-compatible live record. There is no source-code provider/model
default. An empty or incompatible catalog returns a local selection error and
makes no upstream inference request.

```bash
router serve --bridge-model gpt-5
# or
ANTHROPIC_BRIDGE_MODEL=gpt-5 router serve
```

The response echoes back the model id **the client asked for**, so Claude Code's
own display and bookkeeping stay consistent. Use the audit log or
`/api/management/usage`
to see which upstream actually served it — see
[audit-and-monitoring.md](audit-and-monitoring.md).

## 6. Verify without the CLI

Non-streaming:

```bash
curl -s http://127.0.0.1:8080/api/services/anthropic/v1/messages \
  -H "Authorization: Bearer $TASK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":64,
       "messages":[{"role":"user","content":"say hello in five words"}]}' | jq .
```

Expect an Anthropic-shaped body: `"type":"message"`, `"role":"assistant"`, a
`content` array of blocks, `stop_reason`, and a `usage` object.

Streaming:

```bash
curl -sN http://127.0.0.1:8080/api/services/anthropic/v1/messages \
  -H "Authorization: Bearer $TASK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":64,"stream":true,
       "messages":[{"role":"user","content":"count to three"}]}'
```

Expect the Anthropic SSE vocabulary, in order: `message_start`,
`content_block_start`, one or more `content_block_delta`, `content_block_stop`,
`message_delta`, `message_stop`.

## What is translated

| Anthropic concept | Bridged as |
| --- | --- |
| `system` (string or block list) | leading `system` message |
| `messages[].content` text blocks | message text |
| `image` / `document` blocks | Responses image/file parts when the selected target can carry them losslessly |
| `tools` / `tool_choice` | OpenAI function tools, including `strict` and the parallel-call policy |
| `tool_use` / `tool_result` blocks | native Responses call/output items for Codex, preserving mixed text/image/file results and order |
| web search/fetch call and result history | native Responses server-tool items with IDs and result metadata |
| `output_config.effort` | compatible Responses reasoning effort (`max` maps to `xhigh`) |
| `metadata.user_id` | Responses `safety_identifier`, subject to the target's 64-character limit |
| `temperature`, `top_p`, `stop_sequences`, `stream` | direct equivalents, except that `temperature` and `top_p` are never sent **together** to an Anthropic upstream — it rejects the pair, so an explicit `temperature` wins and `top_p` is dropped |
| `max_tokens` | forwarded when supported; see the Codex caveat below |
| `stop_reason` | mapped from the OpenAI `finish_reason` |
| `usage.input_tokens` / `output_tokens` | mapped from upstream usage when reported |

`POST /api/services/anthropic/v1/messages/count_tokens` is answered **locally** with an estimate, since
the OpenAI-dialect upstreams expose no equivalent endpoint. Treat the number as
an approximation for budgeting, not as a billing figure.

## Limits and caveats

- **`thinking` / `redacted_thinking` history is rejected before a translated
  upstream request**, rather than being dropped or exposed as visible text.
  Native Anthropic requests remain untouched.
- Provider-owned file identifiers, unsupported document sources, non-text
  Chat tool results, and other history that cannot cross the selected protocol
  losslessly are rejected before inference. Use a self-contained continuation
  with URL/base64 content, or continue on the history's native provider.
- **Prompt caching** (`cache_control`) has no counterpart upstream and is
  ignored.
- **The Claude-to-Codex bridge emulates `max_tokens`.** The field remains
  required by Anthropic Messages, while the ChatGPT backend rejects its
  Responses equivalent. Router strips only the translated bridge field and
  applies a best-effort local output bound. Native Codex Responses requests are
  untouched and the upstream decides whether a supplied cap is valid.
- **`stop_sequences` is enforced locally for Codex**, including a sequence
  split across SSE chunks. The matched sequence is withheld from the client.
- Anthropic-only beta features and vendor-specific fields are not emulated.
- Token *estimates* replace exact `count_tokens` results (see above).
- Cost and quota accounting are the upstream vendor's; the router only counts
  requests. Cross-client use may violate provider account policy, is audited as
  the exact override cell, and must never be exposed as shared capacity.
- The reverse direction — a Claude MAX subscription inside an OpenAI-dialect
  client — is documented in
  [claude-max-in-codex.md](claude-max-in-codex.md).
