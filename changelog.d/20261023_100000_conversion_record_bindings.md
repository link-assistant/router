### Fixed

- Preserve caller temporary names while independently checking standard-library conversion bodies. Record fields surrounding `String::from`, `.into()` and primitive identity conversions retain their original values in generated JavaScript and TypeScript.
- Verify current reverse-compiler source composition with the complete existing string-operation substitutions and their inverse, preserving the historical parent.
- Add mixed-record conversion boundary cases and Rust source coverage for every provider and field returned by `empty_usage`. Rust verification runs only in CI after all JavaScript stages pass.
