# Use case: ChatGPT (and Qwen, Gemini, LiteLLM…) inside Claude Code

> **Goal** — drive **Claude Code** (or any other Anthropic-dialect client) with
> a **ChatGPT/Codex**, Qwen, Gemini or generic OpenAI-compatible backend.

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
Claude Code ──POST /v1/messages (Bearer la_sk_…)──► router
                                                      │ Anthropic → OpenAI
                                                      ▼
                                             Codex / Qwen / Gemini /
                                             OpenAI-compatible upstream
                                                      │ OpenAI → Anthropic
   Anthropic Messages JSON or SSE ◄───────────────────┘
```

The bridge is enabled automatically whenever the Anthropic surface is used with
one of these upstreams:

| `UPSTREAM_PROVIDER` | Bridged? | Notes |
| --- | --- | --- |
| `anthropic` | no | native pass-through, nothing to translate |
| `codex` (`chatgpt`, `openai-codex`) | **yes** | request is further converted to the Responses shape |
| `qwen` (`qwen-code`, `dashscope`) | **yes** | Chat Completions upstream |
| `gemini` (`google`, `code-assist`) | **yes** | Code Assist upstream |
| `openai-compatible` | **yes** | LiteLLM, vLLM, any `/v1/chat/completions` gateway |
| `gonka`, `crater` | no | these keep the Anthropic-surface behaviour they already had |

## 1. Log in with the vendor CLI once

```bash
codex     # writes ~/.codex/auth.json
```

The router reads that file read-only, refreshes an expired token **in memory**,
and never writes back.

## 2. Start the router against that subscription

```bash
export TOKEN_SECRET=$(openssl rand -hex 32)
export UPSTREAM_PROVIDER=codex
router serve
```

Check the credential:

```bash
router doctor
```

## 3. Issue a task token

```bash
export TASK_TOKEN=$(
  router tokens issue --label claude-code-on-chatgpt --ttl-hours 8 --max-requests 200
)
```

## 4. Point Claude Code at the router

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8080
export ANTHROPIC_AUTH_TOKEN="$TASK_TOKEN"
claude
```

Claude Code now issues `POST /v1/messages` as usual; the answers come from the
ChatGPT subscription.

## 5. Choose the upstream model

Claude Code sends a `claude-…` model id, which means nothing to a Codex or Qwen
backend. The router resolves the upstream model in this order:

1. `--bridge-model` / `ANTHROPIC_BRIDGE_MODEL`, if set;
2. a per-provider default:

| Provider | Default upstream model |
| --- | --- |
| `codex` | `gpt-5-codex` |
| `qwen` | `qwen3-coder-plus` |
| `gemini` | the Gemini default model |
| `openai-compatible` | the stored provider's `default_model` |

```bash
router serve --bridge-model gpt-5
# or
ANTHROPIC_BRIDGE_MODEL=gpt-5 router serve
```

The response echoes back the model id **the client asked for**, so Claude Code's
own display and bookkeeping stay consistent. Use the audit log or `/v1/usage`
to see which upstream actually served it — see
[audit-and-monitoring.md](audit-and-monitoring.md).

## 6. Verify without the CLI

Non-streaming:

```bash
curl -s http://127.0.0.1:8080/v1/messages \
  -H "Authorization: Bearer $TASK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":64,
       "messages":[{"role":"user","content":"say hello in five words"}]}' | jq .
```

Expect an Anthropic-shaped body: `"type":"message"`, `"role":"assistant"`, a
`content` array of blocks, `stop_reason`, and a `usage` object.

Streaming:

```bash
curl -sN http://127.0.0.1:8080/v1/messages \
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
| `image` blocks | OpenAI image parts |
| `tools` / `tool_choice` | OpenAI function tools |
| `tool_use` / `tool_result` blocks | assistant `tool_calls` / `tool` messages |
| `temperature`, `top_p`, `stop_sequences`, `stream` | direct equivalents, except that `temperature` and `top_p` are never sent **together** to an Anthropic upstream — it rejects the pair, so an explicit `temperature` wins and `top_p` is dropped |
| `max_tokens` | forwarded when supported; see the Codex caveat below |
| `stop_reason` | mapped from the OpenAI `finish_reason` |
| `usage.input_tokens` / `output_tokens` | mapped from upstream usage when reported |

`POST /v1/messages/count_tokens` is answered **locally** with an estimate, since
the OpenAI-dialect upstreams expose no equivalent endpoint. Treat the number as
an approximation for budgeting, not as a billing figure.

## Limits and caveats

- **`thinking` / `redacted_thinking` blocks are dropped**, not guessed at —
  there is no OpenAI equivalent. Extended-thinking output will not appear.
- **Prompt caching** (`cache_control`) has no counterpart upstream and is
  ignored.
- **Codex cannot enforce `max_tokens`.** The field remains required by the
  Anthropic Messages protocol, but the ChatGPT backend rejects its Responses
  equivalent. The translated response stays a canonical Anthropic response and
  carries no router-specific warning header. Callers that require a hard
  per-request output cap must select a provider that supports one; optional
  OpenAI Chat/Responses caps on Codex are rejected explicitly rather than
  silently dropped.
- **`stop_sequences` is enforced locally for Codex**, including a sequence
  split across SSE chunks. The matched sequence is withheld from the client.
- Anthropic-only beta features and vendor-specific fields are not emulated.
- Token *estimates* replace exact `count_tokens` results (see above).
- Cost and quota accounting are the upstream vendor's; the router only counts
  requests.
- The reverse direction — a Claude MAX subscription inside an OpenAI-dialect
  client — is documented in
  [claude-max-in-codex.md](claude-max-in-codex.md).
