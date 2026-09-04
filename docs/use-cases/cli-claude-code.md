# CLI: Claude Code through the router

**Dialect:** Anthropic Messages only. **Router endpoint:**
`/api/services/anthropic/v1/messages`.

## One-line temporary launch

```bash
router with claude "hi"
```

The wrapper points a disposable `CLAUDE_CONFIG_DIR` at the router and supplies
`ANTHROPIC_BASE_URL` plus `ANTHROPIC_AUTH_TOKEN`; the normal Claude settings are
not changed. It also enables gateway discovery; Claude Code >= 2.1.255 is
required. See [with-router.md](with-router.md) for server and token options.

Wrapper flags may appear before or after `claude`; an explicit `--`
forwards every later token verbatim. See
[with-router.md](with-router.md#arguments-interaction-and-models).

## Manual or permanent configuration

Automatic setup (merges the router URL and backs up an existing settings file):

```bash
router configure claude
# Run the `source …/claude.env` command printed above.
```

`configure` acts on the router this machine is pointed at and stores the
credential it minted there. `clients setup claude` configures the deployment
this CLI itself runs, and refuses when another router is selected.

See [configure-clients.md](configure-clients.md) for show, remove, and doctor.
Without the router binary, export the variables directly using the remote
router URL and task token.

Claude Code's [settings reference](https://code.claude.com/docs/en/settings)
documents the two variables that matter:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8080/api/services/anthropic
export ANTHROPIC_AUTH_TOKEN=la_sk_...      # your task token
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
claude
```

`ANTHROPIC_API_KEY=la_sk_...` works as well; the router accepts the token from
`Authorization: Bearer`, `x-api-key`, or the legacy `la_sk_` prefixed forms.

Pre-1.0.0 prefixes are not accepted. See the
[canonical-route migration](../migrations/1.0.0-canonical-routes.md).

## What the router changes

The client sends its `la_sk_…` token plus its native protocol headers. Per
request, the router:

- replaces only that Router credential with the real upstream credential
  (Claude OAuth, or an explicitly permitted provider's credential),
- removes ingress forwarding and client-IP metadata, and
- preserves other native client headers exactly as sent.

It does not synthesize a missing `anthropic-version` or `anthropic-beta`
header. A request missing evidence required by the supported Claude client
contract is rejected before upstream.

## Which subscription answers

| `UPSTREAM_PROVIDER` | Behaviour |
| --- | --- |
| `auto` (default) | routes the requested advertised model to its healthy owning subscription |
| `anthropic` | native pass-through to `api.anthropic.com` with the Claude MAX OAuth token |
| `codex` | denied by default; exact `claude:codex` risk acceptance required — see [chatgpt-in-claude-code.md](chatgpt-in-claude-code.md) |
| `qwen`, `gemini` | consumer subscription denied pending recorded terms |
| `openai-compatible` | ordinary API-key provider; bridged by its configured terms |
| `z.ai-coding-plan` | experimental, subscriber-bound aliases — see [zai-coding-plan.md](zai-coding-plan.md) |
| `gonka`, `crater` | unchanged prior behaviour on this surface |

The signed managed-client binding and exact model identity are checked again
immediately before upstream; a stale/cached picker entry cannot select another
provider.

## Per-task usage

Because the credential is a single environment variable, one token per task is
just one export per task:

```bash
ANTHROPIC_BASE_URL=http://127.0.0.1:8080/api/services/anthropic ANTHROPIC_AUTH_TOKEN="$TOKEN_A" claude -p "task A"
ANTHROPIC_BASE_URL=http://127.0.0.1:8080/api/services/anthropic ANTHROPIC_AUTH_TOKEN="$TOKEN_B" claude -p "task B"
```

See [per-task-tokens.md](per-task-tokens.md).

## Smoke test

```bash
curl -s http://127.0.0.1:8080/api/services/anthropic/v1/messages \
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
| GLM model missing after a policy/credential change | restart Claude Code to refresh `~/.claude/cache/gateway-models.json`; cached ghosts are still rejected locally |
| Another tool's endpoint, credential, discovery flag, or model pin wins | run `router clients repair claude --dry-run --json`, then explicitly repair; Router backs up the public settings but never edits Claude credentials, account data, shell startup files, or model caches |
