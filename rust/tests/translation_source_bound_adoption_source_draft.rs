//! Independent named-import/no-derive oracle source; gated CI only.
mod model {
    pub struct Record {
        pub value: u8,
    }
    pub const FLAG: bool = true;
    pub fn read(value: bool) -> bool {
        value
    }
}
use model::{read, Record, FLAG};

#[rustfmt::skip]
fn selected(value: bool) -> bool { read(value) }

#[test]
fn ordinary_imports_preserve_values_and_calls_without_generated_traits() {
    assert!(!selected(false));
    assert!(selected(FLAG));
    for value in [0_u8, 1, 127, 128, 255] {
        let original = Record { value };
        assert_eq!(original.value, value);
        assert_eq!(read(original.value > 127), value > 127);
    }
}

#[test]
fn child_aliases_keep_their_original_declaration() {
    use model::read as original_read;
    for value in [false, true] {
        assert_eq!(original_read(value), value);
    }
}
