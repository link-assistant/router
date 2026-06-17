# Solution Plans

One plan per functional requirement from [`requirements.md`](./requirements.md).
Each plan states the goal, the concrete approach (with file-level touch points in
this repo), the existing components reused (see
[`components-survey.md`](./components-survey.md)), acceptance criteria, and how to
verify it against a real subscription.

> **Sequencing principle — "read before login".** For every new provider, ship
> **Phase 1 (read credentials produced by the vendor CLI)** first. It mirrors how
> the router already supports Claude (`src/oauth.rs` reads `~/.claude`), needs
> *no* OAuth code, and immediately delivers subscription access. **Phase 2
> (native `router login`)** removes the vendor-CLI dependency afterward.

> **Verification principle.** Each provider PR must include live evidence against
> a real subscription (a redacted request/response, like issue #35's
> `raw/count_tokens-200.json`). This planning PR cannot verify Codex/Gemini/Qwen
> because those subscriptions are not available in this environment; that is why
> implementation is sequenced as follow-up PRs.

---

## Plan 5 (foundational) — Generalize the provider abstraction (F5, F11)

**Why first:** F2–F4 all depend on a provider abstraction richer than today's
single-variant `ProviderKind { OpenAICompatible }` (`src/providers.rs`).

**Approach.** Introduce a provider descriptor that captures the four things that
differ per provider:

```rust
// sketch — src/providers.rs
enum ProviderKind {
    Anthropic,          // OAuth, /v1/messages, beta header (today's behavior)
    OpenAICodex,        // ChatGPT subscription, Responses wire API
    GeminiCodeAssist,   // Google OAuth, cloudcode-pa v1internal
    QwenCode,           // DashScope OpenAI-compatible
    OpenAICompatible,   // existing generic upstream
}

trait UpstreamProvider {
    fn base_url(&self) -> Url;
    fn auth_headers(&self, cred: &Credential) -> HeaderMap;     // bearer + provider-specific headers
    fn translate_request(&self, body: Value, from: Dialect) -> Value;
    fn translate_response(&self, body: Value, to: Dialect) -> Value;   // incl. SSE
    fn usage_endpoint(&self) -> Option<Url>;                    // for Plan 9
}
```

- Centralize dialect conversion in a small **translation registry** (per
  CLIProxyAPI's `sdk/translator` design) so `src/openai.rs`'s existing
  OpenAI↔Anthropic logic and the new Gemini logic live behind one interface.
- Keep `UpstreamProvider` config enum (`src/config.rs`) but let a single router
  instance host multiple provider-typed accounts (ties into Plan 7).

**Reuse:** existing `src/openai.rs` translation; CLIProxyAPI architecture as the
blueprint.

**Acceptance:** existing Anthropic + OpenAI-compatible paths unchanged (all
current tests green); new provider kinds compile behind the trait with unit
tests for each translation direction.

---

## Plan 1 — Claude subscription hardening (F1)

**Status:** baseline already works (issue #35). **Approach:** add native token
**refresh** (Plan 6) so an expired `~/.claude` token is refreshed via
`https://console.anthropic.com/v1/oauth/token` instead of only logging a warning
(`src/oauth.rs::refresh_token()` today is a file re-read). Add `router login
claude` (PKCE, client_id `9d1c250a-...`) so the router can authenticate without
the `claude` CLI. **Acceptance:** expired token auto-refreshes; `router login
claude` produces a working credential; live `/v1/messages` 200.

---

## Plan 2 — OpenAI Codex / ChatGPT subscription (F2)

**Phase 1 (read).** Add a credential reader for `~/.codex/auth.json` (the
`tokens` object: `access_token`, `refresh_token`, `account_id`). Add provider
kind `OpenAICodex`:

- base `https://chatgpt.com/backend-api/codex`, requests to `.../responses`
  (wire API = **OpenAI Responses**, which `src/openai.rs` already translates to
  via `response_to_anthropic` / `anthropic_to_response`).
- headers: `Authorization: Bearer <access_token>`,
  `chatgpt-account-id: <account_id>`; confirm `originator` / `OpenAI-Beta`
  against `openai/codex` source before shipping (flagged **[INFERRED]** in
  research).

**Phase 2 (login).** `router login codex` — OAuth Auth-Code + PKCE, client_id
`app_EMoamEEZ73f0CkXaXp7hrann`, issuer `https://auth.openai.com`, local callback
`http://localhost:1455/auth/callback`, scopes incl. `offline_access`; parse
`account_id` from the id-token.

**Reuse:** `oauth2` crate (PKCE), existing Responses translation.
**Acceptance:** a ChatGPT/Codex subscription answers `/v1/chat/completions` and
`/v1/messages` through the router; 401 triggers a refresh; live evidence saved to
a future `raw/`. **Risk:** ChatGPT backend headers are partly inferred — verify
first.

---

## Plan 3 — Google Gemini subscription / Code Assist (F3)

**Phase 1 (read).** Read `~/.gemini/oauth_creds.json` (`access_token`,
`refresh_token`, `expiry_date`). Provider kind `GeminiCodeAssist`:

- base `https://cloudcode-pa.googleapis.com`, `v1internal`, method appended with
  a colon (`...:streamGenerateContent`).
- free accounts: omit project (`cloudaicompanionProject: undefined`); Workspace
  accounts: read `GOOGLE_CLOUD_PROJECT`.
- **new translation:** OpenAI/Anthropic ↔ Gemini (`systemInstruction`,
  `contents[]` with `user`/`model` roles, `parts[]`; SSE streams full-shaped
  partial JSON — no `[DONE]`). This is the largest net-new translation work
  (Plan 5 registry).

**Phase 2 (login).** `router login gemini` — Google OAuth Auth-Code, loopback
`http://127.0.0.1:{port}/oauth2callback`, the public installed-app client from
`gemini-cli`, scopes `cloud-platform`/`userinfo.*`, `access_type=offline`;
refresh via `https://oauth2.googleapis.com/token`.

**Reuse:** `oauth2` crate; google-auth refresh pattern.
**Acceptance:** a Gemini subscription answers via OpenAI- and Anthropic-dialect
requests through the router; streaming works; live evidence saved.

---

## Plan 4 — Qwen subscription (F4, lower priority)

**Note:** the Qwen **free OAuth tier was discontinued 2026-04-15** — value is now
limited to paid Coding-Plan accounts, so this ranks below Codex/Gemini.

**Phase 1 (read).** Read `~/.qwen/oauth_creds.json`; route to the per-token
`resource_url` (or DashScope `https://dashscope.aliyuncs.com/compatible-mode/v1`)
which is **OpenAI-compatible** — so it largely reuses the existing
`openai-compatible` path with `Authorization: Bearer <access_token>`.

**Phase 2 (login).** `router login qwen` — OAuth **device-code** + PKCE
(`oauth2::exchange_device_code`), client_id `f0304373...`, device endpoint
`https://chat.qwen.ai/api/v1/oauth2/device/code`; show user-code + verification
URI; poll respecting `slow_down`.

**Reuse:** existing OpenAI-compatible upstream; `oauth2` device-code.
**Acceptance:** a Qwen account answers through the router; device-code login
completes.

---

## Plan 6 — Native login + refresh framework (F6, F7)

**Approach.** A single `router login <provider>` subcommand (extend
`src/cli.rs` `Command`) backed by a small `auth/login.rs` module using the
**`oauth2`** crate:

- Authorization-Code + PKCE for Claude/Codex/Gemini (spin a one-shot localhost
  callback server on the provider's expected port).
- Device-code (RFC 8628) for Qwen/Copilot (poll with countdown).
- `--no-browser` prints the URL (match CLIProxyAPI ergonomics).
- Persist credentials in a provider-scoped store (extend the credential model so
  refresh tokens + `expires_at` are saved and AES-GCM-encrypted, reusing the
  `aes-gcm` machinery already in `src/providers.rs`).
- Replace `src/oauth.rs::refresh_token()` (no-op file re-read) with real
  `exchange_refresh_token()` per provider, refreshing proactively before
  `expires_at`.

**Reuse:** `oauth2` v5 (PKCE + device-code + refresh), `aes-gcm` (already a dep).
**Acceptance:** `router login <provider>` works headless and interactively;
tokens auto-refresh; `router doctor` reports each provider's credential status
(extends the existing doctor probe).

---

## Plan 7 — Cross-provider account pool + smart cooldown (F8)

**Approach.** Generalize `src/accounts.rs::AccountRouter` so an `AccountState`
carries a provider kind + credential, not just a Claude `OAuthProvider`. Then:

- selection respects provider (route a request to an account that can serve the
  requested model/dialect);
- adopt **`fill-first`** in addition to round-robin/priority/least-used;
- replace the fixed 60s cooldown with **`Retry-After` / `Retry-After-Ms`
  parsing** and a per-auth `next_retry_at`; synthesize a `model_cooldown` 429
  with computed `Retry-After` when all candidates are cool (CLIProxyAPI design);
- optional **session affinity** (pin a conversation to one account) and inbound
  per-token rate limiting via `tower` (a known CLIProxyAPI gap).

**Reuse:** existing `AccountRouter`, `SelectionStrategy`, `tower`.
**Acceptance:** mixed-provider pool serves requests; 429 from one account fails
over and honors the server's retry hint; `/v1/accounts` shows per-provider
health.

---

## Plan 8 — Auto-configure client tools (F9)

**Approach.** New `router configure <tool>` plus detection in `router doctor`
(extend `src/cli.rs`), porting ProxyPal's `configure_cli_agent` logic as pure
file I/O:

| Tool | Writes |
| --- | --- |
| `claude-code` | `~/.claude/settings.json` env: `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN=<la_sk_...>`, model-tier maps |
| `codex` | `~/.codex/config.toml` (`base_url`, `wire_api="responses"`) + `auth.json` |
| `gemini-cli` | shell profile `export CODE_ASSIST_ENDPOINT=...` |
| `opencode` | `~/.config/opencode/opencode.json` provider block |
| `continue` | `~/.continue/config.yaml` model entry |
| others | print copyable manual instructions (`router configure --show <tool>`) |

Detection mirrors ProxyPal's `which_exists()` over PATH/known dirs. Always
idempotent (guard markers, like ProxyPal's `# ProxyPal` → our `# link-assistant-router`).

**Reuse:** existing `doctor` subcommand; std fs.
**Acceptance:** after `router configure claude-code`, Claude Code talks to the
router with one command; re-running is idempotent; `router doctor` lists detected
tools and their config status.

---

## Plan 9 — Per-provider usage, quota & savings (F10)

**Approach.** Extend `src/metrics.rs`:

- add per-provider and per-token token-count + estimated-cost accounting (single
  source-of-truth cost table — avoid ProxyPal's two-formula bug);
- `router quota` / `GET /v1/quota` polling vendor usage endpoints with a short
  TTL cache: Claude `api.anthropic.com/api/oauth/usage`
  (`anthropic-beta: oauth-2025-04-20`), Codex `chatgpt.com/backend-api/wham/usage`,
  Copilot `api.github.com/copilot_internal/user`;
- surface in `/v1/usage` (already exists) and Prometheus.

**Reuse:** existing `Metrics`, `/v1/usage`, `/metrics`.
**Acceptance:** `/v1/usage` shows per-provider tokens + cost; `router quota`
reports remaining subscription quota per connected provider.

---

## Plan 10 — GUI / dashboard (F12, optional / future)

**Approach.** The engine should expose everything via CLI + JSON endpoints
(Plans 6–9) so a UI is optional. Two documented options, neither required by this
issue:

1. **Thin web dashboard** served by the router (static SPA hitting the existing
   admin/usage/quota JSON endpoints) — single binary, no extra runtime.
2. **Desktop wrapper** à la ProxyPal (Tauri) pointing at the router instead of
   bundling a Go sidecar — only if a native app is desired.

**Recommendation:** defer; revisit after Plans 2–9 land, since the CLI delivers
the issue's functional goals without it.

---

## Suggested execution order (follow-up PRs)

1. **Plan 5** — provider abstraction + translation registry (foundational, no
   behavior change).
2. **Plan 2 Phase 1** — Codex via `~/.codex` read (highest subscription value,
   reuses Responses translation).
3. **Plan 3 Phase 1** — Gemini via `~/.gemini` read (adds Gemini translation).
4. **Plan 6** — native `router login` + refresh (removes vendor-CLI dependency
   for Claude/Codex/Gemini).
5. **Plan 7** — cross-provider pool + smart cooldown.
6. **Plan 8** — `router configure` auto-setup.
7. **Plan 9** — per-provider usage/quota.
8. **Plan 4** — Qwen (lower priority, free tier gone).
9. **Plan 10** — optional GUI.

Each PR: extend the matching gap in the engine, add unit tests, and attach live
evidence against a real subscription (per the verification principle).
