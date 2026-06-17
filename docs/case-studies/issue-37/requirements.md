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
the state **as of this PR** (this PR is the analysis/planning deliverable).

| # | Functional requirement | Proposed solution (summary) | Status | Plan |
| --- | --- | --- | --- | --- |
| F1 | Support **Claude** subscription (Pro/Max OAuth). | Already shipped: `src/oauth.rs` reads nested `~/.claude` creds; beta header injected. Harden with native refresh + login. | **Already supported** (baseline) | Plan 1 |
| F2 | Support **OpenAI Codex / ChatGPT** subscription. | Phase 1: read `~/.codex/auth.json`; route to `chatgpt.com/backend-api/codex/responses` (Responses wire API) with `chatgpt-account-id`. Phase 2: native `router login codex` (PKCE). | Planned | Plan 2 |
| F3 | Support **Google Gemini** subscription (Code Assist). | Phase 1: read `~/.gemini/oauth_creds.json`; route to `cloudcode-pa.googleapis.com` `v1internal`; translate OpenAI/Anthropic ↔ Gemini. Phase 2: native Google OAuth login. | Planned | Plan 3 |
| F4 | Support **Qwen** subscription (qwen-code). | Phase 1: read `~/.qwen/oauth_creds.json` → DashScope OpenAI-compatible base. Phase 2: device-code `router login qwen`. Note: free OAuth tier closed 2026-04-15. | Planned (low priority) | Plan 4 |
| F5 | **Generalize the provider abstraction** so each provider has its own auth + model map + dialect translation (today `ProviderKind` has one variant). | Introduce a `Provider` trait / enum: `auth()`, `base_url()`, `translate_request/response()`, `usage_endpoint()`. | Planned (foundational) | Plan 5 |
| F6 | **Native login flows** (OAuth Authorization-Code+PKCE and device-code) so the router stands alone without vendor CLIs. | `router login <provider>` using the `oauth2` crate; local callback server / device-code polling; persist tokens. | Planned | Plan 6 |
| F7 | **Token refresh & expiry** across providers. | `oauth2` `exchange_refresh_token()` per provider; proactive refresh before expiry; replace the no-op `refresh_token()`. | Planned | Plan 6 |
| F8 | **Cross-provider multi-account pool** with smart routing/cooldown ("all our features"). | Extend `AccountRouter` to hold accounts of mixed providers; adopt `fill-first`, session affinity, `Retry-After(-Ms)` parsing. | Planned | Plan 7 |
| F9 | **Auto-configure client tools** (Claude Code, Codex, Gemini CLI, OpenCode, Continue, ...). | `router configure <tool>` writes the right config/env; `router doctor` detects installed tools. | Planned | Plan 8 |
| F10 | **Per-provider usage/quota & savings** observability ("and more"). | Extend `src/metrics.rs` with per-provider/per-token token+cost accounting; `router quota` / `/v1/quota` polling vendor usage endpoints. | Planned | Plan 9 |
| F11 | **Dialect translation matrix** (OpenAI ↔ Anthropic ↔ Gemini, incl. SSE). | Build on `src/openai.rs`; add Gemini translation; centralize a translation registry per CLIProxyAPI's design. | Planned | Plan 5 |
| F12 | **GUI / dashboard** (the most visible ProxyPal feature) — optional. | Out of scope for the engine; propose a thin web dashboard or document ProxyPal-style desktop wrapper as future work. | Planned (optional/future) | Plan 10 |

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
