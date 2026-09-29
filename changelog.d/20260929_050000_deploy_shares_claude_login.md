---
bump: patch
---

### Added
- `router deploy --claude-credentials share` lets a local deployment use this machine's Claude Code login. It mounts the Claude Code home (`$CLAUDE_CONFIG_DIR`, else `~/.claude`) in place, read-write, and runs the backend as the credential file's owner. Refresh tokens are never copied: a rotation by either the host CLI or Router is the other's next read, so neither side gets logged out. The mode is recorded on the backend. An update without the flag keeps it, and switching modes is a normal candidate-first update (#622).

### Fixed
- `router deploy` no longer leaves Anthropic silently absent while `/api/health` stays green. The status output now prints an `anthropic_credential=` line. It says whether the login was skipped (and how to opt in), shared (with `refresh_tokens_copied=0`) or refused. `share` is refused before any container changes, with exit code 2 and the reason, in these cases: there is no usable Claude.ai OAuth login; the home cannot be written; the login lives only in the macOS Keychain, which a container can neither read nor update; or earlier root-owned data needs a `chown`. Credential bytes are never printed (#622).
