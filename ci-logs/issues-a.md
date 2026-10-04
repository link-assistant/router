######## 670
title:	Tests: fuzzing and property tests for SSE parsing and protocol translators
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

######## 672
title:	Tests: soak/memory-growth, benchmarks with CI regression gate, mutation testing for security-critical modules
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

######## 673
title:	Tests: N-k upgrade matrix for data, tokens, profiles and deploy state
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

######## 674
title:	Tests: macOS CI with a throwaway keychain for Keychain-dependent paths and real Claude Code
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

######## 675
title:	Tests: Claude Code feature matrix through Router (vision, PDF, thinking+tools, tool_search, citations, count_tokens, server tools)
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

######## 676
title:	Opt-in pre-first-byte failover across pool accounts (429/529/5xx/401) with session affinity and reasoning-state handling
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

######## 677
title:	Use vendor rate-limit state: unified 5h/7d headers, per-model cooldown, optional usage-threshold pause and warmup interception
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

