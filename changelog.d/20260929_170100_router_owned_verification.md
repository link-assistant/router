---
bump: minor
---

### Added
- `rust-script scripts/verify-contracts.rs` runs Router's own tests for the contracts downstream projects depend on: token-authorized catalogs, real-client wrappers, z.ai-only and Anthropic entitlements, request logs, backup/reset/restore and rolling updates. It writes one `link-assistant-router/verification/v1` JSON result with each area's status and skipped tests. `parity` is true only when nothing failed or skipped, and `--require-parity` exits nonzero otherwise (#629).

### Fixed
- Real-client, host-CLI, Lefine and billed z.ai probe tests no longer return early without a word when their switch or key is absent. They announce and count the skip like every other tier (#629).
