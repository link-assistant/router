---
bump: patch
---

### Changed
- Let the temporary manual translation development lane admit same-SHA Rust CI once every active manual stage (native Node, native Bun, strict TypeScript, UI builds) passes. The `rust_allowed` output is now derived from the aggregate job instead of a literal `false`; Rust failures stay fatal, strict parity stays unverified, and local Rust tools stay forbidden.
