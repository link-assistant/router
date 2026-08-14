# CLI: opencode through the router

**Dialect:** whichever the chosen provider plugin speaks — OpenAI Chat
Completions or OpenAI Responses. **Router endpoints:** `/v1/chat/completions`
or `/v1/responses`.

## Configuration

[opencode's provider documentation](https://opencode.ai/docs/providers/) defines
custom providers in `opencode.json`. The npm package selects the dialect:

- `@ai-sdk/openai-compatible` → the endpoint must serve `/v1/chat/completions`
- `@ai-sdk/openai` → the endpoint must serve `/v1/responses`

### Chat Completions

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "link-assistant": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Link.Assistant.Router",
      "options": {
        "baseURL": "http://127.0.0.1:8080/v1",
        "apiKey": "{env:LINK_ASSISTANT_TOKEN}"
      },
      "models": {
        "gpt-5": { "name": "Router (gpt-5 → active subscription)" }
      }
    }
  }
}
```

### Responses

Identical, with `"npm": "@ai-sdk/openai"`. Use this when the active upstream is
`codex`, whose native protocol is Responses.

```bash
link-assistant-router clients setup opencode
# Run the `source …/opencode.env` command printed by setup.
opencode
```

Automatic setup authenticates to `/v1/models`, adds every advertised model to
the provider, and preserves user-added model entries on later runs.

`options.apiKey` accepts `"{env:VAR}"` interpolation, so a per-task token needs
no config edit; `options.headers` can add custom headers if you front the router
with a reverse proxy that requires them.

## Which subscription answers

Any of them. The router's OpenAI surface is served by the active
`UPSTREAM_PROVIDER`: translated to Anthropic for `anthropic`, forwarded natively
for `codex`/`qwen`/`openai-compatible`, translated for `gemini`, and forwarded to
Gonka or delivered as a Crater ForgeFed task for those upstreams.

## Smoke test

```bash
curl -s http://127.0.0.1:8080/v1/models \
  -H "Authorization: Bearer $LINK_ASSISTANT_TOKEN" | jq '.data[].id'

curl -s http://127.0.0.1:8080/v1/chat/completions \
  -H "Authorization: Bearer $LINK_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5","messages":[{"role":"user","content":"ping"}]}' | jq .
```

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `404` on `/v1/responses` | the provider is configured with `@ai-sdk/openai` but you meant `@ai-sdk/openai-compatible` (or `--disable-openai-api` is set) |
| Setup reports an empty model catalog | connect at least one healthy subscription; setup refuses to write an unusable provider |
| `401` | `LINK_ASSISTANT_TOKEN` is unset in the environment opencode inherits |
