#![doc = "Independent actual literal documentation caller oracle. Gated CI only."]
#![forbid(unsafe_code)]
// Drafted translation oracle: these shapes mirror the JavaScript source the
// translator read. Clippy findings are fixed in its rules, not by hand (#772 ledger).
#![allow(clippy::missing_const_for_fn)]
#[macro_use]
#[path = "../../tools/translation/test/fixtures/literal-doc-consumers/native-provider.rs"]
mod provider;
chosen!(selected);
#[test]
fn actual_original_inner_definition_and_generated_literal_docs_keep_native_behavior() {
    assert_eq!(selected(), 7);
}
