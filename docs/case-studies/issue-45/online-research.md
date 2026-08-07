# Online research: how each agentic CLI is pointed at a gateway

Research performed on 2026-08-07. Only primary sources (vendor documentation or
the CLI's own repository) are used for the configuration facts below, because
these facts decide which router endpoints each documented use case must expose.

The central question for issue #45 is: **for each agentic CLI, which wire
protocol does it speak, and can it be pointed at a local gateway?** The answer
determines whether the router needs a new translation direction.

## Per-CLI findings

| CLI | Wire protocol it speaks | How it is pointed at a gateway | Router endpoint it needs |
| --- | --- | --- | --- |
| Claude Code | Anthropic Messages only | `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` | `/v1/messages` |
| Codex CLI | OpenAI Responses only | `config.toml` `[model_providers.<id>]` + `model_provider` | `/v1/responses` |
| Qwen Code | OpenAI, Anthropic, Gemini (per auth type) | `settings.json` `modelProviders[].baseUrl` + `envKey` | any of the three |
| Gemini CLI | Gemini / Vertex | `GOOGLE_GEMINI_BASE_URL`, `GOOGLE_VERTEX_BASE_URL` | `/api/gemini/v1beta`, `/api/vertex/v1` |
| opencode | provider-plugin driven | `opencode.json` `provider.<id>.options.baseURL` | `/v1/chat/completions`, `/v1/responses`, or `/v1/messages` |
| Grok CLI | OpenAI Chat Completions | `GROK_BASE_URL` + `GROK_API_KEY` | `/v1/chat/completions` |
| Cursor CLI (`cursor-agent`) | Cursor backend | **not configurable** — see below | — |

### Claude Code

[Claude Code settings documentation](https://code.claude.com/docs/en/settings)
documents the gateway variables `ANTHROPIC_BASE_URL` (custom API endpoint,
typically a gateway or proxy), `ANTHROPIC_AUTH_TOKEN` (bearer token sent to that
endpoint), `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`,
`ANTHROPIC_SMALL_FAST_MODEL`, the `ANTHROPIC_DEFAULT_*_MODEL` family, and
`ANTHROPIC_CUSTOM_HEADERS`.

Claude Code speaks **only** the Anthropic Messages API. This is the fact that
makes "ChatGPT Pro inside Claude Code" impossible without an
Anthropic→OpenAI translation direction inside the router.

### Codex CLI

The [Codex config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
documents a top-level `model_provider` key ("Provider id from `model_providers`
(default: `openai`)") and per-provider keys under `[model_providers.<id>]`:
`name`, `base_url`, `env_key`, `wire_api`, `query_params`, `http_headers`.

Critically, for `wire_api` the reference states that **`responses` is the only
supported value, and it is the default when omitted**. Built-in provider ids
(`openai`, `ollama`, `lmstudio`) cannot be overridden.

```toml
model_provider = "link-assistant"

[model_providers.link-assistant]
name = "Link.Assistant.Router"
base_url = "http://127.0.0.1:8080/v1"
env_key = "LINK_ASSISTANT_TOKEN"
wire_api = "responses"
```

Consequence: the router's `/v1/responses` endpoint — including its SSE event
names `response.created`, `response.output_text.delta`, `response.completed`,
emitted by `OpenAIStreamTranslator` with `OpenAIStreamShape::Response` — is the
*only* usable integration point for Codex. Chat Completions is not an option.

### Qwen Code

[Qwen Code model-provider documentation](https://github.com/QwenLM/qwen-code/blob/main/docs/users/configuration/model-providers.md)
defines `modelProviders` in `settings.json`, keyed by auth type. Supported auth
types include `openai` ("OpenAI-compatible APIs"), `anthropic` ("Anthropic
Claude API"), `gemini`, and `vertex-ai`. Each model entry accepts `id`,
`envKey`, `baseUrl`, and `generationConfig`; "Credentials are never persisted in
settings; the runtime reads them from `process.env[envKey]`."

Two facts matter here:

- Qwen Code can be pointed at the router through **either** the OpenAI-compatible
  surface or the **Anthropic** surface, because it ships the official
  `@anthropic-ai/sdk` for the `anthropic` auth type.
- Models are unique per `id` + `baseUrl`, so the same model id can be declared
  twice — once direct, once through the router — which is convenient for
  side-by-side testing.

### Gemini CLI

The [Gemini CLI configuration reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md)
documents `GOOGLE_GEMINI_BASE_URL`:

> Overrides the default base URL for Gemini API requests (when using
> `gemini-api-key` authentication). Must be a valid URL. For security, it must
> use HTTPS unless pointing to `localhost` (or `127.0.0.1` / `[::1]`).

and the matching `GOOGLE_VERTEX_BASE_URL` for `vertex-ai` authentication.

Two consequences for our documentation: the override applies to the
`gemini-api-key` auth path (not to the OAuth login path), and a plain
`http://127.0.0.1:PORT` router address is explicitly permitted, so no TLS
termination is required for local use. The router already exposes native
`/api/gemini/v1beta/models/{model}` and `/api/vertex/v1/*` namespaces.

### opencode

[opencode provider documentation](https://opencode.ai/docs/providers/) defines
custom providers in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "myprovider": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "My AI Provider Display Name",
      "options": { "baseURL": "https://api.myprovider.com/v1" },
      "models": { "my-model-name": { "name": "My Model Display Name" } }
    }
  }
}
```

The npm package selects the dialect: `@ai-sdk/openai-compatible` for endpoints
serving `/v1/chat/completions`, and `@ai-sdk/openai` for endpoints serving
`/v1/responses`. `options.apiKey` accepts `"{env:VAR}"` interpolation and
`options.headers` adds custom headers.

### Grok CLI

[superagent-ai/grok-cli](https://github.com/superagent-ai/grok-cli) documents
`GROK_API_KEY` for authentication and an optional `GROK_BASE_URL` (default
`https://api.x.ai/v1`), with user settings persisted at
`~/.grok/user-settings.json`. It speaks the OpenAI Chat Completions dialect, so
the router's `/v1/chat/completions` endpoint is the integration point.

### Cursor CLI

The [Cursor CLI configuration reference](https://cursor.com/docs/cli/reference/configuration)
documents `~/.cursor/cli-config.json`, `CURSOR_CONFIG_DIR`, `XDG_CONFIG_HOME`,
the standard `HTTP_PROXY`/`HTTPS_PROXY`/`NODE_USE_ENV_PROXY` proxy variables,
and `NODE_EXTRA_CA_CERTS`. It documents **no** custom API base URL or custom
provider key; model selection is limited to Cursor-hosted models.

This is recorded as an explicit non-support finding rather than being papered
over: the Cursor *IDE* exposes an "Override OpenAI Base URL" setting, but the
`cursor-agent` CLI does not expose an equivalent. The corresponding use-case
document says so and describes the only supported interception route (an
HTTP(S) proxy with a trusted CA), while marking it unsupported/unverified.

## Cross-cutting conclusions

1. Two dialects cover nearly every CLI: **Anthropic Messages** and **OpenAI
   Responses/Chat Completions**. Gemini adds a third for its own CLI.
2. Codex constrains us hardest: Responses only.
3. Claude Code constrains us in the opposite direction: Anthropic Messages only.
4. Therefore a gateway that wants to be universal must implement **both**
   translation directions. The router had only one of them, which is precisely
   the gap issue #45 names.
5. Every CLI authenticates to the gateway with a **single opaque bearer
   token/API key** taken from an environment variable. That is exactly the shape
   of a router `la_sk_…` token, so "one token per task" is configurable purely
   by exporting a different variable per task — no CLI change is needed.

## Sources

- [Claude Code settings](https://code.claude.com/docs/en/settings)
- [Codex config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Qwen Code model providers](https://github.com/QwenLM/qwen-code/blob/main/docs/users/configuration/model-providers.md)
- [Gemini CLI configuration reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md)
- [opencode providers](https://opencode.ai/docs/providers/)
- [opencode config](https://opencode.ai/docs/config/)
- [superagent-ai/grok-cli](https://github.com/superagent-ai/grok-cli)
- [Cursor CLI configuration](https://cursor.com/docs/cli/reference/configuration)
