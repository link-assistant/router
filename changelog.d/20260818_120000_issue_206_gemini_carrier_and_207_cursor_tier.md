---
bump: minor
---

### Fixed
- Gemini CLI now authenticates against the router. The documented setup in `docs/use-cases/cli-gemini-cli.md` sends the task token as `x-goog-api-key` — the carrier Google's own API documents, and what `GEMINI_API_KEY` becomes — which the router did not accept, so every request returned `401` while the identical token in `Authorization: Bearer` returned `200`. The header is now accepted anywhere a client token is, on every surface.
- A refused request is now refused in the dialect of the surface it arrived on. A Gemini client received an Anthropic-shaped error envelope it could not report usefully; authentication failures on `/api/gemini/**` and `/api/vertex/**` now carry Google's `error.code` / `error.status` shape, as other errors on those routes already did.
- The `401` names the carriers the router accepts instead of naming only two of them. A valid token in the wrong header was indistinguishable from an invalid token, which is what made this expensive to diagnose.

### Security
- Every header that can carry the router's own client token is now stripped before a request is forwarded to a vendor, and before a vendor response is relayed to a client. `x-goog-api-key` was previously copied through on the Anthropic pass-through path, so accepting it as a credential without this change would have leaked the router's client token upstream.

### Changed
- The `?key=<token>` query parameter that some Google clients support is explicitly refused rather than silently unrecognised, and the refusal says why: a token in a URL is recorded by proxies, access logs and shell history, none of which is true of a header. The behaviour is pinned by a test so it cannot flip silently.
- Cursor CLI is documented as **not implemented** rather than "unsupported by design". The technical finding is unchanged and still holds — `cursor-agent` speaks a private, unversioned Connect-RPC protocol, so an HTTP model proxy sees no matching route — but "unsupported" read as "will never work", which is a stronger claim than the evidence supports. `docs/use-cases/cli-cursor.md` now scopes what a minimal version-pinned adapter would have to cover as a reviewable checklist, and documents the TLS-proxy route as an advanced, opt-in, unverified configuration with its security cost stated in full. `with cursor` still fails before launch, and now points at that document.
