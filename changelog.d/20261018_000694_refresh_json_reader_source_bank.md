### Changed

Regenerate the complete current source bank with all 848 tracked Rust/Cargo inputs, including the CI-only JSON reader oracle. Preserve all sixteen historical cases and both original 806/808-input profiles. Review every full source, native Git join, lossless CST partition and inverse before installing the actual producer output; source storage does not establish runtime parity or Rust verification.

Refresh those same 848 inputs after appending the optional service-tier Rust
goldens. The actual JavaScript producer and independent full source/CST review
retain the historical cases and profiles and change only that current source
entry. The Rust goldens remain unrun locally.

Refresh the single `responses_chat_input.rs` entry after adding nonempty-field
goldens. The actual producer and independent review retain all 848 current
inputs, historical profiles and complete CST inverses. Native golden execution
still belongs to CI after the same-commit JavaScript gate.
