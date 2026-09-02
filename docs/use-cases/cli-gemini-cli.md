# CLI: Gemini CLI through the router

**Dialect:** Gemini / Vertex. **Router endpoints:**
`/api/services/gemini/v1beta/…` and `/api/services/vertex/v1/…`.

## One-line temporary launch

```bash
router with gemini "hi"
```

The wrapper selects the Gemini API-key flow below a disposable
`GEMINI_CLI_HOME`, sets `GOOGLE_GEMINI_BASE_URL` to
`URL/api/services/gemini`, and
passes the run token as `GEMINI_API_KEY`. The normal Gemini home is untouched.
Permanent setup is not offered because this endpoint override belongs to the
API-key environment. See [with-router.md](with-router.md).

Wrapper flags may appear before or after `gemini`; an explicit `--`
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
export GOOGLE_GEMINI_BASE_URL=http://127.0.0.1:8080/api/services/gemini
export GEMINI_API_KEY=la_sk_...        # your task token
gemini
```

For the Vertex auth path:

```bash
export GOOGLE_VERTEX_BASE_URL=http://127.0.0.1:8080/api/services/vertex/v1
```

Two consequences of the documented rule above:

- the override applies to the **API-key** auth path, not to the interactive
  OAuth login path — select API-key authentication in the CLI;
- a plain `http://127.0.0.1:PORT` router address is explicitly permitted, so no
  TLS termination is needed for local use. A remote router does need HTTPS.

## How the token reaches the router

`GEMINI_API_KEY` is sent by the CLI as the `x-goog-api-key` header, which is
the carrier Google's own API documents. The router accepts the task token in
any of the three carriers its supported dialects use:

| Carrier | Sent by |
| --- | --- |
| `Authorization: Bearer <token>` | most clients, and every `curl` example here |
| `x-api-key: <token>` | the Anthropic SDKs |
| `x-goog-api-key: <token>` | Gemini CLI, and anything using `GEMINI_API_KEY` |

The `?key=<token>` query parameter that some Google clients support is
**deliberately not accepted**. A token in a URL is recorded by proxies, server
access logs and shell history, none of which is true of a header; the router
answers such a request with `401` and says so in the message rather than
failing opaquely.

Before router version 0.87.0 only the first two carriers were accepted, so the
setup above returned `401` on every request even with a valid token. If you see
that on an older router, either upgrade or send the token as
`Authorization: Bearer`.

## Router endpoints used

| Endpoint | Purpose |
| --- | --- |
| `GET /api/services/gemini/v1beta/models` | model list |
| `GET /api/services/gemini/v1beta/models/{model}` | model metadata |
| `POST /api/services/gemini/v1beta/models/{model}:generateContent` | generation |
| `POST /api/services/gemini/v1beta/models/{model}:streamGenerateContent` | SSE generation |
| `POST /api/services/vertex/v1/projects/.../models/{model}:generateContent` | Vertex-style generation |

These native namespaces work under `UPSTREAM_PROVIDER=auto`, but the catalog is
filtered by the signed Gemini client/principal policy. Gemini consumer OAuth is
currently denied until Google's terms are recorded; Claude and ChatGPT
consumer credentials are not exposed to Gemini CLI by default. Pinning a
provider does not bypass this entitlement check.

The experimental z.ai Coding Plan can reuse this translation only after its
separate provider-level acknowledgement and exact `gemini` unsupported-tool
acknowledgement. See [zai-coding-plan.md](zai-coding-plan.md).

Three provider gaps are handled here explicitly:

- `generationConfig` normally carries **both** `temperature` and `topP`, which
  is Gemini CLI's default and not a user setting. Anthropic rejects a request
  specifying both, so driving a Claude model this way used to fail with `400`
  on every request. The router now forwards **only one**: an explicit
  `temperature` wins and `topP` is dropped, because `temperature` is the more
  commonly tuned knob and the one a user is likelier to have set deliberately.
  A request carrying only `topP` still has it honoured — the parameter is
  mapped, not discarded whenever it is inconvenient. `topK` and
  `thinkingConfig` have no Anthropic equivalent and are not forwarded;

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
router serve
router doctor            # confirms the credential file and token validity
```

The router reads `~/.gemini/oauth_creds.json` read-only and refreshes expired
tokens in memory; it routes to the Code Assist `generateContent` backend and
synthesises SSE for streaming.

## Smoke test

```bash
curl -s "http://127.0.0.1:8080/api/services/gemini/v1beta/models" \
  -H "Authorization: Bearer $GEMINI_API_KEY" | jq .

curl -s "http://127.0.0.1:8080/api/services/gemini/v1beta/models/gemini-2.5-pro:generateContent" \
  -H "Authorization: Bearer $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"role":"user","parts":[{"text":"ping"}]}]}' | jq .
```

## Using a Gemini subscription from other CLIs

The translation remains implemented and tested, but consumer Gemini OAuth is
denied for every client until the applicable terms and a reviewed native row
are recorded. Protocol compatibility alone cannot enable it.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| CLI rejects the base URL | non-localhost addresses must be HTTPS |
| Base URL appears ignored | you are on the OAuth login path; the override only applies to API-key auth |
| `401` on every request with a valid token | a router older than 0.87.0 did not accept `x-goog-api-key`; upgrade, or send `Authorization: Bearer` |
| `401` mentioning `?key=` | the token was put in the URL; move it into a header |
| `404` on a Gemini namespace | the route is disabled, or the model is not owned by any connected subscription |
| Empty `models` list | no healthy credential is entitled to this signed client/principal; run `router doctor` |
| `INVALID_ARGUMENT` about server-side tools | a forced tool choice offers only `web_search`; use `AUTO` or add a client function |
| Answer ends early with `finishReason: "MAX_TOKENS"` | `generationConfig.maxOutputTokens` was reached; raise or drop the cap |
