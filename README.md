# Link.Assistant.Router

A Rust-based API gateway that proxies Anthropic (Claude) APIs through a Claude MAX OAuth session, providing multi-tenant access via custom-issued tokens.

[![CI/CD Pipeline](https://github.com/link-assistant/router/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/link-assistant/router/actions)
[![crates.io](https://img.shields.io/crates/v/link-assistant-router.svg?label=crates.io)](https://crates.io/crates/link-assistant-router)
[![Docker Hub](https://img.shields.io/docker/v/konard/link-assistant-router?label=docker%20hub)](https://hub.docker.com/r/konard/link-assistant-router)
[![docs.rs](https://img.shields.io/docsrs/link-assistant-router?label=docs.rs)](https://docs.rs/link-assistant-router)
[![Rust Version](https://img.shields.io/badge/rust-1.70%2B-blue.svg)](https://www.rust-lang.org/)
[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](http://unlicense.org/)

## Overview

Link.Assistant.Router is a transparent proxy that sits between API clients (such as Claude Code) and the Anthropic API. It is the OpenRouter-equivalent for Claude MAX accounts: every feature found in the community Claude proxies is available behind a single configurable surface.

- **Proxies all Anthropic API requests** transparently, including SSE/streaming responses
- **Supports Claude MAX (OAuth)** by reading Claude Code session credentials
- **Vendor subscriptions** — `UPSTREAM_PROVIDER=codex|gemini|qwen` reads each vendor CLI's OAuth credentials read-only (`~/.codex`, `~/.gemini`, `~/.qwen`), refreshes expired tokens in memory, and routes to the ChatGPT/Code Assist/DashScope backend with full dialect translation
- **OpenAI-compatible endpoints** — `/v1/chat/completions`, `/v1/responses`, `/v1/models` translate to Anthropic or forward to a configured OpenAI-compatible provider
- **Optional Gonka upstream** — `UPSTREAM_PROVIDER=gonka` forwards OpenAI-compatible routes to Gonka instead of translating them to Anthropic
- **Optional Crater ForgeFed upstream** — `UPSTREAM_PROVIDER=crater` turns OpenAI chat requests into ForgeFed `Offer{Ticket}` tasks and waits for resolved task results
- **Optional LiteLLM/OpenAI-compatible upstream** — `UPSTREAM_PROVIDER=openai-compatible` routes OpenAI SDK traffic to a stored provider such as LiteLLM
- **Multi-account routing** — pool any number of Claude MAX accounts; round-robin / priority / least-used; automatic cooldowns on 429
- **Issues custom `la_sk_...` JWT tokens** with expiration and revocation for multi-tenant access
- **Persistent token store** — text (Lino) **and** binary backends, both on by default; tokens survive restarts
- **Live observability** — Prometheus `/metrics`, JSON `/v1/usage`, per-account health at `/v1/accounts`
- **`lino-arguments` + `.lenv`** — every flag has an env-var alias and an optional `.lenv` file fallback
- **First-class CLI** — `serve`, `tokens issue|list|revoke|expire|show`, `providers add|list|show|remove|import`, `accounts list`, `doctor` subcommands
- **Replaces custom tokens with real OAuth credentials** internally, so the OAuth token is never exposed to clients
- **Runs as a single Docker container** for easy deployment

Every feature is **configurable** — conflicting design choices in upstream community proxies become toggles (`--routing-mode`, `--storage-policy`, `--disable-openai-api`, `--disable-anthropic-api`, `--disable-metrics`, `--experimental-compatibility`).

### Architecture

```
Client (Claude Code / API user)
   |
   |  Authorization: Bearer la_sk_...
   v
Link.Assistant.Router (Rust / axum)
   |
   |  Authorization: Bearer <real OAuth token>
   v
Anthropic API (api.anthropic.com)
```

When `UPSTREAM_PROVIDER=gonka`, clients still authenticate to the router with
`Authorization: Bearer la_sk_...`, but upstream OpenAI-compatible requests are
sent to Gonka with Gonka signing headers instead of the client token. This
project remains Link.Assistant.Router; Gonka is an optional backend.

When `UPSTREAM_PROVIDER=openai-compatible`, clients still authenticate to the
router with `Authorization: Bearer la_sk_...` or `x-api-key: la_sk_...`. The
router forwards OpenAI-compatible requests to the configured provider, such as
a LiteLLM proxy, and substitutes only the upstream provider key inside the
router.

When `UPSTREAM_PROVIDER=crater`, `/v1/chat/completions` accepts normal OpenAI
chat requests, delivers a ForgeFed `Offer` containing a `Ticket` to
`CRATER_FORGEFED_INBOX`, reads `Accept.result`, polls that task URI until
`isResolved:true`, and maps the resolved content back to OpenAI JSON or SSE.

### Vendor subscriptions (Codex, Gemini, Qwen)

Set `UPSTREAM_PROVIDER` to `codex`, `gemini`, or `qwen` to serve a vendor
subscription instead of an API key. Clients still authenticate to the router
with their `la_sk_...` token; the router supplies the vendor OAuth token.

| Provider | `UPSTREAM_PROVIDER` (aliases) | Credentials (read-only) | Upstream |
| --- | --- | --- | --- |
| Claude | `anthropic` | `~/.claude/.credentials.json` | `api.anthropic.com` |
| Codex / ChatGPT | `codex` (`chatgpt`, `openai-codex`) | `~/.codex/auth.json` | ChatGPT backend Responses API |
| Gemini | `gemini` (`google`, `code-assist`) | `~/.gemini/oauth_creds.json` | Code Assist `generateContent` |
| Qwen | `qwen` (`qwen-code`, `dashscope`) | `~/.qwen/oauth_creds.json` | DashScope OpenAI-compatible |

The credential files are produced by each vendor's own CLI (run its `login`
once); the router only reads them. Expired tokens are refreshed in memory using
the vendor's public OAuth client — the files on disk are never modified and
secrets are never logged. `/v1/chat/completions` and `/v1/responses` are
translated to each backend's dialect (Codex uses the OpenAI Responses API;
Gemini uses the Code Assist envelope with synthesized SSE for streaming; Qwen is
OpenAI-compatible). Run `router doctor` to verify each credential file is
present and its token valid.

## Quick Start

### Prerequisites

- [Rust 1.70+](https://www.rust-lang.org/tools/install) (for building from source)
- [Docker](https://docs.docker.com/get-docker/) (for containerized deployment)
- A Claude MAX subscription with an active Claude Code OAuth session

### 1. Build from source

```bash
git clone https://github.com/link-assistant/router.git
cd router
cargo build --release
```

The binary will be at `target/release/link-assistant-router`.

### 2. Set up Claude Code credentials

The router reads OAuth credentials from the Claude Code home directory. By default, it looks in `~/.claude` for credential files. Make sure you have an active Claude Code session:

```bash
# Log in with Claude Code (this creates the session files)
claude
```

The router searches these files in order:
- `credentials.json`
- `.credentials.json`
- `auth.json`
- `oauth.json`
- `config.json`

Two on-disk layouts are supported automatically:

- **Nested** (the format real Claude Code writes to `~/.claude/.credentials.json`):

  ```json
  {
    "claudeAiOauth": {
      "accessToken": "sk-ant-oat01-...",
      "refreshToken": "sk-ant-ort01-...",
      "expiresAt": 1781050618000,
      "scopes": ["user:inference", "user:profile"],
      "subscriptionType": "max"
    }
  }
  ```

- **Flat** (convenient for tests and minimal setups):

  ```json
  { "accessToken": "sk-ant-oat01-..." }
  ```

For the nested layout the router reads `accessToken` and `expiresAt` from inside
`claudeAiOauth`. For the flat layout it reads `accessToken` (or `access_token`,
`oauthToken`, `oauth_token`) from the top level of the first file found. The
file is only ever read — the router never writes back to or deletes your
credential files.

### 3. Start the router

```bash
# Required: set the JWT signing secret
export TOKEN_SECRET=your-secure-secret-here

# Optional: customize port (default: 8080)
export ROUTER_PORT=8080

# Optional: set Claude Code home directory (default: ~/.claude)
export CLAUDE_CODE_HOME=~/.claude

# Optional: override upstream URL (default: https://api.anthropic.com)
export UPSTREAM_BASE_URL=https://api.anthropic.com

# Start the router
./target/release/link-assistant-router
```

You should see:

```
INFO Link.Assistant.Router v0.2.0
INFO Upstream: https://api.anthropic.com
INFO Claude Code home: /home/user/.claude
INFO Listening on 0.0.0.0:8080
```

### 4. Issue a custom token

```bash
curl -s -X POST http://localhost:8080/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"ttl_hours": 24, "label": "my-dev-token"}' | jq .
```

Response:

```json
{
  "token": "la_sk_eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "ttl_hours": 24,
  "label": "my-dev-token"
}
```

Save the `token` value for use in API requests.

### 5. Use the router as an Anthropic API proxy

```bash
# Use the custom token to make requests through the router
curl -s http://localhost:8080/api/latest/anthropic/v1/messages \
  -H "Authorization: Bearer la_sk_eyJ0eXAi..." \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello!"}]
  }' | jq .
```

The router will:
1. Validate the `la_sk_...` token
2. Replace it with the real OAuth token from the Claude Code session
3. Inject the upstream headers Claude MAX OAuth requires — `anthropic-version`
   (default `2023-06-01` when the client omits it) and the
   `anthropic-beta: oauth-2025-04-20` flag (merged with any betas the client
   already sent)
4. Forward the request to `https://api.anthropic.com/v1/messages`
5. Stream the response back to the client

Because the router injects these headers itself, a client only needs to send the
`la_sk_...` token — it never needs the real OAuth token, the OAuth beta flag, or
even an `anthropic-version` header.

## Using with Claude Code

The primary use case is routing Claude Code through the proxy so multiple users can share a single Claude MAX subscription.

### Step 1: Start the router (on the server/host machine)

```bash
export TOKEN_SECRET=your-secure-secret
./target/release/link-assistant-router
```

### Step 2: Issue a token for each user

```bash
# Issue a token for user Alice
curl -s -X POST http://localhost:8080/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"ttl_hours": 168, "label": "alice"}' | jq -r '.token'

# Issue a token for user Bob
curl -s -X POST http://localhost:8080/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"ttl_hours": 168, "label": "bob"}' | jq -r '.token'
```

### Step 3: Configure Claude Code to use the router (on each user's machine)

```bash
# Set the base URL to point to the router
export ANTHROPIC_BASE_URL=http://your-server:8080/api/latest/anthropic

# Set the custom token as the API key
export ANTHROPIC_API_KEY=la_sk_eyJ0eXAi...

# Run Claude Code normally — all requests go through the router
claude
```

Claude Code will work exactly as normal, with all requests transparently proxied through the router.

## API Endpoints

### Always available

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check, returns `ok` |
| `/api/tokens` | POST | Issue a new custom token |
| `/api/tokens/list` | GET | (admin) List every persisted token |
| `/api/tokens/revoke` | POST | (admin) Revoke a token by id |
| `/api/providers` | GET/POST | (admin) List or upsert OpenAI-compatible upstream providers |
| `/api/providers/{name}` | GET/DELETE | (admin) Show or delete one provider |

### Anthropic surface (`--disable-anthropic-api` to opt out)

| Endpoint | Method | Description |
|---|---|---|
| `/v1/messages` | POST | Anthropic Messages — preserves SSE streaming |
| `/v1/messages/count_tokens` | POST | Token-count helper |
| `/invoke` | POST | Bedrock-format invoke |
| `/invoke-with-response-stream` | POST | Bedrock streaming invoke |
| `/api/latest/anthropic/*` | ANY | Legacy prefix; stripped and forwarded |
| `/*:rawPredict`, `/*:streamRawPredict` | POST | Vertex rawPredict pass-through |

### OpenAI surface (`--disable-openai-api` to opt out)

| Endpoint | Method | Description |
|---|---|---|
| `/v1/chat/completions` | POST | Chat Completions, translated to Anthropic Messages, forwarded to the selected OpenAI-compatible provider, or delivered as a Crater ForgeFed task |
| `/v1/responses` | POST | Responses API, translated to Anthropic Messages or forwarded to the selected OpenAI-compatible provider |
| `/v1/models` | GET | OpenAI-shaped model list |

`gpt-4o`, `gpt-4o-mini`, `gpt-4`, and the `o*` reasoning families auto-map to the Claude Sonnet / Haiku / Opus tiers respectively. Native `claude-*` IDs pass through unchanged.

With `UPSTREAM_PROVIDER=gonka`, `/v1/chat/completions` and `/v1/responses`
forward OpenAI-compatible JSON to Gonka without Anthropic translation. If a
request omits `model`, the router uses `GONKA_MODEL`.

With `UPSTREAM_PROVIDER=openai-compatible`, the same routes forward JSON to the
configured provider. This supports LiteLLM proxy deployments by setting the
provider base URL to the LiteLLM `/v1` API base. Streaming OpenAI requests are
passed through for OpenAI-compatible providers, and Anthropic-backed streaming
requests are translated to OpenAI SSE chunks.

With `UPSTREAM_PROVIDER=crater`, `/v1/chat/completions` supports normal JSON
responses and SSE with either request-body `"stream": true` or `?stream=true`.
The SSE stream emits OpenAI chat-completion chunks once the ForgeFed task
resolves.

### MPP charges for OpenAI endpoints

The OpenAI-compatible endpoints can advertise Machine Payments Protocol (MPP)
charges with HTTP `402 Payment Required`. Enable this only after configuring
the amount, currency, and recipient for your payment method:

```env
MPP_ENABLE=true
MPP_AMOUNT=0.05
MPP_CURRENCY=USD
MPP_RECIPIENT=acct_or_wallet
MPP_METHOD=stripe
```

When enabled, unpaid calls to `/v1/chat/completions` and `/v1/responses`
return `WWW-Authenticate: Payment ...` with `protocol="mpp"` and
`intent="charge"`. This is separate from the ForgeFed/ActivityPub discovery
surface. Payment credential settlement is intentionally not accepted until a
method-specific verifier is configured.

### Observability (`--disable-metrics` to opt out)

| Endpoint | Method | Description |
|---|---|---|
| `/metrics` | GET | Prometheus text-exposition counters |
| `/v1/usage` | GET | JSON snapshot of all counters |
| `/v1/accounts` | GET | Multi-account health: cooldowns, last error, used-count |

### POST /api/tokens

Issue a new custom JWT token.

**Request body:**

```json
{
  "ttl_hours": 24,
  "label": "my-token"
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `ttl_hours` | integer | 24 | Token lifetime in hours |
| `label` | string | `""` | Optional human-readable label |

**Response:**

```json
{
  "token": "la_sk_eyJ0eXAi...",
  "ttl_hours": 24,
  "label": "my-token"
}
```

### Proxy Routes

Any request to `/api/latest/anthropic/*` is forwarded to the upstream Anthropic API. The proxy:

- Validates the `Authorization: Bearer la_sk_...` or `x-api-key: la_sk_...` token
- Replaces it with the real OAuth token
- Forwards all headers (except `host`, `authorization`, `x-api-key`, `connection`, `transfer-encoding`)
- Passes through the request body unmodified
- Streams back the response (SSE-compatible)
- Preserves the upstream status code and response headers

**Error responses** follow the Anthropic API error format:

```json
{
  "type": "error",
  "error": {
    "type": "authentication_error",
    "message": "Token has expired"
  }
}
```

| Status | Condition |
|---|---|
| 401 | Missing or invalid/expired token |
| 403 | Token has been revoked |
| 502 | OAuth token unavailable or upstream request failed |

## Configuration

Configuration is read by `lino-arguments` in this order: CLI flags,
environment variables, `.lenv`, then `.env`. The default file format is
Lino-style key/value notation:

```text
TOKEN_SECRET: your-router-token-secret
UPSTREAM_PROVIDER: openai-compatible
OPENAI_COMPATIBLE_PROVIDER_NAME: litellm
OPENAI_COMPATIBLE_BASE_URL: http://litellm:4000/v1
OPENAI_COMPATIBLE_MODEL: claude-sonnet
OPENAI_COMPATIBLE_MODELS: claude-sonnet,gpt-4o
```

Every flag listed in `--help` has an env-var alias and can be configured from
`.lenv` with the same env-var key.

### Core

| Flag / env | Default | Required | Description |
|---|---|---|---|
| `--token-secret` / `TOKEN_SECRET` | — | Yes | Secret key for signing/validating JWT tokens |
| `--port` / `ROUTER_PORT` | `8080` | No | Port to listen on |
| `--host` / `ROUTER_HOST` | `0.0.0.0` | No | Host/IP to bind to |
| `--claude-code-home` / `CLAUDE_CODE_HOME` | `~/.claude` | No | Primary Claude Code credentials directory |
| `--upstream-provider` / `UPSTREAM_PROVIDER` | `anthropic` | No | Upstream provider: `anthropic`, `gonka`, `crater`, or `openai-compatible` |
| `--upstream-base-url` / `UPSTREAM_BASE_URL` | `https://api.anthropic.com` | No | Upstream Anthropic API URL |
| `--api-format` / `UPSTREAM_API_FORMAT` | (auto) | No | Restrict the proxy to `anthropic` / `bedrock` / `vertex` |
| `--verbose` / `VERBOSE` | `false` | No | Verbose tracing |

### Gonka provider

Gonka support is optional. Anthropic remains the default provider, and existing
Claude MAX OAuth behavior is unchanged unless `UPSTREAM_PROVIDER=gonka` is set.

```env
TOKEN_SECRET=your-router-token-secret

UPSTREAM_PROVIDER=gonka
GONKA_PRIVATE_KEY=your_gonka_private_key
GONKA_SOURCE_URL=https://node4.gonka.ai
GONKA_MODEL=Qwen/Qwen3-235B-A22B-Instruct-2507-FP8
```

| Flag / env | Default | Required | Description |
|---|---|---|---|
| `--gonka-private-key` / `GONKA_PRIVATE_KEY` | — | Yes, for Gonka | Private key used to sign Gonka upstream requests |
| `--gonka-source-url` / `GONKA_SOURCE_URL` | `https://node4.gonka.ai` | No | Gonka source node URL |
| `--gonka-model` / `GONKA_MODEL` | `Qwen/Qwen3-235B-A22B-Instruct-2507-FP8` | No | Default model for Gonka OpenAI-compatible requests |

Your Gonka account must be activated for inference, funded, and have a
published on-chain public key. Participant registration is only needed for
hosting.

### Crater ForgeFed provider

Crater support is optional. It keeps router-issued `la_sk_...` tokens at the
edge, then uses ForgeFed to submit work to a remote ticket tracker or exchange.

```env
TOKEN_SECRET=your-router-token-secret

UPSTREAM_PROVIDER=crater
CRATER_FORGEFED_INBOX=https://tracker.example/inbox
CRATER_FORGEFED_TARGET=https://tracker.example/projects/demo
# Optional; defaults to ACTIVITYPUB_ACTOR_BASE_URL/actor/code
CRATER_FORGEFED_ACTOR=https://router.example/actor/code
```

| Flag / env | Default | Required | Description |
|---|---|---|---|
| `--crater-forgefed-inbox` / `CRATER_FORGEFED_INBOX` | — | Yes, for Crater | Remote ForgeFed inbox that receives `Offer{Ticket}` activities |
| `--crater-forgefed-actor` / `CRATER_FORGEFED_ACTOR` | `${ACTIVITYPUB_ACTOR_BASE_URL}/actor/code` | No | Local actor URI used in outbound activities |
| `--crater-forgefed-target` / `CRATER_FORGEFED_TARGET` | inbox URI | No | Ticket tracker or project URI used as `Offer.target` |
| `--crater-poll-interval-ms` / `CRATER_POLL_INTERVAL_MS` | `1000` | No | Delay between task URI polls |
| `--crater-poll-timeout-secs` / `CRATER_POLL_TIMEOUT_SECS` | `120` | No | Maximum wait for `isResolved:true` |

### OpenAI-compatible / LiteLLM provider

Generic OpenAI-compatible providers are used when
`UPSTREAM_PROVIDER=openai-compatible`. The boot-time config can come from
`.lenv`, env vars, or CLI flags:

```text
TOKEN_SECRET: your-router-token-secret
UPSTREAM_PROVIDER: openai-compatible
OPENAI_COMPATIBLE_PROVIDER_NAME: litellm
OPENAI_COMPATIBLE_BASE_URL: http://litellm:4000/v1
OPENAI_COMPATIBLE_API_KEY_ENV: LITELLM_MASTER_KEY
OPENAI_COMPATIBLE_MODEL: claude-sonnet
OPENAI_COMPATIBLE_MODELS: claude-sonnet,gpt-4o
```

| Flag / env | Default | Required | Description |
|---|---|---|---|
| `--openai-compatible-provider-name` / `OPENAI_COMPATIBLE_PROVIDER_NAME` | `litellm` | No | Stored provider name to resolve |
| `--openai-compatible-base-url` / `OPENAI_COMPATIBLE_BASE_URL` | `http://localhost:4000/v1` | No | Upstream OpenAI-compatible `/v1` API base |
| `--openai-compatible-api-key` / `OPENAI_COMPATIBLE_API_KEY` | — | No | Inline upstream key; prefer persisted provider storage for long-lived secrets |
| `--openai-compatible-api-key-env` / `OPENAI_COMPATIBLE_API_KEY_ENV` | — | No | Environment variable containing the upstream key |
| `--openai-compatible-model` / `OPENAI_COMPATIBLE_MODEL` | — | No | Default model injected when requests omit `model` |
| `--openai-compatible-models` / `OPENAI_COMPATIBLE_MODELS` | — | No | Comma-separated models exposed from `/v1/models` |

Persistent provider records live in `<DATA_DIR>/providers.lenv`. Inline
provider API keys are encrypted with AES-GCM using a key derived from
`TOKEN_SECRET`; API responses and CLI output only show whether a stored key is
present.

```bash
link-assistant-router providers add \
  --name litellm \
  --base-url http://litellm:4000/v1 \
  --model claude-sonnet \
  --models claude-sonnet,gpt-4o \
  --api-key "$LITELLM_MASTER_KEY"

link-assistant-router providers list
link-assistant-router providers show litellm
link-assistant-router providers remove litellm
```

Provider records can also be imported from JSON, provider-store `.lenv`, or an
indented Links-style config:

```text
litellm
  kind "openai-compatible"
  base-url "http://litellm:4000/v1"
  model "claude-sonnet"
  models "claude-sonnet,gpt-4o"
  api-key-env "LITELLM_MASTER_KEY"
```

The HTTP API accepts the same shape at `POST /api/providers`:

```json
{
  "name": "litellm",
  "kind": "openai-compatible",
  "base_url": "http://litellm:4000/v1",
  "default_model": "claude-sonnet",
  "models": ["claude-sonnet", "gpt-4o"],
  "api_key_env": "LITELLM_MASTER_KEY"
}
```

### Routing & storage

| Flag / env | Default | Description |
|---|---|---|
| `--routing-mode` / `ROUTING_MODE` | `direct` | `direct` (OAuth substitution), `cli` (Claude CLI subprocess), or `hybrid` |
| `--storage-policy` / `STORAGE_POLICY` | `both` | Persistent token store: `memory`, `text` (Lino), `binary`, or `both` |
| `--data-dir` / `DATA_DIR` | platform-specific | Where `tokens.lino` / `tokens.bin` live |
| `--claude-cli-bin` / `CLAUDE_CLI_BIN` | `claude` | Local Claude CLI binary used by the `cli` backend |
| `--additional-account-dirs` / `ADDITIONAL_ACCOUNT_DIRS` | (empty) | Comma-separated extra credential dirs for multi-account routing |

### Feature toggles

| Flag / env | Default | Description |
|---|---|---|
| `--disable-openai-api` / `DISABLE_OPENAI_API` | off | Hide `/v1/chat/completions`, `/v1/responses`, `/v1/models` |
| `--disable-anthropic-api` / `DISABLE_ANTHROPIC_API` | off | Hide `/v1/messages*` and Bedrock paths |
| `--disable-metrics` / `DISABLE_METRICS` | off | Hide `/metrics`, `/v1/usage`, `/v1/accounts` |
| `--experimental-compatibility` / `EXPERIMENTAL_COMPATIBILITY` | off | XML history, model spoofing and other community-proxy behaviours |
| `--admin-key` / `TOKEN_ADMIN_KEY` | (open) | Bearer key required for `/api/tokens*` admin endpoints |
| `--mpp-enable` / `MPP_ENABLE` | off | Return MPP `402 Payment Required` challenges on OpenAI endpoints |
| `--mpp-amount` / `MPP_AMOUNT` | `0.00` | Per-request MPP charge amount |
| `--mpp-currency` / `MPP_CURRENCY` | `USD` | Currency or asset for MPP charges |
| `--mpp-recipient` / `MPP_RECIPIENT` | — | Recipient wallet, merchant account, or payment address |
| `--mpp-method` / `MPP_METHOD` | — | Optional MPP payment method identifier |

### CLI subcommands

```bash
# Default: starts the HTTP server (same as `serve`).
link-assistant-router

# Issue / list / revoke / show tokens locally (no HTTP needed):
link-assistant-router tokens issue --ttl-hours 168 --label alice
# ...optionally cap how many upstream requests the token may make:
link-assistant-router tokens issue --ttl-hours 168 --label alice --max-requests 500
link-assistant-router tokens list
link-assistant-router tokens revoke <id>
link-assistant-router tokens show <id>

# Inspect configured accounts:
link-assistant-router accounts list

# Manage OpenAI-compatible upstream providers:
link-assistant-router providers add --name litellm --base-url http://litellm:4000/v1 --model claude-sonnet
link-assistant-router providers import providers.lenv
link-assistant-router providers list

# Print resolved configuration + credential / store probes:
link-assistant-router doctor
```

### Logging

The router uses `tracing` with the `RUST_LOG` environment variable:

```bash
# Default: info level
RUST_LOG=info ./target/release/link-assistant-router

# Debug level for detailed request tracing
RUST_LOG=debug ./target/release/link-assistant-router

# Trace level for maximum verbosity
RUST_LOG=trace ./target/release/link-assistant-router
```

## Docker Deployment

### Build the image

```bash
docker build -t link-assistant/router .
```

### Run the container

```bash
docker run -d \
  -p 8080:8080 \
  -e TOKEN_SECRET=your-secure-secret \
  -v /path/to/claude-code-home:/data/claude:ro \
  link-assistant/router
```

The Dockerfile sets `CLAUDE_CODE_HOME=/data/claude` by default, so mount your Claude Code session directory to `/data/claude`.

### Docker Compose example

```yaml
version: "3.8"
services:
  router:
    build: .
    ports:
      - "8080:8080"
    environment:
      TOKEN_SECRET: ${TOKEN_SECRET}
      ROUTER_PORT: "8080"
    volumes:
      - ${HOME}/.claude:/data/claude:ro
    restart: unless-stopped
```

### VPS Deployment

To deploy on a VPS (e.g., Ubuntu):

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 2. Clone and build
git clone https://github.com/link-assistant/router.git
cd router
cargo build --release

# 3. Set up Claude Code credentials on the VPS
# (log in with Claude Code to create session files)
claude

# 4. Create a systemd service (optional, for auto-start)
sudo tee /etc/systemd/system/link-assistant-router.service > /dev/null <<EOF
[Unit]
Description=Link.Assistant.Router
After=network.target

[Service]
Type=simple
User=$USER
Environment=TOKEN_SECRET=your-secure-secret
Environment=ROUTER_PORT=8080
Environment=CLAUDE_CODE_HOME=/home/$USER/.claude
ExecStart=/home/$USER/router/target/release/link-assistant-router
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable link-assistant-router
sudo systemctl start link-assistant-router

# 5. Check status
sudo systemctl status link-assistant-router
journalctl -u link-assistant-router -f
```

### Akash and Kubernetes

Ready-to-edit deployment templates are included for hosted environments:

- [Akash SDL](deploy/akash/deploy.yaml)
- [Kubernetes manifests](deploy/k8s/router.yaml)

Replace placeholder secrets, set `ACTIVITYPUB_ACTOR_BASE_URL` to the public
router URL, and mount or provision Claude Code credentials at
`CLAUDE_CODE_HOME` before exposing the service.

## ForgeFed Integration

The router exposes ActivityPub/ForgeFed endpoints for service discovery and
problem-source federation. See [docs/forgefed.md](docs/forgefed.md) for the
actor document, inbox, follow activity, and deployment verification steps.

## Token System

The router uses JWT-based custom tokens with the `la_sk_` prefix.

### Token lifecycle

1. **Issue**: `POST /api/tokens` creates a signed JWT with a UUID subject, expiration, optional label, and an optional per-token request budget
2. **Validate**: Each proxy request extracts the `Authorization: Bearer la_sk_...` header, strips the prefix, and verifies the JWT signature and expiration
3. **Meter**: When the token carries a request budget, each forwarded request increments a persisted `used_requests` counter; once it reaches `max_requests` the router returns `429 Too Many Requests` instead of forwarding upstream
4. **Revoke**: Tokens can be revoked by their subject ID. Records (including the revoked flag and usage counter) are written to the persistent token store, so revocations and usage survive restarts

### Token format

Tokens are standard HS256 JWTs with the `la_sk_` prefix. The JWT payload contains:

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1710806400,
  "exp": 1710892800,
  "label": "my-token"
}
```

### Per-token request budget

Each token can carry an optional cap on the number of upstream requests it may
make. This lets you hand a scoped token to a separate task or agent and bound
how much of your Claude MAX subscription that task can consume, without ever
exposing the real OAuth credential.

```bash
# CLI: issue a token limited to 100 upstream requests
link-assistant-router tokens issue --ttl-hours 24 --label scoped-agent --max-requests 100

# HTTP: same, via the admin endpoint
curl -s -X POST http://localhost:8080/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"ttl_hours": 24, "label": "scoped-agent", "max_requests": 100}' | jq .
```

- Omitting `--max-requests` / `max_requests` leaves the token **unlimited**.
- Usage is counted per forwarded request and persisted in the token store, so
  the budget is enforced across restarts.
- When the budget is exhausted the router responds with
  `429 Too Many Requests` and a `rate_limit_error` body
  (`{"error":{"message":"Token has reached its request limit",...}}`) instead of
  forwarding upstream.
- `tokens list` shows a `requests` column as `used/max` (e.g. `42/100`), or
  `used/-` for unlimited tokens.

### Security notes

- The `TOKEN_SECRET` must be kept secure — anyone with the secret can forge tokens
- OAuth tokens from the Claude Code session are never exposed to clients
- Tokens are validated on every request
- Use a strong, random secret (e.g., `openssl rand -hex 32`)
- Pair short TTLs with `max_requests` to give each task a tightly scoped,
  self-expiring credential

## Testing

### Run all tests

```bash
cargo test
```

This runs:
- **Unit tests** in every module under `src/` (44 tests covering config, oauth, token, storage, accounts, openai, metrics, cli)
- **Integration tests** in `tests/integration_test.rs` cover API path routing, OpenAI translation, metrics rendering, and CLI parsing

### Run specific test suites

```bash
# Unit tests only
cargo test --lib

# Integration tests only
cargo test --test integration_test

# A specific test
cargo test test_token_roundtrip

# With verbose output
cargo test -- --nocapture
```

### Code quality checks

```bash
# Check formatting
cargo fmt --check

# Run Clippy lints
cargo clippy --all-targets --all-features

# All checks together
cargo fmt --check && cargo clippy --all-targets --all-features && cargo test
```

### Manual end-to-end testing

Use the provided script to test the router locally:

```bash
# Make the script executable
chmod +x scripts/test-manual.sh

# Run manual tests (starts the router, issues a token, tests endpoints)
./scripts/test-manual.sh
```

Or test manually step by step:

```bash
# Terminal 1: Start the router with a test credential file
mkdir -p /tmp/test-claude
echo '{"accessToken": "test-oauth-token"}' > /tmp/test-claude/credentials.json
export TOKEN_SECRET=test-secret
export CLAUDE_CODE_HOME=/tmp/test-claude
export UPSTREAM_BASE_URL=https://api.anthropic.com
cargo run

# Terminal 2: Test the endpoints

# 1. Health check
curl -s http://localhost:8080/health
# Expected: ok

# 2. Issue a token
TOKEN=$(curl -s -X POST http://localhost:8080/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"ttl_hours": 1, "label": "test"}' | jq -r '.token')
echo "Token: $TOKEN"

# 3. Test proxy with token (will get auth error from Anthropic since test-oauth-token is not real)
curl -s http://localhost:8080/api/latest/anthropic/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model": "claude-sonnet-4-20250514", "max_tokens": 10, "messages": [{"role": "user", "content": "Hi"}]}' | jq .

# 4. Test without token (should get 401)
curl -s http://localhost:8080/api/latest/anthropic/v1/messages | jq .

# 5. Test with invalid token (should get 401)
curl -s http://localhost:8080/api/latest/anthropic/v1/messages \
  -H "Authorization: Bearer la_sk_invalid" | jq .
```

### Run the example

```bash
cargo run --example basic_usage
```

This demonstrates token issuance, validation, and revocation programmatically.

## Project Structure

```
.
├── .github/workflows/
│   └── release.yml           # CI/CD pipeline (lint, test, build, release)
├── changelog.d/              # Changelog fragments (per-PR documentation)
├── docs/                     # Documentation
├── examples/
│   └── basic_usage.rs        # Token management example
├── scripts/
│   ├── test-manual.sh        # Manual end-to-end testing script
│   ├── bump-version.rs       # Version bumping utility
│   ├── check-file-size.rs    # File size validation
│   └── ...                   # Other CI/CD scripts
├── src/
│   ├── lib.rs                # Library root — re-exports modules
│   ├── main.rs               # Binary entry point — Cli dispatch + server setup
│   ├── cli.rs                # `lino-arguments`-based CLI parser + subcommands
│   ├── config.rs             # CLI/env/.lenv configuration
│   ├── crater.rs             # Crater ForgeFed task provider
│   ├── oauth.rs              # Claude Code OAuth credential reader
│   ├── accounts.rs           # Multi-account router (round-robin/priority/least-used + cooldowns)
│   ├── storage.rs            # Persistent token store (text Lino + binary backends)
│   ├── providers.rs          # OpenAI-compatible provider store + encrypted secrets
│   ├── proxy.rs              # Transparent API proxy with token swap, OpenAI shim, ops endpoints
│   ├── openai.rs             # OpenAI <-> Anthropic translation helpers
│   ├── metrics.rs            # Atomic counters, Prometheus rendering, JSON snapshots
│   └── token.rs              # Custom JWT token management (la_sk_...)
├── tests/
│   └── integration_test.rs   # Integration tests
├── Cargo.toml                # Project configuration and dependencies
├── Dockerfile                # Multi-stage Docker build
├── CHANGELOG.md              # Project changelog
├── CONTRIBUTING.md           # Contribution guidelines
├── LICENSE                   # Unlicense (public domain)
└── README.md                 # This file
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding guidelines, and the pull request process.

## License

[Unlicense](LICENSE) — Public Domain. See [LICENSE](LICENSE) for details.
