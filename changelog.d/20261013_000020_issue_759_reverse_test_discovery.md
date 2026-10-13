### Changed

- Require every reverse translator test under Node and pinned Bun before the JavaScript gate can pass. Test discovery includes future compiler test files, and structural checks reject partial suites, filters and ignored failures.
- Translate the original Clap ValueEnum quote output and resolve original imported Display and TOML function owners, enabling two additional ClientKind methods without changing their Rust source.
