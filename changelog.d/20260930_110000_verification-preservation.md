---
bump: minor
---

### Added
- Namespaced local staging deployments with private state, bounded diagnostics, resource limits and ownership-restricted cleanup.
- Bounded non-OAuth deployment checkpoints and offline additive or explicit replacement restore, retaining a pre-restore checkpoint.
- Separate live mixed-provider entitlement verification and pre-compilation version preparation for Claude Code, Codex and OpenCode.
- Read-only merged-source delivery reports and explicit recovery of partial releases without overwriting existing publication identities.

### Fixed
- Prefer an authorized GLM-5.3 for fresh z.ai-only Claude profiles while preserving saved and explicit model choices.
- Replace copied system executables in active-profile tests with a portable fixture and report early process exits.
- Refuse native macOS vendor verification before version, doctor or TUI calls when credential-store isolation is unavailable; terminate owned Unix process groups and Windows diagnostic jobs on cancellation.
- Prevent empty replacement token restores from reviving stale text-store records.
- Validate credential sources, existing signed client tokens and each token's provider catalog before local, remote and host migration cutover. Report explicit access-loss overrides separately from connection force.
