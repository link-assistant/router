# Use cases

Each document below covers exactly one scenario end to end — start the router,
issue the right token, configure the client, verify it works — so you can read
only the one you need.

The two scenarios named in [issue #45](https://github.com/link-assistant/router/issues/45)
come first; the per-CLI documents follow.

## Core scenarios

| Document | Scenario |
| --- | --- |
| [per-task-tokens.md](per-task-tokens.md) | One `la_sk_…` token per task, for audit, monitoring, security and isolation |
| [audit-and-monitoring.md](audit-and-monitoring.md) | Where per-token usage shows up: `/metrics`, `/v1/usage`, and the JSONL audit log |
| [claude-max-in-codex.md](claude-max-in-codex.md) | Use a **Claude MAX** subscription from **Codex CLI** (and any other OpenAI-dialect client) |
| [chatgpt-in-claude-code.md](chatgpt-in-claude-code.md) | Use a **ChatGPT/Codex** subscription from **Claude Code** (and any other Anthropic-dialect client) |

## Per-CLI configuration

| Document | CLI | Dialect it speaks to the router |
| --- | --- | --- |
| [cli-claude-code.md](cli-claude-code.md) | Claude Code | Anthropic Messages |
| [cli-codex.md](cli-codex.md) | Codex CLI | OpenAI Responses (only) |
| [cli-qwen-code.md](cli-qwen-code.md) | Qwen Code | OpenAI *or* Anthropic |
| [cli-gemini-cli.md](cli-gemini-cli.md) | Gemini CLI | Gemini / Vertex |
| [cli-opencode.md](cli-opencode.md) | opencode | OpenAI Chat Completions or Responses |
| [cli-grok-cli.md](cli-grok-cli.md) | Grok CLI | OpenAI Chat Completions |
| [cli-cursor.md](cli-cursor.md) | Cursor CLI (`cursor-agent`) | **Not supported** — no base-URL override exists |

## The one rule that makes all of this work

Every client above authenticates to the router with a **single opaque bearer
token** read from an environment variable or config file. That is exactly the
shape of a router `la_sk_…` token, so switching tasks, quotas or subscriptions
never requires touching the client's code — only the value of one variable.

The vendor credential (Claude MAX OAuth, ChatGPT OAuth, Gemini, Qwen, or a
provider API key) stays inside the router and is never sent to a client.

## Which dialect goes where

```
Claude Code ──Anthropic──┐
Qwen Code   ──Anthropic──┤
                         ├─► /v1/messages ──► Anthropic upstream (pass-through)
                         │                └─► Codex / Qwen / Gemini / OpenAI-compatible
                         │                    upstream (bridged, see
                         │                    chatgpt-in-claude-code.md)
Codex CLI   ──Responses──┐
opencode    ──Responses──┤
                         ├─► /v1/responses ─► Anthropic upstream (translated)
Grok CLI    ──Chat───────┤                 └─► native provider upstream
opencode    ──Chat───────┴─► /v1/chat/completions

Gemini CLI  ──Gemini─────► /api/gemini/v1beta, /api/vertex/v1
```

## Related documents

- [`../case-studies/issue-45/`](../case-studies/issue-45/) — the research,
  requirement trace and solution plans these documents implement.
- [`../../README.md`](../../README.md) — full flag, endpoint and deployment
  reference.
