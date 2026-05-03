# Case Study: Issue #9 - Best Practices From OmniRoute

## Issue

[Issue #9](https://github.com/link-assistant/router/issues/9) asks for three things:

1. Compare this router carefully against [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute) so that the gap to "fully support Claude, Codex, Gemini, Qwen, OpenCode, and so on" is captured concretely.
2. Add support for multiple subscriptions (Codex, Claude, and others) instead of the current single-provider Claude pool.
3. Allow the original CLI clients (Claude Code, Codex CLI, Gemini CLI, Qwen Code, OpenCode, …) to talk to the router both via router-issued OAuth-style tokens (so the upstream subscription stays protected) and via the same tokens used as plain API keys.

The issue also instructs that the work for this case study lands in `docs/case-studies/issue-9/`, that the comparison is informed by online research as well as the upstream code, and that the resulting plan ships in a single pull request ([PR #10](https://github.com/link-assistant/router/pull/10)).

## Summary

The current router covers the "Anthropic-shaped Claude MAX gateway with optional OpenAI compatibility" baseline well after v0.6.0 (issue #7 / PR #8). What issue #9 asks for is a different next step: turn the router from a one-provider gateway into a small, headless multi-provider router along the lines of OmniRoute and its ancestors (CLIProxyAPI, 9router).

The single highest-leverage change is introducing a `Provider` trait. Every other issue-#9 requirement — Codex / Gemini / Qwen / OpenCode support, multi-subscription pools, cross-provider fallback, the unified `la_sk_…` token across every front-door protocol — either depends on that trait or becomes much smaller once it exists.

OmniRoute itself ships a much larger surface (compression beyond `lite`, MCP server, A2A, multi-modal APIs, dashboard, multi-language UI, mobile/PWA, TLS spoofing, geo-proxy chains). Those are valuable but they are not in the literal text of issue #9 and they should not block this work. They are tracked as deferred follow-up issues.

The recommended direction is to land issue #9's MUST/SHOULD requirements (Phases A-F in [requirements.md](./requirements.md)) and to defer the EXP requirements (Phases G partial / H) to dedicated issues.

## Key Findings

### 1. The load-bearing change is the `Provider` trait

CLIProxyAPI (Go), 9router (TypeScript), OmniRoute (TypeScript), musistudio/claude-code-router (TypeScript), and LiteLLM (Python) all share one structural decision: a `Provider` (or `Channel`, or `Backend`) interface that owns its own auth shape, base URL, request translation, response translation, and capability flags. The router core is then a thin dispatcher that picks a provider, applies a fallback chain, and translates between the front-door protocol and the chosen provider's native protocol.

The current router does not have this layer. The Anthropic upstream URL, headers, and OAuth credential format are hard-coded into [src/proxy.rs](../../../src/proxy.rs) and [src/oauth.rs](../../../src/oauth.rs). Lifting them into a `Provider` trait is a one-time cost that immediately enables Codex, Gemini, Qwen, and OpenCode to slot in as additional implementations of that trait.

### 2. The unified `la_sk_…` token convention is already half-implemented

The router already issues `la_sk_…` tokens in [src/token.rs](../../../src/token.rs) and accepts them on both Anthropic surfaces (`/v1/messages`, Bedrock, Vertex) and OpenAI surfaces (`/v1/chat/completions`, `/v1/responses`, `/v1/models`).

What issue #9 needs is to extend the same convention to:

- `Authorization: Bearer la_sk_…` on `/v1/responses` (already present),
- `x-goog-api-key: la_sk_…` on `v1beta/models/<id>:generateContent` (Gemini, missing),
- `Authorization: Bearer la_sk_…` on Qwen DashScope routes (missing),
- `Authorization: Bearer la_sk_…` on OpenCode-style OpenAI-compatible routes (covered by the existing OpenAI surface).

This is exactly the "and also as regular API tokens" clause from issue #9, expressed as an interop convention. The gap is small; it is a direct consequence of the missing front-door routes.

### 3. Subscription protection is already the right shape; only the provider list needs to grow

CLIProxyAPI, 9router, and OmniRoute all hide the upstream OAuth refresh token behind their own bearer. The client never sees the real upstream credential. The router caches it, refreshes it on its own schedule, and substitutes it at the moment of the upstream request.

The current router already implements this for Claude. Issue #9 needs the same pattern for Codex, Gemini, Qwen, and (optionally) Kiro / Qoder. The cost per provider is one OAuth refresher and one credential cache entry; the design is unchanged.

### 4. Cross-provider fallback is a small extension to the existing multi-account ring

The router already tracks per-account cooldowns and last-failure timestamps in [src/accounts.rs](../../../src/accounts.rs), but the ring is keyed by a single Claude provider. Lifting the same mechanism to operate over `(provider, account)` pairs turns the `MultiAccountRouter` into a `MultiProviderRouter` and unlocks OmniRoute's "Subscription → API → Cheap → Free" 4-tier fallback as an ordered list of provider+model nodes.

The musistudio/claude-code-router project models the same idea with a JSON config file (`default`, `background`, `think`, `longContext`, `webSearch`, `image`). That is a better fit for this repository's existing `lino-arguments` + `.lenv` story than OmniRoute's UI-driven approach.

### 5. OmniRoute's larger surface should be deferred, not declined

OmniRoute also ships compression beyond `lite`, an MCP server (29 tools, 3 transports), A2A v0.3, 10 multi-modal APIs (chat, embeddings, images, video, music, TTS, STT, moderation, rerank, search), an Electron desktop app, a Termux/PWA build, 40+ language UI, semantic + signature cache, Cloudflare/Tailscale/ngrok tunnels, and a 1proxy free marketplace. None of those are in the literal text of issue #9.

Each of those is large enough to deserve its own issue. The right move is to keep them visible in [requirements.md](./requirements.md) as EXP-rated requirements (R22-R28) so they are not lost, but to keep them out of the issue #9 implementation slice.

## Recommended Architecture

| Layer | Recommendation | Why |
| --- | --- | --- |
| Provider model | Introduce a `Provider` trait owning `auth + base URL + translate request + translate response + capabilities` | Smallest abstraction that supports the largest provider list; matches every reference project |
| Account model | Generalise the existing `MultiAccountRouter` to a `MultiProviderRouter` keyed by `(provider, account)` pairs | Reuses the cooldown / round-robin / priority / least-used mechanics already in [src/accounts.rs](../../../src/accounts.rs) |
| OAuth | Extract the Claude-specific OAuth refresher into a per-provider trait method; add Codex / Gemini / Qwen / Kiro / Qoder implementations behind feature flags | Each provider has a different OAuth client ID, scopes, and token endpoint; they should not be hard-coded into the proxy |
| Front-door routes | Add Gemini (`v1beta/models/<id>:generateContent`, `:streamGenerateContent`, `:embedContent`) and Qwen DashScope route families alongside the existing Anthropic and OpenAI surfaces | Required so Gemini CLI and Qwen Code can be pointed at the router unchanged |
| Token surface | Keep the same `la_sk_…` token on every front door; add token scopes (chat-only, embeddings-only, model-restricted) and per-token rate limits | Issue #9's "and also as regular API tokens" clause; OpenRouter-style operator surface |
| Routing engine | Extend the existing chain to support a four-tier fallback (Subscription → API → Cheap → Free) expressed as an ordered list of `(provider, model)` nodes in `.lenv` | OmniRoute marquee feature; also matches musistudio/claude-code-router's rule-engine pattern |
| Persistence | Reuse the existing dual-write text + binary stores ([src/storage.rs](../../../src/storage.rs)) for the new provider / account / scope records | Already on by default; no new dependency |
| Observability | Extend [src/metrics.rs](../../../src/metrics.rs) and `/v1/usage` with per-provider counters, breaker state, and active-stream gauges | OmniRoute exposes these in the dashboard; the router can expose them in JSON + Prometheus |
| Operator surface | Add `provider list / add / remove / show` CLI subcommands; keep the headless `lino-arguments` + `.lenv` model | A dashboard is OmniRoute polish, not a hard requirement of issue #9 |
| Compression | Add a `--compression=off|lite|standard|aggressive|ultra` flag, default `off`, only `lite` (whitespace + dedup) safe to auto-enable | Caveman-inspired; semantics-changing modes stay opt-in |

## Proposed Delivery Plan

The full per-requirement plan is in [requirements.md](./requirements.md); this is the high-level slicing.

### Phase A - Provider abstraction (MUST)

Goals:

- introduce the `Provider` trait (`auth`, `base_url`, `translate_request`, `translate_response`, `capabilities`)
- port the existing Claude proxy path to the new trait without changing observable behaviour
- add an in-memory provider registry seeded from `.lenv`
- cover R2-R12 from [requirements.md](./requirements.md)

### Phase B - Routing policies and fallbacks (MUST)

Goals:

- generalise `MultiAccountRouter` to `MultiProviderRouter`
- express the four-tier fallback chain (Subscription → API → Cheap → Free) as an ordered list of `(provider, model)` nodes in `.lenv`
- preserve the existing cooldown / round-robin / priority / least-used semantics inside each tier
- cover R13-R14

### Phase C - Format translation extension (MUST)

Goals:

- add Gemini front-door routes (`v1beta/models/<id>:generateContent`, `:streamGenerateContent`, `:embedContent`)
- add Qwen DashScope front-door routes
- reuse the existing OpenAI surface for OpenCode (no new front door needed)
- cover R15-R16

### Phase D - Token surface generalisation (MUST)

Goals:

- accept `la_sk_…` as both `Authorization: Bearer …` (Anthropic / OpenAI / Codex / Qwen) and `x-goog-api-key: …` (Gemini)
- add token scopes (chat-only, embeddings-only, model-restricted) and per-token rate limits
- cover R9, R11, R18

### Phase E - Persistence + telemetry extension (SHOULD)

Goals:

- extend the existing dual-write store with provider / account / scope records
- extend `/metrics` and `/v1/usage` with per-provider counters, breaker state, active-stream gauges
- cover R17, R20

### Phase F - Operator ergonomics (SHOULD)

Goals:

- add `provider list / add / remove / show` CLI subcommands
- document the new `.lenv` keys and migration notes for v0.6.0 → v0.7.0
- cover R21

### Phase G - Compression (EXP, partial in this PR)

Goals:

- add a `--compression=off|lite|standard|aggressive|ultra` flag
- ship only `off` (default) and `lite` (whitespace + dedup) in this PR
- defer `standard` / `aggressive` / `ultra` to a follow-up issue with quality benchmarks
- cover R19 partially

### Phase H - Experimental layers (EXP, deferred)

Goals (deferred to follow-up issues, captured here for traceability):

- MCP server, A2A, agent card
- multi-modal APIs (images, video, music, TTS, STT, moderation, rerank, search, batch)
- dashboard, multi-language UI, mobile / PWA
- 3-level proxy chain, TLS fingerprint spoofing
- semantic + signature cache
- cover R22-R28

## Scope Boundaries

Recommended as default supported behaviour for the issue #9 PR:

- `Provider` trait with at least Claude, Codex, Gemini, Qwen, OpenCode implementations behind feature flags
- multi-provider multi-account routing with the four-tier fallback chain
- Gemini and Qwen front-door routes alongside existing Anthropic / OpenAI surfaces
- unified `la_sk_…` token accepted on every front door, with scopes and per-token rate limits
- per-provider Prometheus counters and `/v1/usage` rows
- `provider` CLI subcommand
- `--compression=off|lite` only

Recommended as experimental or deferred:

- compression `standard` / `aggressive` / `ultra` (semantics-changing; needs benchmarks)
- MCP server, A2A protocol, agent card
- multi-modal APIs beyond chat / embeddings
- dashboard, multi-language UI, mobile / PWA
- 3-level proxy chain, TLS fingerprint spoofing, prompt-injection guard
- semantic / signature response cache

## Files In This Case Study

- [README.md](./README.md) - overview and recommended roadmap
- [requirements.md](./requirements.md) - extracted requirement inventory R1-R28 with priorities and per-requirement solution plan
- [current-router-gap-analysis.md](./current-router-gap-analysis.md) - current repo capability assessment with src/ evidence pointers
- [external-projects.md](./external-projects.md) - competitor comparison (OmniRoute, 9router, CLIProxyAPI, musistudio/claude-code-router, LiteLLM, Caveman)
- [online-research.md](./online-research.md) - per-source research notes and provider documentation cross-references
- [raw/](./raw/) - fetched README snapshots and metadata for each compared project

## References

Sources viewed on 2026-05-03:

External projects:

- [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute) - issue #9's reference target
- [decolua/9router](https://github.com/decolua/9router) - immediate ancestor, smaller surface
- [router-for-me/CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) - Go-original ancestor, smallest design covering the issue #9 surface
- [musistudio/claude-code-router](https://github.com/musistudio/claude-code-router) - rule-engine pattern in a JSON config file
- [BerriAI/litellm](https://github.com/BerriAI/litellm) - reference 100+ provider gateway in Python
- [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) - token compressor cited by OmniRoute's `standard` mode

Provider documentation:

- [Anthropic Messages API](https://docs.anthropic.com/claude/reference/messages_post)
- [OpenAI Chat Completions](https://platform.openai.com/docs/api-reference/chat) and [OpenAI Responses](https://platform.openai.com/docs/api-reference/responses)
- [Google Gemini generateContent](https://ai.google.dev/api/generate-content)
- [Aliyun DashScope (Qwen)](https://help.aliyun.com/zh/dashscope/developer-reference/api-details)
- [OpenAI Codex CLI](https://github.com/openai/codex), [Google Gemini CLI](https://github.com/google-gemini/gemini-cli), [Qwen Code](https://github.com/QwenLM/Qwen-Code), [OpenCode](https://github.com/sst/opencode)
- [Claude Code LLM gateway configuration](https://code.claude.com/docs/en/llm-gateway) and [third-party integrations](https://code.claude.com/docs/en/third-party-integrations)

Carried forward from issue #7 (still applies):

- [OpenRouter provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)
- [OpenRouter management API keys](https://openrouter.ai/docs/guides/overview/auth/management-api-keys)
- [OpenRouter workspaces](https://openrouter.ai/docs/guides/features/workspaces/)

External project README snapshots fetched on 2026-05-03 are stored in [raw/](./raw/).
