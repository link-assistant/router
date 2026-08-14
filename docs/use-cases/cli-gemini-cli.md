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

These native namespaces require `UPSTREAM_PROVIDER=gemini`: they are additive
client-facing protocol aliases, not cross-provider fallback rules.

## Setup

```bash
gemini                                  # log in once; writes ~/.gemini/oauth_creds.json
export UPSTREAM_PROVIDER=gemini
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

With `UPSTREAM_PROVIDER=gemini` the router also serves
`/v1/chat/completions`, `/v1/responses` and — via the bridge —
`/v1/messages`, so Claude Code, Codex CLI and opencode can all run on a Gemini
subscription. See [chatgpt-in-claude-code.md](chatgpt-in-claude-code.md).

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| CLI rejects the base URL | non-localhost addresses must be HTTPS |
| Base URL appears ignored | you are on the OAuth login path; the override only applies to API-key auth |
| `404` on a Gemini namespace | the router is not running with `UPSTREAM_PROVIDER=gemini` |
