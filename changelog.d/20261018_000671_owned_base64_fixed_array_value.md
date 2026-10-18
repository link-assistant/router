### Fixed

Require the checked fixed-array value ownership for the owned base64 `[u8; 32]`
operation. Preserve primitive u8 identity, exact length, source association and
native Copy checks; Vec, slices, references and other ownership remain refused.
Add separate boundary and repeated-Copy target regressions while preserving the
original eight base64 cases and deadlines. Runtime and CI Rust qualification
remain separate.

Check the current native error layout before weak transport lookup so malformed
layouts refuse independently of receipt lifetime. Successful emission retains
every original live-custody, source and repeated layout check.
