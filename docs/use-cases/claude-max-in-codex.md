# Use case: Claude MAX inside Codex CLI

> **Goal** — drive **Codex CLI** (or any other OpenAI-dialect client) with a
> **Claude MAX** subscription, without giving the client the Claude OAuth
> credential.

> **Disabled by default.** Anthropic documents subscription OAuth for Claude
> Code/native applications, not third-party routing. This historical issue #45
> bridge now requires the exact `codex:claude` risk acceptance. A generic task
> token is never enough; use `router with codex` or `router clients setup codex`
> so the token carries an immutable Codex client and subscriber binding.

This is the first compatibility scenario named in
[issue #45](https://github.com/link-assistant/router/issues/45): *"Claude Max
subscription usage inside Codex"*.

## What the router does

Codex CLI speaks the OpenAI **Responses** API and nothing else — the
[Codex config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
states that `responses` is the only supported value of `wire_api`. The router
serves `/api/services/codex/v1/responses`, translates the request into Anthropic Messages, calls
`api.anthropic.com` with the Claude MAX OAuth token it holds, and translates the
answer — including SSE — back into Responses events.

```
Codex CLI ──POST /api/services/codex/v1/responses (Bearer la_sk_…)──► router ──Anthropic Messages
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

The router prepends the block only for native Claude Code traffic or after the
exact `codex:claude` override has authorized a request using a subscription
OAuth token (`sk-ant-oat…`). Your own system prompt is preserved
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
export UPSTREAM_PROVIDER=anthropic
router serve --allow-subscription-bridge codex:claude
```

Verify the credential is readable and unexpired:

```bash
router doctor
```

## 3. Launch with a bound token

```bash
router with codex "explain this repository"
```

For permanent configuration, run `router clients setup codex`; it writes a
short-lived Codex-bound token without printing it. `router tokens issue` creates
a generic token and is intentionally refused for consumer subscriptions.

## 4. Point Codex CLI at the router

Add a provider to `~/.codex/config.toml`:

```toml
model_provider = "link-assistant"
model = "gpt-5"

[model_providers.link-assistant]
name = "Link.Assistant.Router"
base_url = "http://127.0.0.1:8080/api/services/codex/v1"
env_key = "LINK_ASSISTANT_TOKEN"
wire_api = "responses"
```

Then run Codex normally after sourcing the managed environment file printed by
setup:

```bash
codex "explain this repository"
```

Notes on this configuration:

- `wire_api = "responses"` is required. Chat Completions is not an option for
  Codex, which is why the router's `/api/services/codex/v1/responses` endpoint (and its
  `response.created` / `response.output_text.delta` / `response.completed` SSE
  events) is the integration point.
- Built-in provider ids (`openai`, `ollama`, `lmstudio`) cannot be overridden —
  use a new id such as `link-assistant`.
- `env_key` names an environment variable, so each task can export a different
  `la_sk_…` token against the same config file.
- `/api/services/codex/v1/responses` is the only public Codex Responses path.

## 5. Model names

Codex sends the exact model selected from its authenticated client catalog.
Automatic mode routes only an unambiguous live identity; it never maps a
familiar spelling to a source-code tier. Cross-provider use must select an
operator bridge policy that resolves against the healthy account's current
catalog. If no compatible model is available, Router returns a local selection
error and makes no upstream request.

The audit record preserves requested, resolved, provider and canonical upstream
identity. The upstream receives its original catalog identifier.

## 6. Verify without the CLI

```bash
curl -s http://127.0.0.1:8080/api/services/codex/v1/responses \
  -H "Authorization: Bearer $LINK_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5","input":"say hello in five words"}' | jq .
```

A streaming check:

```bash
curl -sN http://127.0.0.1:8080/api/services/codex/v1/responses \
  -H "Authorization: Bearer $LINK_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5","input":"count to three","stream":true}'
```

You should see `response.created`, one or more `response.output_text.delta`
events, then `response.completed`.

## Limits and caveats

- **Anthropic Terms apply.** A Claude MAX subscription is a personal
  subscription. The override is an explicit policy/account-restriction risk;
  never share or resell it. Removing `codex:claude` restores the safe default.
- **Tool calls** are translated in both directions. Function outputs retain
  compatible text, image, and file parts; provider-specific reasoning/custom
  tool history and provider-owned file identifiers are rejected before the
  upstream request instead of being silently removed.
- **Codex-specific features** that assume the ChatGPT backend (for example
  `previous_response_id` or `conversation`) are not emulated. Non-null state
  handles are rejected; send the complete self-contained history instead.
- Compatible JSON Schema output formats, function-tool `strict`, and disabled
  parallel tool calls are preserved. Unsupported audio, multiple-choice, and
  log-probability response contracts fail with a Responses/Chat-shaped `400`.
- Caller-provided `safety_identifier` values are forwarded as Anthropic
  `metadata.user_id` and redacted from Router request logs. Responses `top_p`
  is preserved; requests that also set `temperature` are rejected because the
  Anthropic target cannot honor both sampling controls together.
- Responses execution controls are fail-closed: `background: true`,
  `store: true`, automatic truncation, and non-empty `stream_options` are
  rejected because Anthropic cannot honor them exactly. `max_tool_calls` is
  forwarded as `max_uses` only when exactly one server tool is present.
- The reverse direction — a ChatGPT subscription inside Claude Code — is
  documented separately in
  [chatgpt-in-claude-code.md](chatgpt-in-claude-code.md).
