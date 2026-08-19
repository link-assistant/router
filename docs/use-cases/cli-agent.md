# CLI: Link.Assistant Agent through the router

**Dialect:** OpenAI Chat Completions through Agent's OpenCode-compatible
provider configuration. **Router endpoint:** `/v1/chat/completions`.

## One-line temporary launch

```bash
router with agent "ping"
```

The wrapper supplies disposable OpenCode-compatible config content and a
per-run `LINK_ASSISTANT_TOKEN`; the normal Agent configuration is untouched.
See [with-router.md](with-router.md).

Wrapper flags may appear before or after `agent`; an explicit `--` forwards
every later token verbatim. See
[with-router.md](with-router.md#arguments-interaction-and-models).

## Manual or permanent configuration

```bash
router clients setup agent
# Run the printed `source …/agent.env` command, then choose a configured model.
agent --model link-assistant/<model-from-v1-models> -p "ping"
```

Permanent setup merges a `link-assistant` provider into
`$XDG_CONFIG_HOME/link-assistant-agent/opencode.json` (normally
`~/.config/link-assistant-agent/opencode.json`). It preserves other providers
and settings, creates a timestamped backup, and refers to the token as
`{env:LINK_ASSISTANT_TOKEN}` rather than storing its value.

## Manual configuration

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "link-assistant": {
      "name": "Link.Assistant.Router",
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://127.0.0.1:8080/v1",
        "apiKey": "{env:LINK_ASSISTANT_TOKEN}"
      },
      "models": {
        "<model-from-v1-models>": {
          "name": "Router (<model-from-v1-models>)"
        }
      }
    }
  }
}
```

```bash
export LINK_ASSISTANT_TOKEN=la_sk_...
agent --model link-assistant/claude-sonnet-4-5-20250929 -p "ping"
```

Agent already uses this OpenCode JSON provider shape for configurable local
servers such as Formal AI. The router entry uses its OpenAI-compatible surface,
so the active subscription can be Anthropic, Codex, Qwen, Gemini, or another
configured upstream.

## Diagnosis and removal

```bash
router clients doctor agent
router clients remove agent
```

`doctor` discovers the live catalog and sends a minimal request with an
advertised model using the configured URL and token variable.
`remove` restores a pre-existing `link-assistant` provider when setup replaced
one; otherwise it removes only the managed provider. It also revokes the token
that setup minted before deleting the credential file, and refuses to delete
anything if that revocation fails (`--force` overrides, `--revoke-supplied`
extends this to operator-supplied tokens).
