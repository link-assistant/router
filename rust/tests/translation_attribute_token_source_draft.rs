//! Original token versus string behavior. Native CI runs after the full JS gate.
mod fixture {
    const TEXT: &str = "#[automatically_derived]";
    #[rustfmt::skip]
    pub fn original_text() -> &'static str { TEXT }
}
#[test]
fn written_attribute_text_inside_a_string_is_only_string_data() {
    assert_eq!(fixture::original_text(), "#[automatically_derived]");
}
