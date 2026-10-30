//! Independent tool/adoption oracle source. Execution is deferred to gated CI.
#[rustfmt::skip]
fn selected(value: bool) -> bool { value }

mod model {
    #[derive(Clone, Debug)]
    pub struct Record {
        pub value: u8,
    }
}
use model::Record;

#[test]
fn original_tool_attribute_preserves_boolean_body_and_derived_owner() {
    assert!(!selected(false));
    assert!(selected(true));
    for value in [0_u8, 1, 127, 128, 255] {
        let record = Record { value };
        let copied = record.clone();
        assert_eq!(copied.value, value);
        assert_eq!(format!("{record:?}"), format!("Record {{ value: {value} }}"));
    }
}

#[test]
fn inactive_variant_cannot_replace_an_original_tool_prefix() {
    #[derive(Clone, Debug, PartialEq)]
    enum Choice {
        #[cfg(any())]
        rustfmt,
        Value(bool),
    }
    use Choice::*;
    #[rustfmt::skip]
    fn original(value: bool) -> Choice { Value(value) }
    assert_eq!(original(false), Choice::Value(false));
    assert_eq!(original(true), Choice::Value(true));
}
