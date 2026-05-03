# Current Router Gap Analysis (vs. OmniRoute)

This assessment is based on the code in the repository as of 2026-05-03 (post v0.6.0, the result of issue #7 / PR #8).

It compares the existing router to the OmniRoute feature set referenced by issue #9.

## What The Router Already Does Well (Post-v0.6.0)

| Capability | Status | Evidence | Why it matters |
| --- | --- | --- | --- |
| Direct Anthropic Messages proxy | Present | [src/proxy.rs](../../../src/proxy.rs), [src/main.rs](../../../src/main.rs) | Matches Anthropic's documented Claude Code gateway shape |
| Bedrock InvokeModel routes | Present | [src/proxy.rs](../../../src/proxy.rs) | Covers one official Claude Code gateway family |
| Vertex `rawPredict` routes | Present | [src/proxy.rs](../../../src/proxy.rs) | Covers another official Claude Code gateway family |
| Session header forwarding | Present | [src/proxy.rs](../../../src/proxy.rs) | Preserves `X-Claude-Code-Session-Id` |
| Router-issued `la_sk_…` JWT tokens | Present | [src/token.rs](../../../src/token.rs) | Separates client credentials from real Claude OAuth credentials (R10 baseline) |
| Persistent token storage (text + binary) | Present | [src/storage.rs](../../../src/storage.rs) | Tokens survive restarts; both backends on by default |
| Token lifecycle CLI | Present | [src/cli.rs](../../../src/cli.rs) | `tokens issue / list / revoke / expire / show` |
| Multi-account ring (Claude only) | Present | [src/accounts.rs](../../../src/accounts.rs) | Round-robin / priority / least-used + 429 cooldowns |
| OpenAI ↔ Anthropic translation | Present | [src/openai.rs](../../../src/openai.rs) | `/v1/chat/completions`, `/v1/responses`, `/v1/models` |
| Prometheus `/metrics` | Present | [src/metrics.rs](../../../src/metrics.rs) | Per-route counters and latency histograms |
| JSON `/v1/usage` and `/v1/accounts` | Present | [src/proxy.rs](../../../src/proxy.rs) | Operator JSON observability |
| `lino-arguments` + `.lenv` config | Present | [src/cli.rs](../../../src/cli.rs), [src/config.rs](../../../src/config.rs) | CLI args, env vars, `.lenv` file with documented precedence |
| Single Docker image deployment | Present | [Dockerfile](../../../Dockerfile) | Single binary, single container |

## Main Gaps Versus OmniRoute

Each row is anchored in OmniRoute's README and an evidence pointer (or absence thereof) in the current repository.

### Provider model

| Capability | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Multiple OAuth subscription providers (Claude, Codex, Gemini, Qwen, Kiro, Qoder, GitHub Copilot, Cursor, Antigravity, Kimi) | Missing | [src/oauth.rs](../../../src/oauth.rs) only knows the Claude Code credential file format | OmniRoute markets OAuth PKCE for 8 providers; we only do one |
| Provider trait / abstraction so new providers plug in without rewriting the proxy | Missing | [src/proxy.rs](../../../src/proxy.rs) hard-codes the Anthropic upstream URL and headers | Required for issue #9's "Codex/Gemini/Qwen/OpenCode" |
| API-key passthrough providers (DeepSeek, Groq, xAI, Mistral, NVIDIA NIM, OpenRouter…) | Missing | No multi-provider routing exists | OmniRoute claims 120+ API-key providers |
| Free-tier providers (Kiro, Qoder, Pollinations, Qwen, LongCat, Cloudflare AI, NVIDIA NIM) | Missing | Same | OmniRoute headlines "$0 forever" combos |
| Self-hosted upstreams (Ollama, vLLM, LM Studio) | Missing | Same | Easy add once provider abstraction exists |

### Routing and resilience

| Capability | Status | Evidence | Gap |
| --- | --- | --- | --- |
| 4-tier auto-fallback (Subscription → API → Cheap → Free) | Missing | [src/accounts.rs](../../../src/accounts.rs) only fails over within one provider | OmniRoute marquee feature |
| Cross-provider fallback chain | Missing | Same | The cooldown mechanism exists but does not jump providers |
| Routing strategies: weighted, P2C, cost-optimized, context-relay, task-aware | Missing | [src/accounts.rs](../../../src/accounts.rs) implements priority / round-robin / least-used only | Three of OmniRoute's thirteen strategies |
| Circuit breakers and anti-thundering-herd guards | Partial | Cooldowns exist; no breaker state machine | OmniRoute cites a dedicated resilience engine |
| Active stream metrics (per state) | Missing | No active-stream gauge in [src/metrics.rs](../../../src/metrics.rs) | Useful for production diagnostics |

### API surface

| Capability | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Anthropic Messages | Present | [src/proxy.rs](../../../src/proxy.rs) | — |
| OpenAI Chat Completions | Present | [src/openai.rs](../../../src/openai.rs) | — |
| OpenAI Responses (Codex format) | Present | [src/openai.rs](../../../src/openai.rs) | — |
| `/v1/models` | Present | [src/openai.rs](../../../src/openai.rs) | — |
| Gemini `generateContent` / `streamGenerateContent` | Missing | No Gemini routes | Required to host Gemini CLI |
| Qwen DashScope `chat/completions` | Missing | No Qwen routes | Required to host Qwen Code |
| OpenAI Embeddings (`/v1/embeddings`) | Missing | Not implemented | OmniRoute exposes 10 multi-modal APIs incl. embeddings |
| Image / video / audio / TTS / STT / moderation / rerank / search / batch APIs | Missing | n/a | OmniRoute's other multi-modal surfaces; out of scope for issue #9 |
| MCP server | Missing | n/a | OmniRoute ships 29 tools; out of scope for issue #9 |
| A2A (Agent-to-Agent JSON-RPC) | Missing | n/a | Out of scope for issue #9 |
| Agent Card at `/.well-known/agent.json` | Missing | n/a | Out of scope for issue #9 |

### Token surface

| Capability | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Router-issued bearer accepted on Anthropic + OpenAI surfaces | Present | [src/proxy.rs](../../../src/proxy.rs), [src/openai.rs](../../../src/openai.rs) | The same token already crosses two surfaces |
| Same token usable as a plain API key on Codex / Gemini / Qwen surfaces | Missing | No Codex/Gemini/Qwen surface yet | Direct effect of provider gap above |
| Token scopes (chat-only, embeddings-only, model-restricted) | Missing | [src/token.rs](../../../src/token.rs) issues unscoped tokens | OmniRoute UI exposes scoping |
| Token IP allow-list, per-key rate limits | Missing | Same | OmniRoute exposes both |
| Token rotation / parent-child (mint short-lived from a long-lived management key) | Missing | Same | OpenRouter-style management keys |

### Operator surface

| Capability | Status | Evidence | Gap |
| --- | --- | --- | --- |
| `serve / tokens / accounts / doctor` CLI subcommands | Present | [src/cli.rs](../../../src/cli.rs) | — |
| `provider` CRUD subcommand | Missing | n/a | Required when providers are first-class |
| Web dashboard | Missing | n/a | Out of scope for issue #9 |
| Multi-language UI | Missing | n/a | Out of scope (CLI is English-only) |
| Tunnel integrations (Cloudflare / ngrok / Tailscale) | Missing | n/a | Useful, out of scope for first pass |

### Compatibility / cost-control layers

| Capability | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Prompt compression — lite mode (whitespace, dedup) | Missing | n/a | Cheap to implement; safe default candidate |
| Prompt compression — standard / Caveman | Missing | n/a | Inspired by JuliusBrussee/caveman |
| Prompt compression — aggressive / ultra | Missing | n/a | Aggressive token pruning; opt-in only |
| 3-level proxy chain (global / per-provider / per-key) | Missing | n/a | OmniRoute headline; opt-in for issue #9 |
| TLS fingerprint spoofing | Missing | n/a | Anti-detection; experimental only |
| Prompt-injection guard | Missing | n/a | Not requested by issue #9 |
| Semantic / signature cache | Missing | n/a | Not requested by issue #9 |

## Strategic Read

The current router covers the "Anthropic-shaped Claude MAX gateway with optional OpenAI compatibility" baseline very well after v0.6.0. Issue #9 asks for a different next step:

1. Generalise the OAuth provider so Claude is one of N providers, not the only one.
2. Generalise the multi-account ring so each provider keeps its own pool of subscriptions / API keys / free tiers.
3. Generalise the front-door routes so Codex / Gemini / Qwen / OpenCode clients can plug in unchanged.
4. Generalise the router-issued `la_sk_…` token so the same string works as the bearer / API key for every protocol.
5. Generalise the routing engine so a single chain can fall back across providers (Subscription → API → Cheap → Free), not only across accounts of one provider.

Everything else from OmniRoute (compression beyond lite mode, MCP, A2A, multi-modal, dashboard, mobile, TLS spoofing, geo-proxy chains) is layered on top of those primitives and can be deferred to follow-up issues without blocking this one.

The single highest-leverage change is therefore the `Provider` trait. Every other gap above either depends on it or becomes much smaller once it exists.
