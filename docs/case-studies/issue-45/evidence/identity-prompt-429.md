# Root cause: Claude MAX OAuth rejects requests without the Claude Code identity

The first live run of `experiments/issue-45/test-docker-claude-max.sh`
(2026-08-07, router v0.22.0) failed both subscription use cases with:

```json
{"type":"error","error":{"type":"rate_limit_error","message":"Error"},
 "request_id":"req_011CdoQZNbh5QFPh5MaE3iu4"}
```

The `request_id` proves the request reached `api.anthropic.com` — so the
credential resolution, the OAuth headers and the container mount were all fine.
The error is nonetheless *not* a rate limit.

## Isolation

Two direct requests to `api.anthropic.com` with the **same** OAuth access token,
differing only in the `system` field:

| Request | Result |
| --- | --- |
| with `"system": "You are Claude Code, Anthropic's official CLI for Claude."` | `200`, `content[0].text == "ROUTER_OK"` |
| identical request with `system` omitted | `429`, `rate_limit_error`, `message: "Error"` |

Same account (`subscriptionType: max`, `rateLimitTier: default_claude_max_20x`),
same model, seconds apart. The system block is the only variable.

## Consequence for issue #45

Claude Code always sends that line, so pass-through traffic *from Claude Code*
worked by accident. Every other documented client — Codex over `/v1/responses`,
an Anthropic SDK, a `curl` smoke test — does not send it, so the
"Claude MAX subscription inside Codex" use case was broken, and the failure mode
(`429 rate_limit_error`) pointed users at the wrong diagnosis entirely.

## Fix

`src/claude_identity.rs` prepends the identity block when, and only when, the
resolved upstream credential is a subscription OAuth token (`sk-ant-oat…`), on
both the `/v1/responses` translation path and the pass-through `/v1/messages`
path. It is idempotent (Claude Code's own bodies are byte-identical afterwards),
it preserves the caller's own system prompt directly after the identity block,
and it never touches API-key (`sk-ant-api…`) traffic.

Re-running the same harness after the fix: **18 passed, 0 failed**, with
`ROUTER_OK` and `CODEX_OK` coming back from the live model — see the other files
in this directory.
