# Issue 37 Case Study: Adopt the best of ProxyPal — full multi-provider subscription support

## Summary

[Issue #37](https://github.com/link-assistant/router/issues/37) asks us to "use
all the best experience from
[heyhuynhgiabuu/proxypal](https://github.com/heyhuynhgiabuu/proxypal)" so that
the router can **"fully support claude, codex, gemini, qwen, and their
subscriptions with all our features and more."** It then specifies a concrete
*process*: collect the issue's data into `docs/case-studies/issue-37/`, do a deep
case-study analysis (including online research), list **every** requirement,
propose a solution/plan for each, and survey existing components/libraries — all
in PR #38.

This case study delivers that process. It is a **planning and analysis
deliverable**: the functional super-goal (four providers' OAuth subscriptions +
login + auto-config + analytics + a possible GUI) is a multi-PR roadmap, and the
issue's explicit ask is to *analyze it and plan it*, which is exactly what these
documents do. Implementation is then sequenced as follow-up PRs, each verified
against a real subscription (the same discipline issue #35 used for Claude).

## What's in this folder

| File | Purpose |
| --- | --- |
| [`README.md`](./README.md) | This analysis: what ProxyPal teaches, where we stand, the gap, the plan. |
| [`requirements.md`](./requirements.md) | Every requirement (process + functional) traced to a solution and status. |
| [`solution-plans.md`](./solution-plans.md) | One detailed, file-level plan per functional requirement, plus execution order. |
| [`components-survey.md`](./components-survey.md) | Existing components/libraries surveyed, with build-vs-borrow decisions. |
| [`online-research.md`](./online-research.md) | Cited primary sources: each provider's OAuth endpoints, tokens, quotas, 429 handling. |
| [`proxypal-analysis.md`](./proxypal-analysis.md) | Deep inventory of ProxyPal + the CLIProxyAPI engine it wraps. |
| [`raw/`](./raw/) | Captured data: issue JSON/comments + ProxyPal snapshot metadata. |

## The key insight: ProxyPal is a UX shell, not an engine

The most important finding (full evidence in
[`proxypal-analysis.md`](./proxypal-analysis.md)): **ProxyPal implements no proxy
and no OAuth.** It is a Tauri v2 + SolidJS desktop GUI that wraps the Go-based
[**CLIProxyAPI**](https://github.com/router-for-me/CLIProxyAPI) binary as a
sidecar. CLIProxyAPI is the engine that performs the OAuth, the model/API-dialect
translation, the multi-account rotation, and the proxying. ProxyPal's value is
the *experience*: one-click login per provider, auto-configuring installed coding
tools, usage analytics, and lifecycle management.

```
ProxyPal (what the issue points at)        link-assistant/router (us)
───────────────────────────────────        ──────────────────────────
Tauri shell (Rust)                          We already ARE a Rust proxy engine.
  └─ SolidJS UI  ───────────────────────►   Adopt these IDEAS (login, configure,
       (login / configure / analytics)       analytics) as CLI/JSON surfaces.
       └─ CLIProxyAPI engine (Go) ───────►   Adopt this ARCHITECTURE (per-provider
            (OAuth, translate, rotate)        auth + translation + rotation) in OUR
                                              engine — don't embed a foreign one.
```

So "use the best experience from ProxyPal" resolves to **two distinct things**:

1. **Adopt CLIProxyAPI's engine architecture** — per-provider OAuth, a dialect
   translation registry, and smart account rotation/cooldown — implemented
   *natively in our Rust engine* (we already own one; we shouldn't bolt on a Go
   sidecar and throw away the `la_sk_` token gateway, Lino store, Gonka/Crater,
   and single-binary deployment that define this project).
2. **Adopt ProxyPal's UX** — login, auto-configure-your-coding-tool, and usage
   analytics — re-expressed as `router` subcommands and JSON endpoints (with a
   GUI as optional later work).

## Where the router stands today

Full inventory was produced by reading every source file; highlights relevant to
this issue (file evidence in [`requirements.md`](./requirements.md) and
[`solution-plans.md`](./solution-plans.md)):

- **Claude is fully supported.** `src/oauth.rs` reads the real nested
  `~/.claude/.credentials.json`, the proxy injects `anthropic-version` +
  `anthropic-beta: oauth-2025-04-20`, and `la_sk_` tokens hide the real OAuth
  credential (issue #35). This is our model for every other provider.
- **A capable proxy core:** axum server; OpenAI↔Anthropic translation
  (`src/openai.rs`, incl. streaming SSE); `/v1/messages`, `/v1/chat/completions`,
  `/v1/responses`, `/v1/models`; admin + `/metrics` + `/v1/usage` + `/v1/accounts`.
- **Multi-account routing** (`src/accounts.rs`): round-robin/priority/least-used
  with a fixed 60s cooldown on 429 — **Claude-only**.
- **Several upstreams** via `UPSTREAM_PROVIDER`: `anthropic` (default, incl.
  Bedrock/Vertex request shapes), `gonka` (signed), `crater` (ForgeFed),
  `openai-compatible`/`litellm` (static API key).
- **Scoped tokens:** `la_sk_` JWTs with TTL, revocation, and per-token
  `max_requests` budgets; dual Lino-text + binary store.

## The gap (what "fully support codex/gemini/qwen" requires)

| Capability | Today | Needed |
| --- | --- | --- |
| Claude subscription | ✅ file read + beta header | refresh + native login (hardening) |
| Codex/ChatGPT subscription | ❌ API-key only | read `~/.codex` + ChatGPT Responses route; native login |
| Gemini subscription | ❌ (Vertex *shape* only, no Google creds) | read `~/.gemini` + Code Assist route + Gemini translation; native login |
| Qwen subscription | ❌ | read `~/.qwen` → DashScope; device-code login |
| Provider abstraction | one variant (`OpenAICompatible`) | per-provider auth + model map + translation |
| Native OAuth login / device-code | ❌ (reads files only) | `router login <provider>` (PKCE / device-code) via `oauth2` crate |
| Token refresh | ❌ (`refresh_token()` re-reads the file) | real `exchange_refresh_token()` per provider |
| Cross-provider account pool | ❌ Claude-only | mixed-provider pool + `fill-first` + `Retry-After` cooldown |
| Auto-configure client tools | ❌ | `router configure <tool>` + `router doctor` detection |
| Per-provider usage/quota/savings | coarse counters | per-provider token+cost + vendor quota polling |
| GUI / dashboard | ❌ (JSON/Prometheus only) | optional thin web dashboard / desktop wrapper |

## The plan

The full, file-level, phased plan is in
[`solution-plans.md`](./solution-plans.md). The shape:

- **Read before login.** For each new provider, first *read the credential file
  the vendor CLI already writes* (Phase 1) — zero OAuth code, immediate
  subscription access, exactly how Claude works today — then add native
  `router login` (Phase 2) to drop the vendor-CLI dependency.
- **Foundation first.** Generalize the provider abstraction + a translation
  registry (Plan 5) before adding Codex (Plan 2), Gemini (Plan 3), Qwen (Plan 4).
- **Borrow Rust libraries, not engines.** Use the `oauth2` crate (PKCE +
  device-code + refresh) for login; adopt CLIProxyAPI's rotation/cooldown
  *design*; re-express ProxyPal's UX as CLI subcommands.
- **Verify each provider live.** Every implementation PR ships redacted live
  evidence against a real subscription, like issue #35's Claude proof.

### Suggested follow-up PR order

1. Provider abstraction + translation registry (Plan 5)
2. Codex via `~/.codex` read (Plan 2 Phase 1)
3. Gemini via `~/.gemini` read + Gemini translation (Plan 3 Phase 1)
4. Native `router login` + refresh (Plan 6)
5. Cross-provider pool + smart cooldown (Plan 7)
6. `router configure` auto-setup (Plan 8)
7. Per-provider usage/quota (Plan 9)
8. Qwen (Plan 4) · 9. Optional GUI (Plan 10)

## Why implementation is not all in this PR

The issue's explicit deliverables (collect/analyze/list/plan/survey) are
**complete here**. The functional super-goal spans four providers' OAuth, native
login + refresh, a generalized provider abstraction, cross-provider routing,
auto-config, and analytics — each of which can only be *verified* against a real
subscription (Codex/Gemini/Qwen credentials are not available in this
environment). Shipping untested OAuth for credentials we cannot exercise would
contradict this repo's "reproduce and verify" discipline. So this PR delivers the
exhaustive, evidence-backed roadmap, and each provider lands in a focused
follow-up PR with its own live proof — the same path issue #35 used to land
Claude correctly.
