# CLI: Link.Assistant Agent through the router

**Dialect:** OpenAI Chat Completions through Agent's OpenCode-compatible
provider configuration. **Router endpoint:** `/v1/chat/completions`.

## One-line temporary launch

```bash
link-assistant-router with agent "ping"
```

The wrapper supplies disposable OpenCode-compatible config content and a
per-run `LINK_ASSISTANT_TOKEN`; the normal Agent configuration is untouched.
See [with-router.md](with-router.md).

## Manual or permanent configuration

```bash
eval "$(link-assistant-router clients setup agent | grep '^export ')"
agent --model link-assistant/claude-sonnet-4-5-20250929 -p "ping"
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
        "claude-sonnet-4-5-20250929": {
          "name": "Router (Claude Sonnet 4.5)"
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
link-assistant-router clients doctor agent
link-assistant-router clients remove agent
```

`doctor` sends a minimal request using the configured URL and token variable.
`remove` restores a pre-existing `link-assistant` provider when setup replaced
one; otherwise it removes only the managed provider.
