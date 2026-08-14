# Configure local agentic CLIs

For one run, use the temporary launcher. It is the default path and does not
modify normal client configuration:

```bash
link-assistant-router with codex "hi"
with-router claude-code "hi"
```

See [with-router.md](with-router.md) for the integration registry, server
selection, token mint/revoke behavior, Docker lifecycle, and argument boundary.

The older `clients` command and `with --global` are permanent, opt-in paths.
They configure every local client that exposes a supported router URL without
replacing unrelated user settings:

```bash
link-assistant-router clients list
link-assistant-router clients setup codex
link-assistant-router clients setup opencode --token la_sk_...
link-assistant-router clients setup qwen-code
link-assistant-router clients setup agent
link-assistant-router clients show codex
link-assistant-router clients doctor codex
link-assistant-router clients remove codex
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
| Grok CLI | `~/.grok/user-settings.json` is inspected but not changed | `GROK_BASE_URL` (shell only) | `GROK_API_KEY` | Yes, via environment only |
| Gemini CLI | no file is changed | `GOOGLE_GEMINI_BASE_URL` on the API-key auth path | `GEMINI_API_KEY` | Conditional; the tested individual Code Assist flow aborts with `IneligibleTierError` before HTTP |
| Cursor CLI | `~/.cursor/cli-config.json` has no provider field | none | vendor `--api-key` only | No; it rejects non-Cursor keys before HTTP |

Before changing an existing config, the command creates a sibling timestamped
`*.link-assistant-router.*.bak` file. JSON objects, TOML tables, comments and
unknown settings are preserved. Running `setup` again updates the same entry;
it never creates a duplicate.

Grok's current settings schema can persist `apiKey`, but it reads the API base
URL only from `GROK_BASE_URL`. To avoid writing an ignored setting,
`clients setup grok-cli` puts both required exports in the protected environment
file and leaves `user-settings.json` untouched.

`clients setup cursor` and `clients setup gemini-cli` return the verified
client-side limitation before minting a token or writing a file. Their matching
`doctor` commands report the same reason directly; they do not misdiagnose a
request that never reached the router.

`remove` deletes only the provider and selection owned by the router for Codex.
For Claude Code it removes `ANTHROPIC_BASE_URL` only when it still matches the
value recorded by `setup`; if the user changed that setting later, it is left
alone. OpenCode and Agent restore any provider entry that setup replaced. Qwen
removes only its exact managed model entry. Other environment keys, providers,
models, and settings remain untouched.

`show` reports the path, URL, dialect, installed/configured state, and whether
the expected token variable is set, but never prints its value. `doctor` sends
one catalog-selected minimal request to the configured endpoint and distinguishes missing
configuration, missing token environment, an unreachable router, rejected
tokens, unavailable upstream credentials, and other HTTP failures.

The command lists all eight clients so unsupported vendor behavior is visible
instead of silently omitted.
