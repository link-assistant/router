### Changed

- Require verification jobs and steps after the JavaScript gate to preserve failures. The workflow audit rejects `continue-on-error` bypasses, including dynamic expressions; explicitly false values remain valid.
- Document that disabling a conflicting local Rust or cache-cleanup hook never waives Rust verification in CI after the same-commit JavaScript gate passes.
