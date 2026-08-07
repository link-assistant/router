# Issue 45 requirement trace

Requirements are extracted verbatim from the issue body and split where one
sentence carries more than one obligation.

| ID | Requirement (source text) | Solution | Verification |
| --- | --- | --- | --- |
| R1 | "Each task separate token (we can use universal tokens issuing, but user should be able to use each token in such way)" | Existing `POST /api/tokens` issues an independent `la_sk_…` token per task with its own label, TTL, optional account pin, and optional `max_requests` budget | token issue/validate/revoke unit tests; `docs/use-cases/per-task-tokens.md` |
| R2 | "…for audit" | Append-only JSONL audit log records one line per proxied request: timestamp, token id, label, surface, provider, model, status, account | audit-log unit tests |
| R3 | "…for monitoring" | Per-token counters in `/metrics` (`link_assistant_token_requests_total{token,label}`) and a per-token breakdown in `/v1/usage` | metrics render tests |
| R4 | "…for security/isolation" | Per-token TTL, revocation, request budget, and account pinning; tokens never expose vendor credentials to the client | token budget/revocation tests |
| R5 | "Claude Max subscription usage inside Codex" | `/v1/responses` (+ `/api/codex/v1/responses`) translates the Responses API to Anthropic Messages, which is the wire API Codex requires | Responses translation tests; `docs/use-cases/claude-max-in-codex.md` |
| R6 | "ChatGPT Pro usage inside Claude Code" | New Anthropic→OpenAI request/response/SSE translation lets `/v1/messages` be served by the Codex upstream | cross-dialect unit + integration tests; `docs/use-cases/chatgpt-in-claude-code.md` |
| R7 | "and so on (in any agentic CLI, like qwen, gemini, opencode, grok build, cursor CLI and so on) for compatibility reasons" | The same adapter covers every configured upstream provider, and the OpenAI-compatible surface already covers CLIs that accept a custom base URL | per-CLI use-case documents under `docs/use-cases/` |
| R8 | "general purpose of the system is usage as an internal component of personal or corporate infrastructure, for testing, experimenting and general coding tasks" | Deployment shapes (local process, Docker, corporate host) documented and kept dependency-free: local JSON storage, no external database required; the admin surface's exposure is stated explicitly | `docs/use-cases/self-hosting.md`; `experiments/issue-45/test-deployment-hardening.sh` (16 passed) |
| R9 | "each possible use case is carefully documented, we use separate documentation files for each of them (so user is not distracted)" | `docs/use-cases/` with one file per scenario plus an index, linked from `README.md` | files present and linked |
| R10 | "everything that documented must be tested locally … test copy of these folders in docker container" | Docker-based end-to-end run against a temporary copy of the real `~/.claude` credentials, plus mock-upstream runs for vendors without local credentials | evidence captured under `docs/case-studies/issue-45/` and scripts in `experiments/issue-45/` |
| R11 | "Based on testing locally you can increase unit tests coverage" | New unit/integration tests derived from what the local runs exercised | `cargo test` |
| R12 | "collect data related about the issue to this repository … compile that data to `./docs/case-studies/issue-{id}` folder" | `docs/case-studies/issue-45/` including `raw/` API captures | files present |
| R13 | "do deep case study analysis (also make sure to search online for additional facts and data)" | `README.md` root-cause analysis + `online-research.md` with sources | files present |
| R14 | "list of each and all requirements from the issue" | this document | — |
| R15 | "propose possible solutions and solution plans for each requirement" | `solution-plans.md` | — |
| R16 | "check known existing components/libraries, that solve similar problem or can help in solutions" | `components-survey.md` | — |
| R17 | "plan and execute everything in this single pull request" | PR #46 carries the case study, implementation, docs, tests, and changelog fragment | PR diff |

## Deliberate boundaries

- **No new persistence engine.** The audit log is an append-only JSONL file next
  to the existing token store. A corporate deployment that needs a database can
  ship the file with any log collector; adding a database would contradict R8.
- **No vendor credential is ever returned to a client.** Router tokens are the
  only thing a task holds; vendor OAuth material stays inside the process.
- **Cross-dialect tool calling is translated on a best-effort basis.** Text and
  tool-call content are mapped; vendor-specific reasoning/annotation blocks that
  have no Anthropic equivalent are dropped rather than guessed.
- **CLIs that cannot be pointed at a custom base URL are documented as such**
  instead of being claimed as supported.
