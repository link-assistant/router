---
bump: patch
---

### Fixed

- Codex 0.157 and newer start through Router again. Their TUI failed with `account/read failed: workspace routing discovery failed` because Router did not answer `wham/accounts/check`. Router now answers it itself and lists only the selected subscription account under the same opaque handle that `whoami` reports, so real upstream account ids still never reach the client (#612, #519, #528). The real-client capture now also runs against a Codex release newer than the pinned 0.154.0 baseline, and it names the refused account discovery when a client rejects it.
