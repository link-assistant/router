# Online Research

Primary and authoritative sources for the facts behind this case study. Claims
are tagged **[VERIFIED]** (confirmed against official source code/docs or
multiple corroborating sources), **[REPORTED]** (secondary sources), or
**[INFERENCE]** (analyst deduction). Snapshot: June 2026 — auth client IDs,
endpoints, and quotas change over time, so verify against source before building.

## CLIProxyAPI — the engine ProxyPal wraps

- GitHub: <https://github.com/router-for-me/CLIProxyAPI> · docs:
  <https://help.router-for.me/introduction/what-is-cliproxyapi>
- **[VERIFIED]** Tagline: *"Wrap Gemini CLI, Antigravity, ChatGPT Codex, Claude
  Code, Grok Build as an OpenAI/Gemini/Claude/Codex compatible API service."*
- **[VERIFIED]** Language **Go**, current major **v6**
  (`github.com/router-for-me/CLIProxyAPI/v6`), license **MIT**, org
  **router-for-me** (author `luispater`).
- **[VERIFIED]** Client-facing surfaces: OpenAI Chat Completions
  (`/v1/chat/completions`), OpenAI Responses (`/v1/responses`), Anthropic
  Messages (`/v1/messages`), Gemini native
  (`/v1beta/models/{model}:generateContent` / `:streamGenerateContent`),
  `/v1/models`, `/healthz`. Supports streaming, tool calls, multimodal.
- **[VERIFIED]** Config (`config.example.yaml`): `port: 8317`,
  `auth-dir: "~/.cli-proxy-api"`, `api-keys` (client keys), `remote-management`
  (`secret-key`, `disable-control-panel`), provider blocks (`claude-api-key`,
  `codex-api-key`, `openai-compatibility`, `vertex-api-key`), `quota-exceeded`
  (`switch-project`, `switch-preview-model`), `routing.strategy: round-robin`.
- **[VERIFIED]** Management API base `http://localhost:8317/v0/management`, auth
  via `Authorization: Bearer <key>` or `X-Management-Key`; 5 consecutive auth
  failures → ~30-min ban. <https://help.router-for.me/management/api>
- **[REPORTED]** Per-provider login flags with local callback ports: Gemini CLI
  `--login` (8085), Codex `--codex-login` (1455), Claude `--claude-login`
  (54545); `--no-browser` prints the URL.
- **[VERIFIED]** Reusable as a Go library via `sdk/cliproxy`
  (`cliproxy.NewBuilder()` → `Service.Run(ctx)`); translation registry in
  `sdk/translator`. <https://github.com/router-for-me/CLIProxyAPI/blob/main/docs/sdk-usage.md>

## Per-provider subscription OAuth

### Anthropic Claude (Pro/Max via Claude Code) — **[VERIFIED]**

- Grant: OAuth 2.0 Authorization Code + PKCE (S256).
- Public `client_id`: `9d1c250a-e61b-44d9-88ed-5944d1962f5e`.
- Authorize: `https://claude.ai/oauth/authorize` (subscription) — a separate
  `https://console.anthropic.com/oauth/authorize` exists for API-billing orgs.
- Token: `https://console.anthropic.com/v1/oauth/token`.
- Scopes: `org:create_api_key user:profile user:inference` (`user:inference` is
  required for `/v1/messages`).
- Tokens: access `sk-ant-oat01-...`, refresh `sk-ant-ort01-...`.
- Storage: macOS Keychain; Linux/Windows `~/.claude/.credentials.json` (0600),
  nested `{ "claudeAiOauth": { accessToken, refreshToken, expiresAt(ms),
  scopes } }`.
- Refresh: `POST grant_type=refresh_token` to the token endpoint.
- Upstream: `https://api.anthropic.com/v1/messages`, **critical header**
  `anthropic-beta: oauth-2025-04-20,claude-code-20250219` (also `x-app: cli`,
  `anthropic-dangerous-direct-browser-access: true`).
- Sources: <https://code.claude.com/docs/en/authentication> ·
  <https://gist.github.com/cedws/3a24b2c7569bb610e24aa90dd217d9f2>
- **This is what the router already does** (file read + beta header injection),
  so Claude is our baseline, not a gap.

### OpenAI Codex / ChatGPT subscription (Codex CLI) — **[VERIFIED] core, [INFERRED] noted**

- Grant: OAuth 2.0 Authorization Code + PKCE (S256).
- Public `client_id`: `app_EMoamEEZ73f0CkXaXp7hrann`.
- Issuer `https://auth.openai.com` (authorize `/oauth/authorize`, token
  `/oauth/token`). Redirect `http://localhost:1455/auth/callback` (fallback 1457).
- Scopes: `openid profile email offline_access api.connectors.read
  api.connectors.invoke`. Authorize adds `codex_cli_simplified_flow=true`,
  `id_token_add_organizations=true`, `originator=...`.
- Storage: `~/.codex/auth.json` (`CODEX_HOME`); `tokens` object
  (`id_token`, `access_token`, `refresh_token`, `account_id`), `last_refresh`.
- Upstream (subscription): base `https://chatgpt.com/backend-api/codex`,
  responses at `.../codex/responses` (wire protocol = **Responses API**,
  `wire_api="responses"`). Usage: `https://chatgpt.com/backend-api/wham/usage`.
- Required header `chatgpt-account-id: <account_id>` (bills the right account);
  `originator: codex_cli_rs` and `OpenAI-Beta: responses=experimental` are
  **[INFERRED]** — confirm against source.
- Refresh: `grant_type=refresh_token`; sessions stale after ~8 days.
- Sources: <https://github.com/openai/codex/blob/main/codex-rs/login/src/server.rs>
  · <https://developers.openai.com/codex/auth> ·
  <https://github.com/7shi/codex-oauth>

### Google Gemini (Gemini CLI / Code Assist) — **[VERIFIED]**

- Grant: Google OAuth 2.0 Authorization Code, loopback redirect
  `http://127.0.0.1:${port}/oauth2callback`, `access_type=offline`.
- Public installed-app client (hardcoded in `oauth2.ts`): client_id
  `681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com`,
  plus a `GOCSPX-…` installed-app client_secret (not confidential — shipped in
  the open-source gemini-cli; redacted here, read it from
  [`oauth2.ts`](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/packages/core/src/code_assist/oauth2.ts)).
- Scopes: `cloud-platform`, `userinfo.email`, `userinfo.profile`.
- Upstream: `CODE_ASSIST_ENDPOINT = https://cloudcode-pa.googleapis.com`,
  `v1internal`, methods appended with a colon
  (`...:streamGenerateContent`). Free accounts send
  `cloudaicompanionProject: undefined` (server assigns a managed project);
  Workspace accounts need `GOOGLE_CLOUD_PROJECT`.
- Storage: `~/.gemini/oauth_creds.json` (`access_token`, `refresh_token`,
  `expiry_date` ms). Refresh via google-auth-library against
  `https://oauth2.googleapis.com/token`.
- Sources:
  <https://raw.githubusercontent.com/google-gemini/gemini-cli/main/packages/core/src/code_assist/oauth2.ts>
- **Antigravity** (agentic IDE, launched 2025-11-20) uses the same Code Assist
  backend with a different OAuth client — community-reverse-engineered, treat as
  **[REPORTED]**: <https://github.com/NoeFabris/opencode-antigravity-auth>.

### Alibaba Qwen (qwen-code CLI) — **[VERIFIED]**

- **Important [VERIFIED]:** the Qwen OAuth **free tier was discontinued
  2026-04-15** (wound down ~1000 → 100 req/day around 2026-04-13). The flow
  still works but free quota is gone.
  <https://github.com/QwenLM/qwen-code/issues/3203>
- Grant: OAuth 2.0 **Device Authorization Grant** + PKCE (S256). Device code
  `https://chat.qwen.ai/api/v1/oauth2/device/code`, token
  `https://chat.qwen.ai/api/v1/oauth2/token`.
- Public `client_id`: `f0304373b74a44d2b584a3fb70ca9e56`. Scopes
  `openid profile email model.completion`.
- Storage: `~/.qwen/oauth_creds.json` (0600). DashScope base
  `https://dashscope.aliyuncs.com/compatible-mode/v1` (OpenAI-compatible);
  per-token `resource_url` overrides the base.
- Sources:
  <https://raw.githubusercontent.com/QwenLM/qwen-code/main/packages/core/src/qwen/qwenOAuth2.ts>

### GitHub Copilot (token exchange) — **[VERIFIED]**

- Two-token: GitHub OAuth **device flow** (client_id `Iv1.b507a08c87ecfe98`,
  scope `read:user`) → exchange at
  `GET https://api.github.com/copilot_internal/v2/token`
  (header `authorization: token <gh>`) → call chat at
  `https://api.githubcopilot.com` (`Authorization: Bearer <copilotToken>`,
  `copilot-integration-id: vscode-chat`).
- Sources: <https://github.com/ericc-ch/copilot-api> ·
  <https://docs.litellm.ai/docs/providers/github_copilot>

### iFlow / Vertex AI — **[VERIFIED] brief**

- **iFlow:** OpenAI-compatible base `https://apis.iflow.cn/v1`; browser login
  returns a token/key. Integrates as a plain OpenAI-compatible upstream.
- **Vertex AI:** IAM, not API keys — ADC / service-account; regional base
  `https://{LOCATION}-aiplatform.googleapis.com`,
  `.../publishers/google/models/{MODEL}:generateContent`.

## Model / API dialect translation

| Dialect | Endpoint | System | Messages | Output |
| --- | --- | --- | --- | --- |
| OpenAI | `/v1/chat/completions` | `role:system` in `messages[]` | flat `messages[]` | `choices[].message` |
| Anthropic | `/v1/messages` | top-level `system` | typed content **blocks** | `content[]` + `stop_reason` |
| Gemini | `...:generateContent` | `systemInstruction` | `contents[]` (`user`/`model`) | `candidates[].content.parts[]` |

**Streaming SSE differs hardest** — **[VERIFIED]**: OpenAI emits
`choices[].delta` chunks ending in literal `data: [DONE]`; Anthropic emits
**named events** (`message_start`, `content_block_delta`, `message_delta`,
`message_stop`) with **no `[DONE]`**; Gemini streams full-shaped partial JSON.

Known translation projects — **[VERIFIED]**:
- LiteLLM unified `/v1/messages` — <https://docs.litellm.ai/docs/anthropic_unified/>
  (⚠ avoid PyPI `litellm` 1.82.7/1.82.8 — shipped malware).
- claude-code-router — <https://github.com/musistudio/claude-code-router>
- copilot-api (dual OpenAI+Anthropic surface) — <https://github.com/ericc-ch/copilot-api>
- y-router (Anthropic→OpenAI on Cloudflare) — <https://github.com/luohy15/y-router>

Known pitfalls — **[VERIFIED]** (LiteLLM issues): `{"type":"input_text"}` blocks
silently dropped if an adapter checks only `"text"` (#23841); first non-empty
delta dropped in streaming (#30014); OpenAI's 64-char function-name limit breaks
long Anthropic tool names.

## Rate limits / quotas & 429 handling

- **Claude** **[VERIFIED]**: Max 5x $100, Max 20x $200; **5-hour rolling
  window** shared across chat + Claude Code, plus weekly caps.
  <https://support.claude.com/en/articles/11049741-what-is-the-max-plan>
- **ChatGPT/Codex** **[VERIFIED]**: token/credit-based over a shared 5-hour
  window (Plus 15–80 local msgs/5h, Pro 5x 75–400).
  <https://developers.openai.com/codex/pricing>
- **Gemini Code Assist** **[VERIFIED]** (req/user/day): Individuals 1000, AI Pro
  1500, AI Ultra 2000.
  <https://developers.google.com/gemini-code-assist/resources/quotas>
- **Qwen** **[VERIFIED]**: free OAuth closed 2026-04-15.
- **Copilot** **[VERIFIED]**: Pro 300 premium req/mo; usage-based billing from
  2026-06-01. <https://docs.github.com/en/copilot/concepts/billing/copilot-requests>
- **CLIProxyAPI 429 handling** **[VERIFIED, source-read]**: `round-robin` or
  `fill-first` rotation; session affinity (Claude `metadata.user_id`, Codex
  `Session_id`, TTL 1h); per-auth cooldown with `nextRetryAt`; parses both
  `Retry-After` and `Retry-After-Ms`; synthesizes a `model_cooldown` 429 with
  computed `Retry-After` when all auths are cool. **Our router already does a
  fixed 60s cooldown** (`src/accounts.rs`) — this is the upgrade path.

## Existing Rust building blocks (for solution plans)

- **oauth2** v5 — typed OAuth2 client, **device-code (RFC 8628) via
  `exchange_device_code()`** and **PKCE
  (`PkceCodeChallenge::new_random_sha256`)**. <https://docs.rs/oauth2>
- **openidconnect** v4 — OIDC on top of `oauth2`; warns to disable
  redirect-following (SSRF) — relevant to a proxy. <https://docs.rs/openidconnect>
- Stack we already use: **axum** (server + SSE), **reqwest** (upstream),
  **tower** (retry/timeout/rate-limit middleware), **hyper**.
- Reference designs: LiteLLM, OpenRouter, claude-code-router, copilot-api;
  Rust analogs anthropic-proxy-rs, litellm-rs, modelmux.

## Confidence flags

1. CLIProxyAPI literal endpoint paths / login ports are **[REPORTED]**
   (corroborated, not all on one official page).
2. Mainline vs "Plus" status of Copilot/Kiro/Qwen/iFlow varies by version.
3. Codex `originator`/`OpenAI-Beta` header values and exact `auth.json` nesting
   are **[INFERRED]** — confirm against `openai/codex` source before building.
4. Antigravity OAuth client/scopes are from an unofficial repo.
5. All third-party message-count estimates are unaudited; quotas change.
