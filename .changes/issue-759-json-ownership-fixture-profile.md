The synthetic borrowed JSON parser ownership fixture now explicitly selects
the registered standalone default parser profile, matching its expected numeric
adapter. Added valid borrowed-signature checks that retain missing actual Cargo
and actual float_roundtrip refusal diagnostics, while independent Value readers
remain admitted. Source capability checks and numeric implementations unchanged.
Focused12-case checks pass in Node and Bun, including emitted JavaScript and
strict-compiled TypeScript. Complete initial/final logs and exact source-head,
input hashes and harness-child resource observations are archived compactly.
No actual float_roundtrip parser admission, native parity or Rust execution.
