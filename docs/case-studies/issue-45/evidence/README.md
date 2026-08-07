# Live evidence — issue #45

Produced by `experiments/issue-45/test-docker-claude-max.sh` on 2026-08-07 against
the **live** Anthropic upstream, from a router built by the repository
`Dockerfile` and running in a container. The container was given a **copy** of
`~/.claude/.credentials.json`, mounted **read-only** at `/data/claude`; the
original session was never mounted and never written to (both facts are
asserted by the harness).

All files are passed through a redaction filter before they are written, so no
token or credential appears here.

| File | What it shows |
| --- | --- |
| `docker-v1-messages.json` | `POST /v1/messages` answered by the live Claude MAX subscription — the Claude Code / Anthropic-dialect use case |
| `docker-v1-responses.json` | `POST /v1/responses` (Codex dialect) answered by the same subscription — the "Claude MAX inside Codex" use case |
| `docker-v1-messages-stream.sse` | the documented Anthropic SSE vocabulary (`message_start` … `message_stop`) from the live upstream |
| `docker-v1-responses-stream.sse` | the documented Responses SSE vocabulary (`response.created` … `response.completed`) for the Codex dialect |
| `docker-audit.jsonl` | the per-task audit trail for both requests: token id, label, provider, surface, path, model — and no token string |
| `docker-metrics.txt` | `/metrics` after the run, including the per-token counter carrying the task label |
| `docker-router-startup.txt` | container startup showing `Subscription home (claude): /data/claude` |
| `identity-prompt-429.md` | root-cause note for the misleading `429` this run first hit |

Harness result: **18 passed, 0 failed**.

The bridge in the other direction (Anthropic dialect served by an
OpenAI-compatible upstream) is covered by
`experiments/issue-45/test-bridge-openai-compatible.sh`, which needs no
subscription at all: **26 passed, 0 failed**.
