---
bump: patch
---

### Fixed
- Preparing a `router with claude --extend-global-config` launch no longer reads the user's Claude settings from inside the launch setup; the caller resolves that file and passes it in. The library test `claude_receives_the_selected_router_ca_as_additional_trust` therefore no longer fails on a machine whose own Claude profile has a saved model such as `opus`, and it never reads the real profile (#613).
