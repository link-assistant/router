# Pluribus

[![Rust](https://img.shields.io/badge/rust-stable-orange.svg)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A lightweight API gateway that exposes Claude Code subscriptions as standard Anthropic Messages API.

## Features

- **Client Spoofing** - Replicates Claude Code official client signatures (User-Agent, headers, beta flags, auto-fetched version)
- **Identity Injection** - Injects official Claude Code system prompt to bypass detection
- **Tool Name Mapping** - Maps third-party tool names (OpenCode) to Claude Code conventions to bypass detection
- **OAuth Authentication** - Standard OAuth 2.0 PKCE flow with automatic token refresh
- **Multi-Account** - Round-robin request distribution across multiple accounts
- **Rate Limit Tracking** - Monitors 5-hour / 7-day quota windows

## Quick Start

### Build

```bash
git clone https://github.com/Arasple/pluribus.git
cd pluribus
cargo build --release
```

### Configure

```bash
cp .env.example .env
# Edit PLURIBUS_SECRET in .env
```

### Login

```bash
pluribus login claude-code
pluribus login claude-code --name work      # optional: named accounts
```

### Run

```bash
pluribus serve
# Listening on http://0.0.0.0:8080
```

## Usage

### Messages API

```bash
curl http://localhost:8080/anthropic/v1/messages \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

Supports both streaming and non-streaming requests.

### Health Check

```bash
curl http://localhost:8080/health
```

Returns service status and rate limit info for all accounts.

## Configuration

| Variable          | Default   | Description               |
| ----------------- | --------- | ------------------------- |
| `PLURIBUS_HOST`   | `0.0.0.0` | Listen address            |
| `PLURIBUS_PORT`   | `8080`    | Listen port               |
| `PLURIBUS_SECRET` | -         | API access key (required) |

Account credentials are stored in `./providers/*.toml`.

## Disclaimer

> For educational and research purposes only.  
> Using this software may violate [Anthropic Terms of Service](https://console.anthropic.com/legal/terms) and [Anthropic Usage Policy](https://console.anthropic.com/legal/aup), which could result in account suspension or permanent ban. Use at your own risk.

## License

MIT - See [LICENSE](LICENSE)
