---
bump: patch
---

### Fixed

- Submit Claude TUI authorization codes as bracketed paste and wait for the input to settle before pressing Enter, preventing long codes from being corrupted.
- Report the CLI's OAuth rejection immediately and distinguish it from a genuine login timeout.
