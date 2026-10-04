=================== #668
title:	Tests: stream termination correctness on every surface (client disconnect, upstream reset, stall, partial-output billing)
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	668
--
## Summary
Stream termination is the riskiest path for a coding-agent gateway, and Router has almost no tests for it. A client that disconnects, an upstream that resets, and an upstream that stalls must each end in a well-defined state: upstream cancelled, budget settled with real usage, no fake success sent to the client.

Checked against v1.15.3 (`f90d7e7`):
- Upstream cancellation on client disconnect is tested only for Gemini (`src/model_routing_evidence_tests.rs::cancelling_the_downstream_gemini_body_drops_the_upstream_stream`).
- Truncation is tested only on the log side (`src/provider_proxy_tests.rs::a_stream_without_a_terminator_stays_incomplete`). No test covers the protocol translators.
- `UsageTracker::drop` (`src/usage.rs`) settles whatever usage it has seen. For Anthropic streams the final `output_tokens` arrives only in `message_delta`, so a mid-stream disconnect probably charges almost no output against a capped token. This is not proven either way.

## Tests to add, for every surface (Anthropic passthrough, Anthropic→OpenAI bridge, Chat Completions, Responses HTTP and WebSocket, Codex, Gemini, z.ai)
1. **Client disconnect after N chunks:** the upstream connection is closed within a bound, and the reservation is settled with the usage actually consumed. If upstream gave no usage, estimate it from streamed content and record it as estimated. A test must assert it is not zero.
2. **Upstream TCP reset or HTTP/2 RST_STREAM after partial output:** the client gets a protocol-correct error event. Router never synthesizes `message_stop`, `[DONE]` or `response.completed`.
3. **No failover after the first byte:** account or pool failover is allowed only before any downstream byte. Exactly one upstream request is billed.
4. **Stalled upstream** (headers, then silence; or a byte trickle): the client gets a timeout error and the reservation is settled.
5. **Abort after the terminal event:** counted as success, not as an error.

## Prior art
- APISIX `t/plugin/ai-proxy-client-disconnect.t`, `ai-proxy-stream-truncated.t`
- TensorZero `crates/tensorzero-core/tests/e2e/streaming_errors.rs` (`test_streaming_h2_rst_stream_is_fatal`)
- Bifrost `core/abandonedstream_test.go`, `core/providers/utils/idle_timeout_reader_test.go`
- LiteLLM `tests/e2e/router/test_reliability_cancel_on_disconnect_e2e.py`, `tests/integration/spend/test_disconnected_bedrock_messages_stream_billing.py`
- claude-code-router `packages/core/test/integration/gateway/gateway-client-disconnect.test.mjs`

## Compatibility
Budget accounting may change for capped tokens; document it as a fix. Wire formats are unchanged.

=================== #669
title:	Upstream client: default connect/first-byte/idle timeouts, asserted no-redirect policy, SSRF guard for provider base URLs
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	669
--
## Summary
The upstream HTTP client (`src/upstream_client.rs`, v1.15.3) disables redirects. Its only timeout is a read timeout, and that is enabled only when `UPSTREAM_READ_TIMEOUT_SECS` is set. There is no `connect_timeout`. A black-holed provider address therefore holds a connection, a file descriptor and a token reservation until the OS gives up. Nothing asserts the no-redirect policy, so a refactor could silently allow redirects, which matters for credential-bearing requests.

## Proposal
- Safe defaults: a connect timeout of about 10 s, a first-byte timeout, and an idle-read timeout for streams. Each is configurable, and `0` means disabled for compatibility.
- Tests against a local listener that accepts but never answers, one that answers headers then stalls, and one that redirects to a different host. Assert the timeout errors, the settled reservations, and that no redirect is followed (Authorization never reaches the second host).
- SSRF guard for configurable provider base URLs: refuse loopback, link-local, `169.254.169.254`, private ranges and DNS rebinding unless explicitly allowed. Test each case.

## Prior art
Bifrost `core/network/ssrf_test.go`, `idle_timeout_reader_test.go`; new-api `common/ssrf_protection_test.go`; MLflow `tests/gateway/test_ssrf.py`; TensorZero `timeouts.rs`.

## Compatibility
Defaults are generous and overridable. Loopback provider URLs used in local setups keep working through an explicit allow option.

=================== #670
title:	Tests: fuzzing and property tests for SSE parsing and protocol translators
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	670
--
## Summary
Router translates untrusted request bodies and upstream SSE between Anthropic, OpenAI Chat, Responses and Gemini. Coverage of these is deterministic and hand-written. There is no `fuzz/` directory, `proptest` appears only in `src/request_log_tests.rs` and `src/lino_json_tests.rs`, and `src/sse_regression_tests.rs` has a handful of cases.

## Proposal
1. `cargo-fuzz` targets for the SSE parser and for every request and stream translator: arbitrary bytes or JSON in, no panic, bounded allocation, valid output or a typed error. Run a short corpus in CI and longer runs nightly.
2. Property tests for re-chunking: for any split of a valid upstream stream (frame boundaries, CRLF, `:` comments and pings, multi-line `data:`, split UTF-8), the translated output is identical to the unsplit run.
3. Round-trip properties for tool calls, thinking and signatures, and cache-control blocks across protocol pairs.

## Prior art
agentgateway `fuzz/fuzz_targets/llm_request_conversions.rs`; CLIProxyAPI `internal/runtime/executor/helps/claude_json_prefilter_fuzz_test.go`; APISIX `t/plugin/ai-proxy-flush-fragmented.t`; Bifrost `core/providers/utils/sse_test.go`.

## Compatibility
Tests only.

=================== #671
title:	Tests: recorded vendor fixtures (record/replay), cache-token budget accounting, prompt-cache prefix stability
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	671
--
## Summary
Upstream behaviour in Router's tests comes from hand-written mocks. Real vendor wire shapes drift — new usage fields, cache-token fields, error envelopes, new SSE event types — and hand-written mocks do not follow. Cache tokens appear only in `src/bridge_response_tests.rs` and `src/zai_coding_plan_tests.rs`, not in the budget tests (`tests/router_e2e/token_budget.rs`).

## Proposal
1. A record/replay fixture layer. Record real Anthropic, Codex/Responses, Gemini and z.ai responses once, with secrets scrubbed: streaming, non-streaming, tool use, thinking with signatures, every error class (429, 529, 5xx, billing such as z.ai 1113, invalid request), and usage with `cache_read_input_tokens`, `cache_creation_input_tokens` and `cached_tokens`. Replay them through every translator in CI. Provide a re-record command for the live tier.
2. Budget tests: cache tokens are counted consistently, by a documented rule, in reservation settlement for each protocol, both streamed and non-streamed.
3. Multi-turn prompt-cache prefix stability: the bytes Router sends upstream keep an identical prefix across turns, including through the OpenAI→Anthropic bridge, so injected metadata or IDs never break cache hits.

## Prior art
Envoy AI Gateway `tests/data-plane/vcr/`; TensorZero `crates/provider-proxy`; LiteLLM `.github/workflows/e2e_record_replay.yml`, `tests/e2e/claude_code/prompt_caching_5m/`; Kong `spec/fixtures/ai-proxy/`; CLIProxyAPI `claude_cloaked_cache_repro_test.go`; any-llm `tests/integration/test_cached_tokens.py`.

## Compatibility
Item 2 may change how much budget is spent; announce it in the changelog.

=================== #672
title:	Tests: soak/memory-growth, benchmarks with CI regression gate, mutation testing for security-critical modules
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	672
--
## Summary
Router has no load, soak, memory-growth or performance-regression tests: no `benches/`, no criterion, no load scripts. It also has no mutation testing on the security-critical modules. Rolling updates, relay draining and long agent sessions all depend on stable memory, file descriptors and latency under sustained streaming.

## Proposal
1. A soak test: N concurrent long SSE streams through Router against a local mock for 10–30 minutes. Assert flat RSS, open file descriptor count and task count, and p99 added latency within a budget. Run it nightly.
2. Microbenchmarks with a CI regression gate (criterion plus a stored baseline, or CodSpeed): per-chunk translation overhead, token verification, request-log write.
3. `cargo-mutants` on token signing and verification, budget reservation and settlement, and log redaction. Track surviving mutants as issues.

## Prior art
LiteLLM `tests/load_tests/test_linear_memory_growth.py`, `codspeed.yml`, `mutation-test.yml`; TensorZero `tests/load/`; Bifrost `ssestream_bench_test.go`, `.github/workflows/scripts/load-test.sh`; Envoy AI Gateway `tests/data-plane/bench_test.go`.

## Compatibility
Tests only.

=================== #673
title:	Tests: N-k upgrade matrix for data, tokens, profiles and deploy state
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	673
--
## Summary
The backward-compatibility tests are good but cover a single step: one older token-store fixture (`tests/fixtures/token_stores/v0.125.3-one-record.lino`), log format migration, and a previous-release → current relay update. Operators who skip releases, and the frequent releases themselves, need an N-k matrix.

## Proposal
A CI job that, for each of the last 3–5 published releases:
1. starts that release's image or binary with a data dir containing issued tokens (with budgets, revocations and model policies), provider configuration, request logs, client profiles, an exhaustion record and a deploy state;
2. upgrades to the candidate through `router deploy` (container and host mode), and also by plain binary replacement;
3. asserts that every token is still accepted with the same policy, providers and catalogs are preserved, logs are readable by `router logs`, `deploy --status` converges, and a downgrade back to N-1 either works or is refused with a named reason.

## Prior art
Envoy AI Gateway `tests/e2e-upgrade/upgrade_test.go`; LiteLLM `tests/proxy_migration_tests/`; Bifrost `framework/configstore/migrations_test.go`; Kong `spec/05-migration/`.

## Compatibility
This is the compatibility guard itself.

=================== #674
title:	Tests: macOS CI with a throwaway keychain for Keychain-dependent paths and real Claude Code
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	674
--
## Summary
macOS is the most common platform for Claude Code users, and the Keychain decides whether Anthropic works at all (host mode, share refusal, auth import). Yet Keychain behaviour is unit-tested only (`src/platform_keychain_tests.rs`), and `real-clients.yml` runs real clients on Ubuntu only. The Linux verifier (`scripts/verify-contracts-in-linux.sh`) cannot cover Keychain paths by design.

## Proposal
A macOS CI job that creates a throwaway keychain (`security create-keychain`, added to a temporary search list, then deleted) and covers:
- per-`CLAUDE_CONFIG_DIR` entry discovery without reading secrets;
- host-mode reading of a Keychain login in place;
- `--claude-credentials share` refusal;
- `auth import` from the Keychain without forking the refresh chain;
- a real Claude Code launch through `router with claude` against a mock upstream.

The job must assert that no UI prompt is possible: the keychain is unlocked, and its ACL is set for the test binaries only.

## Compatibility
Tests only.

=================== #675
title:	Tests: Claude Code feature matrix through Router (vision, PDF, thinking+tools, tool_search, citations, count_tokens, server tools)
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	675
--
## Summary
Router's real-client tier proves that Claude Code launches, routes and lists models. It does not exercise the Claude Code feature surface that agents use every day through a gateway: `citations` appears in no test file and `tool_search` in only one.

## Proposal
Real Claude Code (and Codex where applicable) against the loopback mock, plus an opt-in live tier, for:
- image input
- PDF/document input
- thinking with tool use, and signature preservation across turns
- tool_search
- web search and other server tools
- citations
- `count_tokens`
- structured outputs
- 1M-context headers
- `/compact`

For each, assert the exact upstream request Router sends and the response the client renders.

## Prior art
LiteLLM `tests/e2e/claude_code/{vision,pdf_input,thinking_with_tool_use,tool_search,web_search,count_tokens,structured_outputs}`.

## Compatibility
Tests only.

=================== #676
title:	Opt-in pre-first-byte failover across pool accounts (429/529/5xx/401) with session affinity and reasoning-state handling
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	676
--
## Summary
With several accounts for one subscription (pool), a 429, 529, 5xx or 401 from account A is relayed to the client, and A is only marked as cooling down (v1.15.3 `src/proxy.rs`, Anthropic path: `report_failure_with_retry_after` followed by the response). The coding agent then backs off or fails, although account B could serve the same request immediately.

## Proposal (opt-in routing mode, so the current behaviour remains the default)
- Before the first downstream byte, retry the same request on the next eligible account for 429, 529, retryable 5xx, transport errors, and 401 after a failed refresh. The client sees one response.
- Never fail over after the first byte (see the stream-termination tests issue).
- Keep session affinity: the session moves while its pinned account cools down, returns afterwards, and concurrent failovers spread across accounts instead of piling onto one.
- Stop retrying when the client disconnects. Bound total attempts and time.
- Reasoning state across accounts: drop or replay Codex `encrypted_content` and Claude thinking signatures so the next account does not reject the conversation with 400.
- Log every attempt under one correlation id.

## Tests
One stream on success; affinity return; spreading across accounts; client-gone stops retries; signature handling; exactly one billed attempt.

## Prior art
CLIProxyAPI `internal/runtime/executor/claude_executor_ratelimit_test.go` (`AlternativeCredentialCanBeSelected`), `codex_stream_bootstrap_buffering_test.go`, `codex_executor_reasoning_replay_cache_test.go`; sub2api `backend/internal/handler/failover_loop_test.go`; better-ccflare `session-affinity.test.ts`.

=================== #677
title:	Use vendor rate-limit state: unified 5h/7d headers, per-model cooldown, optional usage-threshold pause and warmup interception
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	677
--
## Summary
Account cooldown is driven only by `Retry-After`. Subscription vendors expose much richer limit state, which Router passes through but does not act on:
- Anthropic `anthropic-ratelimit-unified-{5h,7d}-status/reset` headers (`tests/router_e2e/cases_core.rs` only checks that they pass through);
- model-scoped limits, such as a weekly Opus cap while other models remain available;
- the usage percentages that `router usage` already reads.

## Proposal
1. Cooldown from the unified headers: honour both windows, let the longer one win when both are rejected, match header names case-insensitively, and include `count_tokens` responses.
2. Per-model cooldown: a model-scoped 429 blocks only that model on that account, while a credential-wide 429 blocks all models.
3. Optional threshold pause: stop selecting an account when its 5h or 7d usage passes a configured percentage, and resume it when the window resets. Handle a 0% reading, an unreadable window and a manual pause.
4. Optional interception of Claude Code warmup/probe requests, so they do not spend quota.
5. Surface all of this in `router usage`, `doctor`, metrics and `deploy --status`.

## Prior art
CLIProxyAPI `claude_executor_ratelimit_test.go`; claude-relay-service `tests/claudeAccountModelRateLimit.test.js`; better-ccflare `packages/core/src/usage-threshold.test.ts`; sub2api `gateway_handler_warmup_intercept_unit_test.go`.

## Compatibility
Items 3 and 4 are opt-in. Items 1 and 2 only make cooldown more precise.

=================== #678
title:	Per-account connection/cookie isolation and optional per-account egress proxy
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	678
--
## Summary
All Codex accounts share one static cookie client (`src/upstream_client.rs`, v1.15.3), and no account can egress through its own proxy. Vendor anti-abuse layers (for example Cloudflare cookies) and per-account rate limits work per identity. Shared cookies or keep-alive connections can link accounts or carry one account's state into another's requests.

## Proposal
- Per-account HTTP client: a separate cookie store and connection pool for each account, with a maximum connection age, and idle connections closed.
- An optional per-account egress proxy (HTTP or SOCKS5), configured with the account. Credentials go to the proxy through a secret reference, never argv.
- Test: cookies and connections set for account A are never sent for account B.

## Prior art
ccLoad `internal/app/upstream_connection_age_test.go`; sub2api and CLIProxyAPI per-account proxy settings.

## Compatibility
With no per-account proxy configured, behaviour is unchanged apart from isolation.

=================== #679
title:	Deploy configuration for downstreams: env passthrough by name, instance prefix, SSH options, issued-token limits, declarative config file
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	679
--
## Summary
Downstream deployments still keep their own orchestration wrappers around `router deploy`, only because a few settings cannot be expressed through it. If these were configuration in Router, a downstream could drop its wrapper and keep only a small config file.

## Needed settings for local and `--server` deploys
- **Runtime environment passthrough by name only** (for example a request-log size cap, or a vendor OAuth client setting). Values are read from the caller's environment or a file and never put in argv. A changed value triggers a reconcile, detected by an HMAC fingerprint in the launch specification.
- **Instance name/label prefix,** so several independent deployments can share a host.
- **SSH:** port, identity file, a pinned `known_hosts` entry (no `accept-new`), keepalive interval, and an overall deadline for the remote session with a documented exit code.
- **Client tokens issued by deploy:** TTL, request/token caps and model policy, so deploy-issued tokens are not effectively unlimited.
- **A declarative file** (for example `router-deploy.lino`/`.toml`) holding all of the above, so the deploy command line stays short and reviewable.

## Acceptance
A downstream that today wraps `router deploy` in its own scripts can express its setup as one config file plus `router deploy --config …` for local, host and remote targets.

=================== #680
title:	deploy --server: add or rotate API-key providers in the candidate before cutover
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	680
--
## Summary
On `router deploy --server`, the staging candidate only inherits the previous release's provider configuration (`src/deploy/remote_agent.sh` copies `providers.lenv`). A downstream that rotates or adds an API-key provider (for example a GLM Coding Plan key) has to call `providers add` against the live deployment after cutover. That bypasses the candidate-first verification.

## Proposal
- `router deploy --server … --provider-key <name>=<env-var|file>`, repeatable. Values come through the process environment or stdin, never argv.
- The key is added to the candidate before cutover and verified there (catalog and a minimal request), together with the existing per-client checks. Modes: `replace` (only after positive validation), `if-absent`, `keep` (default, current behaviour).
- The deploy JSON reports a fingerprint per provider and the validation result. Values are never printed.

## Compatibility
Without the flag, nothing changes.

=================== #681
title:	Supported non-interactive way to give a new remote deployment an existing subscription
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	681
--
## Summary
Router deliberately refuses to copy OAuth credentials into a remote deployment (`auth_import.rs::refuse_a_remote_import`), and the documented alternative is `router auth <provider> --server …`. Downstreams still need a non-interactive way to give a fresh remote deployment the subscription that the operator already holds locally. Today they write their own credential-delivery code: file upload, `auth import` on the target, pending/active markers, receipts.

## Proposal (pick one and document it)
1. An opt-in, idempotent `router deploy --server … --seed-credential <provider>`, built on the safe `auth import` contract: the refresh chain is moved, not forked, the source is invalidated or marked as handed over, the transfer survives a lost response, and a receipt fingerprint is kept.
2. Or an official non-interactive handoff for `router auth <provider> --server` (device-code or pre-authorized link) that scripts can drive and verify. Document it as the only supported path, with an example.

## Acceptance
A first remote deployment can be brought to "Anthropic and Codex usable" by a script without bespoke credential-copying code, and no refresh chain is forked.

=================== #682
title:	Tunnel companion: forward mode, non-root key handling, pinned host key, router tunnel up|status|down
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	682
--
## Summary
The tunnel companion (`docker/tunnel/`) supports only a reverse tunnel (`-R`). Downstreams that reach a remote Router from a workstation need a forward tunnel (`-L`), and so they maintain their own tunnel images and scripts.

## Proposal
- Forward mode (`-L`) in the tunnel image, bound to `127.0.0.1` only, with a test that it is not reachable on other interfaces.
- Run as non-root. When the bind-mounted key has loose permissions, copy it inside the container with mode 0600 instead of failing or running as root.
- A pinned host key is required (no `accept-new`).
- `router tunnel up|status|down --server …`: starts or stops the companion and checks Router `/api/health` and an authorized catalog through the tunnel, with keepalives and reconnect.

## Compatibility
Reverse mode is unchanged.

=================== #683
title:	Configurable deploy verification profile, fuller remote checks and timing in --json
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	683
--
## Summary
The deploy-time verifier is fixed in code. Downstreams need to state *what must be proven* before cutover, so they keep parallel verification suites of their own. Some useful checks also exist only in unit tests, not at deploy time.

## Proposal
1. **Verification profile** (config): which client kinds and providers must be proven; one exact verification model per provider and client; whether a real `router with <client>` launch against a stub client is required on remote deploys; and whether "quota exhausted" is accepted as proven only with upstream-request evidence (correlation id in the request log). Results go to the deploy JSON.
2. **Fuller remote checks:** probe the whole removed-routes list at deploy time (today only `/v1/models`). On the public inference-only listener, check the anonymized usage view and that inference refuses the admin token.
3. **Observability:** per-step and per-subprocess timings in `--json`.
4. **Opt-in live check** that a Claude response with thinking is displayed as configured (the generated `--settings`).

## Acceptance
A downstream's own deploy verification tests can be replaced by `verify-contracts.rs` plus a verification-profile file.

=================== #684
title:	Host mode: doctor misses custom deploy roots, no service install for reboot survival, weak alternative-model suggestion
state:	OPEN
author:	konard (Konstantin Diachenko)
labels:	
comments:	0
assignees:	
projects:	
milestone:	
issue-type:	
parent:	link-assistant/router#685
sub-issues:	
sub-issues-completed:	
blocked-by:	
blocking:	
number:	684
--
## Summary
Small gaps found while running v1.15.3 in local host mode:

1. `router doctor --local` inspects the default data dir and the *default* deploy root (`~/.link-assistant-router/deploy/data`). A host deployment created with `--root <custom>` serves the selected server, but doctor reports `provider exhaustion: none recorded` while that deployment has an exhausted provider. Doctor should discover active deployments — for example a registry of roots written by `router deploy`, or by asking the serving host Router's management API for the selected server — or name the deployment it could not see.
2. A host-mode Router does not survive a reboot or logout. The docs say to rerun deploy or write a launchd agent yourself. Please add `router deploy --mode host --install-service` (launchd on macOS, a systemd user unit on Linux) that restarts the same binary, data dir and port. `TOKEN_SECRET` should come from the OS secret store or a 0600 file, never from the plist or argv.
3. The pre-launch warning suggests the alphabetically first model (`claude-fable-5`). It should suggest the provider's flagship, or the user's last working selection.

