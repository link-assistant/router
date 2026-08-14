# CLI: Codex CLI through the router

**Dialect:** OpenAI **Responses** only. **Router endpoint:** `/v1/responses`
(alias `/api/codex/v1/responses`).

The [Codex config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
states that `responses` is the only supported value of `wire_api` and the
default when omitted. Chat Completions is therefore not an integration option
for this CLI.

## Configuration

Automatic setup (merges this provider and backs up an existing config):

```bash
link-assistant-router clients setup codex
# Run the `source …/codex.env` command printed by setup.
```

See [configure-clients.md](configure-clients.md) for show, remove, and doctor.
For manual setup, use the following configuration.

`~/.codex/config.toml`:

```toml
model_provider = "link-assistant"
model = "gpt-5"

[model_providers.link-assistant]
name = "Link.Assistant.Router"
base_url = "http://127.0.0.1:8080/v1"
env_key = "LINK_ASSISTANT_TOKEN"
wire_api = "responses"
```

```bash
export LINK_ASSISTANT_TOKEN=la_sk_...
codex "explain this repository"
```

- Built-in provider ids (`openai`, `ollama`, `lmstudio`) cannot be overridden;
  pick a new id.
- `env_key` names an environment variable, so a per-task token needs no config
  edit — just a different export.
- `http_headers` and `query_params` are available if you front the router with
  something that needs them.

## Which subscription answers

| `UPSTREAM_PROVIDER` | Behaviour |
| --- | --- |
| `auto` (default) | `gpt-5` and other advertised Codex models route to the healthy ChatGPT subscription |
| `anthropic` | Responses request is translated to Anthropic Messages and served by Claude MAX — see [claude-max-in-codex.md](claude-max-in-codex.md) |
| `codex` | native: forwarded to the ChatGPT backend Responses API with the `~/.codex/auth.json` OAuth token |
| `qwen`, `gemini`, `openai-compatible`, `gonka`, `crater` | translated to that provider's dialect |

## Smoke test

```bash
curl -s http://127.0.0.1:8080/v1/responses \
  -H "Authorization: Bearer $LINK_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5","input":"say hello in five words"}' | jq .
```

Streaming should produce `response.created`, `response.output_text.delta`, and
`response.completed` events:

```bash
curl -sN http://127.0.0.1:8080/v1/responses \
  -H "Authorization: Bearer $LINK_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5","input":"count to three","stream":true}'
```

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Codex reports an unsupported wire API | `wire_api` must be `responses`; remove any `chat` value |
| `401` from Codex immediately | `env_key` variable is unset in the shell Codex runs in |
| The provider is ignored | the id collides with a built-in (`openai`, `ollama`, `lmstudio`) |
| Model answers as a Claude model | expected on `UPSTREAM_PROVIDER=anthropic`; see the model-mapping table in [claude-max-in-codex.md](claude-max-in-codex.md) |
