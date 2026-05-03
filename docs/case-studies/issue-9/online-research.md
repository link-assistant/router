# Online Research Notes

Sources were reviewed on 2026-05-03.

These notes summarise upstream documentation and supporting library / project pages that informed the recommendations in [README.md](./README.md).

## OmniRoute Project (primary subject)

### 1. Project README

Source:

- <https://github.com/diegosouzapw/OmniRoute>
- snapshot: [raw/diegosouzapw_OmniRoute.README.md](./raw/diegosouzapw_OmniRoute.README.md)
- metadata: [raw/diegosouzapw_OmniRoute.metadata.json](./raw/diegosouzapw_OmniRoute.metadata.json)

Relevant findings:

- OmniRoute exposes one local endpoint (`http://localhost:20128/v1`) and aggregates 160+ providers behind it, including 8 OAuth providers (Claude Code, Antigravity, Codex, GitHub Copilot, Cursor, Kimi Coding, Kilo Code, Cline) and 11 free providers (Kiro, Qoder, Pollinations, Qwen Code, LongCat, Gemini CLI, Cloudflare AI, Groq, NVIDIA NIM, Cerebras, Scaleway).
- Headline architectural choices that map to issue #9:
  - 4-tier auto-fallback Subscription → API → Cheap → Free,
  - format translation OpenAI ↔ Claude ↔ Gemini ↔ Responses,
  - one router-issued bearer accepted by every coding CLI (Claude Code, Codex CLI, Gemini CLI, Cursor, Cline, OpenClaw, OpenCode, Kilo, Kiro, Antigravity, Droid, AMP, Hermes, Windsurf, Qwen CLI, Copilot),
  - per-key API key management with scoping, rotation, IP filtering, rate limiting, prompt-injection guard,
  - 5-mode prompt compression pipeline (off / lite / standard / aggressive / ultra) inspired by Caveman.
- Out-of-scope-for-issue-#9 features that OmniRoute also ships: 13 routing strategies, 3-level proxy chain with TLS fingerprint spoofing, 29-tool MCP server (3 transports), A2A v0.3, 10 multi-modal APIs (chat, embeddings, images, video, music, TTS, STT, moderation, rerank, search), Electron desktop app, Termux/PWA, 40+ language UI, semantic + signature cache, Cloudflare/Tailscale/ngrok tunnels, 1proxy free marketplace.
- Scale claim: 4,690+ automated tests across 517 test files, 100% TypeScript core.
- Tech stack: Node.js 20.20.2+ / Next.js 16 / React 19 / Tailwind 4 / better-sqlite3 (with WAL) / Zod / OAuth 2.0 PKCE + JWT + API keys / SSE + WebSocket bridge.

Implication for this repo:

- OmniRoute is the right comparison target for breadth, but the subset that matters for issue #9's literal text is much narrower: multi-provider OAuth, per-provider account pools, format translation including Gemini, and the unified router-issued bearer.
- The compression, MCP, A2A, multi-modal, and dashboard surfaces are good follow-up issues but should not block this one.

### 2. Lineage acknowledgement

Source:

- OmniRoute README, "Acknowledgments" section.

Relevant findings:

- OmniRoute credits **9router** (decolua) as "the original project that inspired this fork".
- OmniRoute credits **CLIProxyAPI** (router-for-me) as "the original Go implementation that inspired this JavaScript port".
- OmniRoute credits **Caveman** (JuliusBrussee) for the standard compression mode.

Implication for this repo:

- The most representative "minimum useful design" is closer to CLIProxyAPI's surface than to OmniRoute's. Reading CLIProxyAPI separates the architectural primitives from the product polish.
- Caveman is a third-party library, not a router; if compression is added, it should follow the same separation (compressor as library, router as integrator).

## 9router (immediate ancestor)

Source:

- <https://github.com/decolua/9router>
- snapshot: [raw/decolua_9router.README.md](./raw/decolua_9router.README.md)

Relevant findings:

- Same one-endpoint-many-providers shape as OmniRoute but with a smaller scope: 40+ providers, 100+ models, 3-tier fallback (Subscription → Cheap → Free) instead of 4-tier.
- "RTK Token Saver" — a precursor to OmniRoute's compression engine that targets `tool_result` content specifically. Cited savings: 20-40%.
- Focus list of supported coding tools: Claude Code, Cursor, Antigravity, Copilot, Codex, Gemini, OpenCode, Cline, OpenClaw — exactly the set issue #9 asks for ("Claude, Codex, Gemini, Qwen, OpenCode, and so on").

Implication for this repo:

- 9router is the closest match in spirit to issue #9. The current router needs to grow into the same slot, but staying Rust-first and headless rather than TypeScript + dashboard.

## CLIProxyAPI (Go-original ancestor)

Source:

- <https://github.com/router-for-me/CLIProxyAPI>
- snapshot: [raw/router-for-me_CLIProxyAPI.README.md](./raw/router-for-me_CLIProxyAPI.README.md)

Relevant findings:

- Smallest design that already covers the issue #9 surface area: OpenAI / Gemini / Claude / Codex compatible API endpoints in a single Go binary.
- Multi-account round-robin per provider (Gemini, OpenAI, Claude).
- OAuth login flows for Gemini, OpenAI Codex, Claude Code.
- Provider-specific routes such as `/api/provider/{provider}/v1/messages`, `/api/provider/{provider}/v1beta/models/...`, and `/api/provider/{provider}/v1/chat/completions` — useful when a client wants to pin a specific backend protocol shape rather than rely on a merged surface.
- Reusable Go SDK so the proxy can be embedded — same library/CLI/server packaging pattern this repository already uses for Rust.

Implication for this repo:

- CLIProxyAPI is the strongest piece of evidence that the issue #9 feature set is implementable with a small typed `Provider` interface plus per-protocol surface routes. The Rust port can mirror the same shape almost line-for-line.

## musistudio/claude-code-router

Source:

- <https://github.com/musistudio/claude-code-router>
- snapshot: [raw/musistudio_claude-code-router.README.md](./raw/musistudio_claude-code-router.README.md)

Relevant findings:

- The most popular ("18k stars" range) Claude-Code-specific router. It explicitly models routing as named rules (`default`, `background`, `think`, `longContext`, `webSearch`, `image`) with a JSON config file.
- Each rule maps a request type to a `provider,model` pair; transformers translate between Anthropic Messages and the chosen provider's native format.

Implication for this repo:

- The "rules in a config file" model is a good fit for this repository's existing `lino-arguments` + `.lenv` story. It is also the simplest place to express the four-tier fallback chain that OmniRoute exposes through a UI.

## LiteLLM

Source:

- <https://github.com/BerriAI/litellm>
- snapshot: [raw/BerriAI_litellm.README.md](./raw/BerriAI_litellm.README.md)

Relevant findings:

- The reference Python proxy gateway: 100+ providers behind one OpenAI-shaped surface.
- Adds budget tracking, virtual keys with quotas, and a router with retry / fallback / circuit-breaker semantics.
- Battle-tested in enterprise deployments; the proxy server design is the de-facto reference for this category.

Implication for this repo:

- LiteLLM proves the abstraction scales; nothing in this repository's chosen Rust stack prevents reaching the same scale.
- The unified `/v1/...` plus per-virtual-key budget is exactly the OpenRouter-style operator surface called out in the issue-7 case study and re-affirmed in issue #9 by the "regular API tokens" clause.

## Caveman

Source:

- <https://github.com/JuliusBrussee/caveman>
- snapshot: [raw/JuliusBrussee_caveman.README.md](./raw/JuliusBrussee_caveman.README.md)

Relevant findings:

- "Why use many token when few token do trick." Caveman is a token compressor, not a router.
- 30+ regex rules that strip filler words, condense repetition, and normalise whitespace — directly cited as the inspiration for OmniRoute's `standard` compression mode.
- Cited savings: ~65% on representative workloads with no measurable accuracy loss for the tested benchmarks.

Implication for this repo:

- If compression lands, the rule pack should live in a separate Rust module so the router does not depend on a JavaScript library.
- Default should remain `compression=off`. `lite` (whitespace + dedup) is the only mode that should be safe to enable automatically without operator opt-in.

## Provider Documentation Cross-References

These are the upstream provider docs the implementation will need to consult during Phase A (provider abstraction). They are listed here so the implementation pull request can ship with a stable reference list.

### Anthropic / Claude Code

- <https://code.claude.com/docs/en/llm-gateway> — gateway HTTP shape (already covered by the current direct-proxy path).
- <https://code.claude.com/docs/en/third-party-integrations> — distinction between corporate HTTP proxies and LLM gateways.
- <https://docs.anthropic.com/claude/reference/messages_post> — `/v1/messages` schema.

Implication: the existing direct-proxy implementation already satisfies these. No change needed beyond keeping it as one provider in the new abstraction.

### OpenAI / Codex CLI

- <https://platform.openai.com/docs/api-reference/chat> — Chat Completions schema.
- <https://platform.openai.com/docs/api-reference/responses> — Responses API schema (used by Codex CLI).
- <https://github.com/openai/codex> — Codex CLI source; OAuth login flow lives there.
- <https://platform.openai.com/docs/api-reference/embeddings> — `/v1/embeddings`.

Implication: OpenAI Chat Completions and Responses are already implemented as a translation layer in `src/openai.rs`. Codex's specific OAuth subscription is the missing piece — Codex's CLI exchanges a refresh token at the OpenAI token endpoint and bills against the user's ChatGPT subscription.

### Google Gemini / Gemini CLI

- <https://ai.google.dev/api/generate-content> — `generateContent` and `streamGenerateContent`.
- <https://github.com/google-gemini/gemini-cli> — Gemini CLI source; OAuth flow uses a Google client ID with PKCE.
- <https://ai.google.dev/api/embeddings> — `embedContent`.

Implication: a new front-door route family (`v1beta/models/<id>:generateContent`, `:streamGenerateContent`, `:embedContent`) is needed so Gemini CLI can be pointed at the router unchanged.

### Qwen Code

- <https://help.aliyun.com/zh/dashscope/developer-reference/api-details> — DashScope API.
- <https://github.com/QwenLM/Qwen-Code> — Qwen Code CLI; uses an OAuth device-code flow.

Implication: Qwen exposes both its own DashScope shape and an OpenAI-compatible shape; the router can support Qwen Code by mounting Qwen DashScope under a new front-door route family or by reusing the OpenAI surface with a Qwen-aware provider implementation.

### OpenCode

- <https://github.com/sst/opencode> — OpenCode CLI; OpenAI-compatible client.

Implication: OpenCode does not need a new front-door route. The router only needs to register an OpenCode provider entry that points at the user's chosen upstream (OpenRouter, DeepSeek, an OmniRoute-style free provider, etc.).

### OpenRouter (referenced for routing-policy parity)

- <https://openrouter.ai/docs/guides/routing/provider-selection>
- <https://openrouter.ai/docs/guides/features/broadcast/overview>
- <https://openrouter.ai/docs/guides/overview/auth/management-api-keys>
- <https://openrouter.ai/docs/guides/features/workspaces/>

Implication (already noted in the issue-7 research): provider routing, per-key observability, and management-vs-completion key separation should remain part of the long-term plan. Issue #9 advances the "many providers" half; the workspace/management plane stays a follow-up.

## Link-Foundation Building Blocks (re-used from issue-7)

The same building blocks recommended in the issue-7 case study still apply, and v0.6.0 already wires them:

- `lino-arguments` for layered config (CLI / env / `.lenv` / defaults).
- `lino-objects-codec` for the human-readable text store.
- `link-cli` for the binary store.
- `box` Rust container base — still on the deferred list; not blocking issue #9.

The new piece for issue #9 is the `Provider` abstraction itself; no link-foundation crate is required for it.
