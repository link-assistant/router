# Docker end-to-end evidence (issue 35)

Built `link-assistant/router:issue-35` from the repo `Dockerfile` and ran it with
a **copy** of the real Claude MAX credentials mounted read-only at
`/data/claude` (the Dockerfile default `CLAUDE_CODE_HOME`). The original
`~/.claude/.credentials.json` was never modified or deleted.

Results:

| Check | Result |
| --- | --- |
| Container reads nested `claudeAiOauth` creds, starts, `/health` | `ok` |
| Issue token with `max_requests` via `POST /api/tokens` | response echoes `"max_requests": 1` |
| `count_tokens` with ONLY a `la_sk_` token (no version/beta headers) | HTTP 200 `{"input_tokens":13}` — transparent passthrough + header injection |
| Capped token after its budget | HTTP 429 `Token has reached its request limit` |
| Missing token | HTTP 401 |
| Invalid token | HTTP 401 |
| Real OAuth token in container logs | 0 occurrences |

- `build.log` — Docker image build output.
- `container-startup.log` — redacted container startup log.
- `count_tokens-200.json` — clean HTTP 200 body proving authenticated upstream passthrough.
