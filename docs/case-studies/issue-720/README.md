# Case study: issue #720 — feature parity with CLIProxyAPI

**Issue:** [#720 — We must support all the features from https://github.com/router-for-me/CLIProxyAPI](https://github.com/link-assistant/router/issues/720)
**Pull request:** [#721](https://github.com/link-assistant/router/pull/721)
**Status:** analysis complete; delivery tracked by the sub-issues listed in
[Issue plan](#issue-plan).

This folder is the evidence base and the decision record for #720. The issue
asks for four things at once: port as many CLIProxyAPI tests as are useful,
reach feature parity where the features matter for our use cases, keep
reliability/security/safety first, and turn the result into GitHub sub-issues
whose ordering is expressed with GitHub blockers. The documents below do the
analysis; the sub-issues do the delivery.

| Document | Contents |
| --- | --- |
| [requirements.md](requirements.md) | Every requirement from the issue text, traced to a solution and a verification |
| [feature-matrix.md](feature-matrix.md) | Side-by-side inventory of CLIProxyAPI v8.0.20 and Router v1.18.3, with a gap verdict per row |
| [online-research.md](online-research.md) | Facts gathered from the upstream repository, its release notes, documentation mirrors, and the surrounding ecosystem |
| [components-survey.md](components-survey.md) | Existing components and libraries (Rust crates, sibling projects) that solve parts of the problem |
| [solution-plans.md](solution-plans.md) | Options considered and the chosen plan for each requirement and each gap |
| [test-reuse.md](test-reuse.md) | Which CLIProxyAPI test suites are worth porting, how, and which are out of scope |
| [raw/](raw/) | Verbatim third-party captures (MIT licensed) and the issue JSON, exempt from the terminology check |

## 1. Snapshot under analysis

| Side | Version | Snapshot |
| --- | --- | --- |
| CLIProxyAPI | v8.0.20 | commit `0f96f568e4dbf6f84ad7399a74b78344c5eac7e6`, 2026-10-08 03:00 +0800, Go 1.26, Gin, MIT ([raw/cliproxyapi-snapshot.txt](raw/cliproxyapi-snapshot.txt)) |
| Router | v1.18.3 | branch `main` at `1ba3399`, Rust edition 2024, axum 0.8, reqwest 0.13 |

Size of the two code bases at the snapshot (lines counted with `wc -l`):

| Metric | CLIProxyAPI | Router |
| --- | --- | --- |
| Test files | 918 `_test.go` | 146 files under `tests/` plus in-module `*_tests.rs` |
| Test lines | 366,826 | 47,878 under `tests/`; 2,955 `#[test]`/`#[tokio::test]` functions in total |
| Source files | — | 495 `.rs` files, 186,494 lines under `src/` |

The CLIProxyAPI clone used for this study lives outside the repository, in its
own directory, and nothing from it was executed. Only text files were copied
into [raw/](raw/).

## 2. What CLIProxyAPI is, in one paragraph

CLIProxyAPI is a single-binary Go proxy that exposes OpenAI (Chat Completions,
Responses, legacy Completions), Anthropic Messages, Gemini (`v1beta/models`
and the newer `v1beta/interactions`) and Codex backend-api surfaces, and routes
each request to one credential from a pool. Credentials are OAuth logins
(Gemini CLI, Antigravity, Codex/ChatGPT, Claude, Qwen, iFlow, Kimi, xAI Grok,
Meta Muse, Devin) or API keys (Gemini, Vertex, Claude, Codex, OpenAI
compatible). It translates between protocols, normalizes "thinking" controls
across vendors, applies a declarative payload-rewrite configuration, keeps
per-credential cooldowns and retry rounds, and exposes a management API
(`/v8/management`) that can read and write the entire configuration document
at path level, manage credentials and OAuth sessions, tail logs, and install
plugins. Secondary subsystems (Home control plane, wsrelay, redis queue,
Postgres/git/object storage backends, TUI, plugin host for dynamic libraries)
make it a platform rather than a proxy. Full detail: [feature-matrix.md](feature-matrix.md).

## 3. Where Router already is

Router v1.18.3 covers the core of the same problem with a different security
posture:

- Protocol surfaces for Anthropic, Codex (including backend-api native paths,
  conversations, realtime/live, `responses/compact`), Gemini, Vertex, Bedrock,
  OpenAI-compatible, Qwen, z.ai Coding Plan and Lefine.
- Multi-account pools with `round-robin`, `priority`/`fill-first` and
  `least-used`/`quota-first`, session affinity, vendor rate-limit state,
  `ACCOUNT_PAUSE_AT_PERCENT`, warm-up interception, pre-first-byte pool
  failover, per-account egress proxy and connection max-age.
- Upstream timeouts and an SSRF guard (`UPSTREAM_ALLOW_PRIVATE_NETWORKS`).
- `la_sk_…` tokens whose signed claims bind client kind and principal, and a
  deny-by-default subscription-bridge policy (`--allow-subscription-bridge`).
- Management API, admin UI on its own port, Telegram/VK admin bots, deploy,
  tunnel, `with`, `configure`, `doctor`, request and audit logs.
- A model-truth contract (`docs/model-truth-contract.md`) and a four-tier test
  policy (`docs/testing-tiers.md`).

Issues #668–#684 (closed 2026-10-05) already delivered stream-termination
tests, upstream timeouts, fuzzing, recorded fixtures, soak benchmarks, upgrade
matrix, Claude Code feature matrix, pool failover, vendor rate-limit state,
per-account isolation, deploy config, tunnel and host mode. None of the
sub-issues created for #720 re-opens that work.

## 4. Gap analysis (summary)

The row-level comparison is in [feature-matrix.md](feature-matrix.md). The
gaps that matter for our use cases, grouped the way the sub-issues are cut:

| Area | Gap in Router | Why it matters for us |
| --- | --- | --- |
| Per-credential routing policy | No `weight`, no model `prefix`, no per-credential `disable-cooling`/retry override, no request-scoped error rules, no `$`-dynamic header passthrough, no per-credential model alias/exclusion | Lets operators shape traffic across uneven subscriptions and work around vendor quirks without code changes |
| Retry and cooldown model | Cooldowns are account-wide; no `request-retry` rounds, `max-retry-credentials`, `max-retry-interval`; strategy is fixed at start; no cooldown reset endpoint | CLIProxyAPI's `codex_quota_failover_test.go` shows model-level cooling preserving sibling models — directly relevant to Codex/Claude pools |
| Thinking pipeline | Thinking handled per adapter (22 files) without a canonical config, no `model(suffix)` overrides, no cross-protocol replay rules in one place | Thinking conversion is the largest cross-module test matrix upstream and the most frequent source of client breakage |
| Provider coverage | No Kimi, xAI Grok, Antigravity, AI Studio API-key channel, Vertex service-account import, Devin, Meta Muse | Grok CLI and Gemini CLI users are already in our client matrix; the rest are optional |
| Gemini Interactions API | `/v1beta/interactions` absent | Newer Gemini CLI builds use it |
| Declarative runtime configuration | Flags/env only; no path-level config CRUD, YAML export, hot reload | Needed by management-center style UIs and by the admin bots |
| Credential lifecycle API | No upload/download/patch/refresh of credential files, no OAuth import/auth-url/status/cancel over the API | Remote fleet management |
| Observability | No error-log capture/download, no request-by-id fetch, no runtime debug toggle; #717–#719 are open in this area | Operators debugging failed requests |
| Multimedia | Images/videos/speech partially routed | Low priority, but cheap once the catalog knows modalities |
| Codex transport/identity toggles | No per-credential websockets/cloaking/alpha-search switches | Dual-use; see security section |
| Model catalog sources | Catalog is compiled in; no configurable sources with periodic refresh | Avoids a release for every vendor model rename |
| Management hardening | No failed-auth lockout, no remote-management toggle, no safe mode for placeholder keys | Security baseline before exposing more management surface |
| Storage backends, plugin host, library extension points | Absent | Low priority; see out-of-scope rationale |

## 5. Reliability, security and safety analysis

The issue asks to pay "a lot" of attention to these. Findings that shaped the
plan:

**Dual-use features.** CLIProxyAPI's Claude "cloaking"/fingerprint logic and
Codex "websockets duplex" exist to make proxied traffic look like the vendor's
own client. Router's policy (ADR 0001, `docs/use-cases/README.md`) is that
consumer subscriptions are deny-by-default and only reachable through the
client they belong to. We therefore port the **toggles and the transport
tests** (so the native client keeps working) but not the fingerprint
mimicry. The sub-issue for Codex transport toggles says this explicitly.

**Configuration CRUD exposes secrets.** The v8 `/config/*path` endpoint can
return any value, including API keys. Upstream mitigates by omitting TURN
credentials from JSON reads and by hashing the plaintext management key at
startup. Router's plan requires redaction-by-default for every secret-bearing
path and a separate scope for configuration writes.

**Plugins are code execution.** CLIProxyAPI's plugin host loads dynamic
libraries from a store. We do not plan this. Extension points in Router stay
in-process Rust traits behind a library API.

**Storage backends widen the credential blast radius.** `PGSTORE_*`,
`GITSTORE_*`, `OBJECTSTORE_*` move credential files into shared systems. If
ever implemented, encryption at rest with a Router-held key is a hard
requirement; the sub-issue is marked low priority.

**Forwarded headers and `$` passthrough.** Copying client headers upstream by
name (`headers: { X-Foo: "$X-Foo" }`) can leak client authorization headers.
The plan restricts passthrough to an allow-list and never forwards
`Authorization`, `Cookie`, `X-Api-Key` or `X-Goog-Api-Key`.

**Management brute force.** Upstream bans an IP for roughly 30 minutes after
5 consecutive failures and ships `remote-management.allow-remote`. Router
lacks both. The hardening sub-issue blocks the configuration-CRUD and
credential-lifecycle sub-issues so the surface is protected before it grows.

**Reliability policy difference.** CLIProxyAPI's `AGENTS.md` forbids timeouts
after the upstream connection is established. Router decided the opposite in
#669 (first-byte, idle and read timeouts with SSRF guard). We keep Router's
policy and port upstream's stream-disconnect failover tests under it.

**Model-level vs account-level cooldowns.** Upstream's
`TestCodexModelLevelCoolingPreservesSiblingModel` demonstrates that a quota
error for one model must not take the whole account out of rotation. Router
cools the account. This is a correctness gap for mixed-model Codex pools and is
the first reliability sub-issue.

## 6. Issue plan

All sub-issues are attached to #720 with the GitHub sub-issue API and the
dependencies are declared with GitHub blockers (`blocked_by`). Letters match
[solution-plans.md](solution-plans.md).

| Key | Sub-issue | Blocked by |
| --- | --- | --- |
| N | #722 Management access hardening: failed-auth lockout, remote toggle, safe mode | — |
| A | #723 Per-credential routing policy: weight, prefix, disable-cooling, retry override, request-scoped error rules, header passthrough, aliases | — |
| I | #724 Model-level cooldowns, retry budgets, runtime strategy switch, cooldown reset | — |
| C | #725 Canonical thinking pipeline with model-suffix overrides and provider appliers | — |
| B0 | #726 Provider onboarding contract (login, refresh, quota signals, catalog, terms policy) | — |
| O | #727 Configurable model catalog sources with periodic refresh | — |
| H | #728 Observability: error-log capture, request-by-id, log tail/delete, runtime debug toggle, usage queue | #718, #719 |
| D1 | #729 Gemini Interactions API surface | C |
| F | #730 Declarative runtime configuration document with path-level CRUD, YAML export/import, hot reload | N |
| G | #731 Credential lifecycle management endpoints and OAuth session API | N, B0 |
| E | #732 Codex per-credential transport and identity toggles | A |
| B1 | #733 Kimi provider (OAuth and API key) | B0 |
| B2 | #734 xAI Grok provider | B0 |
| B3 | #735 Google channel completeness: AI Studio keys, Vertex service accounts, Antigravity | B0, O |
| B4 | #736 Devin and Meta Muse connectors (low priority) | B0 |
| J | #737 Multimedia routes: images, videos, speech | O |
| D2 | #738 Translator conformance suite ported from CLIProxyAPI corpora | C, D1 |
| P | #739 Port CLIProxyAPI cross-module regression suites | C, I, D2 |
| K | #740 Pluggable encrypted credential and configuration storage backend (low priority) | F, G |
| L | #741 Library extension points: request interceptors and custom executors (low priority) | F |

Out of scope, with reasons, in [solution-plans.md § Out of scope](solution-plans.md#out-of-scope).

## 7. Assumptions

- "All the features" is read as "all features useful for our use cases",
  which is what the issue text says two sentences later. Features that
  conflict with Router's security posture or duplicate Router-native
  subsystems are listed as out of scope with a reason, not silently dropped.
- CLIProxyAPI is MIT licensed ([raw/cliproxyapi-LICENSE](raw/cliproxyapi-LICENSE)).
  Porting test vectors and behaviour descriptions is permitted; ported
  material will carry attribution in the file header.
- Sub-issue priority follows the dependency order in the table above; the
  unblocked rows (N, A, I, C, B0, O) are the first wave.
