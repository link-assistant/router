# Use cases

Each document below covers exactly one scenario end to end — start the router,
issue the right token, configure the client, verify it works — so you can read
only the one you need.

The two scenarios named in [issue #45](https://github.com/link-assistant/router/issues/45)
come first; the per-CLI documents follow.

## Core scenarios

| Document | Scenario |
| --- | --- |
| [self-hosting.md](self-hosting.md) | Running the router as an internal component of personal or corporate infrastructure — and who can reach the endpoint that mints tokens |
| [remote-login.md](remote-login.md) | Authorizing a fresh Docker deployment over HTTP, with no credential file to mount |
| [admin-ui.md](admin-ui.md) | The opt-in browser console on its own port: enabling it, the two-phase first-visitor claim, and the `localStorage` trade-off |
| [chat-admin-bots.md](chat-admin-bots.md) | The optional Telegram and VK admin bots: private chats only, sharing one system-wide admin claim with the web UI |
| [per-task-tokens.md](per-task-tokens.md) | One `la_sk_…` token per task, for audit, monitoring, security and isolation |
| [audit-and-monitoring.md](audit-and-monitoring.md) | Public aggregate metrics, admin-only per-token usage, and the JSONL audit log |
| [with-router.md](with-router.md) | Temporary one-line client launcher, remote selection, managed Docker server, per-run credentials, and exact global undo |
| [claude-max-in-codex.md](claude-max-in-codex.md) | Historical Claude MAX → Codex bridge, disabled by default behind exact risk acceptance |
| [chatgpt-in-claude-code.md](chatgpt-in-claude-code.md) | Historical cross-client adapters with deny-by-default subscription policy |
| [zai-coding-plan.md](zai-coding-plan.md) | Experimental, subscriber-bound **z.ai GLM Coding Plan** routing for explicitly recognized tools |

## Per-CLI configuration

Use [`with-router.md`](with-router.md) for temporary-by-default launches and
[`configure-clients.md`](configure-clients.md) for permanent safe merge,
backup, removal, and live diagnosis across the full client matrix. The
individual documents below also describe binary-free manual configuration and
protocol details.

| Document | CLI | Dialect it speaks to the router |
| --- | --- | --- |
| [cli-claude-code.md](cli-claude-code.md) | Claude Code | Anthropic Messages |
| [cli-codex.md](cli-codex.md) | Codex CLI | OpenAI Responses (only) |
| [cli-qwen-code.md](cli-qwen-code.md) | Qwen Code | OpenAI *or* Anthropic |
| [cli-gemini-cli.md](cli-gemini-cli.md) | Gemini CLI | Gemini / Vertex |
| [cli-opencode.md](cli-opencode.md) | opencode | OpenAI Chat Completions or Responses |
| [cli-grok-cli.md](cli-grok-cli.md) | Grok CLI | OpenAI Chat Completions |
| [cli-agent.md](cli-agent.md) | Link.Assistant Agent | OpenAI Chat Completions |
| [cli-cursor.md](cli-cursor.md) | Cursor CLI (`cursor-agent`) | **Not implemented** — endpoint override exists, but its private Connect-RPC surface has no adapter |

## The one rule that makes all of this work

Every managed client above authenticates with a short-lived `la_sk_…` token
whose signed immutable claims identify the exact client adapter and subscriber
principal. A generic/manual/admin/legacy token is deliberately not an inference
superset and cannot spend consumer subscriptions.

The vendor credential stays inside Router. Consumer subscriptions are
deny-by-default: Claude OAuth is native only to Claude Code and ChatGPT OAuth
only to Codex. Every cross-client bridge requires one exact
`--allow-subscription-bridge CLIENT:PROVIDER` risk acceptance; Gemini and Qwen
subscription rows remain denied pending recorded terms.

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
Agent       ──Chat───────┤
opencode    ──Chat───────┴─► /v1/chat/completions

Gemini CLI  ──Gemini─────► /api/gemini/v1beta, /api/vertex/v1
```

## Related documents

- [`../case-studies/issue-45/`](../case-studies/issue-45/) — the research,
  requirement trace and solution plans these documents implement.
- [`../../README.md`](../../README.md) — full flag, endpoint and deployment
  reference.
