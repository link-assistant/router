---
bump: patch
---

### Fixed
- Explicit `auth import <provider> <dir>` sources now stay authoritative when the named directory is not the vendor's default home, even when the machine-wide platform credential is newer.
