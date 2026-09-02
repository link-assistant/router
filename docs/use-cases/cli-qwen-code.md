# CLI: Qwen Code through the router

**Dialects:** OpenAI-compatible **or** Anthropic (Qwen Code ships both SDKs).
**Router endpoints:** `/api/services/qwen/v1/chat/completions` and
`/api/services/qwen/v1/responses`; Anthropic-compatible experiments use
`/api/services/anthropic/v1/messages`.

[Qwen Code's model-provider documentation](https://github.com/QwenLM/qwen-code/blob/main/docs/users/configuration/model-providers.md)
defines `modelProviders` in `settings.json`, keyed by auth type, with `id`,
`envKey`, `baseUrl` and `generationConfig` per model. Credentials are never
persisted in `settings.json` — the runtime reads them from `process.env[envKey]`,
which is exactly what a per-task `la_sk_…` token wants.

## One-line temporary launch

```bash
router with qwen "hi"
```

The wrapper uses an isolated `HOME`, writes a disposable Qwen settings file,
and supplies `OPENAI_BASE_URL`, `OPENAI_API_KEY`, and
`LINK_ASSISTANT_TOKEN`. The normal `$QWEN_HOME` is untouched. See
[with-router.md](with-router.md).

Wrapper flags may appear before or after `qwen`; an explicit `--`
forwards every later token verbatim. See
[with-router.md](with-router.md#arguments-interaction-and-models).

## Manual OpenAI-compatible configuration

```json
{
  "modelProviders": {
    "openai": [
      {
        "id": "<model-from-v1-models>",
        "name": "Link.Assistant.Router",
        "baseUrl": "http://127.0.0.1:8080/api/services/qwen/v1",
        "envKey": "LINK_ASSISTANT_TOKEN"
      }
    ]
  }
}
```

```bash
router clients setup qwen
# Run the `source …/qwen.env` command printed by setup.
qwen
```

Automatic setup selects an advertised model from the authenticated router
catalog. Its stable `name` and `envKey` markers let `show`, `doctor`, and repeat
setup continue to recognise the entry if you switch its `id` to another
advertised model.

## Anthropic configuration

Use this when you want the router's Anthropic surface — for example to exercise
the same path Claude Code uses:

```json
{
  "modelProviders": {
    "anthropic": [
      {
        "id": "claude-sonnet-4-5-20250929",
        "baseUrl": "http://127.0.0.1:8080/api/services/anthropic",
        "envKey": "LINK_ASSISTANT_TOKEN"
      }
    ]
  }
}
```

## Side-by-side comparison

Models are unique per `id` **plus** `baseUrl`, so the same model id can be
declared twice — once direct, once through the router — which makes A/B
comparison of the router's translation against the vendor's own endpoint
straightforward.

## Which subscription answers

| `UPSTREAM_PROVIDER` | Behaviour |
| --- | --- |
| `qwen` | consumer OAuth denied until Alibaba's terms and native row are recorded |
| `anthropic`, `codex`, `gemini` | consumer subscriptions denied by default; protocol compatibility grants nothing |
| `openai-compatible` | ordinary API-key provider under its own terms |
| `z.ai-coding-plan` | denied by default; exact `qwen` second acknowledgement required — see [zai-coding-plan.md](zai-coding-plan.md) |

`/api/services/qwen/v1/*` is the canonical Qwen-native service namespace.

## Smoke test

```bash
curl -s http://127.0.0.1:8080/api/services/qwen/v1/chat/completions \
  -H "Authorization: Bearer $LINK_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3-coder-plus","messages":[{"role":"user","content":"ping"}]}' | jq .
```

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Qwen Code ignores the provider | the model entry's `id` + `baseUrl` pair must be unique and the auth type must match the dialect |
| `401` | `envKey` variable unset in the shell running `qwen` |
| `403 permission_error` | the signed Qwen client/provider cell is not approved; pinning or changing a model id cannot bypass it |
