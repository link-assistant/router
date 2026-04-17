# Case Study: Full LLM Gateway Compliance

## Issue

[Issue #5](https://github.com/link-assistant/router/issues/5) — Double check we fully support all use cases and requirements of the Claude Code LLM Gateway specification.

## Source

<https://code.claude.com/docs/en/llm-gateway>

## Requirements Analysis

The Claude Code LLM Gateway documentation specifies three API formats that a compliant gateway must support, plus additional header and body field requirements.

### Requirement 1: Anthropic Messages API Format

**Endpoints:**
- `POST /v1/messages`
- `POST /v1/messages/count_tokens`

**Header forwarding (required):**
- `anthropic-beta`
- `anthropic-version`

**Status before fix:** Partially supported. The router proxied all requests via `/api/latest/anthropic/*` which maps to the upstream Anthropic API. However, it did not explicitly expose `/v1/messages` or `/v1/messages/count_tokens` as documented gateway endpoints. Claude Code clients configured with `ANTHROPIC_BASE_URL` pointing at the router would send requests to `/v1/messages`, which only worked because the fallback route caught them.

**Solution:** Add explicit route handling for `/v1/messages` and `/v1/messages/count_tokens` that forward directly to the upstream API at the same paths. Ensure `anthropic-beta` and `anthropic-version` headers are always forwarded.

### Requirement 2: Bedrock InvokeModel API Format

**Endpoints:**
- `POST /invoke`
- `POST /invoke-with-response-stream`

**Body field preservation (required):**
- `anthropic_beta`
- `anthropic_version`

**Status before fix:** Not supported. The router only targeted the Anthropic API.

**Solution:** Add Bedrock-format route handling. When `UPSTREAM_API_FORMAT` is set to `bedrock` or when Bedrock-specific routes are hit, forward to the configured upstream preserving all body fields including `anthropic_beta` and `anthropic_version`. The router already streams request bodies through without modification, so body fields are preserved by default.

### Requirement 3: Vertex AI rawPredict API Format

**Endpoints:**
- `POST *:rawPredict`
- `POST *:streamRawPredict`
- `POST */count-tokens:rawPredict`

**Header forwarding (required):**
- `anthropic-beta`
- `anthropic-version`

**Status before fix:** Not supported.

**Solution:** Add Vertex-format route handling. When Vertex-specific routes are hit, forward to the configured upstream preserving headers.

### Requirement 4: Session Tracking Header

**Header:** `X-Claude-Code-Session-Id`

Claude Code includes this header on every API request. Gateways should forward it for session aggregation.

**Status before fix:** Forwarded by default (the proxy copies all non-hop-by-hop headers). However, it was not explicitly documented or logged.

**Solution:** Add verbose logging of this header for observability. Ensure it is never stripped.

### Requirement 5: Authentication Configuration

Claude Code supports multiple authentication methods:
- `ANTHROPIC_AUTH_TOKEN` — static API key sent as `Authorization` header
- `apiKeyHelper` — dynamic key helper script
- `ANTHROPIC_BASE_URL` — custom endpoint URL

**Status before fix:** The router validates incoming tokens with its own JWT system (`la_sk_` prefix) and swaps them for OAuth tokens. This is compatible — clients set `ANTHROPIC_BASE_URL` to the router and use router-issued tokens as their `ANTHROPIC_AUTH_TOKEN`.

**Solution:** No changes needed for basic auth flow. Document the configuration pattern.

### Requirement 6: Verbose Logging

The issue requests lazy logging via the [log-lazy](https://github.com/link-foundation/log-lazy) library with `--verbose` mode support.

**Solution:** Integrate `log-lazy` crate alongside existing `tracing`. Use `log-lazy` for detailed request/response logging that is only evaluated when verbose mode is active. Add `--verbose` CLI flag and `VERBOSE` env var support.

## Existing Solutions and Libraries

| Component | Library | Purpose |
|-----------|---------|---------|
| Lazy logging | [log-lazy](https://crates.io/crates/log-lazy) v0.1.0 | Closure-based lazy message evaluation |
| HTTP proxy | [reqwest](https://crates.io/crates/reqwest) v0.12 | Already used for upstream requests |
| Streaming | [futures-util](https://crates.io/crates/futures-util) v0.3 | Already used for SSE streaming |
| JWT tokens | [jsonwebtoken](https://crates.io/crates/jsonwebtoken) v9.0 | Already used for token management |

## Solution Plan

1. Add `log-lazy` dependency and integrate with `--verbose` / `VERBOSE` env var
2. Refactor proxy to support multiple API formats (Anthropic, Bedrock, Vertex)
3. Add explicit routes for all three API formats
4. Ensure required headers (`anthropic-beta`, `anthropic-version`) are never stripped
5. Add verbose logging of session IDs, headers, and request details
6. Add comprehensive tests for each API format
7. Update documentation
