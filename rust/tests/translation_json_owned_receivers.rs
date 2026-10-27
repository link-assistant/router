//! Independent owned JSON receiver source oracle. UNRUN; gated native CI only.
use link_assistant_router::{translation_core as core, translation_json_fields_core as fields};

#[test]
fn owned_inputs_copies_and_parsed_locals_keep_native_value_behavior() {
    for value in [serde_json::json!({"name":"é😀"}), serde_json::json!({"name":""}), serde_json::json!({"name":null}), core::Json::Null] {
        let original = value.get("name").and_then(core::Json::as_str).unwrap_or_default().to_owned();
        assert_eq!(fields::json_str_field_or_empty(&value, "name").to_owned(), original);
        let copy = core::json_copy(&value);
        let alias = &copy;
        assert_eq!(fields::json_str_field_or_empty(alias, "name").to_owned(), original);
    }
    for input in ["{\"name\":\"é😀\"}", "{}", "null", "{"] {
        let original = serde_json::from_str::<core::Json>(input).ok().map(|value| value.get("name").and_then(core::Json::as_str).unwrap_or_default().to_owned());
        let selected = core::json_parse(input).map(|value| fields::json_str_field_or_empty(&value, "name").to_owned());
        assert_eq!(selected, original);
        let bytes = input.as_bytes();
        let selected = core::json_parse_bytes(bytes).map(|value| fields::json_str_field_or_empty(&value, "name").to_owned());
        assert_eq!(selected, original);
    }
}
