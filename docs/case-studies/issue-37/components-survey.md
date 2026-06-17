# Existing Components & Libraries Survey

The issue asks to "check known existing components/libraries that solve a similar
problem or can help in solutions." The super-problem — *use multiple AI
subscriptions (Claude, Codex, Gemini, Qwen, ...) through one local proxy with any
client* — decomposes into five sub-problems. This file surveys prior art for
each and records the build-vs-borrow decision.

## Sub-problem A — Multi-provider proxy engine

| Component | Lang | What it gives | Fit for this repo |
| --- | --- | --- | --- |
| [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) | Go | The closest match: wraps Claude/Codex/Gemini/Qwen/Copilot OAuth, translates dialects, rotates accounts, 429 cooldown. | **Design reference.** It is exactly what the issue describes — but in Go. We already own a Rust engine; we copy its *design* (provider executors, translation registry, fill-first rotation, cooldown), not the code. Could be embedded as a sidecar (the ProxyPal route) but that abandons our Rust engine and its `la_sk_` token model. |
| [ProxyPal](https://github.com/heyhuynhgiabuu/proxypal) | Rust+TS (Tauri) | The *experience* layer over CLIProxyAPI: one-click login, auto-config, analytics. | **UX reference** (see [`proxypal-analysis.md`](./proxypal-analysis.md)). The login/auto-config/analytics ideas map onto CLI subcommands and (optionally) a future web dashboard. |
| [LiteLLM](https://github.com/BerriAI/litellm) | Python | 100+ providers, virtual keys, budgets, routing, OpenAI-format proxy. | Reference for the proxy contract (already cited in ADR 0001). Too heavy / wrong language to embed; we already interop with it as an `openai-compatible` upstream. |
| [claude-code-router](https://github.com/musistudio/claude-code-router) | TS | Routes Claude Code `/v1/messages` to OpenAI-compatible backends; `/model` switching. | Reference for the Anthropic-in / any-out routing direction. |
| [Bifrost](https://github.com/maximhq/bifrost) | Go | OpenAI-compatible gateway, load-balancing, cluster mode. | Reference for multi-account load balancing at scale. |

**Decision:** grow our existing Rust engine; adopt CLIProxyAPI's architecture
(per-provider executor + translation registry + rotation/cooldown). Do **not**
embed a foreign engine — that would discard the `la_sk_` token gateway, the Lino
token store, Gonka/Crater, and the single-binary Rust deployment that are this
repo's identity.

## Sub-problem B — Per-provider OAuth / device-code login

| Component | What it gives | Fit |
| --- | --- | --- |
| [`oauth2`](https://docs.rs/oauth2) v5 (Rust) | Typed OAuth2 Authorization-Code + **PKCE** (`PkceCodeChallenge::new_random_sha256`) and **device-code** (`exchange_device_code`, RFC 8628). reqwest backend (already a dependency). | **Adopt.** Covers Claude, Codex, Gemini (auth-code+PKCE) and Qwen, Copilot (device-code) with one crate, no new HTTP stack. |
| [`openidconnect`](https://docs.rs/openidconnect) v4 (Rust) | OIDC on top of `oauth2` (id-token, discovery); documents SSRF-safe redirect handling. | Optional — only if we want id-token parsing (Codex `account_id` comes from the id-token). |
| Provider CLIs (`claude`, `codex`, `gemini`, `qwen`) | Already perform the OAuth and write credential files we can read. | **Already used for Claude** (`src/oauth.rs` reads `~/.claude`). Lowest-effort path for new providers: read `~/.codex/auth.json`, `~/.gemini/oauth_creds.json`, `~/.qwen/oauth_creds.json` like we read `~/.claude` — *before* implementing native login. |

**Decision:** two-phase. **Phase 1 (read-only):** extend the credential reader
to ingest Codex/Gemini/Qwen credential files produced by their official CLIs —
mirrors how we already support Claude, needs no OAuth code, immediately unlocks
subscriptions. **Phase 2 (native login):** add `router login <provider>` using
the `oauth2` crate (PKCE + device-code) so the router stands alone without the
vendor CLIs.

## Sub-problem C — Token refresh & expiry

| Component | What it gives | Fit |
| --- | --- | --- |
| `oauth2` crate refresh | `exchange_refresh_token()` against each provider's token endpoint. | **Adopt** in Phase 2; today `src/oauth.rs::refresh_token()` only re-reads the file (no network refresh). |
| Provider CLIs' own refresh | The CLI refreshes its file; we re-read it. | Phase 1 free-ride: if the user keeps the vendor CLI logged in, files stay fresh. |

## Sub-problem D — Auto-configure client tools

| Component | What it gives | Fit |
| --- | --- | --- |
| ProxyPal `configure_cli_agent` / `get_tool_setup_info` | Detects + rewrites `~/.claude/settings.json`, `~/.codex/config.toml`, shell profiles, etc. | **Re-implement as a CLI** (`router configure <tool>` + `router doctor` detection). We already have a `doctor` subcommand to extend. Pure file I/O, no new deps. |

## Sub-problem E — Usage analytics / quota / 429 rotation

| Component | What it gives | Fit |
| --- | --- | --- |
| Our `src/metrics.rs` | Prometheus counters, `/v1/usage`, `/v1/accounts`. | **Extend**, don't replace — add per-provider/per-token token-count + cost. We already emit better structured metrics than ProxyPal's log-tail. |
| ProxyPal quota widgets | Per-provider usage via each vendor's usage endpoint. | Reference for *which* endpoints to poll (Claude `/api/oauth/usage`, Codex `/wham/usage`, Copilot `/copilot_internal/user`). Map to a `router quota` command / `/v1/quota` endpoint. |
| CLIProxyAPI rotation/cooldown | `fill-first`, session affinity, `Retry-After(-Ms)` parsing, synthesized `model_cooldown` 429. | **Adopt** to upgrade our fixed-60s cooldown in `src/accounts.rs`. |
| [`tower`](https://docs.rs/tower) middleware | Retry/timeout/rate-limit layers. | Already a dependency; use for inbound per-token rate limiting (a known CLIProxyAPI gap). |

## Overall build-vs-borrow decision

**Borrow designs and pure-Rust libraries; build on our own engine.**

- **Borrow:** `oauth2` crate (login), CLIProxyAPI's provider/translation/rotation
  *architecture*, ProxyPal's *UX* (login → configure → analytics) re-expressed as
  CLI subcommands.
- **Build/extend:** the existing axum proxy, `ProviderKind` enum (today only
  `OpenAICompatible` — generalize to per-provider auth+translation), the
  credential reader (multi-provider), `AccountRouter` (cross-provider pool +
  smarter cooldown), and the `doctor`/new `configure`/`login` CLI surface.
- **Do not embed** CLIProxyAPI/LiteLLM as a foreign engine — it would discard the
  `la_sk_` token gateway, Lino store, Gonka/Crater, and single-Rust-binary
  deployment that distinguish this project.
