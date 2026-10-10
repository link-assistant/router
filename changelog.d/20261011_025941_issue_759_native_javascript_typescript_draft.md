---
bump: minor
---

### Added

- Opt-in native JavaScript runtime and CLI for Node and Bun, with subsets of token/provider administration, account routing, Claude/Codex credential adoption, Claude code authorization, managed Node daemons, inference protocols and foreground Responses resources. The existing Rust wrapper API remains available.
- Automated bulk JavaScript/TypeScript translation drafts with forward and reverse source inventories. Unsupported constructs remain explicitly carried, and full Rust runtime parity remains unverified.

### Changed

- Run JavaScript/TypeScript binding, translation, type and native behavior checks before Rust validation in CI. A strict parity gate keeps Rust checks blocked while partial or unsupported operations, HTTP routes, native features or carried translation logic remain.
