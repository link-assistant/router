---
bump: patch
---

### Fixed

- Normalise a string `input` on `/v1/responses` into the typed single-turn list the ChatGPT backend requires, so both documented forms work again instead of drawing `Input must be a list` (HTTP 400).
- Treat `expiresAt` as a hint rather than a verdict: a stamped-expired credential stays routable until an upstream actually rejects it (HTTP 401/403), catalog refreshes are attempted with it and fall back to the last known models on failure, and `doctor` reports `invalid_grant` refresh failures as "re-authenticate" instead of "expired".
