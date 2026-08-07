### Added

- Router-driven refresh for Claude subscription tokens. An expired
  `~/.claude` access token is now renewed by exchanging the `refreshToken`
  from the nested `claudeAiOauth` block against Anthropic's token endpoint,
  the same way `src/refresh.rs` already handled Codex, Gemini, and Qwen. The
  result is kept **in memory only**, so a container whose `CLAUDE_CODE_HOME`
  is mounted read-only keeps working past expiry without a Claude CLI inside
  the image (#48).
- A `with-claude-cli` image variant that layers Node.js and the Claude Code
  CLI on top of the runtime image, published on each release as
  `:with-claude-cli` and `:<version>-with-claude-cli` on both GHCR and Docker
  Hub. It makes a first-time `claude /login` possible from inside a
  container; the default image stays minimal.

### Documentation

- README and `docs/use-cases/self-hosting.md` now state which credential
  operations work with a read-only `CLAUDE_CODE_HOME` mount (serving
  requests, renewing an expired token) and which need a writable one plus the
  CLI (first-time login), and include a derived-image recipe for adding the
  CLI to the published minimal image.
