# CLI: Qwen Code through the router

**Dialects:** OpenAI-compatible **or** Anthropic (Qwen Code ships both SDKs).
**Router endpoints:** `/v1/chat/completions`, `/v1/responses`, or `/v1/messages`.

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
        "baseUrl": "http://127.0.0.1:8080/v1",
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
        "baseUrl": "http://127.0.0.1:8080",
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
| `qwen` | native: DashScope OpenAI-compatible backend, using `~/.qwen/oauth_creds.json` |
| `anthropic` | OpenAI requests are translated to Claude MAX; Anthropic requests pass through |
| `codex`, `gemini`, `openai-compatible` | translated to that provider's dialect (the Anthropic surface is bridged) |

`/api/qwen/v1/*` is a namespaced alias that forwards Qwen's native
OpenAI-compatible protocol.

## Smoke test

```bash
curl -s http://127.0.0.1:8080/v1/chat/completions \
  -H "Authorization: Bearer $LINK_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3-coder-plus","messages":[{"role":"user","content":"ping"}]}' | jq .
```

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Qwen Code ignores the provider | the model entry's `id` + `baseUrl` pair must be unique and the auth type must match the dialect |
| `401` | `envKey` variable unset in the shell running `qwen` |
| Wrong model served | on a non-Qwen upstream the id is remapped; see the bridge/model tables in the scenario documents |
