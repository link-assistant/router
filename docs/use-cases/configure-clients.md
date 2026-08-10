# Configure local agentic CLIs

The `clients` command configures the first two supported local clients without
replacing unrelated user settings:

```bash
link-assistant-router clients list
link-assistant-router clients setup codex
link-assistant-router clients setup claude-code --token la_sk_...
link-assistant-router clients show codex
link-assistant-router clients doctor codex
link-assistant-router clients remove codex
```

`setup` mints a 24-hour router token unless `--token` supplies one. The token is
shown once as a shell `export` command and is **not written to either client
configuration**. Export it in every shell that launches the client. Use
`--ttl-hours` to change the minted token lifetime and `--base-url` when the
router is not reachable at the local CLI host and port.

| Client | File changed | Router-owned setting | Token variable | Dialect |
| --- | --- | --- | --- | --- |
| Codex CLI | `$CODEX_HOME/config.toml`, or `~/.codex/config.toml` | `model_provider = "link-assistant"` and `[model_providers.link-assistant]` | `LINK_ASSISTANT_TOKEN` via `env_key` | Responses |
| Claude Code | `$CLAUDE_CONFIG_DIR/settings.json`, or `~/.claude/settings.json` | `env.ANTHROPIC_BASE_URL` | `ANTHROPIC_AUTH_TOKEN` in the launching shell | Anthropic Messages |

Before changing an existing config, the command creates a sibling timestamped
`*.link-assistant-router.*.bak` file. JSON objects, TOML tables, comments and
unknown settings are preserved. Running `setup` again updates the same entry;
it never creates a duplicate.

`remove` deletes only the provider and selection owned by the router for Codex.
For Claude Code it removes `ANTHROPIC_BASE_URL` only when it still matches the
value recorded by `setup`; if the user changed that setting later, it is left
alone. Other environment keys and settings remain untouched.

`show` reports the path, URL, dialect, installed/configured state, and whether
the expected token variable is set, but never prints its value. `doctor` sends
one minimal request to the configured endpoint and distinguishes missing
configuration, missing token environment, an unreachable router, rejected
tokens, unavailable upstream credentials, and other HTTP failures.

The current milestone supports `codex` and `claude-code`. The other clients in
this directory remain documented for manual setup and can be added to the same
command structure later.
