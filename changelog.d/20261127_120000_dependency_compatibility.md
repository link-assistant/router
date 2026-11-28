### Fixed

- Restore Rust compatibility with the current JWT and terminal parser APIs. Keep existing deployment secret fingerprints and reject unset secrets during token issuance and validation.

### Changed

- The optional local sensitive data scanner now uses the locked sanitizer 2.1.0 package and requires Node.js 26.13.1 or newer.
