# Verification matrix — issue #45

Issue #45 requires that *"everything that is documented must be tested locally"*.
This file states, per documented use case, exactly how far the verification got
and what stopped it — no use case is claimed as verified when it is not.

## Harnesses

| Harness | Needs | Result |
| --- | --- | --- |
| `experiments/issue-45/test-bridge-openai-compatible.sh` | nothing (bundles `mock_openai_upstream.py`) | **26 passed, 0 failed** |
| `experiments/issue-45/test-docker-claude-max.sh` | Docker + a Claude MAX session in `~/.claude` | **18 passed, 0 failed** |
| `cargo test` | nothing | 235 tests, all passing |

The Docker harness copies **only** `~/.claude/.credentials.json` into a
throwaway directory and mounts that copy read-only; it asserts both that the
mount rejects writes and that the copy stays byte-identical to the original.

## Per use case

| Documented use case | Verification | Evidence |
| --- | --- | --- |
| [per-task-tokens.md](../../use-cases/per-task-tokens.md) | live: issuance, label, `max_requests` budget exhaustion → `rate_limit_error`, revocation | both harnesses; `evidence/docker-audit.jsonl` |
| [audit-and-monitoring.md](../../use-cases/audit-and-monitoring.md) | live: JSONL fields, absence of any token string, per-token Prometheus series | `evidence/docker-audit.jsonl`, `evidence/docker-metrics.txt` |
| [cli-claude-code.md](../../use-cases/cli-claude-code.md) | **live against the real Claude MAX subscription**, JSON and SSE | `evidence/docker-v1-messages*.{json,sse}` |
| [claude-max-in-codex.md](../../use-cases/claude-max-in-codex.md) | **live against the real Claude MAX subscription**, JSON and SSE, via `/v1/responses` in the Codex dialect | `evidence/docker-v1-responses*.{json,sse}` |
| [chatgpt-in-claude-code.md](../../use-cases/chatgpt-in-claude-code.md) | end-to-end against a **mock** OpenAI upstream: request translation, response translation, SSE translation, `count_tokens`, budget, audit, metrics | `test-bridge-openai-compatible.sh` |
| [cli-codex.md](../../use-cases/cli-codex.md), [cli-qwen-code.md](../../use-cases/cli-qwen-code.md), [cli-gemini-cli.md](../../use-cases/cli-gemini-cli.md), [cli-opencode.md](../../use-cases/cli-opencode.md), [cli-grok-cli.md](../../use-cases/cli-grok-cli.md) | router side verified via the OpenAI-compatible harness; the **subscription** side is unverified — see below | — |
| [cli-cursor.md](../../use-cases/cli-cursor.md) | documented as **not supported**; nothing to verify | — |

### What could not be tested here, and why

`~/.codex/auth.json`, `~/.qwen` and `~/.gemini` do not exist on this machine, so
no ChatGPT Pro, Qwen or Gemini subscription credential was available. For those
providers the router-side behaviour is covered (the OpenAI-compatible upstream
exercises the same forwarder and the same bridge), but the vendor-specific
credential refresh and endpoint dialect are **not** confirmed against the live
vendor. Re-running `test-docker-claude-max.sh` on a machine that has those
sessions, with `UPSTREAM_PROVIDER` set accordingly, is the remaining step.

## Findings that became fixes

| Finding | Fix | Test that locks it in |
| --- | --- | --- |
| `POST /v1/messages/count_tokens` was answered locally by the bridge **without validating the client token** | validate (and audit) before answering; the request budget is deliberately not consumed | `src/anthropic_bridge_tests.rs::count_tokens_auth::*`, plus a live 401 assertion in the bridge harness |
| Claude MAX OAuth rejects any request whose first system block is not Claude Code's identity, with a misleading `429 rate_limit_error` — breaking the Codex use case | `src/claude_identity.rs` prepends the block for `sk-ant-oat…` credentials on both Anthropic-bound paths | `src/claude_identity.rs` unit tests; the live Docker run ([root-cause note](evidence/identity-prompt-429.md)) |
| A forwarded body can change length once the identity block is added | `content-length` is dropped from forwarded upstream headers | live Docker run (both surfaces) |
