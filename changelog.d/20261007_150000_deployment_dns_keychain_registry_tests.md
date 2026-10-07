bump: patch

### Fixed
- Keep named local and remote deployment backend names within Docker DNS bounds for every accepted instance length.
- Probe the selected Claude profile's Keychain presence without requesting its password during host status or planning, and isolate fixture probes.
- Verify bounded request-log append accounting deterministically under parallel test contention.
- Retry registry delivery using the existing attested release assets, verify registry distribution hashes and exact-version imports, and retain fail-closed stable promotion.
