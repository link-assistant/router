---
bump: patch
---

### Added
- Added versioned, secret-free JSON outcomes and opaque transaction resume for credential imports.
- Added a client-scoped `/api/models` catalogue that merges every compatible healthy service with exact native IDs and only provider-reported normalized metadata.
- Added `router usage [anthropic|openai|z-ai|lefine] [--json]` and a client-scoped `/api/usage` API for cached, secret-free subscription limits gathered without inference requests.

### Fixed
- Corrected the canonical-route migration guide to document exact model ownership and explicit cross-provider collision failure without invented aliases.
- Preserved Gemini's provider-reported `models/` prefix as the sole aggregate catalogue identifier and removed the redundant `native_id` field while keeping native Gemini resource paths routable.
- Accepted Claude Code's native Bearer client credential consistently for model discovery and inference, while keeping the legacy key carrier compatible and giving Router doctor probes an explicit reachability-check identity.
- Completed the private GitHub adapter listener with root `gh` and Git smart-HTTP routes.
- Made the Anthropic API switch own the complete Anthropic namespace, including its model catalogue.
- Kept Router correlation IDs internal to logs so client and provider `x-request-id` headers remain transparent end to end.
- Stopped mapping one z.ai model onto Claude Code's three Anthropic family overrides; z.ai-only setup now pins only the dynamic main and subagent boundaries.
- Removed ingress forwarding, client identity, and dynamically nominated hop-by-hop headers from every shared native upstream path while preserving official client protocol headers unchanged.
- Replaced the obsolete unbound Anthropic curl example with the current Claude-bound token and transparent-header contract.
- Added full-stack denial logging coverage and bounded capture of small rejected JSON bodies, proving client request/response correlation without any upstream or stream-end record.
- Bound cached usage evidence to the current credential/provider configuration, retried one rejected native usage request through the shared refresh transaction, and matched the official Claude Code and Codex usage-request identities.
- Redacted OAuth refresh failures at ingestion so response bodies and headers cannot reach errors, health, doctor, recovery diagnostics, or logs.
- Required positive live validation even for disabled z.ai and Lefine replacement candidates, rejected plaintext Lefine keys in imports, selected a stored Lefine usage provider independently of the routing default, and made remote provider provisioning return the same secret- and identity-free outcome as the API.
- Made provider and credential replacement recoverable across rename, directory-sync, commit-marker, invalidation, unlock, and restart boundaries; late failures now restore the prior primary while completed writes remain unambiguous.
- Refused refresh-token exchange when the authoritative credential is owned by a platform store Router cannot update, and validated imported external credentials without spending their source refresh links.

### Changed
- Updated the pinned Claude Code, Codex, and OpenCode real-client validation dependencies to 2.1.261, 0.153.3, and 1.18.28, respectively.
- Updated every active Cargo dependency and tracked lockfile to the newest resolvable release, including zstd 0.14.0.
