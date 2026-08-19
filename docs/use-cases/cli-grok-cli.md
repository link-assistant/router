# CLI: Grok CLI through the router

**Dialect:** OpenAI Chat Completions. **Router endpoint:**
`/v1/chat/completions`.

## One-line temporary launch

```bash
link-assistant-router with grok "hi"
```

The wrapper isolates `HOME` and supplies `GROK_BASE_URL=URL/v1` and a per-run
`GROK_API_KEY`. Grok has no persistent base-URL field, so `--global` directs
users to the temporary or manual environment path. See
[with-router.md](with-router.md).

Wrapper flags may appear before or after `grok`; an explicit `--` forwards
every later token verbatim. See
[with-router.md](with-router.md#arguments-interaction-and-models).

## Manual configuration

[superagent-ai/grok-cli](https://github.com/superagent-ai/grok-cli) documents
`GROK_API_KEY` for authentication and an optional `GROK_BASE_URL` (default
`https://api.x.ai/v1`), with user settings persisted at
`~/.grok/user-settings.json`.

```bash
export GROK_BASE_URL=http://127.0.0.1:8080/v1
export GROK_API_KEY=la_sk_...            # your task token
grok
```

The current settings schema can store `apiKey` in
`~/.grok/user-settings.json`, but the implementation reads the base URL only
from `GROK_BASE_URL`. The router therefore writes both exports to a protected
mode-`0600` environment file instead of the client settings or terminal output.

`link-assistant-router clients setup grok` prints the command that sources
that file. Chat token limits sent by Grok are dropped only when forwarding to a
Codex subscription, whose backend cannot accept them.

## Which subscription answers

Any active `UPSTREAM_PROVIDER`. Grok CLI speaks plain Chat Completions, which
the router either translates to Anthropic Messages (`anthropic`), converts to
Responses (`codex`), or forwards natively (`qwen`, `openai-compatible`, `gonka`).

## Smoke test

```bash
curl -s http://127.0.0.1:8080/v1/chat/completions \
  -H "Authorization: Bearer $GROK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"ping"}]}' | jq -r '.choices[0].message.content'
```

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Requests still hit `api.x.ai` | `GROK_BASE_URL` was not exported in the shell that launched `grok` |
| `404` | the base URL must include the `/v1` suffix |
| Model not recognised upstream | unknown OpenAI ids map to the default Sonnet tier on `UPSTREAM_PROVIDER=anthropic`; set an explicit `claude-…` id if you need a specific model |
