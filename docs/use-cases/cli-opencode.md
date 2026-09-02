# CLI: opencode through the router

**Dialect:** whichever the chosen provider plugin speaks — OpenAI Chat
Completions or OpenAI Responses. **Router endpoints:**
`/api/services/openai/v1/chat/completions` or
`/api/services/openai/v1/responses`.

## One-line temporary launch

```bash
router with opencode run "hi"
```

The wrapper writes a disposable OpenCode file, selects it with
`OPENCODE_CONFIG`, supplies `LINK_ASSISTANT_TOKEN`, and removes it on exit. The
normal `opencode.json` remains untouched. See [with-router.md](with-router.md).

Wrapper flags may appear before or after `opencode`; an explicit `--` forwards
every later token verbatim. See
[with-router.md](with-router.md#arguments-interaction-and-models).

## Manual configuration

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
        "baseURL": "http://127.0.0.1:8080/api/services/openai/v1",
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
router clients setup opencode
# Run the `source …/opencode.env` command printed by setup.
opencode
```

Automatic setup authenticates to `/api/services/openai/v1/models`, adds every advertised model to
the provider, and preserves user-added model entries on later runs.

`options.apiKey` accepts `"{env:VAR}"` interpolation, so a per-task token needs
no config edit; `options.headers` can add custom headers if you front the router
with a reverse proxy that requires them.

## Which credential answers

OpenCode cannot spend Claude, ChatGPT, Gemini, or Qwen consumer subscriptions by
default. It may use ordinary API-key/Gonka/Crater providers under their own
terms, or the separately policy-gated `z.ai-coding-plan` `z.ai/glm-*` catalog
described in [zai-coding-plan.md](zai-coding-plan.md). The exact signed OpenCode
binding, request evidence, principal, provider health, and model identity are
all re-checked before upstream.

## Smoke test

```bash
curl -s http://127.0.0.1:8080/api/services/openai/v1/models \
  -H "Authorization: Bearer $LINK_ASSISTANT_TOKEN" | jq '.data[].id'

curl -s http://127.0.0.1:8080/api/services/openai/v1/chat/completions \
  -H "Authorization: Bearer $LINK_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5","messages":[{"role":"user","content":"ping"}]}' | jq .
```

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `404` on `/api/services/openai/v1/responses` | the provider is configured with `@ai-sdk/openai` but you meant `@ai-sdk/openai-compatible` (or `--disable-openai-api` is set) |
| Setup reports an empty model catalog | connect at least one healthy subscription; setup refuses to write an unusable provider |
| `401` | `LINK_ASSISTANT_TOKEN` is unset in the environment opencode inherits |
