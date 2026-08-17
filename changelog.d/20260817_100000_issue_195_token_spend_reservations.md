### Fixed
- A per-token `max_tokens` cap can no longer be overshot by a single response. The router now reserves each request's declared output budget before dispatching it and settles the reservation against the usage the provider actually reported, so a request whose budget cannot fit is rejected up front instead of completing and pushing the persisted total past the cap. Reservations are taken inside the same atomic read-modify-write that counts the request, so concurrent requests cannot overshoot together, and they are released when a request fails, is cancelled, or reports no usage. Enforcement covers Responses, Chat Completions, Anthropic Messages, Gemini, Gonka, Crater, and every OpenAI-compatible provider.

### Added
- `tokens list` shows reserved spend alongside actual spend, and reservations orphaned by an unclean shutdown are released at startup.
