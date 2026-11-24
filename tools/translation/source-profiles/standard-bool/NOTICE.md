The complete Rust 1.89.0 library/core/src/bool.rs is retained as an offline
source pin, under the included MIT and Apache-2.0 licenses. Its original byte
hash agrees with the existing standard bool.then profile. Lines 31–35 declare
the distinct non-const bool.then_some method and its Some/None behavior; the
original documentation specifies eager argument evaluation. No source body is
substituted for a Router function. Compilation and runtime verification of the
new lowering remain pending in this source-only draft.
