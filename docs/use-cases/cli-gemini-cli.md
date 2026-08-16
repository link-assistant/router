# CLI: Gemini CLI through the router

**Dialect:** Gemini / Vertex. **Router endpoints:** `/api/gemini/v1beta/…` and
`/api/vertex/v1/…`.

## One-line temporary launch

```bash
link-assistant-router with gemini-cli "hi"
```

The wrapper selects the Gemini API-key flow below a disposable
`GEMINI_CLI_HOME`, sets `GOOGLE_GEMINI_BASE_URL` to `URL/api/gemini`, and
passes the run token as `GEMINI_API_KEY`. The normal Gemini home is untouched.
Permanent setup is not offered because this endpoint override belongs to the
API-key environment. See [with-router.md](with-router.md).

Wrapper flags may appear before or after `gemini-cli`; an explicit `--`
forwards every later token verbatim. See
[with-router.md](with-router.md#arguments-interaction-and-models).

## Manual configuration

The [Gemini CLI configuration reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md)
documents `GOOGLE_GEMINI_BASE_URL`:

> Overrides the default base URL for Gemini API requests (when using
> `gemini-api-key` authentication). Must be a valid URL. For security, it must
> use HTTPS unless pointing to `localhost` (or `127.0.0.1` / `[::1]`).

and the matching `GOOGLE_VERTEX_BASE_URL` for `vertex-ai` authentication.

```bash
export GOOGLE_GEMINI_BASE_URL=http://127.0.0.1:8080/api/gemini
export GEMINI_API_KEY=la_sk_...        # your task token
gemini
```

For the Vertex auth path:

```bash
export GOOGLE_VERTEX_BASE_URL=http://127.0.0.1:8080/api/vertex
```

Two consequences of the documented rule above:

- the override applies to the **API-key** auth path, not to the interactive
  OAuth login path — select API-key authentication in the CLI;
- a plain `http://127.0.0.1:PORT` router address is explicitly permitted, so no
  TLS termination is needed for local use. A remote router does need HTTPS.

## Router endpoints used

| Endpoint | Purpose |
| --- | --- |
| `GET /api/gemini/v1beta/models` | model list |
| `GET /api/gemini/v1beta/models/{model}` | model metadata |
| `POST /api/gemini/v1beta/models/{model}:generateContent` | generation |
| `POST /api/gemini/v1beta/models/{model}:streamGenerateContent` | SSE generation |
| `POST /api/vertex/v1/projects/.../models/{model}:generateContent` | Vertex-style generation |

These native namespaces work under the default `UPSTREAM_PROVIDER=auto`: they
list the union of every connected subscription and route each model to its
owning vendor, exactly like `/v1/models` and `/v1/chat/completions`. A Codex or
Claude subscription therefore serves Gemini CLI without a Gemini credential;
pinning `UPSTREAM_PROVIDER=gemini` narrows the namespace to Gemini models only.

Two provider gaps are handled here explicitly:

- `generationConfig.maxOutputTokens` is honoured on every model. Gemini and
  Claude enforce the cap upstream; the ChatGPT backend rejects the field, so
  the router strips it and enforces the budget itself, returning the truncated
  answer with `finishReason: "MAX_TOKENS"`. Because the router has no upstream
  tokenizer, that local bound is an estimate (see the README's output-limit
  note), not exact token accounting;
- a request whose only tools are server-side (`web_search`) together with a
  forced tool choice is refused with `INVALID_ARGUMENT`, because the backend
  executes those tools itself and can never emit the demanded function call.

## Setup

```bash
gemini                                  # log in once; writes ~/.gemini/oauth_creds.json
export TOKEN_SECRET=$(openssl rand -hex 32)
link-assistant-router serve
link-assistant-router doctor            # confirms the credential file and token validity
```

The router reads `~/.gemini/oauth_creds.json` read-only and refreshes expired
tokens in memory; it routes to the Code Assist `generateContent` backend and
synthesises SSE for streaming.

## Smoke test

```bash
curl -s "http://127.0.0.1:8080/api/gemini/v1beta/models" \
  -H "Authorization: Bearer $GEMINI_API_KEY" | jq .

curl -s "http://127.0.0.1:8080/api/gemini/v1beta/models/gemini-2.5-pro:generateContent" \
  -H "Authorization: Bearer $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"role":"user","parts":[{"text":"ping"}]}]}' | jq .
```

## Using a Gemini subscription from other CLIs

The router also serves
`/v1/chat/completions`, `/v1/responses` and — via the bridge —
`/v1/messages`, so Claude Code, Codex CLI and opencode can all run on a Gemini
subscription. See [chatgpt-in-claude-code.md](chatgpt-in-claude-code.md).

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| CLI rejects the base URL | non-localhost addresses must be HTTPS |
| Base URL appears ignored | you are on the OAuth login path; the override only applies to API-key auth |
| `404` on a Gemini namespace | the route is disabled, or the model is not owned by any connected subscription |
| Empty `models` list | no subscription is healthy; run `link-assistant-router doctor` |
| `INVALID_ARGUMENT` about server-side tools | a forced tool choice offers only `web_search`; use `AUTO` or add a client function |
| Answer ends early with `finishReason: "MAX_TOKENS"` | `generationConfig.maxOutputTokens` was reached; raise or drop the cap |
