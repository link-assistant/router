---
bump: patch
---

### Fixed
- `router deploy --status` no longer exits 1 when the relay and backend are running without a durable active record. It prints read-only diagnostics: the record's condition, the relay pointer, any pending transaction, every owned container with its role, image, launch specification, port and Claude credential source, the connection count and the run inventory. It then gives a recovery plan. The next `router deploy` adopts a proven topology under the update lock, keeps a corrupt record aside, and changes no container, so streams and issued tokens survive (#631).
