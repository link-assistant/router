---
bump: patch
---

### Security

- Replace the authenticated upstream catch-all with an explicit inference-route allowlist.
- Authenticate client and proxy-admin routes before body parsing or provider discovery.
- Create and repair audit logs with owner-only permissions on Unix.

### Documentation

- Publish the issue #149 network, data-flow, storage, dependency, and release security review.
