### Added

- Add Rust source regression cases for the real subscription install-result enum: both discriminants, exact path equality, clone preservation, Unicode normalization distinctions, embedded NUL and Unix non-UTF8 payloads. These tests are UNRUN locally and require gated CI after every JavaScript stage passes for the same commit; their presence does not establish translation or runtime parity.
