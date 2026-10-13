### Fixed

- Verify the original shared-reference Copy compressed archive hash before decoding it. The parser-independent source import route now reports the existing checksum refusal consistently during relocated archive corruption tests, while retaining the full decoded-source hash and shared-reference ownership restrictions.
