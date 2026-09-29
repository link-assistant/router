---
bump: patch
---

### Fixed
- A local deploy update no longer leaves the relay on the previous Router image. Once the old backend drains and the relay is idle, the relay is replaced by one on the active image and the path through it is verified. Exactly one container publishes the listener, and a failed replacement restores the previous relay. A relay that stays busy is reported as `relay_rotation=deferred` unless `--force-update` is given. `router deploy --status` prints `backend_image`, `relay_image` and `version_skew`, and an ordinary rerun converges a deployment that v1.14.3 left mixed (#627).
