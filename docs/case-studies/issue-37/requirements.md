# Issue 37 Requirements Trace

The issue has two layers:

1. **Process requirements** — the explicit deliverables the issue spells out
   (collect data, analyze, list requirements, propose plans, survey components,
   do it all in PR #38). These are *completed by this case study*.
2. **Functional requirements** — the super-goal it states: *"fully support
   claude, codex, gemini, qwen, and their subscriptions with all our features and
   more."* Fully shipping all of these is a multi-PR roadmap; this case study's
   job (per the process requirements) is to enumerate them and propose a
   solution/plan for each. They are tracked here and detailed in
   [`solution-plans.md`](./solution-plans.md).

## Layer 1 — Process requirements (delivered in this PR)

| # | Requirement (from the issue) | Solution | Status | Evidence |
| --- | --- | --- | --- | --- |
| P1 | Collect data related to the issue into `docs/case-studies/issue-37/`. | This folder: issue JSON/comments + ProxyPal snapshot metadata captured under `raw/`. | Done | `raw/issue-37.json`, `raw/issue-37-comments.json`, `raw/proxypal/` |
| P2 | Deep case-study analysis, **searching online for additional facts and data**. | `README.md` (analysis), `proxypal-analysis.md` (reference inventory), `online-research.md` (cited primary sources for every provider's OAuth/quotas). | Done | `README.md`, `proxypal-analysis.md`, `online-research.md` |
| P3 | List **each and all** requirements from the issue. | This file (`requirements.md`) — both process and functional requirements traced. | Done | `requirements.md` |
| P4 | Propose possible solutions and solution **plans for each requirement**. | `solution-plans.md` — phased plan per provider/feature, with file-level touch points and acceptance criteria. | Done | `solution-plans.md` |
| P5 | Check known existing components/libraries that solve a similar problem or can help. | `components-survey.md` — surveys CLIProxyAPI, ProxyPal, LiteLLM, `oauth2`/`openidconnect` crates, etc., with build-vs-borrow decisions. | Done | `components-survey.md` |
| P6 | Do everything in the single PR #38 (update the existing draft, don't open a new one). | All commits land on `issue-37-69d3f0803294`; PR #38 updated. | Tracked in GitHub | PR #38 |

## Layer 2 — Functional requirements (the super-goal, planned here)

Derived by decomposing *"fully support claude, codex, gemini, qwen, and their
subscriptions with all our features and more"* against the current router
([`README.md` §gap analysis](./README.md)) and the ProxyPal/CLIProxyAPI feature
set. Each has a plan in [`solution-plans.md`](./solution-plans.md); "Status" is
the state **as of this PR**, which implements the subscription engine
(credential reading, API routing, dialect translation, in-memory refresh) with
**no UI**, per the governing directive on PR #38.

| # | Functional requirement | Proposed solution (summary) | Status | Plan |
| --- | --- | --- | --- | --- |
| F1 | Support **Claude** subscription (Pro/Max OAuth). | Shipped: `src/oauth.rs` reads nested `~/.claude` creds; beta header injected. | **Done** (baseline) | Plan 1 |
| F2 | Support **OpenAI Codex / ChatGPT** subscription. | Implemented: `src/subscription.rs` reads `~/.codex/auth.json`; `src/subscription_proxy.rs` translates Chat Completions → Responses and routes to `chatgpt.com/backend-api/codex/responses` with `chatgpt-account-id`. | **Done** | Plan 2 |
| F3 | Support **Google Gemini** subscription (Code Assist). | Implemented: `src/gemini.rs` reads `~/.gemini/oauth_creds.json`, translates OpenAI ↔ Code Assist `generateContent`, synthesizes SSE for streaming. | **Done** | Plan 3 |
| F4 | Support **Qwen** subscription (qwen-code). | Implemented: reads `~/.qwen/oauth_creds.json` → DashScope OpenAI-compatible base (per-token `resource_url` override). | **Done** | Plan 4 |
| F5 | **Generalize the provider abstraction** so each provider has its own auth + model map + dialect translation. | Implemented: `SubscriptionProvider` enum (auth/home/base-url) + `UpstreamProvider::{Codex,Gemini,Qwen}` dispatch in `src/proxy.rs`. | **Done** | Plan 5 |
| F6 | **Native login flows** so the router stands alone without vendor CLIs. | Deferred by design: best practice is to delegate login to each vendor CLI (avoids duplicating OAuth flows / storing secrets); the router reads the resulting credential files. | Deferred (design choice) | Plan 6 |
| F7 | **Token refresh & expiry** across providers. | Implemented: `src/refresh.rs` exchanges refresh tokens via each vendor's public OAuth client and caches in memory; vendor files stay read-only. | **Done** | Plan 6 |
| F8 | **Cross-provider multi-account pool** with smart routing/cooldown ("all our features"). | Partial: `Retry-After`/`x-ratelimit-*` headers relayed to clients; Claude multi-account pool retained in `src/accounts.rs`. Single-credential subscription providers expose one account each. | **Partial** | Plan 7 |
| F9 | **Auto-configure client tools**. | Deferred: out of scope for the no-UI engine deliverable; vendor CLIs configure themselves. | Deferred | Plan 8 |
| F10 | **Per-provider usage/quota & savings** observability ("and more"). | `router doctor` reports per-provider credential/token validity; full per-provider cost accounting tracked as follow-up. | Partial | Plan 9 |
| F11 | **Dialect translation matrix** (OpenAI ↔ Anthropic ↔ Gemini, incl. SSE). | Implemented: `src/openai.rs` (`chat_completion_to_responses`) + `src/gemini.rs` translators with SSE synthesis. | **Done** | Plan 5 |
| F12 | **GUI / dashboard** — optional. | Out of scope: the governing directive explicitly excludes UI support. | Out of scope (per directive) | Plan 10 |

## Out of scope / explicitly deferred

- Building a Tauri desktop app (F12) — the router is a single-binary engine; a
  GUI is a separate deliverable. We document the option, not build it.
- Providers beyond the four named (iFlow, Vertex, Copilot, Antigravity, Kimi,
  Kiro) — covered as "and more" in the survey and reachable via the same
  generalized abstraction (F5), but not required by the issue's core list.
- Shipping every provider's production-tested OAuth in this PR — real
  subscription credentials are required to verify each end-to-end, so
  implementation is sequenced as follow-up PRs per Plan, each with its own live
  test evidence (mirroring how issue #35 verified Claude against a real session).
