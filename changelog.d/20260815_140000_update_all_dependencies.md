---
bump: minor
---

### Changed
- Updated all active Rust and admin UI dependencies to their latest stable releases, including jsonwebtoken 11, React 19.2.8, and Vite 8.
- Raised the minimum supported Rust version to 1.88, aligned CI on Rust 1.97.1, and moved container builds and runtime images to Debian 13 (Trixie).
- Added weekly grouped Dependabot updates for the admin UI, upgraded the pre-commit hooks to v6, and made the full hook suite pass without rewriting archived evidence or generated bundles.
