//! Independent ordinary external textual inheritance oracle. Gated CI only.
// Drafted translation oracle: these shapes mirror the JavaScript source the
// translator read. Clippy findings are fixed in its rules, not by hand (#772 ledger).
#![allow(clippy::missing_const_for_fn)]
macro_rules! chosen {
    ($name:ident) => {
        pub fn $name() -> u8 {
            7
        }
    };
}
#[path = "../../tools/translation/test/fixtures/tracked-declarative/native-child.rs"]
mod child;
#[path = "../../tools/translation/test/fixtures/tracked-declarative/native-sibling.rs"]
mod sibling;
chosen!(after);
#[test]
fn actual_external_children_inherit_prior_definitions_and_keep_their_local_shadows() {
    assert_eq!(child::inherited(), 7);
    assert_eq!(child::shadowed(), 9);
    assert_eq!(sibling::separate(), 7);
    assert_eq!(after(), 7);
}
