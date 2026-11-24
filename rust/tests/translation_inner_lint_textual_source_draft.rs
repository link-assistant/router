#![forbid(unsafe_code)]
#![deny(unused_variables)]
//! Independent actual inner lint and textual scope oracle. Gated CI only.
// Drafted translation oracle: these shapes mirror the JavaScript source the
// translator read. Clippy findings are fixed in its rules, not by hand (#772 ledger).
#![allow(clippy::missing_const_for_fn)]
#![allow(clippy::non_minimal_cfg)]
#[macro_use]
#[path = "../../tools/translation/test/fixtures/inner-lint-textual/native-provider.rs"]
mod provider;
chosen!(selected);
#[test]
fn actual_original_inner_lints_keep_native_body_and_macro_scope_behavior() {
    assert_eq!(selected(), 7);
}
