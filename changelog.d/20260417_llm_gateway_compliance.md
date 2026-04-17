### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields
