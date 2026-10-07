---
bump: patch
---

### Fixed
- Distinguish known models with unavailable provider credentials (HTTP 503 / `account_unavailable`) from unknown models and unauthorized Router client tokens, with safe provider re-authentication guidance.
- Preserve redacted local error response bodies in request files, including early authentication, permission, and routing denials, while retaining requested models and existing credential replacement and account-pool rules.
