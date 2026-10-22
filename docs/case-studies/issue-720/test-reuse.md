# Reusing CLIProxyAPI tests

The issue asks to "use as much tests as possible from them". The upstream
corpus is MIT licensed and 918 files large
([raw/cliproxyapi-test-inventory.txt](raw/cliproxyapi-test-inventory.txt)).
Go tests cannot run against a Rust binary, so "reuse" means one of three
things, listed from most to least valuable:

1. **Port vectors.** Table-driven inputs and expected outputs (thinking
   matrices, translator pairs, cooldown timelines) become Rust tables or JSON
   fixtures. Behaviour is preserved exactly; the harness is Router's.
2. **Port scenarios.** End-to-end tests with mock upstreams are rewritten
   against Router's tier-1/2 harness (`tests/common/tiers.rs`), keeping the
   assertions.
3. **Port intent.** Where the upstream subsystem does not exist in Router,
   keep only the behavioural claim as an acceptance criterion in the
   sub-issue.

Every ported file carries a header naming the upstream file and commit.

## Selected suites

| Upstream file(s) | Tests | Router target | Mode | Sub-issue |
| --- | --- | --- | --- | --- |
| `test/thinking_conversion_test.go` | `TestThinkingE2EMatrix_Suffix`, `_Body`, `_ProviderTargets`, `_InteractionsMatrix`, `_ClaudeAdaptive_Body` | `src/thinking/tests/` tables | Vectors | C |
| `internal/thinking/*_test.go` | suffix parsers, appliers | same | Vectors | C |
| `test/codex_quota_failover_test.go` | `TestCodexTerminalQuotaCoolsAccountAcrossModels`, `TestCodexModelLevelCoolingPreservesSiblingModel` | `tests/pool_cooldown_model_level.rs` | Scenario | I |
| `test/codex_stream_disconnect_failover_test.go` | 4 disconnect/failover tests | `tests/pool_failover_disconnect.rs` | Scenario | I, P |
| `test/claude_code_compatibility_sentinel_test.go` | sentinel | extend Claude Code feature matrix (#675) | Scenario | P |
| `test/builtin_tools_translation_test.go` | built-in tools across protocols | bridge tests | Vectors | D2, P |
| `test/codex_claude_parallel_function_calls_test.go` | parallel tool calls | bridge tests | Vectors | P |
| `test/summary_intent_translation_test.go` | summary intent | bridge tests | Vectors | D2 |
| `test/usage_logging_test.go` | usage attribution | `tests/usage_*` | Scenario | P |
| `test/codex_incomplete_stream_error_type_test.go` | incomplete stream error | already covered by #668; cross-check assertions | Intent | — |
| `internal/translator/**/*_test.go` (~100 files) | protocol pair conversions | JSON fixture pairs via extraction script | Vectors | D2 |
| `internal/runtime/executor/payload_barrier_test.go` | payload rules as final barrier | config rule tests | Scenario | F |
| `internal/runtime/executor/request_proxy_priority_test.go` | proxy/priority precedence | account policy tests | Scenario | A |
| `internal/runtime/executor/*websocket*duplex*_test.go` | Responses duplex | E transport tests | Scenario | E |
| `internal/runtime/executor/*ratelimit*_test.go` | rate-limit parsing | vendor window parser tests (#677) | Vectors | I |
| `internal/api/handlers/management/*auth*_test.go` | lockout, remote toggle | management tests | Scenario | N |
| `internal/api/handlers/management/*config*_test.go` | config CRUD, redaction | F tests | Scenario | F |
| `internal/config/*_test.go` (42) | validation, aliases, exclusions, weights | A and F tests | Vectors | A, F |
| `sdk/cliproxy/auth/*_test.go` (118) | refresh, cooldown transitions, selection | B0 conformance suite | Scenario (selected) | B0, G |
| `internal/registry/*_test.go` | catalog merge and alias | O tests | Vectors | O |
| `internal/signature/*_test.go` | signature cache | cross-check against Router's 34 signature files | Intent | — |

## Not reused

| Upstream area | Files | Reason |
| --- | --- | --- |
| `internal/pluginhost`, `internal/pluginstore` | 40 | Dynamic-library plugins are out of scope |
| `internal/runtime/executor/*cloak*`, `*fingerprint*` | ~15 | Fingerprint mimicry is out of scope |
| Home, wsrelay, redis queue, discovery, TUI, Amp | — | Subsystems not planned |
| `internal/watcher/diff` | 9 | Only if F adopts a diff-based reload; otherwise intent only |
| `examples/plugin/*` | 8 | Plugin examples |

## Extraction tooling

Sub-issue D2 includes a script, kept under `experiments/`, that reads an
upstream checkout path passed as an argument, extracts table-driven vectors
from the listed Go files into JSON, and never executes anything from the
checkout (the clone is untrusted input). Re-running it against a newer
upstream tag refreshes the fixtures without manual copying.
