//! Independent JSON borrowed default oracle SOURCE. Native execution is CI-only.
use link_assistant_router::{translation_core::Json, translation_json_fields_core as fields};

#[test]
fn original_and_selected_json_string_defaults_retain_borrowed_values() {
    fn original(value: &Json, key: &str) -> String {
        value.get(key).and_then(Json::as_str).unwrap_or("").to_owned()
    }
    fn selected(value: &Json, key: &str) -> String {
        fields::json_str_field_or_empty(value, key).to_owned()
    }
    for value in [serde_json::json!({"name":"é😀"}), serde_json::json!({"name":""}), serde_json::json!({"name":null}), serde_json::json!({"name":false}), serde_json::json!({}), serde_json::json!(["array"]), Json::Null] {
        for key in ["name", "missing", "0"] {
            assert_eq!(selected(&value, key), original(&value, key));
            assert_eq!(fields::json_str_field_or_empty(&value, key), value.get(key).and_then(Json::as_str).unwrap_or_default());
        }
    }
    let value = serde_json::json!({"name":"é😀"});
    let selected = fields::json_str_field_or_empty(&value, "name");
    let original = value.get("name").and_then(Json::as_str).unwrap();
    assert!(std::ptr::eq(selected.as_ptr(), original.as_ptr()));
}
