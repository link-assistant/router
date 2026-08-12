---
bump: patch
---

### Fixed

- Persist and consume Claude PKCE login state so `auth claude --code` redeems the authorization it was issued for without starting a different login.
