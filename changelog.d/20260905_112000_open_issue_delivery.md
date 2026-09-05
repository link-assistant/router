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
