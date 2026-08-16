---
bump: minor
---

### Fixed
- `clients remove` now revokes the router token that `clients setup` minted before deleting the local credential file. Previously the file disappeared while the token stayed valid, so any copy of it kept working access to the router (issue #190).

### Added
- `clients setup` records secret-free credential metadata (`<client>.credential.json`, mode 0600) describing whether the token was minted or supplied and which token record it is.
- `clients remove --revoke-supplied` also revokes an operator-supplied token; without it, supplied tokens are left alone.
- `clients remove --force` deletes the local settings even when revocation fails. Without it, a failed revocation keeps the credential file, prints recovery instructions, and exits nonzero instead of reporting successful removal.
