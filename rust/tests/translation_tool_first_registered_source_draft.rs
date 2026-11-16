//! Independent ordinary tool/derive scope oracle source. Gated CI only.
// Drafted translation oracle: these shapes mirror the JavaScript source the
// translator read. Clippy findings are fixed in its rules, not by hand (#772 ledger).
#![allow(clippy::missing_const_for_fn)]
#![allow(clippy::redundant_clone)]
#[rustfmt::skip]
fn root(value: bool) -> bool { value }
mod model {
    #[derive(Clone, Debug)]
    pub struct Record {
        pub value: u8,
    }
}

#[test]
fn root_tool_attribute_and_child_derives_keep_native_bindings_and_values() {
    assert!(!root(false));
    assert!(root(true));
    let value = model::Record { value: 7 };
    assert_eq!(value.clone().value, 7);
    assert_eq!(format!("{value:?}"), "Record { value: 7 }");
}
