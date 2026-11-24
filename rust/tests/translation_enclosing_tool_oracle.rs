// Drafted translation oracle: these shapes mirror the JavaScript source the
// translator read. Clippy findings are fixed in its rules, not by hand (#772 ledger).
#![allow(clippy::missing_const_for_fn)]
// Native oracle source. Run in CI only after the entire same-SHA JS gate.
#[derive(Clone, Debug)]
struct Record {
    value: u8,
}

#[rustfmt::skip]
fn keep(value: u8) -> u8 { value }

#[test]
fn generated_sibling_impls_and_tool_attribute_preserve_native_behavior() {
    let original = Record { value: 255 };
    let cloned = original.clone();
    assert_eq!(original.value, cloned.value);
    assert_eq!(format!("{cloned:?}"), "Record { value: 255 }");
    assert_eq!(keep(0), 0);
    assert_eq!(keep(255), 255);
}
