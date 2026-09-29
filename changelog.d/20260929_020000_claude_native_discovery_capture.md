---
bump: patch
---

### Fixed
- The hermetic Claude Code capture no longer fails intermittently on Claude Code 2.1.284 with "Claude Code must discover models through the authenticated native Anthropic route". The `GET /api/models` it saw was the `router with` wrapper's own catalog read, which uses the Router token as `x-api-key`. Claude's own gateway discovery is an unawaited startup task, so a short `-p` run can exit before sending it. The split-auth check now accepts either credential shape on a catalog read and still forbids every other model route. The model-selector scenario, which waits for the TUI, continues to require Claude's native `GET /api/services/anthropic/v1/models` with only the Router bearer token. The capture now also covers exact z.ai rows that have no verified capability metadata, and the newer-release job runs against 2.1.284 (#617).
