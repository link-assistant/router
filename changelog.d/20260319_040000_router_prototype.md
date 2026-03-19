### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment
