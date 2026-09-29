---
bump: minor
---

### Added
- `router deploy` labels each backend with a keyed fingerprint of its `TOKEN_SECRET`, and `router deploy --status` reports `token_secret=matches|changed|unknown` without printing the secret (#625).
- Every update shows the candidate a short-lived token signed with the running deployment's secret before cutover; a candidate that rejects it is rolled back and the old backend keeps serving (#625).

### Fixed
- A deploy with a different `TOKEN_SECRET` is no longer reported as "already converged", and an image update with a mistaken secret no longer replaces the backend and breaks every issued client token. Both are refused before any mutation. `--force-update` with the saved secret recovers a stranded deployment on the same image, with no manual container removal (#625).
