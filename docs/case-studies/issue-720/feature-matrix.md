# Feature matrix: CLIProxyAPI v8.0.20 vs Router v1.18.3

Sources: [raw/cliproxyapi-README.md](raw/cliproxyapi-README.md),
[raw/cliproxyapi-config.example.yaml](raw/cliproxyapi-config.example.yaml),
[raw/cliproxyapi-management-api-v8.md](raw/cliproxyapi-management-api-v8.md),
[raw/cliproxyapi-routes.txt](raw/cliproxyapi-routes.txt) for the upstream
side; `README.md`, `src/` route literals (253 distinct `/api/services/*`
literals, 30 `/api/management/*` literals) and the closed issues #668–#684
for the Router side. Verdicts:

- **Have** — Router already implements the behaviour (possibly under a different name).
- **Partial** — Router has part of it; the sub-issue closes the rest.
- **Gap** — absent; a sub-issue delivers it.
- **Skip** — deliberately not planned; rationale in [solution-plans.md](solution-plans.md#out-of-scope).

## 1. Client-facing protocol surfaces

| Feature | CLIProxyAPI | Router | Verdict | Sub-issue |
| --- | --- | --- | --- | --- |
| OpenAI Chat Completions | `/v1/chat/completions` | `/api/services/openai/v1/chat/completions` plus codex/qwen mirrors, completion retrieval and `/messages` listing | Have | — |
| OpenAI Responses (POST) | `/v1/responses`, `/v1/responses/compact` | `/api/services/openai/v1/responses`, `/compact`, `/input_tokens`, `/{id}`, `/cancel`, `/input_items` | Have | — |
| OpenAI Responses over WebSocket (GET) | `/v1/responses` upgrade; per-credential `websockets` toggle | Realtime/live WebSocket relays exist for codex and openai; no Responses-over-WebSocket | Partial | E |
| Legacy Completions | `/v1/completions` | Not routed | Gap (low) | J |
| Anthropic Messages | `/v1/messages`, `/v1/messages/count_tokens` | `/api/services/anthropic/v1/messages`, `count_tokens`, models, files, batches, skills | Have | — |
| Gemini `v1beta/models` | `GET /v1beta/models`, `/v1beta/models/*action` | `/api/services/gemini/v1beta/models`, `/{model}` actions, `/vertex/v1/*` | Have | — |
| Gemini Interactions | `/v1beta/interactions` (translators for openai/interactions, gemini/interactions) | Absent | Gap | D1 |
| Codex backend-api | `/backend-api/codex/*` | `/api/services/codex/backend-api/*` incl. wham, plugins, connectors, files, usage | Have | — |
| Images | `/v1/images/generations|edits|variations`, `/openai/v1/images/*`, image-generation modes `chat`/`passthrough` | `/api/services/openai/v1/images/{generations,edits,variations}`, codex mirrors (relay only) | Partial | J |
| Videos | `/v1/videos/*`, `/openai/v1/videos` | Absent | Gap (low) | J |
| Speech / TTS | `/v1/audio/speech`, `/v1/tts` (Grok TTS via speech endpoint since v8.0.18) | `/api/services/openai/v1/audio/{speech,transcriptions,translations}` relay | Partial | J |
| Alpha search | `/v1/alpha/search`; per-credential `alpha-search` toggle | Absent | Gap | E |
| Live / realtime | `/v1/live`, `/v1/realtime/*` | `/api/services/{openai,codex}/v1/realtime/*`, `/live/*` | Have | — |
| Model listing | `/v1/models` (merged, aliases applied, `excluded-models` respected) | `/api/models` and per-service `/models` from the compiled catalog | Partial (aliases/exclusions) | A, O |
| Auth sources on the data plane | Bearer, `X-Goog-Api-Key`, `X-Api-Key`, `?key=`, `?auth_token=` | Bearer `la_sk_…`, `x-api-key`, `x-goog-api-key`, Gemini `?key=` | Have | — |
| ActivityPub / GitHub proxy | — | `/api/services/activitypub/*`, `/api/services/github/*` | Router-only | — |

## 2. Providers and credentials

| Provider / channel | CLIProxyAPI | Router | Verdict | Sub-issue |
| --- | --- | --- | --- | --- |
| Anthropic Claude OAuth + API key | OAuth login, `claude-api-key` with `base-url`, `headers`, `proxy-url`, `models`, `disable-codex-cloaking` style toggles | `router auth claude`, `auth import`, API-key accounts, pools, Vertex Anthropic | Have | — |
| OpenAI Codex / ChatGPT OAuth + API key | OAuth, `codex-api-key`, `websockets`, `disable-codex-cloaking`, `alpha-search` | `router auth codex`, `auth import`, ChatGPT subscription routing | Have (toggles: E) | E |
| Gemini CLI OAuth | OAuth, project switching on quota | `auth import` of Gemini CLI credentials; subscription row denied pending terms | Partial | B3 |
| Gemini API key (AI Studio) | `gemini-api-key[]` with `headers`, `proxy-url`, `excluded-models` | `GEMINI_API_KEY` single key, `x-goog-api-key` passthrough | Partial | B3 |
| Vertex API key / service account | `vertex-api-key[]`, service-account JSON import, `base-url` | `/api/services/vertex/v1/*` relay with caller credentials | Partial | B3 |
| Antigravity (Google) | OAuth, catalog, `oauth-model-alias` | Absent | Gap | B3 |
| Qwen Code OAuth | OAuth | `auth import`, `/api/services/qwen/v1/*`; subscription row denied pending terms | Have | — |
| iFlow OAuth / cookie | OAuth and cookie import | Absent | Skip (terms unknown) | — |
| Kimi (Moonshot) | OAuth (device flow) + API key | Absent | Gap | B1 |
| xAI Grok | OAuth-like login, API key, TTS | Grok CLI client adapter only (routes to other vendors) | Gap | B2 |
| Meta Muse | OAuth | Absent | Gap (low) | B4 |
| Devin | API key, `devin-catalog` source | Absent | Gap (low) | B4 |
| OpenAI-compatible upstreams | `openai-compatibility[]` with `api-key-entries`, `models[].alias`, `headers`, `proxy-url` | `ProviderKind::OpenAICompatible`, Lefine, z.ai Coding Plan | Have (aliases: A) | A |
| AWS Bedrock | — | `/api/services/bedrock/*` | Router-only | — |
| z.ai Coding Plan, Lefine | — | Native, subscriber-bound | Router-only | — |
| Per-credential `weight` | weighted round-robin, default 1, max 1,000,000, non-positive excludes | Absent | Gap | A |
| Per-credential `prefix` + `force-model-prefix` | Model-name prefix selects credential | Absent | Gap | A |
| Per-credential `disable-cooling` | Credential never enters cooldown | Absent | Gap | A |
| Per-credential `request-retry` override | Overrides global retry rounds | Absent | Gap | A |
| Per-credential `request-scoped-errors` | `status` + `match` → action rules | Absent | Gap | A |
| Per-credential `headers` with `$` dynamic copy | Static and client-copied headers | Absent | Gap | A |
| Per-credential `proxy-url` incl. `direct` | Yes | `ACCOUNT_EGRESS_PROXY` per account | Have | — |
| Per-credential `models[].alias`, `excluded-models` | Yes, wildcards | Absent | Gap | A |
| `oauth-model-alias` with `fork`, `oauth-excluded-models` | Per provider | Absent | Gap | A |
| Credential `priority` attribute | Numeric, higher first | Pool priority ordering exists | Have | — |

## 3. Routing, retry and reliability

| Feature | CLIProxyAPI | Router | Verdict | Sub-issue |
| --- | --- | --- | --- | --- |
| Strategies | `round-robin` (default), `weighted-round-robin`, `fill-first` | `round-robin`, `priority`/`fill-first`, `least-used`/`quota-first` | Partial (weighted) | A |
| Session affinity | `routing.session-affinity` (default false), TTL 1h, subagent inheritance, derived from Claude Code/Codex/OpenCode/pi headers, `prompt_cache_key`, conversation IDs, first-message hash | `SESSION_AFFINITY_TTL_SECS` (default 3600), header/metadata derived | Have (subagent inheritance: I) | I |
| Retry rounds | `routing.retry.request-retry` (3), `max-retry-credentials` (0 = all), `max-retry-interval` (30–60 s) on 403/408/429/500/502/503/504 | `POOL_FAILOVER=pre-first-byte`, `POOL_FAILOVER_MAX_ATTEMPTS` (3), `POOL_FAILOVER_BUDGET_SECS` (30) | Partial | I |
| Cooldown | Exponential `min(1s·2^n, 30m)`; **model-level** cooling preserving sibling models; manual block; cooldown reset via API and plugin callback | Account-level cooldown, `ACCOUNT_PAUSE_AT_PERCENT`, vendor window state | Partial | I |
| `quota-exceeded.switch-project`, `switch-preview-model` | Both default true (Gemini) | Absent | Gap | B3 |
| Streaming bootstrap retries / keep-alive | `streaming.bootstrap-retries` (1), `keepalive-seconds` (15) | Pre-first-byte failover; keep-alive not configurable | Partial | I |
| Upstream timeouts | Forbidden after connection (AGENTS.md) except listed cases | `UPSTREAM_*_TIMEOUT_SECS`, SSRF guard (#669) | Router policy kept | — |
| Truncated-stream error (v8.0.17) | Emits terminal error when upstream stream ends early | Stream termination tests (#668) | Have | — |
| Runtime strategy switch | `PATCH /v8/management/config` | Restart required | Gap | I |
| Payload rules `default`/`override`/`filter`, raw variants, `models`+`protocol` scoping, `match`/`not-match`/`exist`/`not-exist` conditions | Yes ("final barrier", `payload_barrier_test.go`) | Absent | Gap | F |
| Prompt cache options (v8.0.17) | Per-provider | 14 files handle `prompt_cache`/cache_control | Have | — |

## 4. Thinking and translation

| Feature | CLIProxyAPI | Router | Verdict | Sub-issue |
| --- | --- | --- | --- | --- |
| Model suffix overrides | `model(16384)`, `model(high)`, `model(none)`, `model(-1)` via `ParseSuffix`/`ParseNumericSuffix`/`ParseSpecialSuffix`/`ParseLevelSuffix` | Absent | Gap | C |
| Canonical `ThinkingConfig` + provider appliers | `ApplyThinking(body, model, from, to, providerKey)` | Per-adapter handling in 22 files; `reasoning_effort` and `thinking.budget_tokens` mapped in bridges | Partial | C |
| Thinking signature replay across protocols | `internal/signature` cache; Claude 5.5 signature replay fix (v8.0.16) | Signature handling in 34 files | Have | — |
| Claude adaptive thinking body | Yes | Partial | Partial | C |
| Built-in tools translation (web search etc.) | `builtin_tools_translation_test.go` | Partial | Partial | D2 |
| Parallel function calls Codex↔Claude | `codex_claude_parallel_function_calls_test.go` | Bridge supports tool calls | Have (test port: P) | P |
| Summary/intent translation | `summary_intent_translation_test.go` | Unknown | Verify | D2 |
| Claude Code compatibility sentinel | `claude_code_compatibility_sentinel_test.go` | Claude Code feature matrix (#675) | Have (test port: P) | P |
| Incomplete stream error type | `codex_incomplete_stream_error_type_test.go` | #668 | Have | — |

## 5. Management plane

| Feature | CLIProxyAPI (`/v8/management`) | Router (`/api/management`) | Verdict | Sub-issue |
| --- | --- | --- | --- | --- |
| Config read/replace/patch | `GET/PUT/PATCH /config`, `GET/PUT /config.yaml`, `GET/PUT/PATCH/DELETE /config/*path` | Flags/env; `admin_config.rs` for admin UI settings | Gap | F |
| Latest version check | `/server/latest-version` | `doctor` | Partial | H |
| Make an API call through the proxy | `POST /requests/api-call` | — | Gap (low) | H |
| Cooldown reset | `POST /routing/cooldown/reset` | pause/resume only | Gap | I |
| Model definitions per channel | `GET /routing/model-definitions/:channel` | `/providers`, catalog | Partial | O |
| Logs | `GET/DELETE /observability/logs`, `/logs/errors[/:name]`, `/logs/requests/:id` | `requests.lino` with size caps, `AUDIT_LOG` | Partial | H |
| Usage | `/observability/usage/api-keys`, `/usage/queue` | `/metrics`, `/usage` | Partial | H |
| Credentials | `GET/POST/DELETE /credentials`, `/models`, `/download`, `PATCH /status`, `/fields`, `/refresh` | `/accounts`, `/pause`, `/resume`, `/providers` | Partial | G |
| OAuth sessions | `/oauth/import`, `/auth-url`, `/status`, `/session`, `/callback` | `/login`, `/login/{id}`, `/login/{id}/code`, `/emergency-auth` | Partial | G |
| Plugins | `/plugins`, `/store`, `/install`, `/quota` | — | Skip | — |
| Admin bootstrap/rotate, tokens | — | `/admin/*`, `/tokens/*` | Router-only | — |
| Auth lockout | 5 failures → ~30 min IP ban | Absent | Gap | N |
| Remote management toggle | `remote-management.allow-remote`, `MANAGEMENT_PASSWORD`, bcrypt at startup | Admin UI on separate port; no explicit remote toggle | Gap | N |
| Safe mode for placeholder keys | Startup refuses obvious example keys | Absent | Gap | N |
| Web management UI | External CPAMC (`management.html`) | Built-in admin UI, Telegram/VK bots | Router-only | — |
| v0 management API | Deprecated | — | Skip | — |

## 6. Platform subsystems

| Feature | CLIProxyAPI | Router | Verdict | Sub-issue |
| --- | --- | --- | --- | --- |
| Model catalog sources with refresh | `models.sources` (catalog, codex-catalog, devin-catalog), 3 h refresh, reload on change | Compiled catalog + `docs/model-truth-contract.md` | Gap | O |
| Config hot reload / watcher | fsnotify watcher, `internal/watcher/diff` | Credential store reload | Partial | F |
| Storage backends | Postgres, git, object store | Local files | Skip → low-priority K | K |
| Plugin host (dynamic libraries) | `pluginhost`, `pluginstore` | — | Skip | L (in-process traits) |
| Library SDK (`sdk/cliproxy`, interceptors, custom executors) | Yes | Crate is binary-first | Gap (low) | L |
| Home control plane (RESP) | Yes | — | Skip | — |
| wsrelay, redis queue, mDNS discovery | Yes | Tunnel, deploy | Skip | — |
| TUI | Yes | Router has its own | Skip | — |
| Amp module | Yes | — | Skip | — |
| TLS | Yes | Yes | Have | — |
| Trusted proxies / forwarded headers | `server.trusted-proxies` | 36 files handle forwarded headers | Have | — |
| CORS | Gin CORS middleware | Not found in `src/` | Gap (low) | F |
| GitHub token for downloads | `server.github-token` (v8.0.19) | `/api/services/github` proxy | Different | — |
| Deploy / tunnel / `with` / `configure` / `doctor` | — | Yes | Router-only | — |

## 7. Tests

| Suite | CLIProxyAPI | Router | Verdict |
| --- | --- | --- | --- |
| Cross-module end-to-end (`test/`) | 9 files, matrices for thinking, failover, usage logging | Tier 1–4 tests, recorded fixtures (#671), soak (#672) | Port the matrices (P, D2) |
| Executor unit tests | 143 files (cloaking, signing, ratelimit, duplex, payload barrier) | Adapter unit tests | Port selectively (see [test-reuse.md](test-reuse.md)) |
| Auth SDK tests | 118 files | `auth_import_*`, `auth_native_acceptance_tests.rs` | Port lifecycle cases (G) |
| Management handler tests | 51 files | `admin_tests.rs`, management tests | Port lockout/config cases (N, F) |
| Config tests | 42 files | Flag parsing tests | Port validation cases (F) |
| Translator tests | ~100 files across protocol pairs | Bridge tests | Port corpora (D2) |
| Plugin host / store | 40 files | — | Skip |
