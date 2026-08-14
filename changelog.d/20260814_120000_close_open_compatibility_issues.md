---
bump: minor
---

### Added
- Added native server-side web tool translation across Anthropic Messages, OpenAI Chat Completions, and Responses, including tool identity and usage accounting.
- Added opt-in GitHub REST/GraphQL credential proxying with policy-controlled destructive operations, a hardened reverse-SSH tunnel image, and optional real-client smoke tests.
- Added configurable proxy request-body limits independent of bounded request logging.

### Changed
- Updated managed client defaults, reasoning levels, model catalogs, diagnostics, argument boundaries, and cleanup behavior for Claude Code, Codex, Gemini, Qwen, Grok CLI, and Cursor.
- Hardened native and container release workflows with immutable action pins, reproducible native artifacts, checksums, SBOMs, and provenance attestations.

### Fixed
- Preserved function/tool call IDs, prior tool history, actual served models, quota headers, dialect-specific errors, stop sequences, and streaming SSE state across protocol bridges.
- Made text, binary, and dual token storage safe across concurrent processes with advisory locking, atomic durable writes, and crash-recovery journaling.
- Corrected Cursor protocol documentation and removed obsolete router-generated warning headers.

### Security
- Prevented caller GitHub credentials and upstream plan/entitlement metadata from crossing trust boundaries while retaining safe rate and consumption headers.
