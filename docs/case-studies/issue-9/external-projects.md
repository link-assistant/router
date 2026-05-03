# External Project Comparison

All snapshots in this document are based on repository metadata and README content fetched on 2026-05-03. This is a README-level comparison, not a full source audit of every code path.

Primary source files are stored in [raw/](./raw/).

## Lineage

OmniRoute did not appear from nothing. The README explicitly credits two upstreams:

```
CLIProxyAPI (Go, router-for-me)
        │
        ▼
9router (TypeScript / Node, decolua) — "the original project that inspired this fork"
        │
        ▼
OmniRoute (TypeScript, diegosouzapw) — adds compression, multi-modal, MCP, A2A
```

Reading those three README snapshots together helps separate "this is required for Claude/Codex/Gemini support" from "this is OmniRoute product polish".

## Snapshot Table

| Repo | Stack | Stars (≈) | Updated | Core role | Standout idea relevant to issue #9 |
| --- | --- | ---: | --- | --- | --- |
| [diegosouzapw/OmniRoute](./raw/diegosouzapw_OmniRoute.README.md) | TS / Next.js 16 / SQLite | 5.3k | 2026-04 | Issue #9's reference target | Multi-provider OAuth + 4-tier fallback + format translation + dashboard |
| [decolua/9router](./raw/decolua_9router.README.md) | TS / Node | 0.6k | 2026-04 | Direct ancestor of OmniRoute | Same provider model, smaller surface; closer to what issue #9 literally asks for |
| [router-for-me/CLIProxyAPI](./raw/router-for-me_CLIProxyAPI.README.md) | Go | 1.5k | 2026-04 | Original CLI proxy bridge | Multi-account, multi-provider, format translation between Anthropic / OpenAI / Gemini, all in <5K lines of Go |
| [musistudio/claude-code-router](./raw/musistudio_claude-code-router.README.md) | TS / Node | 18k | 2026-04 | Most popular Claude Code "router" project | Provider routing rules, transformers, and per-route model overrides — the rule engine pattern |
| [BerriAI/litellm](./raw/BerriAI_litellm.README.md) | Python | 16k | 2026-04 | The reference 100+ provider gateway | Provider abstraction at scale; budget tracking; OpenAI-style proxy server; battle-tested router |
| [JuliusBrussee/caveman](./raw/JuliusBrussee_caveman.README.md) | TS / library | 51k | 2026-04 | Token compressor inspiration | "Why use many token when few token do trick" — 30+ regex compression rules cited by OmniRoute's standard mode |

## Capability Matrix

Legend:

- `Y` = clearly advertised in fetched README
- `P` = partial, opt-in, or limited
- `N` = not advertised in fetched README
- `?` = not enough README signal to decide

| Project | Multi-provider OAuth | API-key providers | Free providers | OpenAI surface | Anthropic surface | Gemini surface | Cross-provider fallback | Per-key auth & quotas | Dashboard | Compression | MCP / A2A | Multi-modal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| link-assistant/router (current) | P (Claude only) | N | N | Y | Y | N | P (within one provider) | P (no scopes/limits) | N | N | N | N |
| OmniRoute | Y (8) | Y (120+) | Y (11) | Y | Y | Y | Y | Y | Y | Y (5 modes) | Y | Y (10 APIs) |
| 9router | Y (subset of OmniRoute's) | Y | Y | Y | Y | Y | Y | Y | Y | N | N | N |
| CLIProxyAPI | Y (Claude / Codex / Gemini) | Y | N | Y | Y | Y | P | P | N | N | N | N |
| musistudio/claude-code-router | N | Y | P | Y | Y | P | Y | P | N | P | P | N |
| LiteLLM | N (provider keys, not OAuth subs) | Y (100+) | P | Y | Y | Y | Y | Y | Y (paid) | N | P (MCP only) | Y |
| Caveman | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Y (library) | n/a | n/a |

## Patterns That Matter For Issue #9

### Pattern A: provider abstraction is the load-bearing change

CLIProxyAPI, 9router, OmniRoute, musistudio/claude-code-router, and LiteLLM all share one structural decision: a `Provider` (or `Channel`, or `Backend`) interface that knows its own auth shape, base URL, request translation, and capability flags. The router core is then a thin dispatcher.

That is exactly the abstraction the current router does not yet have. Every other feature in issue #9 — Codex / Gemini / Qwen support, multi-subscription pooling, fallback chains, the unified `la_sk_…` token — assumes this layer already exists.

### Pattern B: the unified API key trick

OmniRoute, 9router, and CLIProxyAPI all expose the same locally-issued bearer (`la_sk_…` analogue) as the credential for every supported front-door protocol. Concretely:

- `Authorization: Bearer la_sk_…` on `/v1/messages` (Anthropic),
- `Authorization: Bearer la_sk_…` on `/v1/chat/completions` (OpenAI),
- `Authorization: Bearer la_sk_…` on `/v1/responses` (Codex),
- `x-goog-api-key: la_sk_…` on `v1beta/models/<id>:generateContent` (Gemini),
- `Authorization: Bearer la_sk_…` on `/api/v1/services/aigc/text-generation/generation` (Qwen DashScope).

That is the "and also as regular API tokens" clause from issue #9, expressed as an interop convention. The router already does this for Anthropic + OpenAI; the gap is Gemini and Qwen.

### Pattern C: subscription protection by token swap

All three direct ancestors (CLIProxyAPI / 9router / OmniRoute) hide upstream OAuth credentials behind their own bearer. The client never sees the real Claude / Codex / Gemini OAuth refresh token. The router caches it, refreshes it on its own schedule, and substitutes it at the moment of the upstream request.

The current router already implements this for Claude. Issue #9 needs the same pattern for Codex / Gemini / Qwen / Kiro / Qoder. The cost is a per-provider OAuth refresher and a credential cache; the design is unchanged.

### Pattern D: cross-provider fallback as a first-class chain

OmniRoute's "Subscription → API → Cheap → Free" is an ordered list of provider+model nodes. On 429 / 5xx / quota-exhausted / breaker-open, the chain advances by one node. CLIProxyAPI and musistudio/claude-code-router expose the same idea with different vocabularies (`Channel`, `route_rule`).

The current router has the building blocks (cooldown, last-failure tracking) but they only operate inside one provider. Lifting them to operate across providers turns the existing `MultiAccountRouter` into a true `MultiProviderRouter`.

### Pattern E: routing rules vs. dashboards

OmniRoute and LiteLLM expose routing rules through a UI; musistudio/claude-code-router exposes them through a JSON config file. Either is fine. The current router's `lino-arguments` + `.lenv` story is closer to musistudio's approach: textual rules in a config file, plus CLI subcommands to mutate them.

The headless approach is the right baseline for issue #9 — a dashboard is OmniRoute polish, not a hard requirement of the issue text.

### Pattern F: compression is real but should be opt-in

Caveman is a separate library, not a router. OmniRoute embeds the same idea behind a `compression` flag with five tiers, and the README quotes 15-75% token savings. The pattern that matters for the current router is:

- a single `--compression=off|lite|standard|aggressive|ultra` flag,
- `off` is the only safe default,
- `lite` (whitespace + dedup) is the only safe automatic mode,
- everything else is explicitly opt-in because it can change semantics.

### Pattern G: protocols beyond chat are out of scope for issue #9

OmniRoute ships images, video, music, TTS, STT, moderation, rerank, search, batch, embeddings, MCP server, A2A, agent card, and more. None of those are required by issue #9's literal text ("fully support Claude, Codex, Gemini, Qwen, OpenCode"). They are valuable, but they should be tracked as separate follow-up issues so issue #9 stays focused.

## What This Means For Link.Assistant.Router

The five projects above push the recommendation in one direction:

1. **Adopt CLIProxyAPI's provider abstraction shape** — a small typed surface (auth + base URL + translate request + translate response + capabilities). It is the smallest design that supports the largest provider list.
2. **Adopt OmniRoute's unified-token convention** — one `la_sk_…` token works on every front door. Codex, Gemini, and Qwen need their own surface routes for this to be observable.
3. **Adopt the four-tier fallback chain semantics from OmniRoute** — keep the chain visible to operators in the config file and `/v1/usage` log.
4. **Adopt musistudio/claude-code-router's "router rules in a config file" mental model** — keep the operator surface headless and reproducible. A dashboard can come later as a separate project.
5. **Adopt Caveman compression as opt-in only** — start with `lite`, defer `standard / aggressive / ultra` until there are tests proving they preserve output quality on representative workloads.

The three EXP-rated layers (MCP, A2A, multi-modal) should stay deferred to dedicated issues. They do not block issue #9 and they are large enough to deserve their own scope.
