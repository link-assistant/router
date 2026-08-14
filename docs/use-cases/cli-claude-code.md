# CLI: Claude Code through the router

**Dialect:** Anthropic Messages only. **Router endpoint:** `/v1/messages`.

## One-line temporary launch

```bash
link-assistant-router with claude-code "hi"
```

The wrapper points a disposable `CLAUDE_CONFIG_DIR` at the router and supplies
`ANTHROPIC_BASE_URL` plus `ANTHROPIC_AUTH_TOKEN`; the normal Claude settings are
not changed. See [with-router.md](with-router.md) for server and token options.

Wrapper flags may appear before or after `claude-code`; an explicit `--`
forwards every later token verbatim. See
[with-router.md](with-router.md#arguments-interaction-and-models).

## Manual or permanent configuration

Automatic setup (merges the router URL and backs up an existing settings file):

```bash
link-assistant-router clients setup claude-code
# Run the `source …/claude-code.env` command printed by setup.
```

See [configure-clients.md](configure-clients.md) for show, remove, and doctor.
Without the router binary, export the variables directly using the remote
router URL and task token.

Claude Code's [settings reference](https://code.claude.com/docs/en/settings)
documents the two variables that matter:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8080
export ANTHROPIC_AUTH_TOKEN=la_sk_...      # your task token
claude
```

`ANTHROPIC_API_KEY=la_sk_...` works as well; the router accepts the token from
`Authorization: Bearer`, `x-api-key`, or the legacy `la_sk_` prefixed forms.

The legacy prefix `http://127.0.0.1:8080/api/latest/anthropic` is also accepted
and stripped, for configurations written against older versions.

## What the router supplies

The client sends only its `la_sk_…` token. The router adds, per request:

- the real upstream credential (Claude MAX OAuth, or the bridged provider's),
- `anthropic-version: 2023-06-01` when the client omitted it,
- `anthropic-beta: oauth-2025-04-20`, merged with any betas the client already
  sent.

## Which subscription answers

| `UPSTREAM_PROVIDER` | Behaviour |
| --- | --- |
| `auto` (default) | routes the requested advertised model to its healthy owning subscription |
| `anthropic` | native pass-through to `api.anthropic.com` with the Claude MAX OAuth token |
| `codex`, `qwen`, `gemini`, `openai-compatible` | bridged — see [chatgpt-in-claude-code.md](chatgpt-in-claude-code.md) |
| `gonka`, `crater` | unchanged prior behaviour on this surface |

So the same Claude Code configuration works against any of them; only the
router's `UPSTREAM_PROVIDER` changes.

## Per-task usage

Because the credential is a single environment variable, one token per task is
just one export per task:

```bash
ANTHROPIC_BASE_URL=http://127.0.0.1:8080 ANTHROPIC_AUTH_TOKEN="$TOKEN_A" claude -p "task A"
ANTHROPIC_BASE_URL=http://127.0.0.1:8080 ANTHROPIC_AUTH_TOKEN="$TOKEN_B" claude -p "task B"
```

See [per-task-tokens.md](per-task-tokens.md).

## Smoke test

```bash
curl -s http://127.0.0.1:8080/v1/messages \
  -H "Authorization: Bearer $ANTHROPIC_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":32,
       "messages":[{"role":"user","content":"ping"}]}' | jq -r '.content[0].text'
```

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `401 authentication_error` | token expired, revoked, or `TOKEN_SECRET` changed since it was issued |
| `429 rate_limit_error` with "reached its request limit" | the token's `--max-requests` budget is spent — issue a new one |
| `429 rate_limit_error` whose message is just `"Error"` | the upstream rejected the request because the Claude Code identity system block was missing — the router adds it for OAuth credentials, so this indicates an API-key upstream ([details](claude-max-in-codex.md#the-claude-code-identity-block)) |
| `503` naming an account | the pinned account is in a `Retry-After` cooldown |
| Extended thinking missing | you are on a bridged upstream; `thinking` blocks are dropped (see the bridge document) |
