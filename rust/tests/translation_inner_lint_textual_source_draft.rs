#![forbid(unsafe_code)]
#![deny(unused_variables)]
//! Independent actual inner lint and textual scope oracle. Gated CI only.
#[macro_use]
#[path = "../../tools/translation/test/fixtures/inner-lint-textual/native-provider.rs"]
mod provider;
chosen!(selected);
#[test]
fn actual_original_inner_lints_keep_native_body_and_macro_scope_behavior() {
    assert_eq!(selected(), 7);
}
