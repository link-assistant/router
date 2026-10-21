### Fixed

- Bulk draft current physical Rust source reads through reusable native syntax
  and CST substitution rules while preserving historical source text and labels.
- Retain all current Rust bytes and workspace/package Cargo inputs in original
  test captures, including moved build and fuzz files.
- Add literal source substitutions while preserving the existing replacement
  contract, and keep public serialization source labels crate-relative.
- Record unfinished full-file, performance, regeneration and parity checks;
  focused receiving successes do not establish complete project translation.
