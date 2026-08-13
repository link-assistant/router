---
bump: patch
---

### Security

- Redact credentials in request-log query strings, camelCase and common secret fields, unlisted credential headers, and values shaped like known tokens or JWTs.
- Create request logs with owner-only permissions on Unix and repair permissive modes on existing logs.

### Fixed

- Requests larger than the 10 MiB logging buffer now continue to their handler with the body omitted from the log instead of being rejected with `413 Payload Too Large` by observability middleware.
