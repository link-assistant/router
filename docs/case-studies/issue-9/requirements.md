# Requirement Inventory for Issue #9

This file turns the free-form issue body into an actionable requirement list.

Legend:

- `MUST`: directly stated in the issue or required to satisfy the issue's stated goal
- `SHOULD`: strongly implied by the issue, by the named comparison target (OmniRoute), or by the named tools (Claude Code, Codex, Gemini CLI, Qwen, OpenCode)
- `EXP`: useful but should stay opt-in or experimental because it depends on undocumented behavior, third-party reverse engineering, or product polish that is out of scope for the first pass

## Source Quotes

The full issue body is one paragraph; the relevant clauses are quoted below so each requirement can be traced back to a concrete piece of text.

| Quote | Captures |
| --- | --- |
| "Use best practices from https://github.com/diegosouzapw/OmniRoute" (issue title) | OmniRoute is the canonical comparison target |
| "carefully compare all missing features we have to fully support Claude, Codex, Gemini, Qwen, OpenCode, and so on" | Multi-tool client compatibility on the API side |
| "we support multiple subscriptions codex/claude and others" | Multi-provider OAuth subscription pooling, not just Claude |
| "allow to connect original codex/claude apps via our own issues oauth tokens, that keep original subscription access protected" | Router-issued tokens swap in real upstream OAuth without exposing it |
| "And also as regular API tokens" | The same router-issued token must work as a plain API key for non-OAuth backends |
| "compile that data to `./docs/case-studies/issue-{id}` folder" | Case-study artefacts must live under `docs/case-studies/issue-9/` |
| "deep case study analysis (also make sure to search online for additional facts and data)" | Online research notes belong in the case study |
| "list of each and all requirements from the issue" | This file |
| "propose possible solutions and solution plans for each requirement" | Solution-plan tables in this file plus README roadmap |
| "we should also check known existing components/libraries, that solve similar problem or can help in solutions" | External-projects comparison plus library notes |

## Requirements

| ID | Priority | Requirement | Source in issue | Notes |
| --- | --- | --- | --- | --- |
| R1 | MUST | Treat OmniRoute as the primary comparison target and document where it sets a higher bar than the current router | Issue title and body | Captured here, in `external-projects.md`, and in `current-router-gap-analysis.md` |
| R2 | MUST | Support Claude Code as a fully wired client, including OAuth subscription mode | "fully support Claude" | Already done at the Anthropic layer in v0.6.0; the gap is multi-account multi-provider |
| R3 | MUST | Support Codex / Codex CLI as a fully wired client, including its OAuth subscription | "fully support ... Codex" | Codex uses an OpenAI-shaped Responses + Chat Completions API on a Codex OAuth flow |
| R4 | MUST | Support Gemini CLI as a fully wired client, including its OAuth subscription | "fully support ... Gemini" | Gemini CLI talks to a Google `generativelanguage.googleapis.com` style API with its own OAuth |
| R5 | MUST | Support Qwen Code as a fully wired client | "fully support ... Qwen" | Qwen Code uses a device-code OAuth flow against DashScope-style Qwen endpoints |
| R6 | MUST | Support OpenCode as a fully wired client | "fully support ... OpenCode" | OpenCode is OpenAI-compatible; the gap is provider routing, not protocol |
| R7 | SHOULD | Support the rest of the OmniRoute "and so on" CLI list (OpenClaw, Cursor, Cline, Continue, Kilo, Kiro, Antigravity, GitHub Copilot, Droid, AMP, Hermes, Windsurf) | "and so on" plus OmniRoute parity goal | Each one is reachable via the same OpenAI-compatible / Anthropic-compatible front door |
| R8 | MUST | Pool multiple subscriptions of any supported provider, not just multiple Claude accounts | "we support multiple subscriptions codex/claude and others" | Generalise the `Vec<Account>` ring-buffer in `src/accounts.rs` to be keyed by provider |
| R9 | MUST | Issue our own router tokens that the original CLIs (Claude / Codex / Gemini / Qwen) can use as their bearer credential | "connect original codex/claude apps via our own issues oauth tokens" | Tokens like `la_sk_…` already exist; the new requirement is making them also work as the OpenAI / Gemini / Qwen API key |
| R10 | MUST | Keep the upstream OAuth refresh tokens never visible to clients | "keep original subscription access protected" | Existing token-swap behaviour for Anthropic must be generalised per provider |
| R11 | MUST | Make the same router-issued token usable as a plain API key against API-key-only providers | "And also as regular API tokens" | The router must accept its own bearer in standard `Authorization: Bearer …` and `x-api-key` headers, regardless of the downstream backend |
| R12 | MUST | Provide a provider-and-backend abstraction so new providers can be added without rewriting the proxy core | OmniRoute parity (160+ providers) implies the abstraction must exist | Concrete: `Provider` trait with auth, base URL, model translation, capability flags |
| R13 | SHOULD | Add a unified routing engine with at least priority, round-robin, weighted, least-used, and cooldown-on-429 strategies | OmniRoute "13 routing strategies"; current router only has rotation+cooldown | Reuse the cooldown logic already in `src/accounts.rs`; layer policy on top |
| R14 | SHOULD | Add a 4-tier auto-fallback chain (Subscription → API key → Cheap → Free) | OmniRoute headline feature | This is a routing policy on top of R13, not a new transport |
| R15 | SHOULD | Translate request/response format between OpenAI Chat Completions, OpenAI Responses, Anthropic Messages, and Gemini `generateContent` so any client can hit any backend | OmniRoute "Format Translation"; we already do OpenAI↔Anthropic | New direction needed: Anthropic↔Gemini and OpenAI↔Gemini |
| R16 | SHOULD | Expose `/v1/chat/completions`, `/v1/responses`, `/v1/models`, `/v1/embeddings`, plus Anthropic `/v1/messages` from one server | OmniRoute "one endpoint" + Codex Responses requirement | `/v1/chat/completions` and `/v1/responses` already shipped in v0.6.0; embeddings and Gemini-shaped routes are missing |
| R17 | SHOULD | Persist provider catalog, per-account quota usage, and routing decisions so restarts do not lose state | OmniRoute SQLite/LowDB layer | Reuse the existing dual text+binary storage layer; add new collections |
| R18 | SHOULD | Add per-token API-key management — scoping, IP filtering, rate limiting, optional rotation | OmniRoute "API Key Management" | Build on existing `la_sk_…` token store; add scope and limit fields |
| R19 | SHOULD | Add prompt compression with at least an opt-in "lite" mode that strips whitespace and dedupes system prompts | OmniRoute "Prompt Compression" + Caveman inspiration | Off by default; lite is the only safe default; aggressive/ultra stay opt-in |
| R20 | SHOULD | Add observability surfaces: structured logs, Prometheus metrics, per-account health, per-token usage | OmniRoute observability + already shipped baseline | Extend the existing `/metrics` and `/v1/usage` endpoints |
| R21 | SHOULD | Provide CLI subcommands for `provider add`, `provider list`, `accounts add`, `accounts test`, `tokens scope set`, mirroring OmniRoute's dashboard CRUD | OmniRoute dashboard parity for headless deployments | Extend the existing `clap`-via-`lino-arguments` CLI |
| R22 | EXP | Implement OAuth PKCE flows for Claude Code, Codex, Gemini, Qwen, Kiro, Qoder, GitHub Copilot, Cursor, Antigravity, Kimi inside the router itself | OmniRoute "OAuth PKCE for 8 providers" | Each provider depends on undocumented client IDs and may break; gate behind explicit `--enable-oauth-flow=<provider>` |
| R23 | EXP | Add a 3-level proxy chain (global / per-provider / per-key) with TLS fingerprint spoofing | OmniRoute "3-Level Proxy" | Useful but uses anti-detection techniques; ship as opt-in |
| R24 | EXP | Add MCP server functionality (registry of tools, multiple transports, scoped permissions) | OmniRoute "MCP Server (29 tools)" | Belongs in a separate crate or feature flag |
| R25 | EXP | Add A2A (Agent-to-Agent JSON-RPC 2.0) protocol support | OmniRoute "A2A Protocol" | Ship after MCP; gate behind feature flag |
| R26 | EXP | Add multi-modal endpoints — image / video / music / TTS / STT / moderation / rerank / search / batch / web search | OmniRoute "10 multi-modal APIs" | Each one is a new API surface; not required for the issue's literal text |
| R27 | EXP | Add a web dashboard | OmniRoute headline feature | Out of scope for the first pass; the headless CLI plus metrics endpoints satisfy operator needs |
| R28 | EXP | Add a desktop / mobile / Termux / PWA distribution | OmniRoute multi-platform feature | Out of scope; the existing single-binary plus Docker image cover the documented deployments |

## Solution Plan Per Requirement

The following plan groups the requirements into delivery-ordered phases. Each phase produces something runnable, testable, and shippable.

### Phase A — Provider abstraction (R2-R12)

Goals:

1. Introduce a `Provider` trait in a new `src/providers/` module:
   - `name()`, `kind()` (`Subscription` / `ApiKey` / `Free`),
   - `base_url()`,
   - `auth_header(creds: &Credentials) -> HeaderMap`,
   - `translate_request(client_format: ClientFormat, body: &mut Value)`,
   - `translate_response(client_format: ClientFormat, body: &mut Value)`,
   - `capabilities() -> Capabilities` (chat/responses/embeddings/streaming/tools).
2. Refactor the existing Anthropic + OAuth path into the first `Provider` implementation (`AnthropicClaudeMax`).
3. Add four more providers in priority order:
   - `OpenAiCodex` (OAuth + Responses + Chat Completions),
   - `GoogleGeminiCli` (OAuth + `generateContent`),
   - `QwenCode` (Device Code OAuth + DashScope),
   - `OpenCode` (uses any underlying OpenAI-compatible provider; mostly a routing label).
4. Refactor `MultiAccountRouter` (`src/accounts.rs`) so `accounts: Vec<Account>` becomes `accounts_by_provider: HashMap<ProviderId, Vec<Account>>`.
5. Confirm token-swap behaviour: every `Provider::auth_header` reads the upstream credential lazily; the router-issued bearer token is never replaced with the upstream token in any client-visible artifact (R10).

Acceptance:

- a smoke-test integration runs `claude` against the Anthropic provider, `codex` against the Codex provider, and `gemini` against the Gemini provider, all using the same `la_sk_…` bearer.
- the unified token (R9, R11) is accepted on `/v1/messages`, `/v1/chat/completions`, `/v1/responses`, `/v1/models`, and `v1beta/models/<id>:generateContent`.

### Phase B — Routing policies and fallbacks (R13, R14)

Goals:

1. Replace the current `RotationStrategy::{RoundRobin, Priority, LeastUsed}` enum with a policy graph that supports a fallback chain across providers, not only across accounts of one provider.
2. Add a `FallbackChain` config object: ordered list of `{ provider, model_alias, max_tokens?, priority? }` nodes; the router walks the chain on cooldown / 429 / 5xx / circuit-open.
3. Wire the four-tier shorthand: a single config flag `--fallback subscription,api,cheap,free` expands into a chain using the registered providers.

Acceptance:

- with three providers configured (Claude / DeepSeek / Kiro), pulling the OAuth credential off Claude immediately routes to DeepSeek and then to Kiro without dropping the response.
- the chain is observable in `/v1/usage` (which provider served which request).

### Phase C — Format translation extension (R15, R16)

Goals:

1. Add `Anthropic ↔ Gemini` and `OpenAI ↔ Gemini` translators (we already have `OpenAI ↔ Anthropic` in `src/openai.rs`).
2. Add `/v1/embeddings` (OpenAI) plus `/v1beta/models/<id>:embedContent` (Gemini).
3. Keep capability flags so unsupported translations fail loudly with a `400 unsupported_translation` body, rather than silently degrading.

Acceptance:

- a Gemini CLI client can hit the router with its native protocol and reach an Anthropic backend.
- a Codex client can hit the router on Responses and reach a Gemini backend.

### Phase D — Token surface generalisation (R9, R11, R18)

Goals:

1. Extend `TokenRecord` with `scope: Vec<Scope>`, `rate_limit: Option<RateLimit>`, `allowed_ips: Vec<IpNet>`.
2. Make every API surface (Anthropic / OpenAI / Gemini / Qwen) accept the same `la_sk_…` token via `Authorization`, `x-api-key`, and `Authorization: Bearer` (Codex), so client SDKs do not need any patching.
3. Add CLI subcommands `tokens scope set`, `tokens limit set`, `tokens ip allow`.

Acceptance:

- one router-issued token is interchangeable across all four protocols above.
- exceeded limits return `429` with a JSON body matching the appropriate provider's shape.

### Phase E — Persistence + telemetry extension (R17, R20)

Goals:

1. Persist `providers/`, `accounts/`, `routing-decisions/` in the same dual text + binary stores already used for tokens.
2. Extend `/metrics` with per-provider counters and histograms.
3. Extend `/v1/usage` with provider, account, and fallback-step columns.

### Phase F — Operator ergonomics (R21)

Goals:

1. `link-assistant-router providers list/add/test/remove`.
2. `link-assistant-router accounts list/add/test/remove --provider=<name>`.
3. `link-assistant-router doctor` extended with provider reachability and OAuth health.

### Phase G — Compression (R19)

Goals:

1. Implement `compression::lite` (whitespace collapse, dedup repeated system prompts, image URL shortening).
2. Add `--compression=off|lite` flag, default `off` for the first release.
3. Defer `standard/aggressive/ultra` to a follow-up issue; track the design decision in the README.

### Phase H — Experimental layers (R22-R28)

Each EXP requirement gets its own follow-up issue; this case study only proposes the architecture so they slot into the provider abstraction without breaking the stable surface.

## Existing Components and Libraries

| Need | Library / project | Already in repo? | Notes |
| --- | --- | --- | --- |
| Layered config (CLI / env / file / defaults) | [`lino-arguments`](https://crates.io/crates/lino-arguments) | Yes | Used in `src/cli.rs`; can add subcommands without rework |
| Text persistence | [`lino-objects-codec`](https://crates.io/crates/lino-objects-codec) | Yes | Already powers the text token store |
| Binary persistence | [`link-cli`](https://github.com/link-foundation/link-cli) | Yes (adapter) | Already powers the binary token store |
| HTTP server | [`axum`](https://crates.io/crates/axum) 0.8 | Yes | Same handler signatures stay valid |
| HTTP client | [`reqwest`](https://crates.io/crates/reqwest) | Yes | Used in `src/proxy.rs` |
| JWT issuance for `la_sk_…` | [`jsonwebtoken`](https://crates.io/crates/jsonwebtoken) | Yes | Used in `src/token.rs` |
| Metrics | [`metrics`](https://crates.io/crates/metrics) + Prometheus exporter | Yes | Used in `src/metrics.rs` |
| OAuth PKCE flows (R22) | [`oauth2`](https://crates.io/crates/oauth2) | No | Add only when implementing R22 |
| Compression rules (R19 lite) | hand-written; no external dep needed | n/a | Caveman / OmniRoute rules can be ported as a Rust regex pass |
| Compression aggressive (R19+) | [`tiktoken-rs`](https://crates.io/crates/tiktoken-rs) for tokenisation, plus a small LLM prompt for summarisation | No | Defer until aggressive mode lands |
| MCP (R24) | [`rmcp`](https://crates.io/crates/rmcp) (community Rust implementation) | No | Pull in only when MCP work is scheduled |

## Acceptance Signals For Issue #9

The issue can be considered well-covered when the repository has:

- a stable case-study package under `docs/case-studies/issue-9/`,
- a written roadmap that splits stable (`MUST` / `SHOULD`) work from experimental (`EXP`) work,
- a documented provider abstraction plan,
- a documented unified-token plan,
- a documented multi-provider multi-account routing plan,
- and external-project comparisons that justify the recommendations.

## Non-Goals For The First Implementation Pass

These items should not block the first implementation pass on issue #9:

- shipping every OmniRoute provider (160+) at once,
- shipping a dashboard, desktop app, mobile app, or PWA,
- shipping the MCP / A2A protocol stacks,
- shipping anti-detection / TLS-fingerprint spoofing,
- shipping multi-modal (image / video / audio) APIs.

The first implementation pass should prioritise the provider abstraction, the unified-token surface, and the per-provider routing engine — everything else fits cleanly on top of those foundations later.
