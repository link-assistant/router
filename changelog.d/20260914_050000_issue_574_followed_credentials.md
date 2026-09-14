---
bump: minor
---

### Added
- `auth status` now reports *which store is real* for every subscription: `following` a vendor credential home, a `copy` taken at import time, `external` for a credential Router may read but not rotate, or `source-gone` when a followed home has been removed. A deployment and the vendor CLI beside it hold links in one rotating refresh chain, and whoever redeems a link invalidates it for every other holder — so an operator who cannot tell a followed credential from a copy has to infer which store the deployment is actually using, and the inference is wrong exactly when it matters (issue #574).
- `auth import --follow` requires that the credential be followed rather than copied. Following is already what an import does whenever it can: it installs a reference to the vendor client's own credential file, so both processes advance one chain and a rotation by either is visible to the other with no re-import and no restart. The flag turns that preference into a requirement — where a reference is impossible (the credential lives only in the platform keychain, names no writable source, or its directory cannot be replaced atomically) the import refuses at preflight and names the obstacle, instead of silently installing a copy that will drift into `invalid_grant`. `auth import --snapshot` asks for that one-time copy deliberately, and an import that falls back to one now says so and explains that it will need re-importing.

### Fixed
- A followed credential home that has been removed is reported as `source-gone`, with a warning naming the missing path, rather than surfacing as a path-bearing internal read error. The deployment holds no usable credential for that provider in this state — it does not fall back to a stale copy — and saying so is the difference between a deployment that looks healthy and one an operator can fix.
