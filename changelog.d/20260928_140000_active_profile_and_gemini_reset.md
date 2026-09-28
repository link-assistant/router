---
bump: patch
---

### Fixed
- `router clients backup`, `reset`, `backup restore` and `update` no longer refuse because an unrelated `claude`, `codex` or other client process is running. On Linux and macOS a running client now blocks only the profile it can write, read from its own `HOME`, config-directory overrides and Router-owned roots; a process whose environment cannot be read still blocks, with a message naming the process and reason. Windows keeps refusing on any running client because it does not expose the environment (#610).
- `router clients reset gemini --profile router` now removes the Router-owned `home/.gemini/settings.json` that `router with gemini` reads, reports it as a target, and reports `unchanged` with the checked paths instead of claiming `reset` when there is nothing to remove (#611).
