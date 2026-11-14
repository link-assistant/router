# Rust shared f64 method evidence

The complete reference files and both licenses are copied from rust-lang/reference
commit `9571d4d38cc580bd9fe926f97fccd98f215564a9`, the submodule selected by
Rust 1.89.0. The manifest records every complete source hash and upstream link.
Copyright the Rust Project Developers; licensed under MIT or Apache-2.0.

The receiver-candidate search, built-in reference dereference and Copy read
rules support only checked shared primitive f64 inherent receivers. The
preexisting explicit-read profile still grants no implicit method authority.
Visible or unresolved competing trait methods remain refused. This evidence
does not implement a general trait resolver or prove complete runtime parity.
