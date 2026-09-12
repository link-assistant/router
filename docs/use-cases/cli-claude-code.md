# CLI: Claude Code through the router

**Dialect:** Anthropic Messages only. **Router endpoint:**
`/api/services/anthropic/v1/messages`.

## One-line temporary launch

```bash
router with claude "hi"
```

The wrapper supplies `ANTHROPIC_BASE_URL` plus `ANTHROPIC_AUTH_TOKEN` and points
`CLAUDE_CONFIG_DIR` at a persistent owner-only Router profile. Router creates
only the directory; Claude owns everything inside it, so onboarding happens
once and Router sessions stay resumable without importing the normal Claude
settings, credentials, MCP servers, permissions, theme, account data, or model
cache. Add `--extend-global-config` before `claude` to use the normal profile
explicitly, or `--isolated-config` for a disposable clean-room profile.

Reset only the Router profile before launching Claude with:

```bash
router with claude --reset-to-default-configuration
# Non-interactive confirmation:
router with --yes claude --reset-to-default-configuration
```

Reset retains a recoverable owner-only backup, rolls back setup/spawn failures,
and refuses while another Router-launched Claude uses the profile.

The same process-local `--settings` carries `verbose: true`, so a completed
thinking trace stays on screen instead of collapsing to `Thought for Ns`. The
Router-owned profile starts empty and copies nothing from your normal Claude
profile, so without this a bare launch lost a presentation you would otherwise
have. It is a presentation default only: a response that returns no thinking
still shows none, no provider-side thinking mode is enabled, and blocks,
deltas, signatures and model IDs are unchanged. Router's `--settings` is
applied before your own arguments, so a forwarded `--settings` or Claude flag
still wins.

Gateway discovery supplies native Claude IDs. A process-local `--settings`
extension adds every other compatible, authorized exact ID to Claude's
`modelPicker` once, including GLM IDs, without aliases or cache writes. Claude
Code 2.1.255 through 2.1.265 is the reviewed range. Newer releases fail closed
until the pinned hermetic real-client capture reviews their gateway and
authentication behavior. See [with-router.md](with-router.md) for server and
token options.

## Privacy defaults and feature-gated tools

`router with claude` applies three child-process defaults without changing
Claude settings or the invoking shell:

```text
DISABLE_ERROR_REPORTING=1
DISABLE_AUTOUPDATER=1
DISABLE_FEEDBACK_COMMAND=1
```

An explicit ambient value remains unchanged, including a value that enables a
facility. Router does not set or clear `DISABLE_TELEMETRY`,
`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, or `DO_NOT_TRACK`. Claude Code
2.1.265 disables remote feature evaluation when either of the first two is
non-empty or `DO_NOT_TRACK` is truthy, so a gated built-in tool such as
`Monitor` can disappear. Router preserves that user-owned privacy choice and
names every active variable before launching Claude.

There is no supported Claude Code 2.1.265 environment combination that both
disables usage telemetry and guarantees freshly evaluated remote feature flags.
The commonly suggested four-variable combination includes
`DISABLE_TELEMETRY=1`, so it does not provide both properties. This limitation
must be re-evaluated when Claude exposes separate controls or makes `Monitor`
independent of remote feature evaluation.

## Claude.ai native-service boundary

The released Claude client resolves one authentication source for the process.
`ANTHROPIC_AUTH_TOKEN` and a custom `ANTHROPIC_BASE_URL` correctly send sampling
and `/v1/models` discovery to Router, but they take precedence over the stored
Claude.ai login. Claude Code offers no documented way to retain that independent
identity for its first-party control-plane services.

Router handles this explicitly:

- it leaves the stored Claude login byte-for-byte untouched and never sends it
  to Router or another provider;
- it sends the per-run Router token only to Router sampling and catalog routes;
- it names the unavailable services during setup, repair, and status checks: Claude.ai MCP
  connectors, Remote Control and `/remote-control`, `/schedule`, notification
  preferences, cloud sessions, remote managed settings, and organization
  policy; and
- it rejects `--cloud`, `--environment`, `--remote-control`/`--rc`,
  `--teleport`, `remote-control`, and `ultrareview` before contacting a Router,
  minting a token, or launching Claude. Run those directly with Claude.ai
  authentication.

Router does not use `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL`, replace OAuth
endpoints, or intercept TLS. When an official split-auth mechanism ships, the
pinned client fixture must demonstrate separate authorities before Router
adopts it.

Wrapper flags go before `claude`; arguments after it are forwarded verbatim.
The exact reset spelling above is the sole Router operation recognized there;
an explicit `--` forwards even that token. See
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
  -H "anthropic-version: 2023-06-01" \
  -H "User-Agent: claude-cli/2.1.265" \
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
| `Monitor` or another feature-gated tool is missing | `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, or `DO_NOT_TRACK` may be inherited; Router preserves the value and names it before launch because Claude Code currently couples telemetry privacy to feature evaluation |
| GLM model missing after a policy/credential change | restart Claude Code to refresh `~/.claude/cache/gateway-models.json`; cached ghosts are still rejected locally |
| Another tool's endpoint, credential, discovery flag, or model pin wins | run `router clients repair claude --dry-run --json`, then explicitly repair; Router backs up the public settings but never edits Claude credentials, account data, shell startup files, or model caches |
| Claude.ai connector, Remote Control, cloud-session, schedule, notification, or organization-policy feature is unavailable | current Claude Code has no supported split-auth mechanism; run that operation directly with Claude.ai authentication |
