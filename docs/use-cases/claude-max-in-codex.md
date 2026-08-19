# Use case: Claude MAX inside Codex CLI

> **Goal** — drive **Codex CLI** (or any other OpenAI-dialect client) with a
> **Claude MAX** subscription, without giving the client the Claude OAuth
> credential.

This is the first compatibility scenario named in
[issue #45](https://github.com/link-assistant/router/issues/45): *"Claude Max
subscription usage inside Codex"*.

## What the router does

Codex CLI speaks the OpenAI **Responses** API and nothing else — the
[Codex config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
states that `responses` is the only supported value of `wire_api`. The router
serves `/v1/responses`, translates the request into Anthropic Messages, calls
`api.anthropic.com` with the Claude MAX OAuth token it holds, and translates the
answer — including SSE — back into Responses events.

```
Codex CLI ──POST /v1/responses (Bearer la_sk_…)──► router ──Anthropic Messages
                                                            (Bearer OAuth)──► api.anthropic.com
```

The client never sees the OAuth token. It only ever holds a task-scoped
`la_sk_…` token.

### The Claude Code identity block

`api.anthropic.com` only serves a Claude MAX OAuth credential when the request's
**first system block** is Claude Code's own identity line:

```
You are Claude Code, Anthropic's official CLI for Claude.
```

Codex never sends it — it does not know Claude exists. A request without the
line is rejected with a **misleading** `429 rate_limit_error` whose message is
literally `"Error"`, even when no rate limit has been hit (captured live in
[`docs/case-studies/issue-45/evidence/`](../case-studies/issue-45/evidence/)).

The router therefore prepends the block whenever the upstream credential is a
subscription OAuth token (`sk-ant-oat…`), on both the `/v1/responses` and the
pass-through `/v1/messages` surfaces. Your own system prompt is preserved
immediately after it, and a request that already starts with the line — every
request Claude Code itself makes — is left untouched. Plain API keys
(`sk-ant-api…`) are never modified.

## 1. Log in with Claude Code once

The router reads (never writes) the Claude Code session:

```bash
claude          # completes the OAuth login, writes ~/.claude/.credentials.json
```

## 2. Start the router

```bash
export TOKEN_SECRET=$(openssl rand -hex 32)
export UPSTREAM_PROVIDER=anthropic          # the default
router serve                 # listens on 0.0.0.0:8080
```

Verify the credential is readable and unexpired:

```bash
router doctor
```

## 3. Issue a token for this task

```bash
export LINK_ASSISTANT_TOKEN=$(
  router tokens issue --label codex-on-claude --ttl-hours 24 --max-requests 200
)
```

(See [per-task-tokens.md](per-task-tokens.md) for what the flags buy you.)

## 4. Point Codex CLI at the router

Add a provider to `~/.codex/config.toml`:

```toml
model_provider = "link-assistant"
model = "gpt-5"

[model_providers.link-assistant]
name = "Link.Assistant.Router"
base_url = "http://127.0.0.1:8080/v1"
env_key = "LINK_ASSISTANT_TOKEN"
wire_api = "responses"
```

Then run Codex normally:

```bash
codex "explain this repository"
```

Notes on this configuration:

- `wire_api = "responses"` is required. Chat Completions is not an option for
  Codex, which is why the router's `/v1/responses` endpoint (and its
  `response.created` / `response.output_text.delta` / `response.completed` SSE
  events) is the integration point.
- Built-in provider ids (`openai`, `ollama`, `lmstudio`) cannot be overridden —
  use a new id such as `link-assistant`.
- `env_key` names an environment variable, so each task can export a different
  `la_sk_…` token against the same config file.
- `/api/codex/v1/responses` is an equivalent namespaced alias if you prefer an
  explicit path.

## 5. Model names

Codex will send an OpenAI model id. The router maps it to a Claude tier:

This compatibility alias table applies when the router is explicitly pinned to
Anthropic. In automatic multi-subscription mode, the live catalogs own model
attribution, so an OpenAI-shaped name cannot silently select Claude.

| Requested | Served by |
| --- | --- |
| `gpt-4o-mini`, `gpt-4-mini` | Claude Haiku |
| `o1`, `o1-pro`, `o3`, `o4`, `gpt-5` | Claude Opus |
| `gpt-4`, `gpt-4-turbo`, `gpt-4o` | Claude Sonnet |
| `claude-…` | passed through unchanged |
| anything else | rejected with `404 not_found_error` |

If you want an exact model, set `model = "claude-sonnet-4-5-20250929"` in
`config.toml` — Claude-native ids pass through untouched.

The `model` field in successful buffered and streaming responses contains the
resolved Claude model id, not the OpenAI alias from the request.

## 6. Verify without the CLI

```bash
curl -s http://127.0.0.1:8080/v1/responses \
  -H "Authorization: Bearer $LINK_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5","input":"say hello in five words"}' | jq .
```

A streaming check:

```bash
curl -sN http://127.0.0.1:8080/v1/responses \
  -H "Authorization: Bearer $LINK_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5","input":"count to three","stream":true}'
```

You should see `response.created`, one or more `response.output_text.delta`
events, then `response.completed`.

## Limits and caveats

- **Anthropic Terms apply.** A Claude MAX subscription is a personal
  subscription; use this to serve your own tooling, not to resell capacity.
- **Tool calls** are translated in both directions, but vendor-specific
  extensions that have no Anthropic equivalent are dropped rather than guessed.
- **Codex-specific features** that assume the ChatGPT backend (for example
  server-side conversation state) are not emulated; each request is
  self-contained.
- The reverse direction — a ChatGPT subscription inside Claude Code — is
  documented separately in
  [chatgpt-in-claude-code.md](chatgpt-in-claude-code.md).
