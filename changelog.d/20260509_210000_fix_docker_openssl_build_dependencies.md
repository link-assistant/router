---
bump: patch
---

### Fixed
- Installed native OpenSSL build dependencies in the Docker builder stage so release image publishing can compile crates that use `openssl-sys`.
