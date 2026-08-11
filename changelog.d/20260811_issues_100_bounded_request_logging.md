### Added

- Log every client and transformed upstream HTTP exchange to a redacted, correlated JSONL file with a configurable 100 MiB default bound.

### Fixed

- Let `RUST_LOG` override the fallback `info` or `debug` directive.
