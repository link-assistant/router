---
bump: patch
---

### Fixed
- The Windows CI test job enables Git long paths before checkout, so the repository's 336 paths longer than 200 characters no longer abort the checkout with "Filename too long" under Windows' 260-character limit.
