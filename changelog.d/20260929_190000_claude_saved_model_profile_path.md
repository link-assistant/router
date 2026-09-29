---
bump: patch
---

### Fixed
- `router with claude` now reads a `/model` choice from the `settings.json` Claude actually uses in the Router-owned profile (`CLAUDE_CONFIG_DIR` itself), not from a `.claude/settings.json` below it. Previously Router never saw the choice: it pinned `ANTHROPIC_MODEL` over it, and a choice the catalog no longer authorized was silently replaced instead of refused before launch (#630).
