---
bump: minor
---

### Added

- Release now publishes attested, checksummed `darwin-arm64` and `darwin-amd64` binaries alongside the Linux archives, with a documented install/update path in the README
- `clients setup` accepts an existing router token via `--token-stdin` or the documented `LINK_ASSISTANT_ROUTER_TOKEN` (alias `LINK_ASSISTANT_TOKEN`) variable, so tokens no longer need to appear in argv
- `clients --home DIR` runs the whole setup/show/doctor/remove lifecycle against an isolated configuration root that ignores real user settings and ambient token variables
- A macOS release job runs the host CLI lifecycle against a remote router through an SSH-forwarded localhost port

### Fixed

- Client diagnostics are redacted, so router error bodies or transport errors can no longer echo a router token
