# Configure local agentic CLIs

For one run, use the temporary launcher. It is the default path and does not
modify normal client configuration:

```bash
router with codex "hi"
with-router claude "hi"
```

See [with-router.md](with-router.md) for the integration registry, server
selection, token mint/revoke behavior, Docker lifecycle, and argument boundary.

## Permanent setup

`router configure <client>` points a client at the router permanently. It acts
on the router this machine is pointed at — the same targeting rule every
state-touching command follows — mints a credential from that router and stores
it outside the client's configuration at mode 0600, so the client works when
the command returns:

```bash
router configure claude
router configure --all               # every client this machine has
router configure --undo claude       # hash-verified restore
router configure claude --server https://router.example  # a named deployment
router configure claude --local      # the router running here
```

`--undo` restores the client's own file byte for byte and revokes the token it
minted, when a credential able to revoke is to hand; when one is not, it names
the token and the router so the revocation can be finished by hand. A file
edited after `configure` is preserved rather than overwritten, and the command
says so instead of restoring.

`with --global <client>` is the same command under an older name and keeps
working. `router configure --all` skips clients whose vendor gates prevent
file-based configuration — `cursor-agent` and `gemini` — and names them in the
summary rather than failing the run.

The older `clients` command configures **this** deployment, because it mints
from this machine's own token store. With another router selected it refuses
and names `router configure`, rather than writing this CLI's `--host`/`--port`
default into a client pointed somewhere else:

```bash
router clients list
router clients setup codex
router clients setup opencode --token la_sk_...
router clients setup qwen
router clients setup agent
router clients show codex
router clients doctor codex
router clients repair codex --dry-run --json
router clients repair codex
router clients repair --all --dry-run
router clients remove codex
```

Deployments may keep management completely off the public listener. Persist
both canonical origins once and then use the ordinary commands:

```bash
printf '%s\n' "$ROUTER_ADMIN_TOKEN" | router server use \
  https://router.example \
  --management-server https://router-admin.example \
  --token-stdin
router configure codex
router clients repair codex
```

For one setup without changing the saved selection:

```bash
printf '%s\n' "$ROUTER_ADMIN_TOKEN" | router clients setup opencode \
  --server https://router.example \
  --management-server https://router-admin.example \
  --token-stdin
```

Only the public inference origin is written into client configuration. Token
inspection, minting, and revocation use only the management origin; health and
model catalogs use only inference. Setup/configure writes are transactional,
and any newly minted candidate is revoked if validation or a local write
fails.

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

OpenCode, Qwen Code, and Agent setup authenticate to their canonical
`/api/services/*/models` catalog and configure models that the router currently advertises. Setup fails before changing the
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

`list`, `show`, and `doctor` report `unconfigured`, `foreign`,
`managed-intact`, `managed-drifted`, or `ambiguous` ownership. `configured:
true` means the effective route is the one described by Router's managed
metadata, not merely that some base URL exists. Reports contain safe endpoint
origins and conflicting key names, never credential values.

`clients repair` is the explicit recovery path after another tool rewrites a
routing-critical setting. Dry-run performs the identical precedence analysis
without filesystem writes, Router calls, token changes, or inference. A real
repair validates a catalog first, snapshots exact allowed files under
`$XDG_CONFIG_HOME/link-assistant-router/repairs/<id>/`, writes configuration,
environment and metadata transactionally, then validates the public catalog
again. A second repair of an intact client is a no-op. Roll back with
`clients repair <client> --rollback <id>`; later user edits are never erased.

See [the 1.0.0 migration guide](../migrations/1.0.0-canonical-routes.md) for the
complete old-to-new HTTP route table.

Grok's current settings schema can persist `apiKey`, but it reads the API base
URL only from `GROK_BASE_URL`. To avoid writing an ignored setting,
`clients setup grok` puts both required exports in the protected environment
file and leaves `user-settings.json` untouched.

`configure cursor-agent` and `configure gemini` — like the `clients setup`
spellings — return the verified
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

`show` reports the path, safe URL, dialect, installed/configured and ownership
state, conflicts, and whether the expected token variable is set, but never
prints its value. `doctor` sends one minimal request using a compatible model
from the current authenticated catalog rather than a source-code model name,
and distinguishes missing
configuration, missing token environment, an unreachable router, rejected
tokens, unavailable upstream credentials, and other HTTP failures.

The command lists all eight clients so unsupported vendor behavior is visible
instead of silently omitted.
