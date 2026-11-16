//! Independent actual word module macro_use oracle. Gated CI only.
// Drafted translation oracle: these shapes mirror the JavaScript source the
// translator read. Clippy findings are fixed in its rules, not by hand (#772 ledger).
#![allow(clippy::doc_markdown)]
#![allow(clippy::missing_const_for_fn)]
macro_rules! chosen {
    ($name:ident) => {
        pub fn $name() -> u8 {
            7
        }
    };
}
chosen!(before);
#[macro_use]
#[path = "../../tools/translation/test/fixtures/module-macro-use/native-provider.rs"]
mod provider;
chosen!(after);
#[path = "../../tools/translation/test/fixtures/module-macro-use/native-sibling.rs"]
mod sibling;
chosen!(after_sibling);
#[test]
fn actual_word_attribute_keeps_child_textual_scope_and_ordinary_siblings_restore_it() {
    assert_eq!(before(), 7);
    assert_eq!(provider::inside(), 9);
    assert_eq!(after(), 9);
    assert_eq!(sibling::inherited(), 9);
    assert_eq!(sibling::shadowed(), 13);
    assert_eq!(after_sibling(), 9);
}
