# ProxyPal & CLIProxyAPI — Reference Inventory

The issue asks us to "use all the best experience from
[heyhuynhgiabuu/proxypal](https://github.com/heyhuynhgiabuu/proxypal)". This file
is the deep inventory of what ProxyPal (and the engine it wraps) actually does,
so the requirement list and solution plans have a concrete, evidence-backed
basis.

> **Snapshot:** ProxyPal `v0.4.42`
> (commit `3c0f0cf5704aff82426e73a7b95a87d05b2b25c6`, 2026-06-16), bundling
> **CLIProxyAPI** sidecar `v7.2.7`. License: MIT. Cloned to `/tmp/proxypal-ref`
> for this analysis; key metadata preserved in [`raw/proxypal/`](./raw/proxypal/).

## 1. What ProxyPal actually is

ProxyPal is **not a proxy**. It is a native desktop GUI (Tauri v2 + SolidJS) that
**wraps the Go-based [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)
binary as a sidecar**. CLIProxyAPI is the engine that does all the real work:
OAuth, multi-account rotation, model/API translation, and proxying. ProxyPal's
value is entirely in the *experience layer*:

- one-click OAuth/device-code login per provider,
- auto-configuring installed coding tools to point at the local proxy,
- usage analytics, request monitoring, and per-provider quota widgets,
- lifecycle management (start/stop, health, tray, updater, tunnels).

ProxyPal's own README states the stack verbatim: *"SolidJS + TypeScript +
Tailwind (frontend), Rust + Tauri v2 (backend), CLIProxyAPI (proxy)."* This is
**directly relevant prior art** for us: it proves the "thin Rust shell around a
multi-provider proxy engine" pattern — except we already *own* a Rust proxy
engine (`link-assistant/router`), so our task is to grow the engine, not wrap
someone else's.

```
ProxyPal architecture                       Our position
─────────────────────                       ────────────
Tauri shell (Rust)                          We are the engine, in Rust.
  └─ SolidJS UI (login, analytics, config)  ← the "experience" to adopt
       └─ CLIProxyAPI sidecar (Go)          ← the multi-provider engine
            ├─ Claude / Codex / Gemini /    ← the providers to support
            │   Qwen / Copilot OAuth
            ├─ model/API translation
            └─ account rotation + 429
```

## 2. Provider support matrix (ProxyPal `AuthStatus`)

The authoritative provider list is the Rust `AuthStatus` struct in
`src-tauri/src/types/auth.rs` plus Copilot (a separate subprocess):

| Provider | Subscription wrapped | Auth method(s) | Notes |
| --- | --- | --- | --- |
| **Claude** | Anthropic Claude Pro/Max | OAuth **or** API key | quota via `api.anthropic.com/api/oauth/usage` |
| **OpenAI (Codex/ChatGPT)** | OpenAI ChatGPT/Codex | OAuth **or** device code **or** API key | quota via `chatgpt.com/backend-api/wham/usage` |
| **Gemini** | Google Gemini (Code Assist) | OAuth **or** API key | thinking-token injection |
| **Qwen** | Alibaba Qwen | OAuth **or** device code | OAuth needs "Plus" sidecar channel |
| **iFlow** | iFlow | OAuth | OpenAI-dialect upstream |
| **Vertex AI** | Google Cloud Vertex | service-account JSON import / API key | IAM, not OAuth |
| **GitHub Copilot** | GitHub Copilot | separate `copilot-api` subprocess (token exchange) | exposed as OpenAI-compatible |
| **Antigravity** | Google Antigravity (thinking) | OAuth | quota via `*-cloudcode-pa.googleapis.com` |
| **Kimi** | Moonshot Kimi | OAuth | model-mapping source |
| **Kiro** | Kiro | OAuth (web UI) | quota via shelling out to `kiro-cli` |
| **Custom** | any OpenAI-compatible | API key + base URL | model aliases |

Config defaults: port `8317`, client key `proxypal-local`, management key
`proxypal-mgmt-key`, routing `round-robin` (or `fill-first`).

## 3. OAuth / device-code flows

**ProxyPal implements no OAuth itself** — it orchestrates UX and delegates every
PKCE/token-exchange to CLIProxyAPI's Management API
(`http://127.0.0.1:{port}/v0/management/*`, header `X-Management-Key`).

- `get_oauth_url(provider)` / `open_oauth(provider)` → fetch the provider auth
  URL (`.../anthropic-auth-url`, `.../codex-auth-url`,
  `.../gemini-cli-auth-url`, `.../qwen-auth-url`, ...), open the browser.
- Completion detected three ways: **polling**
  (`get-auth-status?state=...` → `status == "ok"`), a **deep link**
  (`proxypal://oauth/callback` registered in `tauri.conf.json`), or **manual
  code paste**.
- **Source of truth** for "is a provider connected" is a filesystem scan of
  `~/.cli-proxy-api/*.json` credential files, counted by filename prefix.
- **Device-code** flow (`DeviceCodeModal.tsx`) for OpenAI and Qwen: shows
  `userCode` + `verificationUri`, polls every `interval`s with an `mm:ss`
  countdown.

The actual OAuth endpoints, client IDs, scopes, and token storage formats for
each provider — the part **we** would have to implement in Rust — are documented
in [`online-research.md`](./online-research.md).

## 4. Auto-configure coding agents

ProxyPal detects installed CLI/IDE coding tools and rewrites their config to
point at the local proxy. Shared values: endpoint `http://127.0.0.1:{port}/v1`,
key `proxypal-local`.

| Tool | Detect | Config it writes |
| --- | --- | --- |
| Claude Code | `which claude` | `~/.claude/settings.json` env (`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, model-tier maps) |
| Codex | `which codex` | `~/.codex/config.toml` (`base_url`, `wire_api="responses"`) + `~/.codex/auth.json` |
| Gemini CLI | `which gemini` | shell profile `export CODE_ASSIST_ENDPOINT=...` |
| OpenCode | `which opencode` | `~/.config/opencode/opencode.json` provider block |
| Factory Droid | `which droid` | `~/.factory/config.json` custom_models |
| Continue | `~/.continue/` | `~/.continue/config.yaml` model entry |
| Cursor / Cline / GitLab Duo | app/ext | copyable manual instructions only |

This is **the single most reusable idea for us**: a `router configure <tool>`
command (and `router doctor` detection) that writes the same env/config so a
user points Claude Code / Codex / etc. at the router with one command.

## 5. Usage analytics, request monitoring, quota widgets

- **Metrics** (`types/usage.rs`): total/success/failure counts, requests-today,
  input/output/cached tokens, per-model and per-provider breakdowns, and
  time-series (`requestsByDay`/`Hour`). Each `RequestLog` has status code +
  `durationMs` + token counts.
- **Request monitor**: a **log-file watcher** tails `logs/main.log`, parses
  `[GIN]` lines, emits a `request-log` event per request (history capped at
  500); token counts back-filled from `/v0/management/usage`.
- **Savings**: `estimate_request_cost(model, in, out)` uses a per-model USD/1M
  table (claude opus 15/75, sonnet 3/15, gpt-5 15/45, gemini flash 0.075/0.30,
  ...) and shows "money saved vs public API pricing".
- **Per-provider quota widgets**, each through a 5-min TTL cache: Claude
  (`api.anthropic.com/api/oauth/usage`, `anthropic-beta: oauth-2025-04-20`),
  Codex (`chatgpt.com/backend-api/wham/usage`), Copilot
  (`api.github.com/copilot_internal/user`), Antigravity, Kiro.

## 6. UX features worth noting

Command palette (⌘K), 3-step setup wizard / onboarding checklist, per-provider
health dots (60s poll), light/dark/system themes, i18n (en/vi/zh-CN), native
notifications, Tauri auto-updater, system tray + single-instance, SSH-tunnel and
Cloudflare-tunnel managers for remote exposure.

## 7. The 96 Tauri commands (backend surface)

Grouped by module: proxy lifecycle (4), copilot subprocess (6), auth/OAuth (9),
quota (7), config (5), agents/tools (7), usage (7), models (6), api-keys (~16),
settings (~12), auth-files (8), logs (2), ssh (4), cloudflare (4), updater (1).
The full list is in the research notes; the important ones for us are the
**auth/OAuth**, **agents/tools**, **usage**, and **quota** groups — they encode
the experience the issue wants us to match.

## 8. Caveats discovered (so we don't copy mistakes)

1. ProxyPal's `complete_oauth` is a **stub** — real persistence is the sidecar
   writing a credential file; the GUI only counts files. Our engine must
   actually persist tokens.
2. **Two divergent cost formulas** exist (a per-model Rust table vs a flat
   $3/$15 TS estimate). If we add savings accounting, use one source of truth.
3. There is **no live `/v0/management/logs` request feed** — monitoring is a log
   tail. We already have structured metrics, so we can do better natively.
4. **Sidecar channel matters**: the mainline CLIProxyAPI build blocks
   Qwen/iFlow/Kiro OAuth; the "Plus" channel unlocks them. A reminder that some
   providers are moving targets.
5. Qwen's free OAuth tier **was discontinued 2026-04-15** (see research) — Qwen
   support is lower priority than Codex/Gemini for real subscription value.
