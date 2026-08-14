# Solution options and chosen plans

One section per requirement group. Each lists the options that were considered,
the choice, and the concrete steps.

## Plan 1 — Per-task tokens (R1)

Nothing needs to be built: `POST /api/tokens` already issues an independent
`la_sk_…` token with `label`, `ttl_hours`, optional `account`, and optional
`max_requests`. The requirement's parenthetical — "we can use universal tokens
issuing, but user should be able to use each token in such way" — is a
*documentation and workflow* requirement, not a new feature.

Options considered:

1. **Introduce a first-class "task" object** with its own lifecycle endpoints.
   Rejected: it duplicates the token lifecycle and forces every deployment into
   a task-tracking model the issue does not ask for.
2. **Document the token as the task boundary** and make the token id/label the
   audit/monitoring key. **Chosen** — it is the smallest change that satisfies
   audit, monitoring, security, and isolation simultaneously.

Steps: write `docs/use-cases/per-task-tokens.md` covering issuance per task,
naming conventions for `label`, TTL sizing, budget sizing, revocation on task
completion, and how each CLI receives the token through its own environment
variable.

## Plan 2 — Audit trail (R2)

Options:

1. **Reuse `tracing` logs.** Rejected: format and level are operator-tunable, so
   an auditor cannot rely on the records existing.
2. **SQLite/embedded database.** Rejected under R8 — adds a schema and migration
   burden to a component meant to be dropped into personal infrastructure.
3. **Append-only JSONL file next to the token store. Chosen.** One object per
   proxied request: timestamp, token id, token label, surface, provider, model,
   HTTP status, selected account, byte counts. Greppable with `jq`, shippable
   with any collector, rotatable with `logrotate`.

Steps: add an `audit` module with a buffered append-only writer; call it from
the same place metrics are recorded so the two can never disagree; make the path
configurable and the feature off by default (writing an audit trail to disk
must be an explicit operator decision).

## Plan 3 — Per-token monitoring (R3)

Options:

1. **Per-token Prometheus labels only.** Risk: unbounded cardinality in theory.
2. **Aggregate-only, rely on the audit log for per-token analysis.** Loses the
   live dashboard the requirement implies.
3. **Both, with per-token labels behind a flag. Chosen.** `/v1/usage` gains a
   `token_calls` breakdown and `/metrics` gains
   `link_assistant_token_requests_total{token="…",label="…"}`.

Steps: extend `Metrics` with a `token_calls` map keyed by token id + label,
thread the validated token identity from the handlers into `record_request`,
and render the new series.

## Plan 4 — Security and isolation (R4)

Already provided by TTL, revocation, `max_requests`, and the `account` pin. The
plan is to *verify* each property with a test and document the recommended
per-task settings. No new mechanism.

## Plan 5 — Claude MAX inside Codex (R5)

Already supported: Codex requires `wire_api = "responses"`, and `/v1/responses`
translates Responses→Anthropic and Anthropic SSE→Responses SSE. The plan is to
document the exact `config.toml` block and verify it end-to-end against the
real Claude MAX credentials in Docker.

## Plan 6 — ChatGPT Pro inside Claude Code (R6) — the core implementation

Claude Code speaks only Anthropic Messages; the Anthropic surface only ever
talked to the Anthropic upstream. Options for closing the gap:

1. **Teach `proxy_handler` to branch per provider inline.** Rejected:
   `src/proxy.rs` is already 997 of the 1000 allowed lines, and inline branching
   would interleave two protocol families in one function.
2. **Write a second, parallel forwarder per provider that accepts Anthropic
   bodies.** Rejected: duplicates credential resolution, refresh, account
   selection, cooldowns, and budget enforcement — five places to drift.
3. **Adapter around the existing forwarders. Chosen.** A new module that:
   - converts an Anthropic Messages request body into the OpenAI Chat
     Completions / Responses body the target provider expects;
   - delegates to the existing per-provider forwarder, unchanged;
   - converts the returned response back — JSON to an Anthropic `message`
     object, SSE to the Anthropic event vocabulary (`message_start`,
     `content_block_start`, `content_block_delta`, `content_block_stop`,
     `message_delta`, `message_stop`).

   New files keep `src/proxy.rs` under the size limit and keep the adapter
   independently testable.

Steps: implement request translation, response translation, and an incremental
SSE translator; dispatch on the configured provider at the top of the Anthropic
surface; keep the Anthropic-upstream path byte-for-byte unchanged when the
provider is `anthropic` (so no existing behaviour regresses); add a local
`count_tokens` estimate for non-Anthropic upstreams, which have no equivalent
endpoint.

## Plan 7 — Every other agentic CLI (R7)

Most remaining CLIs speak a dialect the router already serves once Plan 6
lands. Cursor is the exception: `CURSOR_API_ENDPOINT` can redirect it, but a
future integration requires a scoped Connect-RPC adapter for the minimum
`agent.v1`/`aiserver.v1` session surface. Until then, keep an accurate explicit
non-support note rather than describing the missing adapter as MCP.

## Plan 8 — Documentation split (R9)

`docs/use-cases/README.md` index plus one file per scenario. Each file is
self-contained: prerequisites, configuration, verification command, expected
output, and troubleshooting. `README.md` links the index rather than absorbing
the content, so the top-level README stays a reference and the use-case files
stay task-oriented.

## Plan 9 — Local verification (R10, R11)

1. Copy `~/.claude` to a temporary directory; never mount the original writable.
2. Run the router in Docker against that copy and drive it with the real
   Anthropic surface and the Responses surface — this covers R5 with real
   credentials.
3. For providers without local credentials, run an in-test upstream server that
   replays recorded vendor responses, covering the Plan 6 translation paths
   deterministically.
4. Redact tokens and credentials from every captured artefact before committing.
5. Convert each behaviour observed during the runs into a unit or integration
   test.

## Risk register

| Risk | Mitigation |
| --- | --- |
| Regression on the existing Anthropic path | Provider dispatch defaults to the current code path; existing tests must pass unchanged |
| Tool-call fidelity across dialects | Translate text and tool calls explicitly; drop unmappable vendor blocks rather than fabricating equivalents; document the limitation |
| Token label cardinality in `/metrics` | Per-token series behind a configuration flag, off by default |
| Credential leakage in committed evidence | Redaction step before commit; only a copy of `~/.claude` is ever used |
| File-size CI check (1000 lines) | New functionality goes into new modules |
