---
bump: minor
---

### Fixed
- Document the registered GitHub REST, GraphQL, and Git routes exactly.
- Strip `anthropic-auth-token` credentials in both proxy directions while preserving unrelated native protocol headers.
- Deduplicate repeated exact z.ai catalog records without hiding the provider, while retaining cross-provider collision safety.
- Align the canonical-route migration guide with the narrow current Claude z.ai-only main/subagent fallback behavior.
