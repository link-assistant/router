---
bump: patch
---

### Fixed
- `auth import <provider> <dir>` reads the directory it was given. The platform store was consulted for any home, and it is a single machine-wide entry that usually holds the newest credential, so on macOS it beat every explicitly named source: no spelling of the command reached the file the operator pointed at (issue #285). The report was honest about it — it named the Keychain — which made the behaviour easy to miss and no less wrong. The store is now consulted only when the source is the vendor's own home, the same condition the serving path already applies, so an unqualified `auth import claude` still adopts a live Keychain credential sitting beside a stale file (issue #249) while a named directory means *this* credential from *there*.
- Naming a source directory no longer collapses a pool of per-account credential directories onto whichever account happens to be logged in interactively. This is the risk `is_vendor_default_home` exists to prevent on the serving path; import writes the credential a deployment then serves, so it had the identical exposure and no equivalent guard.
