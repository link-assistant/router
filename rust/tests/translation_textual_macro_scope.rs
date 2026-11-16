//! Native textual-scope oracle SOURCE only; no Rust tools run locally.
// Drafted translation oracle: these shapes mirror the JavaScript source the
// translator read. Clippy findings are fixed in its rules, not by hand (#772 ledger).
#![allow(clippy::missing_const_for_fn)]
#![allow(clippy::redundant_pub_crate)]

mod original_scope {
    macro_rules! selected {
        () => {
            3_u8
        };
    }

    pub(super) fn before_child() -> u8 {
        selected!()
    }

    #[macro_use]
    mod exported_textual_scope {
        macro_rules! selected {
            () => {
                5_u8
            };
        }
    }

    pub(super) fn after_child() -> u8 {
        selected!()
    }

    mod ordinary_child {
        macro_rules! selected {
            () => {
                7_u8
            };
        }

        pub(super) fn selected_inside() -> u8 {
            selected!()
        }
    }

    pub(super) fn ordinary_child_value() -> u8 {
        ordinary_child::selected_inside()
    }

    pub(super) fn after_ordinary_child() -> u8 {
        selected!()
    }
}

#[test]
fn original_macro_use_exports_textual_scope_but_ordinary_child_restores_it() {
    assert_eq!(original_scope::before_child(), 3);
    assert_eq!(original_scope::after_child(), 5);
    assert_eq!(original_scope::ordinary_child_value(), 7);
    assert_eq!(original_scope::after_ordinary_child(), 5);
}
