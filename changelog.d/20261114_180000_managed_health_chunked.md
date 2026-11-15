---
bump: patch
---

### Fixed
- `server start` now recognizes the managed Router container as healthy. It waited for an `/api/health` response that ends in `ok`, but Router's request-log layer re-streams every body, so the `ok` arrives with `transfer-encoding: chunked` as `2\r\nok\r\n0\r\n\r\n` and the start gave up after 20 seconds with "managed router container did not become healthy". The new `health_response::is_ready` decodes a chunked or length-delimited body and accepts only a 200 whose body is exactly `ok`. The managed-server test's health mock now sends Router's chunked answer, so it fails without the fix.
