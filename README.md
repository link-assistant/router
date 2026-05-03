# Link.Assistant.Router

A Rust-based API gateway that proxies Anthropic (Claude) APIs through a Claude MAX OAuth session, providing multi-tenant access via custom-issued tokens.

[![CI/CD Pipeline](https://github.com/link-assistant/router/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/link-assistant/router/actions)
[![Rust Version](https://img.shields.io/badge/rust-1.70%2B-blue.svg)](https://www.rust-lang.org/)
[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](http://unlicense.org/)

## Overview

Link.Assistant.Router is a transparent proxy that sits between API clients (such as Claude Code) and the Anthropic API. It is the OpenRouter-equivalent for Claude MAX accounts: every feature found in the community Claude proxies is available behind a single configurable surface.

- **Proxies all Anthropic API requests** transparently, including SSE/streaming responses
- **Supports Claude MAX (OAuth)** by reading Claude Code session credentials
- **OpenAI-compatible endpoints** — `/v1/chat/completions`, `/v1/responses`, `/v1/models` translate to and from Anthropic Messages
- **Multi-account routing** — pool any number of Claude MAX accounts; round-robin / priority / least-used; automatic cooldowns on 429
- **Issues custom `la_sk_...` JWT tokens** with expiration and revocation for multi-tenant access
- **Persistent token store** — text (Lino) **and** binary backends, both on by default; tokens survive restarts
- **Live observability** — Prometheus `/metrics`, JSON `/v1/usage`, per-account health at `/v1/accounts`
- **`lino-arguments` + `.lenv`** — every flag has an env-var alias and an optional `.lenv` file fallback
- **First-class CLI** — `serve`, `tokens issue|list|revoke|expire|show`, `accounts list`, `doctor` subcommands
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

It reads the `accessToken` (or `access_token`, `oauthToken`, `oauth_token`) field from the first file found.

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
3. Forward the request to `https://api.anthropic.com/v1/messages`
4. Stream the response back to the client

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
| `/v1/chat/completions` | POST | Chat Completions, translated to Anthropic Messages |
| `/v1/responses` | POST | Responses API, translated to Anthropic Messages |
| `/v1/models` | GET | OpenAI-shaped model list (Claude IDs) |

`gpt-4o`, `gpt-4o-mini`, `gpt-4`, and the `o*` reasoning families auto-map to the Claude Sonnet / Haiku / Opus tiers respectively. Native `claude-*` IDs pass through unchanged.

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

- Validates the `Authorization: Bearer la_sk_...` token
- Replaces it with the real OAuth token
- Forwards all headers (except `host`, `authorization`, `connection`, `transfer-encoding`)
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

Configuration is read from CLI flags, environment variables, and an optional `.lenv` file (loaded automatically by `lino-arguments` if present in the working directory). Any flag listed in `--help` has an env-var alias and a `.lenv` key with the same name (e.g. `--token-secret` ⇔ `TOKEN_SECRET` ⇔ `token-secret = ...`).

### Core

| Flag / env | Default | Required | Description |
|---|---|---|---|
| `--token-secret` / `TOKEN_SECRET` | — | Yes | Secret key for signing/validating JWT tokens |
| `--port` / `ROUTER_PORT` | `8080` | No | Port to listen on |
| `--host` / `ROUTER_HOST` | `0.0.0.0` | No | Host/IP to bind to |
| `--claude-code-home` / `CLAUDE_CODE_HOME` | `~/.claude` | No | Primary Claude Code credentials directory |
| `--upstream-base-url` / `UPSTREAM_BASE_URL` | `https://api.anthropic.com` | No | Upstream Anthropic API URL |
| `--api-format` / `UPSTREAM_API_FORMAT` | (auto) | No | Restrict the proxy to `anthropic` / `bedrock` / `vertex` |
| `--verbose` / `VERBOSE` | `false` | No | Verbose tracing |

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

### CLI subcommands

```bash
# Default: starts the HTTP server (same as `serve`).
link-assistant-router

# Issue / list / revoke / show tokens locally (no HTTP needed):
link-assistant-router tokens issue --ttl-hours 168 --label alice
link-assistant-router tokens list
link-assistant-router tokens revoke <id>
link-assistant-router tokens show <id>

# Inspect configured accounts:
link-assistant-router accounts list

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

## Token System

The router uses JWT-based custom tokens with the `la_sk_` prefix.

### Token lifecycle

1. **Issue**: `POST /api/tokens` creates a signed JWT with a UUID subject, expiration, and optional label
2. **Validate**: Each proxy request extracts the `Authorization: Bearer la_sk_...` header, strips the prefix, and verifies the JWT signature and expiration
3. **Revoke**: Tokens can be revoked by their subject ID (stored in-memory; revocations are lost on restart)

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

### Security notes

- The `TOKEN_SECRET` must be kept secure — anyone with the secret can forge tokens
- OAuth tokens from the Claude Code session are never exposed to clients
- Tokens are validated on every request
- Use a strong, random secret (e.g., `openssl rand -hex 32`)

## Testing

### Run all tests

```bash
cargo test
```

This runs:
- **Unit tests** in every module under `src/` (44 tests covering config, oauth, token, storage, accounts, openai, metrics, cli)
- **Integration tests** in `tests/integration_test.rs` (39 tests covering API path routing, OpenAI translation, metrics rendering, and CLI parsing)

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
│   ├── oauth.rs              # Claude Code OAuth credential reader
│   ├── accounts.rs           # Multi-account router (round-robin/priority/least-used + cooldowns)
│   ├── storage.rs            # Persistent token store (text Lino + binary backends)
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
