---
bump: patch
---

### Fixed
- Token rejections state the facts behind them. `client_message` was a `const fn` returning `&'static str`, so the type itself made every message factless: a user whose day-long session died at the moment they were using it was told what kind of thing went wrong and never a single number about their own token. Expiry now says when the token was issued, how long it was good for, when it lapsed and how long ago; a spent request or token budget says used, limit, and which flag raises it. The router was holding all of those when it wrote the line (issue #355).
- The wording without facts is unchanged, so a rejection is still returned when the store cannot be read rather than being replaced by a storage failure.
