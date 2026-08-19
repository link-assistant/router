# Configure local agentic CLIs

For one run, use the temporary launcher. It is the default path and does not
modify normal client configuration:

```bash
router with codex "hi"
with-router claude "hi"
```

See [with-router.md](with-router.md) for the integration registry, server
selection, token mint/revoke behavior, Docker lifecycle, and argument boundary.

The older `clients` command and `with --global` are permanent, opt-in paths.
They configure every local client that exposes a supported router URL without
replacing unrelated user settings:

```bash
router clients list
router clients setup codex
router clients setup opencode --token la_sk_...
router clients setup qwen
router clients setup agent
router clients show codex
router clients doctor codex
router clients remove codex
```

`remove` revokes the token before it deletes the local credential file, so a
copy of that file stops working immediately. When setup minted the token, the
command prints `revoked managed token <ID>`. When revocation fails, nothing is
deleted, the command exits nonzero, and it prints how to recover; pass `--force`
to delete the local settings anyway and leave the token valid until it expires.
Tokens the operator supplied with `--token`, `--token-stdin`, or the environment
are left alone unless `--revoke-supplied` is given, because the same token is
often shared with other machines.

An existing router token can also be supplied without ever putting it in argv,
where shell history and process listings would expose it:

```bash
# Read one line from standard input.
pass show router/token | router clients setup codex --token-stdin

# Or export the documented variable (`LINK_ASSISTANT_TOKEN` is accepted too).
export LINK_ASSISTANT_ROUTER_TOKEN=la_sk_...
router clients setup codex
```

The precedence is `--token`, then `--token-stdin`, then
`LINK_ASSISTANT_ROUTER_TOKEN`, then `LINK_ASSISTANT_TOKEN`. `--token` and
`--token-stdin` are mutually exclusive. A supplied value that is not a router
token is rejected before any file is written, and the rejection names the
inputs that were checked without echoing the value. Every diagnostic this
command prints, including router error bodies and transport errors, is passed
through the same redaction used by the login surface, so a token cannot leak
into logs through an error message.

`--home DIR`, placed before the subcommand, treats `DIR` as the home for every
client configuration root and ignores the clients' own override variables and
any token variable exported in the calling shell. Automation can therefore prove
setup → doctor → launch → remove without touching real user settings:

```bash
router clients --home /tmp/router-check setup codex --token-stdin
router clients --home /tmp/router-check show codex
router clients --home /tmp/router-check doctor codex
router clients --home /tmp/router-check remove codex
```

`setup` mints a 24-hour router token unless `--token` supplies one. The token is
never printed or written to the client configuration. Instead, setup writes the
required exports to a mode-`0600` file below
`$XDG_CONFIG_HOME/link-assistant-router/clients/` and prints the `source`
command to run in every shell that launches the client. Use
`--ttl-hours` to change the minted token lifetime and `--base-url` when the
router is not reachable at the local CLI host and port.

OpenCode, Qwen Code, and Agent setup authenticate to `/v1/models` and configure
models that the router currently advertises. Setup fails before changing the
client config if the router is unreachable or has no healthy model. Re-running
setup refreshes catalog models while preserving user-added OpenCode entries.

| Client | File used | Base-URL setting | Token input | Arbitrary router URL? |
| --- | --- | --- | --- | --- |
| Codex CLI | `$CODEX_HOME/config.toml`, or `~/.codex/config.toml` | `model_providers.link-assistant.base_url` | `LINK_ASSISTANT_TOKEN` via `env_key` | Yes |
| Claude Code | `$CLAUDE_CONFIG_DIR/settings.json`, or `~/.claude/settings.json` | `env.ANTHROPIC_BASE_URL` | `ANTHROPIC_AUTH_TOKEN` | Yes |
| OpenCode | `$XDG_CONFIG_HOME/opencode/opencode.json`, or `~/.config/opencode/opencode.json` | `provider.link-assistant.options.baseURL` | `LINK_ASSISTANT_TOKEN` via `{env:…}` | Yes |
| Qwen Code | `$QWEN_HOME/settings.json`, or `~/.qwen/settings.json` | `modelProviders.openai[].baseUrl` | `LINK_ASSISTANT_TOKEN` via `envKey` | Yes |
| Link.Assistant Agent | `$XDG_CONFIG_HOME/link-assistant-agent/opencode.json`, or `~/.config/link-assistant-agent/opencode.json` | `provider.link-assistant.options.baseURL` | `LINK_ASSISTANT_TOKEN` via `{env:…}` | Yes |
| Grok CLI | managed mode-`0600` environment file | `GROK_BASE_URL` | `GROK_API_KEY` | Yes |
| Gemini CLI | no file is changed | `GOOGLE_GEMINI_BASE_URL` on the API-key auth path | `GEMINI_API_KEY` | Conditional; the tested individual Code Assist flow aborts with `IneligibleTierError` before HTTP |
| Cursor CLI | `$CURSOR_CONFIG_DIR` / `$CURSOR_DATA_DIR` can isolate it | `CURSOR_API_ENDPOINT` | vendor `--api-key` | Deferred: client speaks private Connect-RPC, not a supported chat dialect |

Before changing an existing config, the command creates a sibling timestamped
`*.link-assistant-router.*.bak` file. JSON objects, TOML tables, comments and
unknown settings are preserved. Running `setup` again updates the same entry;
it never creates a duplicate.

Grok's current settings schema can persist `apiKey`, but it reads the API base
URL only from `GROK_BASE_URL`. To avoid writing an ignored setting,
`clients setup grok` puts both required exports in the protected environment
file and leaves `user-settings.json` untouched.

`clients setup cursor-agent` and `clients setup gemini` return the verified
client-side limitation before minting a token or writing a file. Their matching
`doctor` commands report the same reason directly; they do not misdiagnose a
request that never reached the router.

`remove` also deletes the owner-only managed credential environment file, so a
successful removal does not leave a working router token on disk. It deletes
only the provider and selection owned by the router for Codex.
For Claude Code it removes `ANTHROPIC_BASE_URL` only when it still matches the
value recorded by `setup`; if the user changed that setting later, it is left
alone. OpenCode and Agent restore any provider entry that setup replaced. Qwen
removes its exact set of managed catalog model entries. Other environment keys, providers,
models, and settings remain untouched.

`show` reports the path, URL, dialect, installed/configured state, and whether
the expected token variable is set, but never prints its value. `doctor` sends
one minimal request using the explicit family default (`gpt-5.6-sol`/`xhigh`
or `claude-opus-5`/`high`) rather than depending on catalog order, and distinguishes missing
configuration, missing token environment, an unreachable router, rejected
tokens, unavailable upstream credentials, and other HTTP failures.

The command lists all eight clients so unsupported vendor behavior is visible
instead of silently omitted.
