# Existing components and libraries survey

The issue asks explicitly to "check known existing components/libraries, that
solve similar problem or can help in solutions". This document records what was
evaluated for each of the two functional requirements and what was adopted.

## A. Cross-dialect gateways (R5–R7)

| Project | What it does | What we take | Why we do not depend on it |
| --- | --- | --- | --- |
| [router-for-me/CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) | Wraps Codex, Claude Code, Gemini, and Grok subscriptions behind OpenAI/Gemini/Claude/Codex-compatible endpoints; hides OAuth, multi-account, and protocol differences | Confirms the "N client protocols × M subscription backends" matrix as the correct product shape, and that Anthropic-in/OpenAI-out is the direction users actually ask for | Go service with its own account model; adopting it would replace this repository rather than extend it |
| [raine/claude-code-proxy](https://github.com/raine/claude-code-proxy) | Local Anthropic-compatible proxy so Claude Code can run on ChatGPT/Kimi/Cursor/Grok subscriptions | The exact use case of R6, and the design rule that the client keeps its harness while only the wire protocol is translated | Node/TypeScript; already surveyed for issue #42, where its transparent token substitution was adopted |
| [jimmc414/claude_n_codex_api_proxy](https://github.com/jimmc414/claude_n_codex_api_proxy) | Bidirectional Claude/Codex routing proxy | Reinforces that both directions must exist for the pair to be symmetric | Prototype scope |
| [LiteLLM proxy](https://docs.litellm.ai/docs/proxy/virtual_keys) | Unified gateway with 100+ providers | Its OpenAI-compatible surface is the interoperability baseline the router's `openai-compatible` provider already targets | Python + database + Redis; contradicts R8's "internal component" framing |

**Rust crates considered for the translation itself.** No crate provides an
Anthropic↔OpenAI protocol bridge; `async-openai` and `anthropic-sdk` are client
SDKs for calling those APIs, not translators, and pulling them in would add
strongly-typed request models that reject the vendor-specific extension fields
the router must pass through. The repository already has hand-written
translators (`src/openai.rs`, `src/responses.rs`, `src/gemini.rs`) whose lenient
`serde_json::Value` handling is deliberate. The new direction reuses those
helpers rather than adding a dependency.

**Streaming.** Anthropic SSE is emitted with the existing `axum::response::sse`
plumbing and the same incremental parser strategy as `OpenAIStreamTranslator`
(`find_sse_separator` / `extract_sse_data` in `src/openai.rs`), so no SSE crate
(`eventsource-stream`, `reqwest-eventsource`) is introduced. Those crates parse
SSE into typed events but do not help with re-emitting a different event
vocabulary, which is the whole job here.

## B. Per-task tokens, audit and monitoring (R1–R4)

| Component | What it offers | Decision |
| --- | --- | --- |
| [LiteLLM virtual keys](https://docs.litellm.ai/docs/proxy/virtual_keys) | Per-key spend tracking, budgets at key/user/team/org level, request blocking when any level is over budget, admin-action audit logs | **Adopt the model, not the code.** The router already has per-token budgets (`max_requests`) and account pinning; what it lacked was per-key *attribution* in metrics and an audit trail. Both are added. LiteLLM's team/org hierarchy is out of scope for a personal/corporate internal component (R8) |
| `jsonwebtoken` (already a dependency) | HS256 signing/validation of `la_sk_…` tokens with `sub`, `iat`, `exp`, `label` claims | Already in use; the token `sub` becomes the stable audit/monitoring dimension |
| `tracing` / `tracing-subscriber` (already dependencies) | Structured logging | Used for human-facing logs, but *not* as the audit store: log level and format are operator-configurable, whereas an audit trail must be stable and machine-parseable. The audit log is a separate append-only JSONL file |
| `prometheus` / `metrics` crates | Registry-based metric collection with label cardinality management | Rejected. `src/metrics.rs` deliberately renders Prometheus text from plain atomics with no registry. Adding a crate for two extra label dimensions is disproportionate; the per-token map is bounded by the number of issued tokens, which an internal deployment controls |
| `sqlite`/`sled` for audit storage | Queryable history | Rejected for R8: append-only JSONL is greppable, rotatable, and shippable to any collector without a schema migration story |

### Cardinality note

Per-token Prometheus labels are unbounded in a public SaaS and would be a bad
default there. For this system's stated purpose — one token per task inside a
personal or corporate deployment — the operator controls token issuance, so the
label set is bounded by design. The feature is nevertheless behind a
configuration flag so an operator with many short-lived tokens can keep
`/metrics` aggregate-only while still getting the JSONL audit trail.

## C. Local verification tooling (R10)

| Component | Use |
| --- | --- |
| Docker (available locally) | Runs the router against a **copy** of `~/.claude`, mounted read-only, so the real credential directory is never mutated |
| `axum` + `tokio::net::TcpListener` (already dependencies) | A throwaway in-test upstream server for the vendors whose subscriptions are not available on this machine (Codex/Gemini/Qwen), letting the cross-dialect path be verified deterministically in `cargo test`. A dedicated mock crate such as `wiremock` was considered and rejected: the router already depends on `axum`, so a ten-line handler is cheaper than a new dev-dependency |
| `curl` | Byte-level SSE evidence capture for the documented flows |

Nothing new is added to `Cargo.toml` by this change.
