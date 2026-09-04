---
bump: patch
---

### Added
- Added versioned, secret-free JSON outcomes and opaque transaction resume for credential imports.
- Added a client-scoped `/api/models` catalogue that merges every compatible healthy service with exact native IDs and only provider-reported normalized metadata.
- Added `router usage [anthropic|openai|z-ai] [--json]` and a client-scoped `/api/usage` API for cached, secret-free subscription limits gathered without inference requests.

### Fixed
- Corrected the canonical-route migration guide to document exact model ownership and explicit cross-provider collision failure without invented aliases.
- Accepted Claude Code's native Bearer client credential consistently for model discovery and inference, while keeping the legacy key carrier compatible and giving Router doctor probes an explicit reachability-check identity.
- Completed the private GitHub adapter listener with root `gh` and Git smart-HTTP routes.
- Made the Anthropic API switch own the complete Anthropic namespace, including its model catalogue.
- Kept Router correlation IDs internal to logs so client and provider `x-request-id` headers remain transparent end to end.
- Stopped mapping one z.ai model onto Claude Code's three Anthropic family overrides; z.ai-only setup now pins only the dynamic main and subagent boundaries.
- Removed ingress forwarding and client-IP headers from every shared native upstream path while preserving official client protocol headers unchanged.
- Replaced the obsolete unbound Anthropic curl example with the current Claude-bound token and transparent-header contract.
- Added full-stack denial logging coverage and bounded capture of small rejected JSON bodies, proving client request/response correlation without any upstream or stream-end record.

### Changed
- Updated the pinned Claude Code, Codex, and OpenCode real-client validation dependencies to 2.1.261, 0.153.3, and 1.18.28, respectively.
- Updated every active Cargo dependency and tracked lockfile to the newest resolvable release, including zstd 0.14.0.
