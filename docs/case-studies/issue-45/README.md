# Issue 45: Documented and supported use cases

## Scope

Issue [#45](https://github.com/link-assistant/router/issues/45) asks for two
product guarantees and one documentation guarantee:

1. **Per-task tokens.** Every task gets its own router token, so usage can be
   audited, monitored, isolated, and revoked independently.
2. **Cross-vendor agentic-CLI compatibility.** A Claude MAX subscription must be
   usable *inside Codex*, a ChatGPT Pro subscription must be usable *inside
   Claude Code*, and the same must hold for the other agentic CLIs (Qwen Code,
   Gemini CLI, opencode, Grok CLI, Cursor CLI, …).
3. **Documentation split per use case**, each documented use case tested
   locally, with the test findings feeding new unit tests.

The stated general purpose is a component of personal or corporate
infrastructure used for testing, experimenting, and general coding tasks — not a
public multi-tenant SaaS. That framing drives the design decisions below: local
files over external databases, opt-in features, no new mandatory dependencies.

## State of the repository before this change

The router already had most of the primitives, but they were wired in one
direction only.

| Capability | Before | Gap |
| --- | --- | --- |
| Router tokens (`la_sk_…`) | issued with TTL, label, account pin, `max_requests` budget | usage was not attributed *per token* in metrics, and there was no audit trail |
| OpenAI Chat Completions surface | `/v1/chat/completions` → Anthropic upstream | — |
| OpenAI Responses surface | `/v1/responses` → Anthropic upstream | — |
| Anthropic Messages surface | `/v1/messages` → **Anthropic upstream only** | a Claude Code client could never reach a Codex/Gemini/Qwen subscription |
| Non-Anthropic subscriptions | reachable through `subscription_proxy` from the *OpenAI* surfaces | not reachable from the *Anthropic* surface |

### Root cause of the compatibility gap

`proxy_handler` in `src/proxy.rs` builds its upstream URL as
`state.upstream_base_url + resolve_upstream_path(path)` and always resolves
Anthropic OAuth credentials. There is no provider dispatch on the Anthropic
surface. Consequently:

- **"Claude MAX inside Codex" already worked.** Codex speaks the Responses API
  (`wire_api = "responses"`), the router exposes `/v1/responses`, and
  `responses::response_to_anthropic` + `openai::OpenAIStreamTranslator`
  (`OpenAIStreamShape::Response`) translate both directions.
- **"ChatGPT Pro inside Claude Code" did not work.** Claude Code speaks *only*
  the Anthropic Messages API, and that surface had no path to a non-Anthropic
  upstream.

The missing translation direction is therefore:

```
Anthropic Messages request  ──►  OpenAI Chat/Responses request  ──►  vendor upstream
Anthropic Messages SSE/JSON ◄──  OpenAI Chat/Responses SSE/JSON ◄──  vendor upstream
```

Everything else (credential reading, refresh, account pooling, cooldowns,
budgets, metrics) is provider-neutral already and is reused unchanged.

## Adopted design

### 1. Anthropic surface over any upstream

A new translation layer converts an Anthropic Messages request into the shape
the configured upstream provider expects, delegates to the **existing**
per-provider forwarder, and converts the reply back into Anthropic JSON or
Anthropic SSE events. No provider path is duplicated; the new code is a pure
adapter around code that is already exercised by the OpenAI surfaces.

This makes the surface matrix complete: every supported client protocol can be
served by every supported subscription.

### 2. Per-task token attribution

Token identity (id + label) is threaded into the metrics recorder and an
append-only audit log. `/metrics` gains per-token counters and `/v1/usage`
gains a per-token breakdown, so "one token per task" becomes observable rather
than merely possible.

### 3. One documentation file per use case

`docs/use-cases/` holds a short, self-contained file per scenario with a copy
-pasteable configuration block, so a reader configuring Codex is never shown
Gemini instructions.

## Companion documents

- [`requirements.md`](requirements.md) — every requirement extracted from the
  issue text, with its solution and verification.
- [`online-research.md`](online-research.md) — external facts gathered for this
  issue (agentic-CLI configuration surfaces), with sources.
- [`components-survey.md`](components-survey.md) — existing projects and
  libraries that solve the same or an adjacent problem, and what was borrowed.
- [`solution-plans.md`](solution-plans.md) — the options considered per
  requirement and the plan chosen.
- [`raw/`](raw) — unmodified issue data captured from the GitHub API.
