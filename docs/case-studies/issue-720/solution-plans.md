# Solution plans

One section per sub-issue key. Each section states the problem, the options
considered, the chosen plan, the tests that prove it, and the security notes
that the sub-issue must carry. Keys match README § 6 and
[feature-matrix.md](feature-matrix.md).

Priority legend: **P1** first wave (unblocked, highest value), **P2** second
wave, **P3** low priority.

---

## N. Management access hardening — P1

**Problem.** Router's management API has no failed-authentication lockout, no
explicit remote-management switch and no refusal of placeholder secrets.
CLIProxyAPI has all three. F and G add surface area and must not ship first.

**Options.**
1. Rate-limit every management request by IP (`tower_governor`). Simple, but
   throttles legitimate automation and does not distinguish failures.
2. Count consecutive authentication failures per client IP and ban for a
   fixed window (upstream model: 5 failures → ~30 min). Precise, tiny state.
3. Both.

**Chosen.** Option 2, with the counter keyed by the trusted client IP (after
Router's existing forwarded-header trust rules), window and threshold
configurable (`MANAGEMENT_LOCKOUT_FAILURES`, `MANAGEMENT_LOCKOUT_SECS`),
audit-logged, and surfaced in `doctor`. Add `MANAGEMENT_ALLOW_REMOTE`
(default false: only loopback and the admin-UI port may reach `/api/management`
unless set) and a startup refusal of secrets that match known example values.

**Tests.** Unit: counter resets on success, bans on the Nth failure, expires.
Integration: banned IP receives 429 with `Retry-After`; loopback never banned
when `MANAGEMENT_LOCKOUT_EXEMPT_LOOPBACK=true`. Port shape from upstream
`internal/api/handlers/management` auth tests.

**Security.** Lockout must not be bypassable by rotating `X-Forwarded-For`
from an untrusted hop. Bans are per IP, not per token, so a valid admin from
another address keeps access.

---

## A. Per-credential routing policy — P1

**Problem.** Router accounts carry a provider, credentials, priority, egress
proxy and max-age. CLIProxyAPI additionally lets each credential declare
`weight`, `prefix`, `disable-cooling`, `request-retry`,
`request-scoped-errors`, `headers` (static and `$`-copied), `models[].alias`
and `excluded-models`; providers add `oauth-model-alias` and
`oauth-excluded-models`.

**Options.**
1. Add each field as a separate account flag/env var.
2. Introduce one per-account policy object (serialized next to the account
   in the credential store) and one `ACCOUNT_ROUTING_STRATEGY=weighted-round-robin`
   value.
3. Wait for F and express everything in the configuration document.

**Chosen.** Option 2, so that A is unblocked, with the object designed to be
embedded in F later. Weighted round-robin uses smooth weighted selection;
`weight` default 1, non-positive excludes the account while that strategy is
active (upstream semantics). `prefix/` routing is applied before model
resolution; `force-model-prefix` maps to `ACCOUNT_FORCE_MODEL_PREFIX`.
Request-scoped error rules are evaluated on the upstream status and body
substring and can `cooldown`, `retry-next`, or `relay`.

**Tests.** Weighted distribution over 1,000 draws within tolerance; zero
weight excluded; prefix routing selects exactly one account; alias visible in
`/models` and rewritten on request and response; exclusion hides the model;
`$` header copies only allow-listed names; request-scoped rule triggers the
configured action. Upstream references: `request_proxy_priority_test.go`,
executor header tests, config alias tests.

**Security.** Header passthrough is allow-list only; `Authorization`,
`Cookie`, `X-Api-Key`, `X-Goog-Api-Key`, `Proxy-Authorization` are never
copied. Alias rewriting must not let a client reach a model the token's
subscription policy denies (resolve policy on the upstream model name).

---

## I. Cooldowns, retry budgets, runtime strategy switch — P1

**Problem.** Router cools down the whole account on a quota error. Upstream
cools `(credential, model)` and keeps sibling models available
(`TestCodexModelLevelCoolingPreservesSiblingModel`); terminal quota errors
still cool the whole account (`TestCodexTerminalQuotaCoolsAccountAcrossModels`).
Upstream also has retry rounds with a credential cap and interval cap, a
cooldown reset endpoint, and session-affinity inheritance for subagents.

**Options.**
1. Keep account-level cooldown, add a model allow-list per cooldown entry.
2. Make cooldown state keyed by `(account, model)` with an account-wide entry
   for terminal errors.

**Chosen.** Option 2. Add `POOL_RETRY_ROUNDS`, `POOL_MAX_RETRY_CREDENTIALS`
(0 = all), `POOL_MAX_RETRY_INTERVAL_SECS` alongside the existing
`POOL_FAILOVER_*` flags; `PATCH /api/management/routing` to switch strategy
and `POST /api/management/routing/cooldown/reset` (all or by account/model).
`SESSION_AFFINITY_SUBAGENTS` (default true) binds child sessions to the
parent's account.

**Tests.** Port the two quota-failover tests and the four
stream-disconnect failover tests from upstream `test/` to Router's recorded
fixture harness with a controllable clock. Property test: cooldown never
exceeds the configured max.

**Reliability.** Keep Router's timeouts (#669). Failover remains
pre-first-byte only.

---

## C. Canonical thinking pipeline — P1

**Problem.** Thinking controls are mapped per adapter. Upstream parses a
`model(suffix)` override into a canonical `ThinkingConfig` and applies it per
target provider with vendor-specific rules (budgets, levels, `none`, `-1`
auto), tested by `TestThinkingE2EMatrix_Suffix`, `_Body`, `_ProviderTargets`,
`_InteractionsMatrix`, `_ClaudeAdaptive_Body`.

**Options.**
1. Keep per-adapter mapping, add suffix parsing in each.
2. One module: parse suffix → canonical config → apply per target; adapters
   call it.

**Chosen.** Option 2 (`src/thinking/`). The suffix grammar is exactly
upstream's; the appliers follow the model-truth contract for what each model
supports. Signature replay stays where it is.

**Tests.** Port the five matrices as table-driven tests with the upstream
vectors (MIT, attributed). `proptest` round-trip on the parser.

---

## B0. Provider onboarding contract — P1

**Problem.** Adding Kimi, Grok, Antigravity, Devin, Meta Muse one at a time
without a shared contract produces inconsistent login, refresh, quota and
catalog behaviour. Router already requires a recorded terms decision for
consumer subscriptions.

**Chosen.** A `ProviderConnector` trait plus a checklist document: login
flow (device/loopback/API key), token refresh and storage, quota/rate-limit
signal extraction, catalog source, error classification into Router's
cooldown states, terms-of-service decision recorded in `docs/use-cases/`.
Each B1–B4 issue is a filled-in checklist.

**Tests.** A conformance test suite that every connector must pass (mock
upstream): login, refresh-before-expiry, 429 → cooldown, catalog parse.

---

## O. Configurable model catalog sources — P1

**Problem.** Router's catalog is compiled in; a vendor rename needs a
release. Upstream fetches catalog documents from configurable sources every
3 hours and reloads on change.

**Chosen.** `MODEL_CATALOG_SOURCES` (URLs or files) merged over the compiled
catalog, validated against the model-truth schema, refreshed on an interval
(`MODEL_CATALOG_REFRESH_SECS`, default 10800), with a `--local-model`
equivalent for ad-hoc entries. Failed fetches keep the last good catalog.

**Tests.** Schema rejection, merge precedence, refresh with a controllable
clock, SSRF guard applied to catalog URLs.

**Security.** Catalog URLs are subject to `UPSTREAM_ALLOW_PRIVATE_NETWORKS`;
documents are size-capped.

---

## H. Observability — P2 (blocked by #718, #719)

**Problem.** Operators cannot fetch a request by id, capture error bodies, or
toggle debug logging at runtime.

**Chosen.** After #718/#719 define the file-logging baseline: error-log
capture with size cap and download endpoint, `GET /api/management/logs/requests/{id}`
served from `requests.lino`, `DELETE /logs`, `PATCH /api/management/logging`
to toggle debug, a usage queue read-out, and a `latest-version` check.

**Security.** Error bodies may contain prompts; the capture is off by default
and admin-scoped.

---

## D1. Gemini Interactions API — P2 (blocked by C)

**Chosen.** Route `/api/services/gemini/v1beta/interactions` natively to
Gemini and translate from/to OpenAI Responses using upstream translators as
the behavioural reference. Thinking is applied through C.

## D2. Translator conformance suite — P2 (blocked by C, D1)

**Chosen.** Port upstream translator test corpora (openai↔claude,
openai↔gemini, codex↔claude, interactions) into JSON fixture pairs loaded by
Router's recorded-fixture harness, with a script that re-extracts them from an
upstream checkout so they can be refreshed.

---

## F. Declarative runtime configuration — P2 (blocked by N)

**Problem.** Flags/env only. Ecosystem tools expect a config document with
path-level CRUD, YAML export and hot reload.

**Options.**
1. Adopt CLIProxyAPI's `config.yaml` schema verbatim.
2. Generate a document from Router's `clap` struct, expose it as JSON with
   JSON Pointer paths and RFC 7396 merge patch, store TOML on disk, export
   YAML optionally.

**Chosen.** Option 2. Verbatim adoption would duplicate flag names and import
settings Router rejects by policy. Includes the payload rules
(`default`/`override`/`filter`, raw variants, model/protocol scoping,
conditions) as the "final barrier" after translation, hot reload via file
watcher, and CORS configuration.

**Security.** Reads redact secret-bearing paths by default; a separate
`config:write` token scope; writes are audit-logged with a diff.

---

## G. Credential lifecycle management endpoints — P2 (blocked by N, B0)

**Chosen.** `GET/POST/DELETE /api/management/credentials`,
`/credentials/{id}/download` (admin, audit-logged), `PATCH /status`
(block/unblock), `PATCH /fields` (priority, weight, prefix, proxy),
`POST /refresh`, and OAuth `/import`, `/auth-url`, `/status`, `/cancel`
built on the existing login-session endpoints.

**Security.** Download returns the encrypted file by default; plaintext
export requires an explicit flag and is logged.

---

## E. Codex per-credential transport and identity toggles — P2 (blocked by A)

**Chosen.** Per-account `codex_websockets` (Responses over upstream
WebSocket duplex), `codex_alpha_search` (route `/v1/alpha/search`). The
upstream "cloaking" (request fingerprint mimicry) is **not** ported; the
`disable-codex-cloaking` toggle is therefore not needed. Port the duplex
transport tests.

---

## B1–B4. Providers — P2/P3 (blocked by B0; B3 also by O)

- **B1 Kimi:** device-flow OAuth and API key, OpenAI-compatible surface;
  terms decision recorded before the subscription row is enabled.
- **B2 xAI Grok:** API key first; OAuth-like login second; TTS through
  `/audio/speech`; makes Grok CLI route to its own vendor.
- **B3 Google channel completeness:** multiple AI Studio API keys with
  per-key policy, Vertex service-account import (`gcp_auth`), Antigravity
  OAuth and alias catalog, `quota-exceeded` project/preview switching.
- **B4 Devin and Meta Muse (P3):** connectors only if a use case appears;
  tracked so the matrix is complete.

---

## J. Multimedia routes — P3 (blocked by O)

**Chosen.** Route images/videos/speech/legacy completions to providers whose
catalog entries declare the modality; relay-only; image-generation mode
`chat`/`passthrough` as upstream.

---

## P. Port cross-module regression suites — P2 (blocked by C, I, D2)

**Chosen.** Port `claude_code_compatibility_sentinel_test.go`,
`builtin_tools_translation_test.go`,
`codex_claude_parallel_function_calls_test.go`,
`codex_stream_disconnect_failover_test.go`, `usage_logging_test.go` and
`summary_intent_translation_test.go` into Router tier-1/2 tests. Details in
[test-reuse.md](test-reuse.md).

---

## K. Pluggable encrypted storage backend — P3 (blocked by F, G)

Only with encryption at rest under a Router-held key; `object_store` first.

## L. Library extension points — P3 (blocked by F)

In-process `async-trait` interceptors and connector registration; no dynamic
loading.

---

## Out of scope

| Upstream feature | Reason |
| --- | --- |
| Claude/Codex request fingerprint "cloaking" | Conflicts with Router's deny-by-default subscription policy and vendor terms; only transport toggles are ported (E) |
| Plugin host with dynamic libraries, plugin store | Remote code execution surface; Router uses in-process traits (L) |
| Home control plane (RESP), wsrelay, redis queue, mDNS discovery | Router has deploy/tunnel/host mode (#681–#684) for the same operational goals |
| TUI | Router ships its own |
| Amp module | Vendor-specific integration with no Router use case |
| iFlow OAuth and cookie import | Terms unknown; no client in our matrix |
| `/v0/management` API | Deprecated upstream |
| "No timeouts after connection" policy | Router decided the opposite in #669 after stream-hang incidents |
| `config.yaml` verbatim schema | Would duplicate flag names and import rejected settings; F maps shapes instead |
