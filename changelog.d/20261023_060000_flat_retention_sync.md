### Fixed

- Generate a flat UTF16 retained-output compiler closure from the existing byte
  and native implementations, preserving complete CST inverses, guarded host
  operations, output bytes and original resource limits.
- Keep the generated ASCII/scalar reverse witness separate from protected
  authored Rust inputs during bidirectional synchronization.
