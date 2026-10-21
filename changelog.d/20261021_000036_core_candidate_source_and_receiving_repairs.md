### Changed
- Materialize three complete, separately named Core producer source copies using native binding validation and lossless CST inverses. Existing producer APIs and defaults remain unchanged; behavior and full production performance still require receiving checks.

### Fixed
- Make the scalar facade-removal refusal fixture actually remove the current grouped export and fail if its mutation becomes a no-op.
- Retain Rust CST/inverse checks without incorrectly requiring JavaScript AST copies for Rust rows in the complete lifetime-source test.
