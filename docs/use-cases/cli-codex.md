# CLI: Codex CLI through the router

**Dialect:** OpenAI **Responses** only. **Router endpoint:** `/v1/responses`
(alias `/api/codex/v1/responses`).

The [Codex config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
states that `responses` is the only supported value of `wire_api` and the
default when omitted. Chat Completions is therefore not an integration option
for this CLI.

## One-line temporary launch

```bash
link-assistant-router with codex "hi"
```

This creates an isolated `HOME`, writes a disposable `~/.codex/config.toml`,
passes the run token through `LINK_ASSISTANT_TOKEN`, and removes the temporary
home afterward. The normal `$CODEX_HOME` and `~/.codex` are untouched. See
[with-router.md](with-router.md) for remote servers and token input.

Wrapper flags may appear before or after `codex`; an explicit `--` forwards
every later token verbatim. See
[with-router.md](with-router.md#arguments-interaction-and-models).

## Manual or permanent configuration

Automatic setup (merges this provider and backs up an existing config):

```bash
link-assistant-router clients setup codex
# Run the `source …/codex.env` command printed by setup.
```

See [configure-clients.md](configure-clients.md) for show, remove, and doctor.
For a machine without the router binary, use the following client-only
configuration with the remote router URL and task token.

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

### Tools that do not cross to another vendor

Codex CLI sends a tool set richer than the `function` and server-side tools
other dialects define — `namespace`, `custom` and `tool_search` appear in
ordinary use. Anthropic has no equivalent for these.

Rather than refuse the whole turn, the router **drops the untranslatable
entries and forwards the rest**: a model is never obliged to call a tool, so a
request carrying its remaining usable tools is far more useful than an error
naming the one that did not fit. Anything dropped is named in the
`x-router-dropped-tools` response header and in the request log, so an agent
that quietly never uses sub-agents is diagnosable rather than mysterious.

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
