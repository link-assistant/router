---
bump: minor
---

### Fixed
- Document the registered GitHub REST, GraphQL, and Git routes exactly.
- Strip `anthropic-auth-token` credentials in both proxy directions while preserving unrelated native protocol headers.
- Deduplicate repeated exact z.ai catalog records without hiding the provider, while retaining cross-provider collision safety.
- Align the canonical-route migration guide with the narrow current Claude z.ai-only main/subagent fallback behavior.
- Preserve usage-window durations in human output and authenticate unknown provider paths before revealing route validity.
- Bound vendor and Router usage bodies while reading their streams, and reject empty or error-shaped 200 responses as unverified.
- Cap untrusted `Retry-After` cooldowns at 24 hours and use checked instant arithmetic.
- Coalesce concurrent usage requests by token, provider, principal, and credential generation.
- Keep the normal Lefine live credential gate catalog-only, with explicit run/skip output and a separate inference opt-in.
- Stream GitHub REST, GraphQL, and Git smart-HTTP response bodies without whole-response buffering, preserving mid-stream failures.
- Keep translated model and dropped-tool diagnostics in local logs instead of emitting Router-private response fields or headers.
- Preserve safe end-to-end client metadata on ordinary OpenAI-compatible Chat Completions and Responses requests while replacing credentials.
- Honor `GEMINI_CLI_HOME`, prefer Claude Code's canonical credential file over legacy fallbacks, and select `gh` credentials only for the configured GitHub host.
- Make `--home` an isolation boundary for every vendor credential reader and local client command.
- Use one non-inference provider-acceptance check for local and remote auth status, distinguishing usable, rejected, unverified, absent, and refresh-failed states.
- Validate imported rotating refresh chains in an isolated durable store and promote Router-owned successors, including newer Claude Keychain credentials.
- Persist the management origin that issued a managed client credential and revoke through it before `clients remove` deletes local files.
- Stream Gemini subscription Chat Completions and native `streamGenerateContent` incrementally from Code Assist, preserving ordered text, tools, finish reasons, usage, errors, and cancellation.
- Refresh the complete compatible Cargo lockfile and the pinned Bun runtime image; verify every direct Rust/UI package, workflow action, hook, and other container base against its latest release.
